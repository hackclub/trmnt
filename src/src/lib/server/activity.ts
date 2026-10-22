import { and, eq, isNotNull } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { dailyActivity, projects, users } from '#lib/server/db/schema.ts';
import { decrypt } from '#lib/server/crypto.ts';
import { fetchMe, fetchSeconds } from '#lib/server/hackatime.ts';
import { forgetHackatime } from '#lib/server/hours.ts';
import { banIfRedOnHackatime } from '#lib/server/users.ts';
import { PROGRAM_START } from '#lib/server/program.ts';

const DAY = 24 * 60 * 60 * 1000;
/** Hackatime requests in flight at once */
const CONCURRENCY = 5;

export interface ActivityReport {
	/** People with Hackatime connected */
	checked: number;
	/** Of those, how many have worked on their projects today (UTC) */
	activeToday: number;
	/** Whose Hackatime had stopped working, so it was dropped */
	disconnected: number;
	/** Who couldn't be checked this time, e.g. because Hackatime errored */
	failed: number;
}

/**
 * Records how long everyone with Hackatime connected worked on their linked projects today and
 * yesterday, in UTC days, which is what makes them daily active users. Yesterday is checked again
 * because editors that were offline send their time late. Also keeps each person's Hackatime ID
 * and trust level current. Meant to run on a schedule; running it again just refreshes the rows.
 */
export async function trackActivity(now = new Date()): Promise<ActivityReport> {
	const today = new Date(Math.floor(now.getTime() / DAY) * DAY);
	const days = [new Date(today.getTime() - DAY), today];

	const [people, links] = await Promise.all([
		db
			.select({ id: users.id, token: users.hackatimeAccessToken })
			.from(users)
			.where(isNotNull(users.hackatimeAccessToken)),
		db.select({ userId: projects.userId, names: projects.hackatimeProjects }).from(projects)
	]);
	const linked = new Map<string, Set<string>>();
	for (const { userId, names } of links) {
		for (const name of names) linked.set(userId, (linked.get(userId) ?? new Set()).add(name));
	}

	const report: ActivityReport = { checked: people.length, activeToday: 0, disconnected: 0, failed: 0 };
	await eachAtMost(CONCURRENCY, people, async (person) => {
		try {
			const names = [...(linked.get(person.id) ?? [])];
			const todaySeconds = await trackPerson(person.id, await decrypt(person.token!), names, days);
			if (todaySeconds === null) report.disconnected++;
			else if (todaySeconds > 0) report.activeToday++;
		} catch (err) {
			console.error(`Checking activity for user ${person.id} failed`, err);
			report.failed++;
		}
	});
	return report;
}

/** Their seconds on the last of `days`, or null when their token stopped working */
async function trackPerson(
	userId: string,
	token: string,
	names: string[],
	days: Date[]
): Promise<number | null> {
	const me = await fetchMe(token);
	if (!me) {
		await forgetHackatime(userId);
		return null;
	}
	const [user] = await db
		.update(users)
		.set({ hackatimeUserId: me.id, hackatimeTrustLevel: me.trustLevel, githubUsername: me.githubUsername })
		.where(eq(users.id, userId))
		.returning();
	// Anyone Hackatime bans is banned here too, unless an admin has let them back in
	await banIfRedOnHackatime(user, me.trustLevel);

	let seconds = 0;
	for (const day of days) {
		const end = new Date(day.getTime() + DAY);
		// Time from before the program started doesn't count
		const start = day < PROGRAM_START ? PROGRAM_START : day;
		const logged = end <= PROGRAM_START ? 0 : await fetchSeconds(token, names, start, end);
		if (logged === null) {
			await forgetHackatime(userId);
			return null;
		}
		seconds = logged;

		const row = { userId, day: day.toISOString().slice(0, 10) };
		if (seconds > 0) {
			await db
				.insert(dailyActivity)
				.values({ ...row, seconds })
				.onConflictDoUpdate({
					target: [dailyActivity.userId, dailyActivity.day],
					set: { seconds, checkedAt: new Date() }
				});
		} else {
			// Only days with work get rows, which is what activity charts count. This clears a day
			// whose time stopped counting, e.g. because a project was unlinked.
			await db
				.delete(dailyActivity)
				.where(and(eq(dailyActivity.userId, userId), eq(dailyActivity.day, row.day)));
		}
	}
	return seconds;
}

/** Runs `work` on every item, with no more than `limit` running at once */
async function eachAtMost<T>(limit: number, items: T[], work: (item: T) => Promise<void>) {
	const queue = [...items];
	await Promise.all(
		Array.from({ length: limit }, async () => {
			for (let item = queue.shift(); item !== undefined; item = queue.shift()) await work(item);
		})
	);
}
