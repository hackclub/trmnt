<script lang="ts">
	import type { Snippet } from 'svelte';

	// The orange block headings: "YOU SHIP:", "WE SHIP:", "FAQ:"
	let { bold = false, children }: { bold?: boolean; children: Snippet } = $props();
</script>

<h2 class:bold>{@render children()}</h2>

<style>
	h2 {
		display: flex;
		align-items: center;
		justify-content: center;
		width: calc(384 * var(--u));
		height: calc(110 * var(--u));
		margin: 0;
		background: var(--accent-orange);
		font: 400 calc(74 * var(--u)) / normal var(--font-serif);
		color: var(--dark-gray);
		text-shadow: calc(1 * var(--u)) calc(2 * var(--u)) calc(0.6 * var(--u)) var(--off-white);
		white-space: nowrap;
	}

	.bold {
		font-weight: 700;
		text-shadow: calc(2 * var(--u)) calc(2 * var(--u)) calc(0.6 * var(--u)) var(--off-white);
	}
</style>
