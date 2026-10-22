<script lang="ts">
	import { tick } from 'svelte';
	import { resolve } from '$app/paths';
	import BalancePill from '#lib/components/app/BalancePill.svelte';
	import ShopItem from '#lib/components/shop/ShopItem.svelte';
	import ShopPopup, { type Choice } from '#lib/components/shop/ShopPopup.svelte';
	import device from '#lib/assets/figma/device-leftface.webp';
	import baseplate from '#lib/assets/figma/shop/baseplate.svg';
	import byodLicense from '#lib/assets/figma/shop/byod-license.webp';
	import diyKit from '#lib/assets/figma/shop/diy-kit.webp';
	import founder from '#lib/assets/figma/shop/founder.webp';
	import hand from '#lib/assets/figma/shop/hand.webp';
	import ogTrmnl from '#lib/assets/figma/shop/og-trmnl.webp';
	import trmnlX from '#lib/assets/figma/shop/trmnl-x.webp';
	import { ADD_ONS, orderPrice, SHOP_ITEMS, type ShopItemId } from '#lib/shop.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	/** Where each card sits on the 1920 × 1080 page, by its top-left corner in Figma */
	const CARDS: { id: ShopItemId; x: number; y: number; tallTitle?: boolean }[] = [
		{ id: 'diy_kit', x: 352, y: 264 },
		{ id: 'bwry', x: 666, y: 39 },
		{ id: 'byod_license', x: 1079, y: 61 },
		{ id: 'founder_delivered', x: 1361, y: 363, tallTitle: true },
		{ id: 'og', x: 449, y: 716 },
		{ id: 'trmnl_x', x: 1160, y: 787 }
	];

	/** The thin lines between the cards: where each starts, how long it is and which way it runs */
	const LINES = [
		{ x: 593, y: 306, length: 530.21, angle: 32.13 },
		{ x: 593, y: 315, length: 434.18, angle: 32.3 },
		{ x: 593, y: 329, length: 371, angle: 31.89 },
		{ x: 693, y: 739, length: 392.24, angle: -36.08 },
		{ x: 1168, y: 787, length: 422.48, angle: -130.97 },
		{ x: 1179, y: 787, length: 422.48, angle: -130.97 }
	];

	let popup: ShopPopup;
	let buying = $state<ShopItemId>('og');
	const offer = $derived(offerFor(buying, data.user.balance));

	async function buy(id: ShopItemId) {
		buying = id;
		await tick();
		popup.show();
	}

	/** What "buy!" asks before ordering. Positions are Figma pixels from the popup's corner. */
	function offerFor(id: ShopItemId, balance: number) {
		const affords = (addOn: 'clarity_kit' | 'byod_license') => balance >= orderPrice(id, addOn);

		if (id === 'og' || id === 'bwry') {
			return {
				message:
					'wanna upgrade to the Clarity Kit? comes with the Developer Edition features (oooh expanded API access), a charging cable, and a battery upgrade!',
				height: 875,
				messageTop: 75.93,
				messageHeight: 433.24,
				tag: { amount: `+${ADD_ONS.clarity_kit.price}`, y: 627, tall: false },
				choices: [
					{ label: 'yep!', x: 633, y: 559, width: 324.71, height: 120, addOn: 'clarity_kit', affordable: affords('clarity_kit') },
					{ label: 'no thanks', x: 803, y: 710, width: 324.71, height: 120, addOn: '' }
				] satisfies Choice[]
			};
		}

		if (id === 'diy_kit') {
			return {
				message:
					'hey! just so you know, you’re gonna need a Developer License to do anything with this unless you’re planning on self-hosting a server as well.',
				height: 1034,
				messageTop: 89.73,
				messageHeight: 511.97,
				tag: { amount: `+${ADD_ONS.byod_license.price}`, y: 740.93, tall: true },
				choices: [
					{ label: 'okay, i’ll buy one!', x: 581, y: 639, width: 391, height: 98, addOn: 'byod_license', affordable: affords('byod_license') },
					{ label: 'i’ll self-host!', x: 759, y: 766, width: 391, height: 98, addOn: '' },
					{ label: 'aw man, nevermind', x: 616, y: 893, width: 382.71, height: 104.81, size: 40 }
				] satisfies Choice[]
			};
		}

		// Not in Figma: a stand-in on the Clarity Kit popup's layout until the confirm step is designed
		const { name, price } = SHOP_ITEMS[id];
		return {
			message: `buy the ${name} for ${price} BFTs?`,
			height: 875,
			messageTop: 75.93,
			messageHeight: 433.24,
			choices: [
				{ label: 'yep!', x: 633, y: 559, width: 324.71, height: 120, addOn: '' },
				{ label: 'no thanks', x: 803, y: 710, width: 324.71, height: 120 }
			] satisfies Choice[]
		};
	}
</script>

<svelte:head>
	<title>Shop — TRMNT</title>
</svelte:head>

