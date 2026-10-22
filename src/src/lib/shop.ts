// Shared by the shop page and the server that takes its orders

/** What's for sale, with prices in BFTs */
export const SHOP_ITEMS = {
	diy_kit: {
		name: 'TRMNL DIY Kit',
		price: 300,
		description: 'A Seeed DIY TRMNL kit, for you to build your own device. You have to make your own enclosure though!'
	},
	bwry: {
		name: 'TRMNL (BWRY)',
		price: 450,
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
		price: 450,
		description: 'an OG TRMNL, straight from the factory and waiting for hackery!'
	},
	trmnl_x: {
		name: 'TRMNL X',
		price: 750,
		description: 'a backorder for the crazy TRMNL X, the TRMNL\'s overachieving older sibling with touch gestures and partial refresh. it\'s waterproof too, in case you were gonna swim with your Pokemon of the Day.'
	}
} as const;

export type ShopItemId = keyof typeof SHOP_ITEMS;

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

export function orderPrice(item: ShopItemId, addOn: AddOn | null): number {
	return SHOP_ITEMS[item].price + (addOn ? ADD_ONS[addOn].price : 0);
}
