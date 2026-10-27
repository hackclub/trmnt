import { fail } from '@sveltejs/kit';
import { and, asc, desc, eq, isNull, ne, or } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { projects, submissions, users } from '#lib/server/db/schema.ts';
import { decrypt } from '#lib/server/crypto.ts';
import { requireAdmin } from '#lib/server/auth/guard.ts';
import { airtableEnabled } from '#lib/server/airtable.ts';
import { fetchTopLanguage } from '#lib/server/hackatime.ts';
import { secondsOn } from '#lib/server/hours.ts';
import { PROGRAM_START } from '#lib/server/program.ts';
import { latestStatus, latestSubmission } from '#lib/server/projects.ts';
import {
	approveSubmission,
	refreshRobert,
	rejectSubmission,
	sendSubmissionToRobert
} from '#lib/server/review.ts';
import { robertEnabled } from '#lib/server/robert.ts';
import type { Actions, PageServerLoad } from './$types';

const QUEUE_LENGTH = 60;

export const load: PageServerLoad = async (event) => {
	requireAdmin(event);
	const view = event.url.searchParams.get('view') ?? 'waiting';
	const { queue, active } =
		view === 'progress'
			? await inProgress(event.url.searchParams.get('project'))
			: await submitted(view === 'reviewed', event.url.searchParams.get('submission'));
	return { view, queue, active, robertEnabled, airtableEnabled };
};

/** The language most of the time on these Hackatime projects went into, streamed */
function topLanguage(encryptedToken: string | null, names: string[]) {
	return encryptedToken
		? decrypt(encryptedToken)
				.then((token) => fetchTopLanguage(token, names, PROGRAM_START))
				.catch(() => null)
		: Promise.resolve(null);
}

/** Submissions: waiting ones oldest first, so nobody waits long; reviewed ones newest first */
async function submitted(reviewed: boolean, activeId: string | null) {
	const queue = await db
		.select({
			id: submissions.id,
			status: submissions.status,
			name: projects.name,
			thumbnail: projects.thumbnailUrl,
			seconds: submissions.secondsLogged,
			author: users.name,
			authorEmail: users.email
		})
		.from(submissions)
		.innerJoin(projects, eq(projects.id, submissions.projectId))
		.innerJoin(users, eq(users.id, projects.userId))
		.where(reviewed ? ne(submissions.status, 'pending') : eq(submissions.status, 'pending'))
		.orderBy(reviewed ? desc(submissions.reviewedAt) : asc(submissions.createdAt))
		.limit(QUEUE_LENGTH);

	const id = activeId ?? queue[0]?.id;
	const [active] = id
		? await db
				.select({ submission: submissions, project: projects, author: users })
				.from(submissions)
				.innerJoin(projects, eq(projects.id, submissions.projectId))
				.innerJoin(users, eq(users.id, projects.userId))
				.where(eq(submissions.id, id))
		: [];

	return {
		queue: queue.map((row) => ({ ...row, author: row.author ?? row.authorEmail })),
		active: active && {
			id: active.submission.id,
			status: active.submission.status,
			name: active.project.name,
			type: active.project.type,
			screenshot: active.project.thumbnailUrl,
			description: active.project.description,
			repoUrl: active.project.repoUrl,
			demoUrl: active.project.demoUrl,
			hackatimeProjects: active.project.hackatimeProjects,
			hours: active.submission.secondsLogged / 3600,
			// What was logged when it was submitted is what's reviewed
			liveHours: Promise.resolve(null),
			approvedHours: active.submission.secondsApproved && active.submission.secondsApproved / 3600,
			bftsAwarded: active.submission.bftsAwarded,
			reason: active.submission.reason,
			justification: active.submission.reviewerNotes,
			author: active.author.name ?? active.author.email,
			trustLevel: active.author.hackatimeTrustLevel,
			robertSent: Boolean(active.submission.robertProjectId),
			// Both from other services, so streamed rather than holding up the page
			language: topLanguage(active.author.hackatimeAccessToken, active.project.hackatimeProjects),
			robert: active.submission.robertProjectId
				? refreshRobert(active.submission.id, active.submission.robertProjectId).catch(() => null)
				: Promise.resolve(null)
		}
	};
}

