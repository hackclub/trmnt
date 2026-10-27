import { fail, redirect } from '@sveltejs/kit';
import { and, desc, eq, max } from 'drizzle-orm';
import { resolve } from '$app/paths';
import { db } from '#lib/server/db/index.ts';
import { projects, submissions, users } from '#lib/server/db/schema.ts';
import { requireUser } from '#lib/server/auth/guard.ts';
import { HACK_CLUB_AUTH_ORIGIN } from '#lib/server/auth/hackclub.ts';
import { hackatimeEnabled } from '#lib/server/hackatime.ts';
import { secondsOn, syncHours } from '#lib/server/hours.ts';
import {
	latestStatus,
	latestSubmission,
	linkableHackatimeProjects,
	readScreenshot,
	saveScreenshot
} from '#lib/server/projects.ts';
import { checkSubmitter, type SubmitterProblem } from '#lib/server/submissions.ts';
import { PROJECT_TYPES, type ProjectType } from '#lib/projects.ts';
import type { OwnProject, Project } from '#lib/types.ts';
import type { Actions, PageServerLoad } from './$types';

const LATEST_COUNT = 6;

export const load: PageServerLoad = async (event) => {
	// Page and layout loads run in parallel, so this can't rely on the layout's check
	const user = requireUser(event);

	let hackatimeConnected = user.hackatimeConnected;
	if (hackatimeConnected) {
		hackatimeConnected = await syncHours(user.id).catch((err) => {
			// Stale hours are better than no page when Hackatime is down
			console.error('Hackatime sync failed', err);
			return true;
		});
	}

	const card = {
		id: projects.id,
		name: projects.name,
		thumbnail: projects.thumbnailUrl,
		seconds: projects.secondsLogged
	};
	const [yours, latest] = await Promise.all([
		db
			.select({
				...card,
				type: projects.type,
				hackatimeProjects: projects.hackatimeProjects,
				repoUrl: projects.repoUrl,
				demoUrl: projects.demoUrl,
				description: projects.description,
				status: latestStatus,
				reason: latestSubmission<string>('reason'),
				bftsAwarded: latestSubmission<number>('bfts_awarded')
			})
			.from(projects)
			.where(eq(projects.userId, user.id))
			.orderBy(desc(projects.createdAt)),
		// Only projects that have been approved, most recently approved first
		db
			.select(card)
			.from(projects)
			.innerJoin(submissions, eq(submissions.projectId, projects.id))
			.where(eq(submissions.status, 'approved'))
			.groupBy(projects.id)
			.orderBy(desc(max(submissions.reviewedAt)))
			.limit(LATEST_COUNT)
	]);

	return {
		yourProjects: yours.map(
			(row): OwnProject => ({
				...toCard(row),
				type: row.type,
				hackatimeProjects: row.hackatimeProjects,
				repoUrl: row.repoUrl,
				demoUrl: row.demoUrl,
				description: row.description,
				status: row.status,
				reason: row.reason,
				bftsAwarded: row.bftsAwarded
			})
		),
		latestProjects: latest.map(toCard),
		hackatime: {
			enabled: hackatimeEnabled,
			connected: hackatimeConnected,
			failed: event.url.searchParams.get('hackatime') === 'failed'
		},
		// For the project forms. Streamed rather than awaited, so Home doesn't wait on Hackatime.
		linkableProjects: hackatimeConnected
			? linkableHackatimeProjects(user.id).catch((err) => {
					console.error('Listing Hackatime projects failed', err);
					return null;
				})
			: Promise.resolve(null)
	};
};

/** The fields both project forms share, or what's wrong with them */
function readDetails(form: FormData) {
	const values = {
		name: String(form.get('name') ?? '').trim(),
		type: String(form.get('type') ?? ''),
		hackatimeProjects: [...new Set(form.getAll('hackatimeProjects').map(String))]
	};
	let problem: string | null = null;
	if (!values.name) problem = 'Give your project a name.';
	else if (values.name.length > 80) problem = 'Keep the name under 80 characters.';
	else if (!(values.type in PROJECT_TYPES)) problem = 'Pick a type for your project.';
	return { values: { ...values, type: values.type as ProjectType }, problem };
}

/** What stops someone submitting, as said under the submit button */
function submitterProblem(reason: SubmitterProblem, projectId: string) {
	const relink = {
		href: `${resolve('auth/hackclub')}?intent=link&redirectTo=${encodeURIComponent(`${resolve('home')}?submit=${projectId}`)}`,
		label: 'link Hack Club'
	};
	const hackClub = { href: HACK_CLUB_AUTH_ORIGIN, label: 'open Hack Club' };
	switch (reason) {
		case 'link_hack_club':
			return {
				message: 'Link your Hack Club account so TRMNT can check you’re eligible and get your mailing address and birthday.',
				link: relink
			};
		case 'verify_identity':
			return { message: 'Verify your identity with Hack Club before submitting.', link: hackClub };
		case 'verification_pending':
			return { message: 'Hack Club is still checking your identity. Try again once you’re verified.' };
		case 'ineligible':
			return { message: 'Hack Club says you’re not eligible for YSWS programs, so this can’t be submitted.' };
		case 'needs_address':
			return { message: 'Add a mailing address to your Hack Club account first.', link: hackClub };
		case 'needs_birthday':
			return { message: 'Add your birthday to your Hack Club account first.', link: hackClub };
	}
}

