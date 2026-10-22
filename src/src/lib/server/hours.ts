import { and, eq, isNull, lt, or } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { projects, users } from '#lib/server/db/schema.ts';
import { decrypt } from '#lib/server/crypto.ts';
import { fetchProjects } from '#lib/server/hackatime.ts';

/** How stale a user's hours can get before viewing them asks Hackatime again */
const SYNC_EVERY = 5 * 60 * 1000;

/**
 * Brings the hours on a user's projects up to date from Hackatime, unless that happened in the
 * last few minutes. A token that stopped working is dropped, so they're asked to reconnect.
 * Returns whether Hackatime is still connected afterwards.
 */
export async function syncHours(userId: string): Promise<boolean> {
	const syncedBefore = new Date(Date.now() - SYNC_EVERY);
	// Claiming the sync up front stops two page loads from both calling Hackatime
	const [user] = await db
		.update(users)
		.set({ hackatimeSyncedAt: new Date() })
		.where(
			and(
				eq(users.id, userId),
				or(isNull(users.hackatimeSyncedAt), lt(users.hackatimeSyncedAt, syncedBefore))
			)
		)
		.returning({ token: users.hackatimeAccessToken });
	// Synced recently enough, so nothing to learn
	if (!user) return true;
	if (!user.token) return false;

	const hackatimeProjects = await fetchProjects(await decrypt(user.token));
	if (!hackatimeProjects) {
		await db
			.update(users)
			.set({ hackatimeAccessToken: null, hackatimeSyncedAt: null })
			.where(eq(users.id, userId));
		return false;
	}

	const secondsByName = new Map(hackatimeProjects.map((project) => [project.name, project.seconds]));
	const own = await db
		.select({ id: projects.id, linked: projects.hackatimeProjects })
		.from(projects)
		.where(eq(projects.userId, userId));

	await db.transaction(async (tx) => {
		for (const project of own) {
			const secondsLogged = project.linked.reduce(
				(total, name) => total + (secondsByName.get(name) ?? 0),
				0
			);
			await tx.update(projects).set({ secondsLogged }).where(eq(projects.id, project.id));
		}
	});
	return true;
}
