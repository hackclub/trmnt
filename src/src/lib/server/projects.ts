import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { projects, users } from '#lib/server/db/schema.ts';
import { decrypt } from '#lib/server/crypto.ts';
import { fetchNewProjectNames } from '#lib/server/hackatime.ts';

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
