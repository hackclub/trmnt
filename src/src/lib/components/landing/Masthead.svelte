<script lang="ts">
	import mascotBody from '#lib/assets/figma/mascot-left-body.svg';
	import mascotRing from '#lib/assets/figma/mascot-left-ring.svg';
	import mascotPupil from '#lib/assets/figma/mascot-left-pupil.svg';
	import mascotRight from '#lib/assets/figma/mascot-right.svg';
	import titleRule from '#lib/assets/figma/title-rule.svg';
	import titleRuleTopShort from '#lib/assets/figma/title-rule-top-short.svg';
	import titleRuleBottomShort from '#lib/assets/figma/title-rule-bottom-short.svg';
	import hackClubFlag from '#lib/assets/figma/hack-club-flag.png';

	// Triple hairlines running off each edge of the page
	const leftRules = [455, 466, 477];
	const rightRules = [55, 66, 77];

	// The Figma text layer is "a" + 15 spaces + "YSWS", with the flag laid over the gap.
	// Svelte collapses whitespace in markup, so the gap has to go in as an expression.
	const flagGap = ' '.repeat(14);
</script>

<header class="masthead">
	<!-- Three layers in Figma: the salmon body, then a ring and pupil centred on its round end -->
	<div class="mascot-left">
		<img class="body" src={mascotBody} alt="" />
		<img class="ring" src={mascotRing} alt="" />
		<img class="pupil" src={mascotPupil} alt="" />
	</div>
	{#each leftRules as y}
		<span class="rule rule-left" style:--y={y}></span>
	{/each}

	<div class="title-card">
		<img class="title-rule" src={titleRule} alt="" style:--y={29} />
		<img class="title-rule-short top" src={titleRuleTopShort} alt="" />
		<h1><span class="kicker">hack club:</span> TRMNT</h1>
		<img class="title-rule-short bottom" src={titleRuleBottomShort} alt="" />
		<img class="title-rule" src={titleRule} alt="" style:--y={433.5} />
	</div>

	<img class="mascot-right" src={mascotRight} alt="" />
	{#each rightRules as y}
		<span class="rule rule-right" style:--y={y}></span>
	{/each}

	<p class="tagline">a <img class="flag" src={hackClubFlag} alt="Hack Club" />{flagGap}YSWS</p>
</header>

<style>
	.masthead {
		position: relative;
		height: calc(521 * var(--u));
	}

	img {
		position: absolute;
		display: block;
		height: auto;
	}

	.mascot-left {
		position: absolute;
		left: calc(61.95 * var(--u));
		top: calc(149.85 * var(--u));
	}

	.mascot-left .body {
		width: calc(329.105 * var(--u));
	}

	.mascot-left .ring {
		left: calc(16.05 * var(--u));
		top: calc(31.15 * var(--u));
		width: calc(142 * var(--u));
	}

	.mascot-left .pupil {
		left: calc(43.05 * var(--u));
		top: calc(58.15 * var(--u));
		width: calc(88 * var(--u));
	}

	.mascot-right {
		left: calc(1550 * var(--u));
		top: calc(164 * var(--u));
		width: calc(265.355 * var(--u));
	}

	/* Hairlines are drawn as boxes, not images, so they snap to whole screen pixels and never thin out */
	.rule {
		position: absolute;
		top: calc(var(--y) * var(--u));
		height: max(1px, calc(1 * var(--u)));
		background: var(--salmon);
	}

	/* These run off the page, so they carry on into the margins of a wide window */
	.rule-left {
		left: calc(-1 * var(--gutter));
		width: calc(491 * var(--u) + var(--gutter));
	}

	.rule-right {
		right: calc(-1 * var(--gutter));
		width: calc(496 * var(--u) + var(--gutter));
	}

	.title-card {
		position: absolute;
		left: calc(496 * var(--u));
		top: calc(27 * var(--u));
		width: calc(929 * var(--u));
		height: calc(468 * var(--u));
		background: var(--accent-orange);
	}

	.title-rule {
		left: calc(29 * var(--u));
		top: calc(var(--y) * var(--u));
		width: calc(871 * var(--u));
	}

	/* These carry a salmon glow (baked into the SVG) on the side facing the wordmark */
	.title-rule-short {
		width: calc(259 * var(--u));
	}

	.title-rule-short.top {
		left: calc(645 * var(--u));
		top: calc(45 * var(--u));
	}

	.title-rule-short.bottom {
		left: calc(25 * var(--u));
		top: calc(405.5 * var(--u));
	}

	h1 {
		position: absolute;
		left: calc(34 * var(--u));
		top: calc(42 * var(--u));
		margin: 0;
		font: 400 calc(300 * var(--u)) / normal var(--font-serif);
		letter-spacing: calc(-54 * var(--u));
		color: var(--dark-gray);
		/* The first shadow paints on top: the off-white edge sits over the salmon one */
		text-shadow:
			calc(5 * var(--u)) calc(2 * var(--u)) 0 var(--off-white),
			calc(10 * var(--u)) calc(4 * var(--u)) 0 var(--salmon);
		white-space: nowrap;
	}

	/* Sits in the gap above the wordmark's capitals */
	.kicker {
		position: absolute;
		left: calc(23 * var(--u));
		top: calc(5 * var(--u));
		font-size: calc(64 * var(--u));
		letter-spacing: calc(-4.48 * var(--u));
		text-shadow: none;
	}

	.tagline {
		position: absolute;
		left: calc(976 * var(--u));
		top: calc(495 * var(--u));
		margin: 0;
		font: 400 calc(64 * var(--u)) / normal var(--font-sans);
		color: var(--salmon);
		white-space: pre;
	}

	.flag {
		left: calc(75 * var(--u));
		top: calc(9 * var(--u));
		width: calc(173 * var(--u));
	}
</style>
