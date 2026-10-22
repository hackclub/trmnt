import { and, eq, isNull, lt, or } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { projects, users } from '#lib/server/db/schema.ts';
import { decrypt } from '#lib/server/crypto.ts';
import { fetchSeconds } from '#lib/server/hackatime.ts';
import { PROGRAM_START } from '#lib/server/program.ts';

/**
 * Time logged on these of a user's Hackatime projects since the program started, asked of
 * Hackatime now rather than read from the last sync. Null when Hackatime isn't connected.
 */
export async function secondsOn(userId: string, names: string[]): Promise<number | null> {
	const [user] = await db
		.select({ token: users.hackatimeAccessToken })
		.from(users)
		.where(eq(users.id, userId));
	if (!user?.token) return null;

	return fetchSeconds(await decrypt(user.token), names, PROGRAM_START);
}

/** Drops a Hackatime token that stopped working, so its owner is asked to reconnect */
export async function forgetHackatime(userId: string) {
	await db
		.update(users)
		.set({ hackatimeAccessToken: null, hackatimeSyncedAt: null })
		.where(eq(users.id, userId));
}

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

	const token = await decrypt(user.token);
	const own = await db
		.select({ id: projects.id, linked: projects.hackatimeProjects })
		.from(projects)
		.where(eq(projects.userId, userId));
	// Each project's total comes from Hackatime as one figure, so overlapping time isn't doubled
	const totals = await Promise.all(
		own.map((project) => fetchSeconds(token, project.linked, PROGRAM_START))
	);
	if (totals.includes(null)) {
		await forgetHackatime(userId);
		return false;
	}

	await db.transaction(async (tx) => {
		for (const [i, project] of own.entries()) {
			await tx.update(projects).set({ secondsLogged: totals[i]! }).where(eq(projects.id, project.id));
		}
	});
	return true;
}
