<script lang="ts">
	import { resolve } from '$app/paths';
	import mascot from '#lib/assets/figma/mascot-right.svg';

	// Not in Figma: the loading screen's look, with its lower rules moved down to fit a note.
	// y is out of a 1080px-tall frame, as on the loading screen.
	const rules = [
		{ y: 120, length: 1655, edge: 'right' },
		{ y: 219, length: 1516, edge: 'right' },
		{ y: 899, length: 1526, edge: 'left' },
		{ y: 974, length: 1715, edge: 'left' }
	];
</script>

<svelte:head>
	<title>Guides — TRMNT</title>
</svelte:head>

<main class="soon">
	<a class="back" href={resolve('ideas')}>← ideas</a>
	{#each rules as { y, length, edge }}
		<span class="rule {edge}" style:--y={y} style:--length={length}></span>
	{/each}
	<img class="mascot" src={mascot} alt="" />
	<h1 class="label" style:--y={717}>one sec!</h1>
	<p class="note" style:--y={812}>
		guac’s still working on these guides, but they should be up for you very soon :)
	</p>
</main>

<style>
	.soon {
		/* The whole window, scaling with its width like the loading screen */
		--u: calc(100vw / 1920);
		position: fixed;
		inset: 0;
		display: grid;
		place-items: center;
		background: var(--maroon);
	}

	.back {
		position: absolute;
		left: calc(48 * var(--u));
		top: calc(40 * var(--u));
		font: 400 calc(32 * var(--u)) / normal var(--font-sans);
		color: var(--salmon);
		text-decoration: underline;
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

	/* Hold still under the bobbing mascot */
	.label,
	.note {
		position: absolute;
		left: 0;
		right: 0;
		top: calc(var(--y) / 1080 * 100%);
		margin: 0;
		text-align: center;
	}

	.label {
		font: 400 calc(64 * var(--u)) / normal var(--font-serif);
		letter-spacing: calc(3.84 * var(--u));
		color: var(--salmon);
	}

	.note {
		font: italic 500 calc(36 * var(--u)) / normal var(--font-serif);
		color: var(--off-white);
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
