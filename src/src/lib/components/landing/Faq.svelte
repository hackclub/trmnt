<script lang="ts">
	import Label from '#lib/components/Label.svelte';
	import Question from '#lib/components/Question.svelte';
	import gearTop from '#lib/assets/figma/gear-top.svg';
	import gears from '#lib/assets/figma/gears.svg';
	import apisGalore from '#lib/assets/figma/apis-galore.svg';
	import observability from '#lib/assets/figma/observability.svg';
	import notetaking from '#lib/assets/figma/notetaking.svg';
	import kindle from '#lib/assets/figma/kindle.webp';
	import nook from '#lib/assets/figma/nook.webp';
	import ipad from '#lib/assets/figma/ipad.webp';

	// Trim on the FAQ label, relative to it: maroon hairlines [x, y, length] off two corners,
	// and a pair of off-white posts down each end
	const labelRules = [
		[185, 4, 199],
		[221, 10, 163],
		[0, 97, 141],
		[0, 104, 164]
	];
	const labelPosts = [8, 15, 369, 376];

	// Questions sit on the side of their ▲, alternating. Answers are fixed-height boxes with their
	// text centred, at the width Figma wraps it to. y is from the top of the section.
	const faqs = [
		{
			question: 'is this for real??',
			marker: 'start',
			top: 222,
			answerTop: 289,
			height: 176,
			textWidth: 774,
			answer:
				'yep! free devices and licenses for teens 13-18 who work on projects. this program is run by Hack Club, a 501(c)(3) non-profit devoted to helping YOU make cool stuff. Our EIN is 81-2908499.'
		},
		{
			question: 'what can i build?',
			marker: 'end',
			top: 480,
			answerTop: 552,
			height: 289,
			textWidth: 773,
			answer:
				'anything at all for TRMNL’s ecosystem! since it’s both BYOD and BYOS (Bring Your Own Server/Device), you can build things for any level of the stack, whether you’re a backend wizard, ambitious firmware fiend, or you just want to make a standard plugin for your Rare Cheese of the Day API.'
		},
		{
			question: 'can i build for my kindle/rpi/kobo/ESP32/whatever?',
			marker: 'start',
			size: 32,
			top: 872,
			answerTop: 937,
			height: 358,
			textWidth: 770,
			answer:
				'yeah, and i’ll even pay for your developer license! TRMNL’s own BYOD docs can show you how to get set up on the device of your choosing, and i can issue you a grant for the BYOD trial license while you work for the full thing. TRMNL themselves offer a $25 bounty if you run their firmware on a device they haven’t seen before, and i’ll match theirs if you submit your build and get approved!'
		},
		{
			question: 'who can participate?',
			marker: 'end',
			top: 1310,
			answerTop: 1382,
			height: 249,
			textWidth: 755,
			answer:
				'anyone between 13 and 18 (inclusive), from anywhere in the world. whether you write your first lines of javascript or your fiftieth firmware project, come make something cool and get a free e-paper device for it!'
		}
	] as const;
</script>

