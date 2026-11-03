// Shared by the shop page and the server that takes its orders

/** What's for sale, with prices in BFTs before any bulk discount */
export const SHOP_ITEMS = {
	diy_kit: {
		name: 'TRMNL DIY Kit',
		price: 300,
		description: 'A Seeed DIY TRMNL kit, for you to build your own device. You have to make your own enclosure though!'
	},
	bwry: {
		name: 'TRMNL (BWRY)',
		price: 405,
		description: 'an OG TRMNL, but breaking the mold with a four-color screen! guac\'s favorite.'
	},
	byod_license: {
		name: 'BYOD License',
		price: 150,
		description: 'gives you a key to connect a device you own or build to TRMNL\'s infrastructure.'
	},
	founder_delivered: {
		name: 'Founder-Delivered TRMNL',
		price: 3000,
		description: 'yes, you read that right. the founder of TRMNL, Ryan Kulp, will hand-deliver a TRMNL to you.'
	},
	og: {
		name: 'TRMNL (Official)',
		price: 405,
		description: 'an OG TRMNL, straight from the factory and waiting for hackery!'
	},
	trmnl_x: {
		name: 'TRMNL X',
		price: 750,
		description: 'a backorder for the crazy TRMNL X, the TRMNL\'s overachieving older sibling with touch gestures and partial refresh. it\'s waterproof too, in case you were gonna swim with your Pokemon of the Day.'
	}
} as const;

export type ShopItemId = keyof typeof SHOP_ITEMS;

/**
 * Devices TRMNL sells cheaper by volume, with what one costs from them in dollars. Each order
 * counts toward its batch, the devices of its kind waiting to be bought from TRMNL: the OG and
 * BWRY share one, and the X has its own.
 */
const BATCHES: { items: ShopItemId[]; dollars: number }[] = [
	{ items: ['og', 'bwry'], dollars: 139 },
	{ items: ['trmnl_x'], dollars: 229 }
];

/**
 * TRMNL's volume pricing, from https://trmnl.com/b2b/pricing-sheet: dollars off each device by
 * how many are in the batch, biggest batches first. The shop takes the same share off in BFTs.
 */
const BULK_DISCOUNTS = [
	{ from: 151, off: 40 },
	{ from: 100, off: 37 },
	{ from: 51, off: 35 },
	{ from: 21, off: 30 },
	{ from: 10, off: 20 }
];

/** The items counted together with this one for a bulk discount, if it gets one */
export function batchOf(item: ShopItemId): ShopItemId[] | null {
	return BATCHES.find((batch) => batch.items.includes(item))?.items ?? null;
}

/** The next bigger bulk discount for an item once its batch has `batchSize` devices, if any */
export function nextDiscount(
	item: ShopItemId,
	batchSize: number
): { from: number; price: number } | null {
	if (!batchOf(item)) return null;
	// The smallest batch that's bigger, since they're listed biggest first
	const tier = BULK_DISCOUNTS.findLast((tier) => tier.from > batchSize);
	return tier ? { from: tier.from, price: itemPrice(item, tier.from) } : null;
}

/** What an item costs if it's ordered now, and how many more orders until it costs less */
export interface ItemPrice {
	price: number;
	next: { orders: number; price: number } | null;
}

/** An item's price when its batch has `batchSize` devices, this one included */
export function itemPrice(item: ShopItemId, batchSize: number): number {
	const { price } = SHOP_ITEMS[item];
	const batch = BATCHES.find((batch) => batch.items.includes(item));
	const off = batch && BULK_DISCOUNTS.find((tier) => batchSize >= tier.from)?.off;
	return off ? Math.round((price * (batch.dollars - off)) / batch.dollars) : price;
}

/** Extras offered while buying particular items, priced on top of the item */
export const ADD_ONS: Record<string, { price: number; items: ShopItemId[] }> = {
	/** Developer Edition features, a charging cable and a battery upgrade */
	clarity_kit: { price: 75, items: ['og', 'bwry'] },
	/** What a DIY Kit needs to use TRMNL's servers rather than a self-hosted one */
	byod_license: { price: SHOP_ITEMS.byod_license.price, items: ['diy_kit'] }
};

export type AddOn = 'clarity_kit' | 'byod_license';

export function isShopItem(value: string): value is ShopItemId {
	return value in SHOP_ITEMS;
}

/** Whether this extra can be bought with this item */
export function isAddOnFor(value: string, item: ShopItemId): value is AddOn {
	return ADD_ONS[value]?.items.includes(item) ?? false;
}

export function orderPrice(item: ShopItemId, addOn: AddOn | null, batchSize: number): number {
	return itemPrice(item, batchSize) + (addOn ? ADD_ONS[addOn].price : 0);
}
