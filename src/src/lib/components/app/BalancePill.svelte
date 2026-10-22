<script lang="ts">
	import { resolve } from '$app/paths';
	import gift from '#lib/assets/figma/gift.svg';

	// The balance doubles as the way into the shop, since the design has no navigation yet. In the
	// shop itself it's just the balance.
	let { balance, link = true }: { balance: number; link?: boolean } = $props();
</script>

{#if link}
	<a href={resolve('shop')}>
		<img src={gift} alt="Shop" />
		<span class="amount">{balance}</span>
	</a>
{:else}
	<div>
		<img src={gift} alt="" />
		<span class="amount">{balance}<span class="visually-hidden">{' BFTs'}</span></span>
	</div>
{/if}

<style>
	a,
	div {
		position: relative;
		display: block;
		box-sizing: border-box;
		width: calc(486 * var(--u));
		height: calc(131 * var(--u));
		padding: calc(17 * var(--u)) calc(19 * var(--u));
		background: var(--accent-orange);
	}

	img {
		position: absolute;
		left: calc(42 * var(--u));
		top: calc(30 * var(--u));
		width: calc(58.18 * var(--u));
		height: auto;
	}

	.amount {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		background: var(--off-white);
		font: 700 calc(64 * var(--u)) / normal var(--font-sans);
		color: var(--accent-orange);
	}
</style>
