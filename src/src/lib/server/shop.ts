import { and, eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { ledger, orders, users } from '#lib/server/db/schema.ts';
import { sendSlackDm } from '#lib/server/slack.ts';
import { getBalance, type SessionUser } from '#lib/server/users.ts';
import { orderPrice, SHOP_ITEMS, type AddOn, type ShopItemId } from '#lib/shop.ts';

/**
 * Records the order and spends its BFTs together, or does neither when the balance won't cover
 * it. Shipping details aren't kept: they're read from Hack Club when the order is fulfilled.
 */
export async function placeOrder(
	userId: string,
	item: ShopItemId,
	addOn: AddOn | null
): Promise<'ordered' | 'too_expensive'> {
	const price = orderPrice(item, addOn);

	return db.transaction(async (tx) => {
		// Holds this user's row until the order commits, so two at once can't spend the same BFTs
		await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update');
		if ((await getBalance(userId, tx)) < price) return 'too_expensive';

		const [order] = await tx
			.insert(orders)
			.values({ userId, item, addOn, price })
			.returning({ id: orders.id });
		await tx
			.insert(ledger)
			.values({ userId, amount: -price, reason: 'shop_order', orderId: order.id });
		return 'ordered';
	});
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

	await db.transaction(async (tx) => {
		await tx
			.update(orders)
			.set({ status: 'cancelled', cancelledAt: new Date(), note: note.trim() || null })
			.where(eq(orders.id, orderId));
		await tx.insert(ledger).values({
			userId: row.order.userId,
			amount: row.order.price,
			reason: 'shop_refund',
			orderId,
			createdById: admin.id
		});
	});

	if (row.slackId) {
		const lines = [
			`Your TRMNT order for the ${SHOP_ITEMS[row.order.item].name} was cancelled, and its ${row.order.price} BFTs are back in your balance.`,
			note.trim()
		];
		await sendSlackDm(row.slackId, lines.filter(Boolean).join('\n'));
	}
	return null;
}
