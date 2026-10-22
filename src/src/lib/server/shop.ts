import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { ledger, orders, users } from '#lib/server/db/schema.ts';
import { getBalance } from '#lib/server/users.ts';
import { orderPrice, type AddOn, type ShopItemId } from '#lib/shop.ts';

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
