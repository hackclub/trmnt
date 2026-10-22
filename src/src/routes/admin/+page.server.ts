import { fail } from '@sveltejs/kit';
import { asc, desc, eq, ne } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { projects, submissions, users } from '#lib/server/db/schema.ts';
import { decrypt } from '#lib/server/crypto.ts';
import { requireAdmin } from '#lib/server/auth/guard.ts';
import { airtableEnabled } from '#lib/server/airtable.ts';
import { fetchTopLanguage } from '#lib/server/hackatime.ts';
import { PROGRAM_START } from '#lib/server/program.ts';
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
	// Waiting ones oldest first, so nobody waits long; reviewed ones newest first
	const reviewed = event.url.searchParams.get('view') === 'reviewed';

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

	const activeId = event.url.searchParams.get('submission') ?? queue[0]?.id;
	const [active] = activeId
		? await db
				.select({ submission: submissions, project: projects, author: users })
				.from(submissions)
				.innerJoin(projects, eq(projects.id, submissions.projectId))
				.innerJoin(users, eq(users.id, projects.userId))
				.where(eq(submissions.id, activeId))
		: [];

	return {
		reviewed,
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
			approvedHours: active.submission.secondsApproved && active.submission.secondsApproved / 3600,
			bftsAwarded: active.submission.bftsAwarded,
			reason: active.submission.reason,
			justification: active.submission.reviewerNotes,
			author: active.author.name ?? active.author.email,
			trustLevel: active.author.hackatimeTrustLevel,
			robertSent: Boolean(active.submission.robertProjectId),
			// Both from other services, so streamed rather than holding up the page
			language: active.author.hackatimeAccessToken
				? decrypt(active.author.hackatimeAccessToken)
						.then((token) => fetchTopLanguage(token, active.project.hackatimeProjects, PROGRAM_START))
						.catch(() => null)
				: Promise.resolve(null),
			robert: active.submission.robertProjectId
				? refreshRobert(active.submission.id, active.submission.robertProjectId).catch(() => null)
				: Promise.resolve(null)
		},
		robertEnabled,
		airtableEnabled
	};
};

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
