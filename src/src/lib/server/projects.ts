import { eq } from 'drizzle-orm';
import { resolve } from '$app/paths';
import { db } from '#lib/server/db/index.ts';
import { projects, screenshots, users } from '#lib/server/db/schema.ts';
import { decrypt } from '#lib/server/crypto.ts';
import { fetchNewProjectNames } from '#lib/server/hackatime.ts';
import { SCREENSHOT_MAX_BYTES, SCREENSHOT_TYPES } from '#lib/projects.ts';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The Hackatime projects a user can still link: started since the program began, and not
 * already counting toward another of their projects, so no time is counted twice.
 * Null when Hackatime isn't connected.
 */
export async function linkableHackatimeProjects(userId: string): Promise<string[] | null> {
	const [user] = await db
		.select({ token: users.hackatimeAccessToken })
		.from(users)
		.where(eq(users.id, userId));
	if (!user?.token) return null;

	const [names, own] = await Promise.all([
		fetchNewProjectNames(await decrypt(user.token)),
		db.select({ linked: projects.hackatimeProjects }).from(projects).where(eq(projects.userId, userId))
	]);
	if (!names) return null;

	const taken = new Set(own.flatMap((project) => project.linked));
	return names.filter((name) => !taken.has(name));
}

export interface Screenshot {
	contentType: string;
	data: Uint8Array<ArrayBuffer>;
}

/** The screenshot sent with a project form: null without one, or a string saying what's wrong */
export async function readScreenshot(form: FormData): Promise<Screenshot | null | string> {
	const file = form.get('screenshot');
	if (!(file instanceof File) || file.size === 0) return null;
	if (!SCREENSHOT_TYPES.includes(file.type)) {
		return 'Screenshots need to be PNG, JPEG or WebP images.';
	}
	if (file.size > SCREENSHOT_MAX_BYTES) return 'That screenshot is over 5 MB. Try a smaller one.';
	return { contentType: file.type, data: new Uint8Array(await file.arrayBuffer()) };
}

/** Stores a project's screenshot, replacing any it had, and points the project at it */
export async function saveScreenshot(tx: Transaction, projectId: string, screenshot: Screenshot) {
	await tx
		.insert(screenshots)
		.values({ projectId, ...screenshot })
		.onConflictDoUpdate({ target: screenshots.projectId, set: { ...screenshot, createdAt: new Date() } });
	await tx
		.update(projects)
		// The version in the URL gets past caches holding the screenshot it replaced
		.set({ thumbnailUrl: `${resolve('/projects/[id]/screenshot', { id: projectId })}?v=${Date.now()}` })
		.where(eq(projects.id, projectId));
}
