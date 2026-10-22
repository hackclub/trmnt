<script lang="ts">
	import { resolve } from '$app/paths';
	import diamond from '#lib/assets/figma/diamond.svg';

	// Full-width hairlines: the pair closing off the section above, then a band of five at the bottom
	const rules = [0, 15, 346, 366, 385, 405, 423];
</script>

<footer>
	{#each rules as y}
		<span class="rule" style:--y={y}></span>
	{/each}
	<!-- Shorter hairlines run into the band from alternating edges -->
	<span class="rule short left" style:--y={356}></span>
	<span class="rule short right" style:--y={414}></span>

	<p class="credit">made with love, for you, by guac.</p>

	<nav>
		<img src={diamond} alt="" />
		<a href="https://hackclub.com/privacy-and-terms" target="_blank">privacy policy and terms</a>
		<img src={diamond} alt="" />
	</nav>
</footer>

<style>
	footer {
		position: relative;
		height: calc(433 * var(--u));
	}

	/*
	 * Edge to edge of the window, margins included. Drawn as boxes, not images, so they snap to whole
	 * screen pixels and never thin out.
	 */
	.rule {
		position: absolute;
		display: block;
		left: calc(-1 * var(--gutter));
		top: calc(var(--y) * var(--u));
		width: calc(1920 * var(--u) + 2 * var(--gutter));
		height: max(1px, calc(1 * var(--u)));
		background: var(--salmon);
	}

	.rule.short {
		width: calc(635 * var(--u) + var(--gutter));
	}

	.rule.right {
		left: auto;
		right: calc(-1 * var(--gutter));
	}

	.credit {
		position: absolute;
		left: calc(618 * var(--u));
		top: calc(100 * var(--u));
		margin: 0;
		font: 400 calc(48 * var(--u)) / normal var(--font-sans);
		color: var(--salmon);
		white-space: nowrap;
	}

	/* Centred across the page rather than pinned to Figma's x, so it stays centred whatever the links say */
	nav {
		position: absolute;
		left: 0;
		right: 0;
		top: calc(198 * var(--u));
		display: flex;
		align-items: center;
		justify-content: center;
		gap: calc(33 * var(--u));
		font: 700 calc(48 * var(--u)) / normal var(--font-sans);
		color: var(--salmon);
		white-space: nowrap;
	}

	nav img {
		width: calc(48 * var(--u));
		height: auto;
	}

	nav a:hover {
		text-decoration: underline;
	}
</style>
