<script lang="ts">
	// Crosses out a button that can't be used yet, the way Figma draws an unaffordable "buy!": a
	// 10px grid of thin lines that starts just inside its left edge and overhangs the others.
	// Sizes are the button's, in Figma pixels.
	let { width, height }: { width: number; height: number } = $props();

	const columns = $derived(
		Array.from({ length: Math.floor((width - 12) / 10) + 1 }, (_, i) => 4 + i * 10)
	);
	const rows = $derived(Array.from({ length: Math.ceil((height - 8) / 10) }, (_, i) => 8 + i * 10));
</script>

<span class="hatch" aria-hidden="true" style:--width={width} style:--height={height}>
	{#each columns as x (x)}
		<span class="column" style:--x={x}></span>
	{/each}
	{#each rows as y (y)}
		<span class="row" style:--y={y}></span>
	{/each}
</span>

<style>
	.hatch {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	/* Boxes rather than an image, so they snap to whole screen pixels and never thin out */
	.column,
	.row {
		position: absolute;
		background: var(--salmon);
	}

	.column {
		left: calc(var(--x) * var(--u));
		top: calc(-2 * var(--u));
		width: max(1px, calc(1 * var(--u)));
		height: calc((var(--height) + 6) * var(--u));
	}

	.row {
		left: calc(-3 * var(--u));
		top: calc(var(--y) * var(--u));
		width: calc((var(--width) + 7) * var(--u));
		height: max(1px, calc(1 * var(--u)));
	}
</style>