/**
 * Projects not in review: never submitted, or sent back for changes and not submitted again.
 * Most hours first, since those are nearest to being submitted. Nothing can be decided on them.
 */
async function inProgress(activeId: string | null) {
	const unsubmitted = or(isNull(latestStatus), eq(latestStatus, 'changes_requested'));
	const queue = await db
		.select({
			id: projects.id,
			name: projects.name,
			thumbnail: projects.thumbnailUrl,
			seconds: projects.secondsLogged,
			author: users.name,
			authorEmail: users.email
		})
		.from(projects)
		.innerJoin(users, eq(users.id, projects.userId))
		.where(unsubmitted)
		.orderBy(desc(projects.secondsLogged))
		.limit(QUEUE_LENGTH);

	const id = activeId ?? queue[0]?.id;
	const [active] = id
		? await db
				.select({
					project: projects,
					author: users,
					status: latestStatus,
					reason: latestSubmission<string>('reason')
				})
				.from(projects)
				.innerJoin(users, eq(users.id, projects.userId))
				.where(and(eq(projects.id, id), unsubmitted))
		: [];

	return {
		queue: queue.map((row) => ({ ...row, author: row.author ?? row.authorEmail })),
		active: active && {
			id: active.project.id,
			status: active.status,
			name: active.project.name,
			type: active.project.type,
			screenshot: active.project.thumbnailUrl,
			description: active.project.description,
			repoUrl: active.project.repoUrl,
			demoUrl: active.project.demoUrl,
			hackatimeProjects: active.project.hackatimeProjects,
			hours: active.project.secondsLogged / 3600,
			// The stored hours are from the owner's last visit to Home, so Hackatime is asked too
			liveHours: secondsOn(active.author.id, active.project.hackatimeProjects)
				.then((seconds) => (seconds === null ? null : seconds / 3600))
				.catch(() => null),
			approvedHours: null,
			bftsAwarded: null,
			reason: active.reason,
			justification: null,
			author: active.author.name ?? active.author.email,
			trustLevel: active.author.hackatimeTrustLevel,
			robertSent: false,
			language: topLanguage(active.author.hackatimeAccessToken, active.project.hackatimeProjects),
			robert: Promise.resolve(null)
		}
	};
}

/** Runs one decision on the submission the form names, reporting how it went */
async function decide(
	event: Parameters<Actions[string]>[0],
	run: (submissionId: string, form: FormData) => Promise<string | null>,
	done: string
) {
	const form = await event.request.formData();
	const submissionId = String(form.get('submission') ?? '');
	const problem = await run(submissionId, form);
	if (problem) return fail(400, { submissionId, message: problem });
	return { submissionId, done };
}

export const actions: Actions = {
	approve: (event) => {
		const admin = requireAdmin(event);
		return decide(
			event,
			(id, form) =>
				approveSubmission(
					id,
					admin,
					Number(form.get('hours')),
					String(form.get('justification') ?? ''),
					event.url
				),
			'Approved. Its record is in Airtable, waiting on the Unified YSWS automation there.'
		);
	},
	reject: (event) => {
		const admin = requireAdmin(event);
		return decide(
			event,
			(id, form) => rejectSubmission(id, admin, String(form.get('reason') ?? ''), false),
			'Sent back for changes.'
		);
	},
	hardReject: (event) => {
		const admin = requireAdmin(event);
		return decide(
			event,
			(id, form) => rejectSubmission(id, admin, String(form.get('reason') ?? ''), true),
			'Rejected for good.'
		);
	},
	sendToRobert: (event) => {
		requireAdmin(event);
		return decide(event, (id) => sendSubmissionToRobert(id), 'Sent to Robert for fraud review.');
	}
};
