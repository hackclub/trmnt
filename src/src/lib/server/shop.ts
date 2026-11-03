import { and, count, eq, inArray, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { ledger, orders, users } from '#lib/server/db/schema.ts';
import { sendSlackDm } from '#lib/server/slack.ts';
import { getBalance, type SessionUser } from '#lib/server/users.ts';
import {
	batchOf,
	itemPrice,
	nextDiscount,
	orderPrice,
	SHOP_ITEMS,
	type AddOn,
	type ItemPrice,
	type ShopItemId
} from '#lib/shop.ts';

/** What each item costs if it's ordered now, counting it into its batch */
export async function currentPrices(): Promise<Record<ShopItemId, ItemPrice>> {
	const pending = await db
		.select({ item: orders.item, count: count() })
		.from(orders)
		.where(eq(orders.status, 'pending'))
		.groupBy(orders.item);
	const ids = Object.keys(SHOP_ITEMS) as ShopItemId[];
	return Object.fromEntries(
		ids.map((id) => {
			const batch = batchOf(id) ?? [];
			const waiting = pending
				.filter((row) => batch.includes(row.item))
				.reduce((sum, row) => sum + row.count, 0);
			const next = nextDiscount(id, waiting + 1);
			const price: ItemPrice = {
				price: itemPrice(id, waiting + 1),
				next: next && { orders: next.from - waiting, price: next.price }
			};
			return [id, price];
		})
	) as Record<ShopItemId, ItemPrice>;
}

/**
 * Records the order and spends its BFTs together, or does neither when the balance won't cover
 * it. Shipping details aren't kept: they're read from Hack Club when the order is fulfilled.
 *
 * An order that takes its batch to a bigger bulk discount lowers the price for every other order
 * waiting in it, and each is refunded what it paid over, with a Slack DM to say so.
 */
export async function placeOrder(
	userId: string,
	item: ShopItemId,
	addOn: AddOn | null
): Promise<'ordered' | 'too_expensive'> {
	const batch = batchOf(item);

	const refunds = await db.transaction(async (tx) => {
		// Holds this user's row until the order commits, so two at once can't spend the same BFTs
		await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update');
		// Holds the batch the same way, so orders placed at once count each other
		if (batch) await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`shop batch ${batch}`}))`);
		const waiting = batch
			? await tx
					.select()
					.from(orders)
					.where(and(eq(orders.status, 'pending'), inArray(orders.item, batch)))
					.for('update')
			: [];

		const batchSize = waiting.length + 1;
		const price = orderPrice(item, addOn, batchSize);
		if ((await getBalance(userId, tx)) < price) return 'too_expensive';

		const [order] = await tx
			.insert(orders)
			.values({ userId, item, addOn, price })
			.returning({ id: orders.id });
		await tx
			.insert(ledger)
			.values({ userId, amount: -price, reason: 'shop_order', orderId: order.id });

		const refunded = [];
		for (const other of waiting) {
			const lowered = orderPrice(other.item, other.addOn, batchSize);
			if (other.price <= lowered) continue;
			await tx.update(orders).set({ price: lowered }).where(eq(orders.id, other.id));
			await tx.insert(ledger).values({
				userId: other.userId,
				amount: other.price - lowered,
				reason: 'bulk_discount',
				orderId: other.id
			});
			refunded.push({ ...other, lowered });
		}
		return refunded;
	});
	if (refunds === 'too_expensive') return refunds;
	// Not waited on, since a big batch is a lot of messages to hold up the order for
	if (refunds.length > 0) void tellRefunded(refunds);
	return 'ordered';
}

/** Messages everyone a bulk discount refunded on Slack */
async function tellRefunded(refunds: { userId: string; item: ShopItemId; price: number; lowered: number }[]) {
	const owners = await db
		.select({ id: users.id, slackId: users.slackId })
		.from(users)
		.where(inArray(users.id, refunds.map((order) => order.userId)));
	for (const order of refunds) {
		const slackId = owners.find((owner) => owner.id === order.userId)?.slackId;
		if (!slackId) continue;
		await sendSlackDm(
			slackId,
			`Enough people ordered with you that your TRMNT order for the ${SHOP_ITEMS[order.item].name} dropped to ${order.lowered} BFTs, so ${order.price - order.lowered} BFTs are back in your balance.`
		);
	}
}

/** An order that's still pending, with who placed it */
async function pendingOrder(orderId: string) {
	const [row] = await db
		.select({ order: orders, slackId: users.slackId })
		.from(orders)
		.innerJoin(users, eq(users.id, orders.userId))
		.where(and(eq(orders.id, orderId), eq(orders.status, 'pending')));
	return row;
}

/** Marks an order sent, and tells the person on Slack. Returns a problem, or null once done. */
export async function fulfilOrder(
	orderId: string,
	trackingNumber: string,
	note: string
): Promise<string | null> {
	const row = await pendingOrder(orderId);
	if (!row) return 'That order isn’t waiting to be fulfilled.';

	await db
		.update(orders)
		.set({
			status: 'fulfilled',
			fulfilledAt: new Date(),
			trackingNumber: trackingNumber.trim() || null,
			note: note.trim() || null
		})
		.where(eq(orders.id, orderId));

	if (row.slackId) {
		const lines = [
			`Your ${SHOP_ITEMS[row.order.item].name} from TRMNT is on its way!`,
			trackingNumber.trim() && `Tracking number: ${trackingNumber.trim()}`,
			note.trim()
		];
		await sendSlackDm(row.slackId, lines.filter(Boolean).join('\n'));
	}
	return null;
}

/**
 * Cancels an order and gives its BFTs back, telling the person on Slack. Returns a problem, or
 * null once done.
 */
export async function cancelOrder(
	orderId: string,
	admin: SessionUser,
	note: string
): Promise<string | null> {
	const row = await pendingOrder(orderId);
	if (!row) return 'Only pending orders can be cancelled.';

	const refund = await db.transaction(async (tx) => {
		// Read again under a lock: a bulk discount may have lowered its price since, and refunding
		// what it cost before would give back more than was paid
		const [order] = await tx
			.select({ price: orders.price })
			.from(orders)
			.where(and(eq(orders.id, orderId), eq(orders.status, 'pending')))
			.for('update');
		if (!order) return null;

		await tx
			.update(orders)
			.set({ status: 'cancelled', cancelledAt: new Date(), note: note.trim() || null })
			.where(eq(orders.id, orderId));
		await tx.insert(ledger).values({
			userId: row.order.userId,
			amount: order.price,
			reason: 'shop_refund',
			orderId,
			createdById: admin.id
		});
		return order.price;
	});
	if (refund === null) return 'Only pending orders can be cancelled.';

	if (row.slackId) {
		const lines = [
			`Your TRMNT order for the ${SHOP_ITEMS[row.order.item].name} was cancelled, and its ${refund} BFTs are back in your balance.`,
			note.trim()
		];
		await sendSlackDm(row.slackId, lines.filter(Boolean).join('\n'));
	}
	return null;
}
