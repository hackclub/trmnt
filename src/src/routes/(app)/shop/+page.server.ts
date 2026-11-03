import { fail } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guard.ts';
import { currentPrices, placeOrder } from '#lib/server/shop.ts';
import { isAddOnFor, isShopItem, type AddOn } from '#lib/shop.ts';
import type { Actions, PageServerLoad } from './$types';

// Bulk discounts depend on what's been ordered, so prices come from here rather than the catalog
export const load: PageServerLoad = async () => ({ prices: await currentPrices() });

export const actions: Actions = {
	buy: async (event) => {
		const user = requireUser(event);
		const form = await event.request.formData();
		const item = String(form.get('item') ?? '');
		const addOn = String(form.get('addOn') ?? '');

		if (!isShopItem(item)) return fail(400, { message: 'That isn’t in the shop.' });
		let extra: AddOn | null = null;
		if (addOn) {
			if (!isAddOnFor(addOn, item)) return fail(400, { message: 'That extra doesn’t go with this.' });
			extra = addOn;
		}

		const result = await placeOrder(user.id, item, extra);
		if (result === 'too_expensive') {
			return fail(400, { message: 'You don’t have enough BFTs for that yet.' });
		}
		return { ordered: item };
	}
};
