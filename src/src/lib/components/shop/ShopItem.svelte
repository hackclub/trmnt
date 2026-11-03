<script lang="ts">
	import type { Snippet } from 'svelte';
	import Hatch from '#lib/components/shop/Hatch.svelte';
	import gift from '#lib/assets/figma/shop/gift-small.svg';
	import { SHOP_ITEMS, type ItemPrice, type ShopItemId } from '#lib/shop.ts';

	// One card around the shop's circle. Everything is placed from the card's top-left corner in
	// Figma, not counting the title that sits across its top edge.
	let {
		id,
		x,
		y,
		tallTitle = false,
		price,
		next,
		affordable,
		onbuy,
		children
	}: {
		id: ShopItemId;
		/** Where the card sits on the 1920 × 1080 page */
		x: number;
		y: number;
		/** For names that wrap onto two lines, like the Founder-Delivered TRMNL's */
		tallTitle?: boolean;
		/** In BFTs, with any bulk discount */
		price: number;
		/** How many more orders until the bulk discount grows, and the price then */
		next: ItemPrice['next'];
		affordable: boolean;
		onbuy: () => void;
		/** The item's picture, placed from the card's corner */
		children: Snippet;
	} = $props();

	const item = $derived(SHOP_ITEMS[id]);
</script>

<!-- Descriptions widen for longer copy, but stop short of the page's right edge -->
<div class="item" style:--x={x} style:--y={y} style:--description-max={Math.min(400, 1900 - (x + 256))}>
	<div class="card">{@render children()}</div>
	<h2 class="title" class:tall={tallTitle}>{item.name}</h2>
	<p class="price" class:wide={price >= 1000}>
		<img src={gift} alt="" />
		<span class="amount">{price}<span class="visually-hidden">{' BFTs'}</span></span>
	</p>
	<button class="buy" disabled={!affordable} aria-describedby="{id}-description" onclick={onbuy}>
		buy!
		{#if !affordable}
			<Hatch width={92} height={34} />
		{/if}
	</button>
	{#if next}
		<!-- Not in Figma: how close its batch is to TRMNL's next bulk discount -->
		<p class="next">
			{next.orders} more {next.orders === 1 ? 'order' : 'orders'} → {next.price} for everyone!
		</p>
	{/if}
	<!-- Floats off the card's lower right while it's hovered or focused -->
	<p class="description" id="{id}-description">{item.description}</p>
</div>

<style>
	.item {
		position: absolute;
		left: calc(var(--x) * var(--u));
		top: calc(var(--y) * var(--u));
		width: calc(244 * var(--u));
		height: calc(244 * var(--u));
	}

	/* Over the others, so its description isn't hidden behind them */
	.item:hover,
	.item:focus-within {
		z-index: 2;
	}

	.card,
	.title,
	.price,
	.buy,
	.description {
		position: absolute;
		box-sizing: border-box;
		margin: 0;
	}

	.card {
		inset: 0;
		background: var(--off-white);
	}

	/* The frame is drawn over the picture, as Figma's inside stroke is, so pictures are placed from
	   the card's outer corner */
	.card::after {
		content: '';
		position: absolute;
		inset: 0;
		border: calc(4 * var(--u)) solid var(--salmon);
		pointer-events: none;
	}

	.title,
	.price,
	.description {
		border: calc(4 * var(--u)) solid var(--accent-orange);
		background: var(--off-white);
		font: 400 calc(24 * var(--u)) / normal var(--font-serif);
		color: var(--accent-orange);
	}

	.title,
	.description {
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
	}

	.title {
		left: calc(14 * var(--u));
		top: calc(-24 * var(--u));
		width: calc(216 * var(--u));
		height: calc(47 * var(--u));
		white-space: nowrap;
	}

	.title.tall {
		left: calc(7 * var(--u));
		top: calc(-33 * var(--u));
		width: calc(230 * var(--u));
		height: calc(75 * var(--u));
		white-space: normal;
	}

	.price {
		left: calc(11 * var(--u));
		top: calc(224 * var(--u));
		width: calc(94 * var(--u));
		height: calc(40 * var(--u));
		display: flex;
		align-items: center;
		justify-content: flex-end;
	}

	/* Figma ends three digits at the border's inner edge, and lets four run across it */
	.price.wide .amount {
		margin-right: calc(-4 * var(--u));
	}

	.price img {
		position: absolute;
		left: 0;
		top: 0;
		width: calc(28.0245 * var(--u));
		height: auto;
	}

	.buy {
		left: calc(138 * var(--u));
		top: calc(227 * var(--u));
		width: calc(92 * var(--u));
		height: calc(34 * var(--u));
		padding: 0;
		border: none;
		background: var(--accent-orange);
		font: 400 calc(24 * var(--u)) / normal var(--font-sans);
		color: white;
		cursor: pointer;
	}

	.buy:disabled {
		cursor: not-allowed;
	}

	/* One line, centred under the card and a little wider than it, since the X's card sits close
	   to the bottom of the page */
	.next {
		position: absolute;
		left: calc(-50 * var(--u));
		top: calc(270 * var(--u));
		width: calc(344 * var(--u));
		margin: 0;
		font: italic 400 calc(18 * var(--u)) / normal var(--font-sans);
		color: var(--salmon);
		text-align: center;
		white-space: nowrap;
	}

	/* Figma's box is 246 × 152; longer descriptions grow it, wider first and then taller */
	.description {
		left: calc(256 * var(--u));
		top: calc(40 * var(--u));
		width: max-content;
		min-width: calc(246 * var(--u));
		max-width: calc(var(--description-max) * var(--u));
		min-height: calc(152 * var(--u));
		padding: calc(12 * var(--u)) calc(16 * var(--u));
		visibility: hidden;
		/* Some cover a neighbouring card, which the pointer should reach through them */
		pointer-events: none;
	}

	.item:hover .description,
	.item:focus-within .description {
		visibility: visible;
	}
</style>
