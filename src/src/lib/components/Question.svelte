<script lang="ts">
	import type { Snippet } from 'svelte';
	import triangle from '#lib/assets/figma/triangle.svg';

	// A front page question, with its ▲ before or after the text, or none for a plain heading
	let {
		marker = 'start',
		size = 48,
		children
	}: { marker?: 'start' | 'end' | 'none'; size?: number; children: Snippet } = $props();
</script>

<h3 style:--size={size}>
	{#if marker === 'start'}<img src={triangle} alt="" />{/if}
	{@render children()}
	{#if marker === 'end'}<img src={triangle} alt="" />{/if}
</h3>

<style>
	h3 {
		display: flex;
		align-items: center;
		gap: calc(4 * var(--u));
		margin: 0;
		font: 700 calc(var(--size) * var(--u)) / normal var(--font-sans);
		color: var(--salmon);
		white-space: nowrap;
	}

	/* Figma draws the triangle in the top three quarters of a 48px square, level with the text */
	img {
		width: calc(41.569 * var(--u));
		height: auto;
		margin: 0 calc(3.216 * var(--u));
	}
</style>
