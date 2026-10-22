import device from '#lib/assets/figma/device-leftface.webp';
import byodLicense from '#lib/assets/figma/shop/byod-license.webp';
import diyKit from '#lib/assets/figma/shop/diy-kit.webp';
import ogTrmnl from '#lib/assets/figma/shop/og-trmnl.webp';
import trmnlX from '#lib/assets/figma/shop/trmnl-x.webp';
import type { ShopItemId } from '#lib/shop.ts';

/** One picture per shop item, for showing an order */
export const ITEM_PICTURES: Record<ShopItemId, string> = {
	diy_kit: diyKit,
	bwry: device,
	byod_license: byodLicense,
	founder_delivered: device,
	og: ogTrmnl,
	trmnl_x: trmnlX
};
