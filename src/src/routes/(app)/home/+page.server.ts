import { fail, redirect } from '@sveltejs/kit';
import { desc, eq, max } from 'drizzle-orm';
import { resolve } from '$app/paths';
import { db } from '#lib/server/db/index.ts';
import { projects, screenshots, submissions, users } from '#lib/server/db/schema.ts';
import { requireUser } from '#lib/server/auth/guard.ts';
import { hackatimeEnabled } from '#lib/server/hackatime.ts';
import { syncHours } from '#lib/server/hours.ts';
import { linkableHackatimeProjects } from '#lib/server/projects.ts';
import {
	PROJECT_TYPES,
	SCREENSHOT_MAX_BYTES,
	SCREENSHOT_TYPES,
	type ProjectType
} from '#lib/projects.ts';
import type { Project } from '#lib/types.ts';
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
		db.select(card).from(projects).where(eq(projects.userId, user.id)).orderBy(desc(projects.createdAt)),
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
		yourProjects: yours.map(toCard),
		latestProjects: latest.map(toCard),
		hackatime: {
			enabled: hackatimeEnabled,
			connected: hackatimeConnected,
			failed: event.url.searchParams.get('hackatime') === 'failed'
		},
		// For the project form. Streamed rather than awaited, so Home doesn't wait on Hackatime.
		linkableProjects: hackatimeConnected
			? linkableHackatimeProjects(user.id).catch((err) => {
					console.error('Listing Hackatime projects failed', err);
					return null;
				})
			: Promise.resolve(null)
	};
};

export const actions: Actions = {
	createProject: async (event) => {
		const user = requireUser(event);
		const form = await event.request.formData();
		const values = {
			name: String(form.get('name') ?? '').trim(),
			type: String(form.get('type') ?? ''),
			hackatimeProjects: [...new Set(form.getAll('hackatimeProjects').map(String))]
		};
		const problem = (message: string) => fail(400, { create: { message, values } });

		if (!values.name) return problem('Give your project a name.');
		if (values.name.length > 80) return problem('Keep the name under 80 characters.');
		if (!(values.type in PROJECT_TYPES)) return problem('Pick a type for your project.');

		// Optional for now; a project needs at least one before its hours count
		if (values.hackatimeProjects.length > 0) {
			const linkable = await linkableHackatimeProjects(user.id).catch(() => null);
			const unlinkable = values.hackatimeProjects.filter((name) => !linkable?.includes(name));
			if (unlinkable.length > 0) {
				return problem(`${unlinkable.join(', ')} can't be linked. Pick others.`);
			}
		}

		// Optional when creating; required to submit
		const file = form.get('screenshot');
		const screenshot = file instanceof File && file.size > 0 ? file : null;
		if (screenshot && !SCREENSHOT_TYPES.includes(screenshot.type)) {
			return problem('Screenshots need to be PNG, JPEG, WebP or GIF images.');
		}
		if (screenshot && screenshot.size > SCREENSHOT_MAX_BYTES) {
			return problem('That screenshot is over 5 MB. Try a smaller one.');
		}
		const screenshotData = screenshot && new Uint8Array(await screenshot.arrayBuffer());

		await db.transaction(async (tx) => {
			const [project] = await tx
				.insert(projects)
				.values({
					userId: user.id,
					name: values.name,
					type: values.type as ProjectType,
					hackatimeProjects: values.hackatimeProjects
				})
				.returning({ id: projects.id });

			if (screenshot && screenshotData) {
				await tx
					.insert(screenshots)
					.values({ projectId: project.id, contentType: screenshot.type, data: screenshotData });
				await tx
					.update(projects)
					.set({
						thumbnailUrl: `${resolve('/projects/[id]/screenshot', { id: project.id })}?v=${Date.now()}`
					})
					.where(eq(projects.id, project.id));
			}

			// So the next page load counts the new project's hours straight away
			await tx.update(users).set({ hackatimeSyncedAt: null }).where(eq(users.id, user.id));
		});

		redirect(303, resolve('home'));
	}
};

function toCard(row: { id: string; name: string; thumbnail: string | null; seconds: number }): Project {
	return {
		id: row.id,
		name: row.name,
		hours: row.seconds / 3600,
		thumbnail: row.thumbnail ?? undefined
	};
}
