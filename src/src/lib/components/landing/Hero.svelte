<script lang="ts">
	import { resolve } from '$app/paths';
	import Label from '#lib/components/Label.svelte';
	// 2x the size it's shown at, as WebP: the 7 MB export from Figma was too heavy to serve
	import device from '#lib/assets/figma/device-leftface.webp';

	// Hairlines across the GET STARTED button's face, two from each end: [x, y, length]
	const buttonRules = [
		[0, 7, 174],
		[0, 11, 80],
		[426, 99, 98],
		[314, 103, 210]
	];
</script>

<section class="hero">
	<div class="you-ship"><Label>YOU SHIP:</Label></div>
	<!-- The span keeps the lines in one flex item, so the box can centre them vertically -->
	<p class="pitch">
		<span>
			A project for the TRMNL ecosystem.<br />
			A TRMNL is an e-paper display that you can set up to fetch or display anything you want.<br />
			You could write a user-facing plugin,<br />
			a self-hosted server in your favorite language, or even custom device firmware!
		</span>
	</p>

	<div class="we-ship"><Label>WE SHIP:</Label></div>
	<p class="prizes">licenses, devices, and swag! for free!</p>

	<a class="get-started" href={resolve('home')}>
		<span class="frame">
			<span class="face">
				{#each buttonRules as [x, y, length]}
					<span class="line" style:--x={x} style:--y={y} style:--length={length}></span>
				{/each}
				GET STARTED
			</span>
		</span>
	</a>

	<img
		class="device"
		src={device}
		alt="A TRMNL e-ink display showing a dog lying on a wooden floor"
	/>
	<p class="caption">^ the author's TRMNL. the dog is not an available prize.</p>
</section>

<style>
	.hero {
		position: relative;
		height: calc(949 * var(--u));
	}

	.you-ship,
	.we-ship {
		position: absolute;
		left: calc(19 * var(--u));
	}

	.you-ship {
		top: 0;
	}

	.we-ship {
		top: calc(471 * var(--u));
	}

	p {
		position: absolute;
		margin: 0;
		text-align: center;
		/* Figma's 111.165% line height is relative to Lora's own 1.28, not the font size */
		--serif-leading: calc(1.28 * 1.11165);
	}

	.pitch {
		left: calc(61 * var(--u));
		top: calc(150 * var(--u));
		display: flex;
		align-items: center;
		justify-content: center;
		width: calc(710 * var(--u));
		height: calc(281 * var(--u));
		background: var(--accent-orange);
		font: 400 calc(32 * var(--u)) / var(--serif-leading) var(--font-serif);
		color: var(--off-white);
	}

	.prizes {
		left: calc(94 * var(--u));
		top: calc(602 * var(--u));
		width: calc(663 * var(--u));
		font: 400 calc(48 * var(--u)) / var(--serif-leading) var(--font-serif);
		color: var(--off-white);
		/* The first shadow paints on top */
		text-shadow:
			calc(1 * var(--u)) calc(1 * var(--u)) 0 var(--salmon),
			calc(2 * var(--u)) calc(2 * var(--u)) 0 var(--accent-orange);
	}

	/* Three stacked slabs, each offset from the last: gray, salmon, then the orange face */
	.get-started {
		position: absolute;
		left: calc(133 * var(--u));
		top: calc(758 * var(--u));
		width: calc(584 * var(--u));
		height: calc(160 * var(--u));
		background: var(--light-gray);
	}

	.frame {
		position: absolute;
		left: calc(14 * var(--u));
		top: calc(13 * var(--u));
		width: calc(553 * var(--u));
		height: calc(134 * var(--u));
		background: var(--salmon);
	}

	.face {
		position: absolute;
		left: calc(16 * var(--u));
		top: calc(12 * var(--u));
		display: flex;
		align-items: center;
		justify-content: center;
		width: calc(524 * var(--u));
		height: calc(110 * var(--u));
		background: var(--accent-orange);
		font: 400 calc(74 * var(--u)) / normal var(--font-serif);
		color: var(--dark-gray);
		text-shadow: calc(2 * var(--u)) calc(2 * var(--u)) calc(0.6 * var(--u)) var(--off-white);
		white-space: nowrap;
	}

	/* Hairlines drawn as boxes, not images, so they snap to whole screen pixels and never thin out */
	.face .line {
		position: absolute;
		left: calc(var(--x) * var(--u));
		top: calc(var(--y) * var(--u));
		width: calc(var(--length) * var(--u));
		height: max(1px, calc(1 * var(--u)));
		background: var(--off-white);
	}

	.device {
		position: absolute;
		display: block;
		left: calc(798 * var(--u));
		top: calc(72 * var(--u));
		width: calc(1017 * var(--u));
		height: calc(778 * var(--u));
		object-fit: cover;
		/* drop-shadow, not box-shadow: the slab follows the device's cut-out outline.
		   Its blur is a standard deviation, half of Figma's 4px blur radius. */
		filter: drop-shadow(calc(64 * var(--u)) calc(66 * var(--u)) calc(2 * var(--u)) var(--salmon));
	}

	.caption {
		left: calc(905 * var(--u));
		top: calc(888 * var(--u));
		width: calc(778 * var(--u));
		font: 400 calc(32 * var(--u)) / normal var(--font-sans);
		color: var(--accent-orange);
		white-space: nowrap;
	}
</style>
