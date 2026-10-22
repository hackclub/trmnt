<script lang="ts">
	import mascot from '#lib/assets/figma/mascot-right.svg';

	// Hairlines that grow in from the screen's edges. y is out of the Loading Screen frame's 1080px height.
	const rules = [
		{ y: 120, length: 1655, edge: 'right' },
		{ y: 219, length: 1516, edge: 'right' },
		{ y: 824, length: 1526, edge: 'left' },
		{ y: 899, length: 1715, edge: 'left' }
	];
</script>

<div class="loading" role="status">
	{#each rules as { y, length, edge }}
		<span class="rule {edge}" style:--y={y} style:--length={length}></span>
	{/each}
	<img class="mascot" src={mascot} alt="" />
	<p class="label" style:--y={717}>loading...</p>
</div>

<style>
	.loading {
		/* Its own full-window 16:9 frame, so it scales with the window's width like the frame in Figma */
		--u: calc(100vw / 1920);
		position: fixed;
		inset: 0;
		z-index: 10;
		display: grid;
		place-items: center;
		background: var(--maroon);
		/* Quick navigations finish before this shows, so it doesn't flash */
		animation: fade-in 200ms 150ms both;
	}

	.rule {
		position: absolute;
		top: calc(var(--y) / 1080 * 100%);
		width: calc(var(--length) * var(--u));
		/* Drawn as a box, not an image, so it snaps to whole screen pixels and never thins out */
		height: max(1px, calc(1 * var(--u)));
		background: white;
		animation: grow 2s linear infinite;
	}

	.rule.left {
		left: 0;
		transform-origin: left;
	}

	.rule.right {
		right: 0;
		transform-origin: right;
	}

	.mascot {
		width: calc(265.355 * var(--u));
		height: auto;
		animation: bob 2s infinite;
	}

	/* Holds still under the bobbing mascot */
	.label {
		position: absolute;
		left: 0;
		right: 0;
		top: calc(var(--y) / 1080 * 100%);
		margin: 0;
		font: 400 calc(64 * var(--u)) / normal var(--font-serif);
		letter-spacing: calc(3.84 * var(--u));
		color: var(--salmon);
		text-align: center;
	}

	@keyframes fade-in {
		from {
			opacity: 0;
		}
	}

	@keyframes grow {
		from {
			transform: scaleX(0);
		}
	}

	/* Figma eases the hop up and falls back linearly */
	@keyframes bob {
		0% {
			transform: translateY(0);
			animation-timing-function: cubic-bezier(0.5, 0, 0.5, 1);
		}
		49.82% {
			transform: translateY(calc(-134.245 * var(--u)));
			animation-timing-function: linear;
		}
		100% {
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.rule,
		.mascot {
			animation: none;
		}
	}
</style>