<!-- Each item's picture, placed from its card's top-left corner -->
{#snippet picture(id: ShopItemId)}
	{#if id === 'diy_kit'}
		<img class="art" src={diyKit} alt="" style:--x={24} style:--y={53} style:--w={195} style:--h={146} />
	{:else if id === 'bwry'}
		<img class="art" src={device} alt="" style:--x={26} style:--y={53} style:--w={191} style:--h={146} />
	{:else if id === 'byod_license'}
		<div class="crop" style:--x={8} style:--y={50} style:--w={228} style:--h={143.54}>
			<img src={byodLicense} alt="" style:--left="-34.16%" style:--top="-25.39%" style:--iw="168.48%" style:--ih="150.53%" />
			<span class="redaction" style:--y={45.53}>KILLPEOPLE</span>
			<span class="redaction" style:--y={54.22}>JENNIFER</span>
		</div>
	{:else if id === 'founder_delivered'}
		<img class="art" src={founder} alt="" style:--x={14} style:--y={50} style:--w={108} style:--h={162} />
		<img class="art" src={hand} alt="" style:--x={68} style:--y={134} style:--w={148} style:--h={90} />
		<img class="art" src={device} alt="" style:--x={88} style:--y={81} style:--w={139} style:--h={106} />
	{:else if id === 'og'}
		<div class="crop" style:--x={28} style:--y={40} style:--w={187} style:--h={163}>
			<img src={ogTrmnl} alt="" style:--left="-32.87%" style:--top="-43.7%" style:--iw="167.13%" style:--ih="191.39%" />
		</div>
	{:else if id === 'trmnl_x'}
		<img class="art" src={trmnlX} alt="" style:--x={19} style:--y={32} style:--w={206} style:--h={180} />
	{/if}
{/snippet}

<main class="shop">
	<h1 class="visually-hidden">Shop</h1>

	<!-- Not in Figma: the design has no way back yet -->
	<a class="home" href={resolve('home')}>← home</a>

	<img class="baseplate" src={baseplate} alt="" />
	{#each LINES as line, i (i)}
		<span
			class="line"
			style:--x={line.x}
			style:--y={line.y}
			style:--length={line.length}
			style:--angle="{line.angle}deg"
		></span>
	{/each}

	{#each CARDS as card (card.id)}
		<ShopItem
			{...card}
			affordable={data.user.balance >= SHOP_ITEMS[card.id].price}
			onbuy={() => buy(card.id)}
		>
			{@render picture(card.id)}
		</ShopItem>
	{/each}

	<div class="balance">
		<BalancePill balance={data.user.balance} link={false} />
	</div>
	<p class="available">BFTs available</p>

	{#if form}
		<!-- Not in Figma: how an order went -->
		<p class="outcome" role="status">
			{'ordered' in form && form.ordered
				? `ordered the ${SHOP_ITEMS[form.ordered].name}!`
				: form.message}
		</p>
	{/if}
</main>

<ShopPopup bind:this={popup} item={buying} {...offer} />

<style>
	/* The shop is one 1080px-tall screen, so it fills the window's height rather than the 1470px
	   the other pages fit */
	:global(.artboard:has(> .shop)) {
		--u: min(100cqw / 1920, 100svh / 1080);
	}

	.shop {
		position: relative;
		height: calc(1080 * var(--u));
	}

	.home,
	.baseplate,
	.line,
	.balance,
	.available,
	.outcome,
	.art,
	.crop,
	.redaction {
		position: absolute;
		margin: 0;
	}

	.home {
		left: calc(48 * var(--u));
		top: calc(40 * var(--u));
		font: 400 calc(32 * var(--u)) / normal var(--font-sans);
		color: var(--salmon);
		text-decoration: underline;
	}

	.baseplate {
		left: calc(450 * var(--u));
		top: calc(37 * var(--u));
		width: calc(1020 * var(--u));
		height: auto;
	}

	/* Boxes rather than images, drawn above where they start and turned about that point as
	   Figma turns its lines */
	.line {
		left: calc(var(--x) * var(--u));
		top: calc(var(--y) * var(--u) - max(1px, calc(3 * var(--u))));
		width: calc(var(--length) * var(--u));
		height: max(1px, calc(3 * var(--u)));
		background: var(--salmon);
		transform-origin: 0 100%;
		rotate: var(--angle);
	}

	.balance {
		left: calc(1404 * var(--u));
		top: calc(37 * var(--u));
	}

	.available,
	.outcome {
		text-align: center;
		color: var(--salmon);
	}

	.available {
		left: calc(1552 * var(--u));
		top: calc(168 * var(--u));
		width: calc(338 * var(--u));
		font: italic 400 calc(48 * var(--u)) / normal var(--font-sans);
	}

	.outcome {
		left: calc(1404 * var(--u));
		top: calc(250 * var(--u));
		width: calc(486 * var(--u));
		font: italic 400 calc(32 * var(--u)) / normal var(--font-sans);
	}

	.art,
	.crop {
		left: calc(var(--x) * var(--u));
		top: calc(var(--y) * var(--u));
		width: calc(var(--w) * var(--u));
		height: calc(var(--h) * var(--u));
	}

	.art {
		object-fit: cover;
	}

	.crop {
		overflow: hidden;
	}

	.crop img {
		position: absolute;
		left: var(--left);
		top: var(--top);
		width: var(--iw);
		height: var(--ih);
		max-width: none;
	}

	/* Grey boxes over the sample license's name */
	.redaction {
		left: calc(73.68 * var(--u));
		top: calc(var(--y) * var(--u));
		display: flex;
		align-items: center;
		justify-content: center;
		width: calc(40.32 * var(--u));
		height: calc(6.6 * var(--u));
		background: #d9d9d9;
		font: 700 calc(6 * var(--u)) / normal var(--font-sans);
		color: black;
		white-space: nowrap;
	}
</style>