<section class="faq">
	{#each [0, 15] as y}
		<span class="rule-row" style:--y={y}></span>
	{/each}
	{#each [952, 967] as x}
		<span class="rule-column" style:--x={x}></span>
	{/each}

	<div class="faq-label">
		<Label bold>FAQ:</Label>
		{#each labelRules as [x, y, length]}
			<span class="trim" style:--x={x} style:--y={y} style:--length={length}></span>
		{/each}
		{#each labelPosts as x}
			<span class="post" style:--x={x}></span>
		{/each}
	</div>

	<div class="questions">
		{#each faqs as faq (faq.question)}
			<div class="question {faq.marker}" style:--top={faq.top}>
				<Question marker={faq.marker} size={'size' in faq ? faq.size : undefined}>
					{faq.question}
				</Question>
			</div>
			<p
				class="answer"
				style:--top={faq.answerTop}
				style:--height={faq.height}
				style:--text-width={faq.textWidth}
			>
				<span>{faq.answer}</span>
			</p>
		{/each}
	</div>

	<div class="heading trmnl">
		<Question marker="none">what can i do with a TRMNL?</Question>
	</div>
	<p class="all-kinds art">all kinds of things...</p>

	<!-- Text-on-path layers are exported as outlines, so each label lives in its image's alt -->
	<ul class="themes">
		<li class="apis art">
			<img class="gear-top" src={gearTop} alt="" />
			<img class="gears" src={gears} alt="" />
			<img class="apis-label" src={apisGalore} alt="APIs galore" />
		</li>
		<li class="observability art">
			<img src={observability} alt="observability" />
		</li>
		<li class="notetaking art">
			<img src={notetaking} alt="notetaking and organization" />
		</li>
	</ul>

	<!-- A second pair of hairlines across just the right column, under the illustrations -->
	{#each [840, 855] as y}
		<span class="rule-right" style:--y={y}></span>
	{/each}

	<div class="heading no-device">
		<Question marker="none">what if i don’t have a device to run it on?</Question>
	</div>
	<p class="odds">odds are, you probably do and don’t realize it!</p>

	<div class="photo kindle art">
		<img src={kindle} alt="A Kindle showing a website analytics dashboard" />
	</div>
	<p class="caption kindle-caption art">do your parents have an old Kindle lying around?</p>
	<p class="caption ipad-caption art">even an ipad works!</p>
	<p class="caption nook-caption art">did you ever own a Nook?</p>
	<div class="photo nook art">
		<img src={nook} alt="A Nook e-reader showing an ink drawing of hills and a pagoda" />
	</div>
	<div class="photo ipad art">
		<img src={ipad} alt="An iPad on a stand showing a This Day in History page" />
	</div>
</section>

<style>
	.faq {
		position: relative;
		height: calc(1736 * var(--u));
	}

	img {
		position: absolute;
		display: block;
		height: auto;
	}

	/* Hairlines are drawn as boxes, not images, so they snap to whole screen pixels and never thin out */
	.rule-row,
	.rule-right,
	.rule-column,
	.trim,
	.post {
		position: absolute;
		display: block;
		background: var(--salmon);
	}

	.rule-row,
	.rule-right,
	.trim {
		height: max(1px, calc(1 * var(--u)));
	}

	.rule-column,
	.post {
		width: max(1px, calc(1 * var(--u)));
	}

	.trim {
		background: var(--maroon);
	}

	.post {
		background: var(--off-white);
	}

	/* Edge to edge of the window, margins included */
	.rule-row {
		left: calc(-1 * var(--gutter));
		top: calc(var(--y) * var(--u));
		width: calc(1920 * var(--u) + 2 * var(--gutter));
	}

	/* From the left divider out to the window's right edge */
	.rule-right {
		left: calc(952 * var(--u));
		top: calc(var(--y) * var(--u));
		width: calc(969 * var(--u) + var(--gutter));
	}

	/* The column dividers run on past the section into the footer's top rule */
	.rule-column,
	.post {
		left: calc(var(--x) * var(--u));
		top: 0;
	}

	.rule-column {
		height: calc(1751 * var(--u));
	}

	/*
	 * The columns run from the window's edges to the dividers, margins included. Headings and the
	 * questions are centred in them; the illustrations and photos keep their arrangement and move
	 * with their column.
	 */
	.faq {
		--left-centre: calc((952 * var(--u) - var(--gutter)) / 2);
		--right-centre: calc((967 * var(--u) + 1920 * var(--u) + var(--gutter)) / 2);
	}

	.questions,
	.heading,
	.odds {
		translate: -50% 0;
	}

	.art {
		translate: calc(var(--gutter) / 2) 0;
	}

	/* Centred by position rather than a translate: transforms aren't pixel-snapped, which blurs
	   the hairlines on it once the page is scaled down */
	.faq-label {
		position: absolute;
		left: calc(var(--left-centre) - 192 * var(--u));
		top: calc(86 * var(--u));
	}

	.trim {
		left: calc(var(--x) * var(--u));
		top: calc(var(--y) * var(--u));
		width: calc(var(--length) * var(--u));
	}

	.post {
		height: calc(110 * var(--u));
	}

	/* From the left ▲'s square to the right one's, with the answers inset between them */
	.questions {
		position: absolute;
		left: var(--left-centre);
		top: 0;
		width: calc(916 * var(--u));
	}

	.question {
		position: absolute;
		top: calc(var(--top) * var(--u));
	}

	.question.start {
		left: 0;
	}

	.question.end {
		right: 0;
	}

	.answer {
		position: absolute;
		left: calc(48 * var(--u));
		top: calc(var(--top) * var(--u));
		display: flex;
		align-items: center;
		justify-content: center;
		width: calc(819 * var(--u));
		height: calc(var(--height) * var(--u));
		margin: 0;
		background: var(--accent-orange);
		font: 400 calc(32 * var(--u)) / normal var(--font-sans);
		color: white;
		text-align: center;
	}

	.answer span {
		width: calc(var(--text-width) * var(--u));
	}

	.heading,
	.odds {
		position: absolute;
		left: var(--right-centre);
	}

	.trmnl {
		top: calc(43 * var(--u));
	}

	.no-device {
		top: calc(891 * var(--u));
	}

	.odds {
		top: calc(967 * var(--u));
		margin: 0;
		font: 400 calc(40 * var(--u)) / normal var(--font-sans);
		color: var(--off-white);
		white-space: nowrap;
	}

	.all-kinds {
		position: absolute;
		left: calc(1464 * var(--u));
		top: calc(135 * var(--u));
		margin: 0;
		font: 400 calc(48 * var(--u)) / normal var(--font-sans);
		color: var(--off-white);
		white-space: nowrap;
	}

	.themes {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.themes li {
		position: absolute;
	}

	.apis {
		left: calc(1025.46 * var(--u));
		top: calc(127.87 * var(--u));
	}

	.gear-top {
		left: 0;
		top: 0;
		width: calc(228.425 * var(--u));
	}

	.gears {
		left: 0;
		top: calc(110.1455 * var(--u));
		width: calc(393.278 * var(--u));
	}

	.apis-label {
		left: calc(236 * var(--u));
		top: calc(30 * var(--u));
		width: calc(258 * var(--u));
	}

	/* Both SVGs overhang their Figma frames; offsets were measured against Figma's render */
	.observability {
		left: calc(1403 * var(--u));
		top: calc(218 * var(--u));
	}

	.observability img {
		width: calc(654.11 * var(--u));
	}

	.notetaking {
		left: calc(862 * var(--u));
		top: calc(285 * var(--u));
	}

	.notetaking img {
		width: calc(1059.11 * var(--u));
	}

	.caption {
		position: absolute;
		width: calc(435 * var(--u));
		margin: 0;
		font: 400 calc(40 * var(--u)) / normal var(--font-sans);
		color: var(--off-white);
		text-align: center;
	}

	.kindle-caption {
		left: calc(1416 * var(--u));
		top: calc(1137 * var(--u));
	}

	.ipad-caption {
		left: calc(1434 * var(--u));
		top: calc(1343 * var(--u));
	}

	.nook-caption {
		left: calc(981 * var(--u));
		top: calc(1367 * var(--u));
	}

	/* Each photo is cropped inside its frame the way Figma crops it */
	.photo {
		position: absolute;
		overflow: hidden;
	}

	.photo img {
		position: absolute;
		height: auto;
	}

	.kindle {
		left: calc(974 * var(--u));
		top: calc(1056 * var(--u));
		width: calc(423 * var(--u));
		height: calc(270 * var(--u));
	}

	.kindle img {
		left: 0;
		top: -6.22%;
		width: 100%;
		height: 111.88%;
	}

	.nook {
		left: calc(970 * var(--u));
		top: calc(1420 * var(--u));
		width: calc(470 * var(--u));
		height: calc(342 * var(--u));
	}

	.nook img {
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.ipad {
		left: calc(1458 * var(--u));
		top: calc(1378 * var(--u));
		width: calc(387 * var(--u));
		height: calc(341 * var(--u));
	}

	.ipad img {
		left: -9.62%;
		top: -22.7%;
		width: 192.48%;
		height: 126.11%;
	}
</style>