export const actions: Actions = {
	createProject: async (event) => {
		const user = requireUser(event);
		const form = await event.request.formData();
		const { values, problem: detailsProblem } = readDetails(form);
		const problem = (message: string) => fail(400, { create: { message, values } });
		if (detailsProblem) return problem(detailsProblem);

		// Optional for now; a project needs at least one before its hours count
		if (values.hackatimeProjects.length > 0) {
			const linkable = await linkableHackatimeProjects(user.id).catch(() => null);
			const unlinkable = values.hackatimeProjects.filter((name) => !linkable?.includes(name));
			if (unlinkable.length > 0) {
				return problem(`${unlinkable.join(', ')} can't be linked. Pick others.`);
			}
		}

		// Optional when creating; required to submit
		const screenshot = await readScreenshot(form);
		if (typeof screenshot === 'string') return problem(screenshot);

		await db.transaction(async (tx) => {
			const [project] = await tx
				.insert(projects)
				.values({ userId: user.id, ...values })
				.returning({ id: projects.id });
			if (screenshot) await saveScreenshot(tx, project.id, screenshot);

			// So the next page load counts the new project's hours straight away
			await tx.update(users).set({ hackatimeSyncedAt: null }).where(eq(users.id, user.id));
		});

		redirect(303, resolve('home'));
	},

	submitProject: async (event) => {
		const user = requireUser(event);
		const form = await event.request.formData();
		const projectId = String(form.get('project') ?? '');
		const problem = (message: string, link?: { href: string; label: string }) =>
			fail(400, { submit: { projectId, message, link } });

		const [project] = await db
			.select({ hackatimeProjects: projects.hackatimeProjects, thumbnail: projects.thumbnailUrl, status: latestStatus })
			.from(projects)
			.where(and(eq(projects.id, projectId), eq(projects.userId, user.id)));
		if (!project) return problem('That project couldn’t be found.');
		if (project.status === 'pending' || project.status === 'approved') {
			return problem('This project has already been submitted.');
		}

		// The form can change anything it shows, as on creating
		const { values, problem: detailsProblem } = readDetails(form);
		if (detailsProblem) return problem(detailsProblem);

		const screenshot = await readScreenshot(form);
		if (typeof screenshot === 'string') return problem(screenshot);
		if (!screenshot && !project.thumbnail) return problem('Add a screenshot of your project running.');

		// What the Unified YSWS database needs about every project
		const links = {
			repoUrl: httpUrl(form.get('codeUrl')),
			demoUrl: httpUrl(form.get('playableUrl')),
			description: String(form.get('description') ?? '').trim()
		};
		if (!links.repoUrl) return problem('Add a link to your project’s code, starting https://.');
		if (!links.demoUrl) {
			return problem('Add a link where people can try your project, starting https://.');
		}
		if (!links.description) return problem('Describe your project in a sentence or two.');
		if (links.description.length > 2000) return problem('Keep the description under 2,000 characters.');

		if (values.hackatimeProjects.length === 0) {
			return problem('Pick the Hackatime projects you worked on, so your hours can be counted.');
		}
		// Its own projects stay linkable, along with any no other project has
		const linkable = new Set([
			...project.hackatimeProjects,
			...((await linkableHackatimeProjects(user.id).catch(() => null)) ?? [])
		]);
		const unlinkable = values.hackatimeProjects.filter((name) => !linkable.has(name));
		if (unlinkable.length > 0) return problem(`${unlinkable.join(', ')} can’t be linked. Pick others.`);

		const blocked = await checkSubmitter(user);
		if (blocked) {
			const { message, link } = submitterProblem(blocked, projectId);
			return problem(message, link);
		}

		// Counted now, so the reviewer sees what was logged as of submitting
		const seconds = await secondsOn(user.id, values.hackatimeProjects);
		if (seconds === null) {
			return problem('Connect Hackatime again so your hours can be counted.', {
				href: `${resolve('connect/hackatime')}?redirectTo=${encodeURIComponent(`${resolve('home')}?submit=${projectId}`)}`,
				label: 'connect Hackatime'
			});
		}
		if (seconds === 0) {
			return problem('Those Hackatime projects have no time logged since TRMNT started.');
		}

		const submitted = await db.transaction(async (tx) => {
			// Holds the project until this commits, so submitting twice at once makes one submission
			await tx.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).for('update');
			const [{ status }] = await tx.select({ status: latestStatus }).from(projects).where(eq(projects.id, projectId));
			if (status === 'pending' || status === 'approved') return false;

			await tx
				.update(projects)
				.set({ ...values, ...links, secondsLogged: seconds })
				.where(eq(projects.id, projectId));
			if (screenshot) await saveScreenshot(tx, projectId, screenshot);
			await tx.insert(submissions).values({ projectId, secondsLogged: seconds });
			return true;
		});
		if (!submitted) return problem('This project has already been submitted.');

		redirect(303, resolve('home'));
	}
};

/** A form value as an http(s) URL, or null if it isn't one */
function httpUrl(value: FormDataEntryValue | null): string | null {
	try {
		const url = new URL(String(value ?? '').trim());
		return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
	} catch {
		return null;
	}
}

function toCard(row: { id: string; name: string; thumbnail: string | null; seconds: number }): Project {
	return {
		id: row.id,
		name: row.name,
		hours: row.seconds / 3600,
		thumbnail: row.thumbnail ?? undefined
	};
}
