<script lang="ts">
	import type { Snippet } from 'svelte';
	import diamond from '#lib/assets/figma/diamond.svg';

	// A heading set between two diamonds: "◆ your projects ◆"
	let { level = 2, children }: { level?: 1 | 2; children: Snippet } = $props();
</script>

<svelte:element this={`h${level}`} class="section-heading">
	<img src={diamond} alt="" />
	{@render children()}
	<img src={diamond} alt="" />
</svelte:element>

<style>
	.section-heading {
		display: flex;
		align-items: flex-start;
		gap: calc(12 * var(--u));
		margin: 0;
		font: 700 calc(48 * var(--u)) / normal var(--font-sans);
		color: var(--salmon);
		white-space: nowrap;
	}

	/* Sits a little low, level with the lowercase letters */
	img {
		width: calc(48 * var(--u));
		height: auto;
		margin-top: calc(10 * var(--u));
	}
</style>
