import { fail } from '@sveltejs/kit';
import { asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { orders, users } from '#lib/server/db/schema.ts';
import { decrypt } from '#lib/server/crypto.ts';
import { requireAdmin } from '#lib/server/auth/guard.ts';
import { fetchDetails, type HackClubDetails } from '#lib/server/auth/hackclub.ts';
import { cancelOrder, fulfilOrder } from '#lib/server/shop.ts';
import { slackProfileUrl } from '#lib/server/slack.ts';
import { SHOP_ITEMS, type ShopItemId } from '#lib/shop.ts';
import type { Actions, PageServerLoad } from './$types';

const LIMIT = 100;
/** Licenses arrive by email; everything else ships */
const DIGITAL: ShopItemId[] = ['byod_license'];

export const load: PageServerLoad = async (event) => {
	requireAdmin(event);
	const params = event.url.searchParams;
	const sort = params.get('sort') ?? 'date';
	const filter = params.get('filter') ?? 'pending';
	const search = params.get('q')?.trim() ?? '';

	// Searching matches the person, or an item by its name in the shop
	const items = (Object.keys(SHOP_ITEMS) as ShopItemId[]).filter((id) =>
		SHOP_ITEMS[id].name.toLowerCase().includes(search.toLowerCase())
	);
	const matching = search
		? or(
				ilike(users.name, `%${search}%`),
				ilike(users.email, `%${search}%`),
				...(items.length ? [inArray(orders.item, items)] : [])
			)
		: undefined;
	const status =
		filter === 'fulfilled' ? eq(orders.status, 'fulfilled') : filter === 'all' ? undefined : eq(orders.status, 'pending');

	const rows = await db
		.select({ order: orders, name: users.name, email: users.email, slackId: users.slackId, token: users.hackClubAccessToken })
		.from(orders)
		.innerJoin(users, eq(users.id, orders.userId))
		.where(status && matching ? sql`${status} and ${matching}` : (status ?? matching))
		.orderBy(
			...(sort === 'participant'
				? [sql`${users.name} asc nulls last`, asc(users.email)]
				: sort === 'item'
					? [asc(orders.item), desc(orders.createdAt)]
					: [desc(orders.createdAt)])
		)
		.limit(LIMIT);

	// Shipping details come from Hack Club each time rather than being kept here, once per person
	const details = new Map<string, Promise<HackClubDetails | null>>();
	function detailsFor(userId: string, token: string | null) {
		if (!details.has(userId)) {
			details.set(
				userId,
				token ? decrypt(token).then(fetchDetails).catch(() => null) : Promise.resolve(null)
			);
		}
		return details.get(userId)!;
	}

	return {
		search,
		orders: rows.map(({ order, name, email, slackId, token }) => ({
			...order,
			participant: name ?? email,
			contact: slackId ? slackProfileUrl(slackId) : `mailto:${email}`,
			digital: DIGITAL.includes(order.item),
			shipping: detailsFor(order.userId, token).then((found) => {
				const [address] = found?.addresses ?? [];
				return {
					email: found?.email ?? email,
					phone: found?.phoneNumber ?? address?.phoneNumber ?? null,
					address: address ?? null
				};
			})
		}))
	};
};

export const actions: Actions = {
	fulfil: async (event) => {
		requireAdmin(event);
		const form = await event.request.formData();
		const orderId = String(form.get('order') ?? '');
		const problem = await fulfilOrder(
			orderId,
			String(form.get('tracking') ?? ''),
			String(form.get('note') ?? '')
		);
		if (problem) return fail(400, { orderId, message: problem });
		return { orderId, done: 'Marked fulfilled.' };
	},
	cancel: async (event) => {
		const admin = requireAdmin(event);
		const form = await event.request.formData();
		const orderId = String(form.get('order') ?? '');
		const problem = await cancelOrder(orderId, admin, String(form.get('note') ?? ''));
		if (problem) return fail(400, { orderId, message: problem });
		return { orderId, done: 'Cancelled, and its BFTs refunded.' };
	}
};
