<script lang="ts">
	import type { Snippet } from 'svelte';

	// The admin panel's grey cards, framed in salmon, with a title on a rule across the top. The
	// rule starts with a fixed run, and `title` can break it again with `.break` spans.
	let {
		title,
		children
	}: {
		/** Sits on the rule, after its first 305px run */
		title: Snippet;
		children: Snippet;
	} = $props();
</script>

<article class="card">
	<h2 class="title">
		<span class="rule lead"></span>
		{@render title()}
		<span class="rule rest"></span>
	</h2>
	{@render children()}
</article>

<style>
	.card {
		position: relative;
		box-sizing: border-box;
		width: calc(1488 * var(--u));
		margin: 0 auto;
		padding: calc(18 * var(--u)) calc(38 * var(--u)) calc(56 * var(--u));
		background: #dddcdc;
		box-shadow: inset 0 0 0 calc(18 * var(--u)) var(--salmon);
	}

	.title {
		display: flex;
		align-items: center;
		gap: calc(16 * var(--u));
		margin: 0;
		font: 400 calc(40 * var(--u)) / normal var(--font-serif);
		color: var(--dark-gray);
		white-space: nowrap;
	}

	/* Boxes rather than images, so they snap to whole screen pixels and never thin out */
	.title :global(.rule) {
		height: max(1px, calc(1 * var(--u)));
		background: var(--accent-orange);
	}

	.lead {
		flex: none;
		width: calc(289 * var(--u));
	}

	.rest {
		flex: 1;
	}
</style>
