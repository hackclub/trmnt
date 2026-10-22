import { fail } from '@sveltejs/kit';
import { asc, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { dailyActivity, orders, projects, users } from '#lib/server/db/schema.ts';
import { requireAdmin } from '#lib/server/auth/guard.ts';
import { slackAvatar, slackProfileUrl } from '#lib/server/slack.ts';
import { banUser, liftBan } from '#lib/server/users.ts';
import type { SubmissionStatus } from '#lib/types.ts';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 10;

/** The last day they logged time on their projects. Qualified by hand: see Home's latestSubmission. */
const lastActive = sql<string | null>`(
	select max(activity.day)::text from daily_activity activity where activity.user_id = users.id
)`;

export const load: PageServerLoad = async (event) => {
	requireAdmin(event);
	const params = event.url.searchParams;
	const sort = params.get('sort') ?? 'joined';
	const search = params.get('q')?.trim() ?? '';
	const pageNumber = Math.max(1, Number(params.get('page')) || 1);

	const today = new Date().toISOString().slice(0, 10);
	const matching = search
		? or(
				ilike(users.name, `%${search}%`),
				ilike(users.email, `%${search}%`),
				ilike(users.slackId, `%${search}%`)
			)
		: undefined;

	const [[{ totalEver }], [{ activeToday }], [{ matches }], people] = await Promise.all([
		db.select({ totalEver: count() }).from(users),
		db.select({ activeToday: count() }).from(dailyActivity).where(eq(dailyActivity.day, today)),
		db.select({ matches: count() }).from(users).where(matching),
		db
			.select({
				id: users.id,
				name: users.name,
				email: users.email,
				slackId: users.slackId,
				trustLevel: users.hackatimeTrustLevel,
				bannedAt: users.bannedAt,
				banReason: users.banReason,
				createdAt: users.createdAt,
				lastActive
			})
			.from(users)
			.where(matching)
			.orderBy(
				...(sort === 'active'
					? [sql`${lastActive} desc nulls last`]
					: sort === 'name'
						? [sql`${users.name} asc nulls last`, asc(users.email)]
						: [desc(users.createdAt)])
			)
			.limit(PAGE_SIZE)
			.offset((pageNumber - 1) * PAGE_SIZE)
	]);

	const ids = people.map((person) => person.id);
	const [theirProjects, theirOrders] = ids.length
		? await Promise.all([
				db
					.select({
						userId: projects.userId,
						name: projects.name,
						status: sql<SubmissionStatus | null>`(
							select latest.status from submissions latest
							where latest.project_id = projects.id
							order by latest.created_at desc limit 1
						)`
					})
					.from(projects)
					.where(inArray(projects.userId, ids))
					.orderBy(desc(projects.createdAt)),
				db
					.select({
						userId: orders.userId,
						id: orders.id,
						item: orders.item,
						status: orders.status,
						createdAt: orders.createdAt
					})
					.from(orders)
					.where(inArray(orders.userId, ids))
					.orderBy(desc(orders.createdAt))
			])
		: [[], []];

	return {
		totalEver,
		activeToday,
		search,
		pageNumber,
		pages: Math.max(1, Math.ceil(matches / PAGE_SIZE)),
		people: people.map((person) => ({
			...person,
			contact: person.slackId ? slackProfileUrl(person.slackId) : `mailto:${person.email}`,
			// From Slack, so streamed rather than holding up the page
			avatar: person.slackId ? slackAvatar(person.slackId) : Promise.resolve(null),
			currentProjects: theirProjects
				.filter((project) => project.userId === person.id && project.status !== 'approved')
				.map((project) => project.name),
			approvedProjects: theirProjects
				.filter((project) => project.userId === person.id && project.status === 'approved')
				.map((project) => project.name),
			orders: theirOrders.filter((order) => order.userId === person.id)
		}))
	};
};

export const actions: Actions = {
	ban: async (event) => {
		const admin = requireAdmin(event);
		const userId = String((await event.request.formData()).get('user') ?? '');
		if (userId === admin.id) return fail(400, { userId, message: 'You can’t ban yourself.' });
		await banUser(userId, `Banned by ${admin.name ?? admin.email}`);
		return { userId, done: 'Banned. They’ve been signed out and can’t sign back in.' };
	},
	unban: async (event) => {
		requireAdmin(event);
		const userId = String((await event.request.formData()).get('user') ?? '');
		await liftBan(userId);
		return { userId, done: 'Unbanned. A red Hackatime trust level won’t ban them again.' };
	}
};
