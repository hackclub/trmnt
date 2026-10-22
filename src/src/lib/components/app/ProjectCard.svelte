<script lang="ts">
	import gift from '#lib/assets/figma/gift-tag.svg';
	import type { OwnProject, Project } from '#lib/types.ts';

	// With `onsubmit`, it's one of your own projects: hovering it offers "submit?" while it can be
	// submitted, and a tag across its corner says how its review went
	let {
		project,
		frame = 'plain',
		onsubmit
	}: {
		project: Project | OwnProject;
		/** Under review projects are framed orange, approved ones off-white */
		frame?: 'plain' | 'review' | 'approved';
		onsubmit?: () => void;
	} = $props();

	const own = $derived('status' in project ? project : null);
	const canSubmit = $derived(own && (own.status === null || own.status === 'changes_requested'));
</script>

<article class:review={frame === 'review'} class:approved={frame === 'approved'}>
	<div class="thumbnail">
		{#if project.thumbnail}
			<img src={project.thumbnail} alt="" />
		{/if}
		{#if onsubmit && canSubmit}
			<button class="submit" type="button" onclick={onsubmit}>
				submit?<span class="visually-hidden">{` ${project.name}`}</span>
			</button>
		{/if}
	</div>
	{#if own?.status === 'approved' && own.bftsAwarded}
		<p class="tag bfts">
			<img src={gift} alt="" />
			<span class="inner">+{own.bftsAwarded}<span class="visually-hidden">{' BFTs'}</span></span>
		</p>
	{:else if own?.status === 'changes_requested'}
		<p class="tag"><span class="inner">needs changes</span></p>
	{:else if own?.status === 'rejected'}
		<!-- Not in Figma: a hard rejection, tagged the way a sent-back project is -->
		<p class="tag" title={own.reason ?? undefined}><span class="inner">rejected</span></p>
	{/if}
	<h3>{project.name}</h3>
	<p class="hours">
		<span class="rule"></span>
		{project.hours.toFixed(1)}h
	</p>
</article>

<style>
	article {
		position: relative;
		width: calc(435 * var(--u));
	}

	.thumbnail {
		position: relative;
		height: calc(295 * var(--u));
		background: black;
	}

	/* The frame is drawn over the screenshot, as Figma's inside stroke is */
	.thumbnail::after {
		content: '';
		position: absolute;
		inset: 0;
		box-shadow: inset 0 0 0 calc(18 * var(--u)) var(--frame, var(--salmon));
		pointer-events: none;
	}

	.review {
		--frame: var(--accent-orange);
	}

	.approved {
		--frame: var(--off-white);
	}

	.thumbnail img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	/* Centred on the picture, and only there while the card's hovered or focused */
	.submit {
		position: absolute;
		z-index: 1;
		left: calc(84.5 * var(--u));
		top: calc(115.18 * var(--u));
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: center;
		width: calc(266 * var(--u));
		height: calc(64.64 * var(--u));
		padding: 0;
		border: calc(8 * var(--u)) solid var(--accent-orange);
		background: black;
		font: italic 500 calc(48 * var(--u)) / normal var(--font-sans);
		color: var(--salmon);
		white-space: nowrap;
		cursor: pointer;
		opacity: 0;
	}

	article:hover .submit,
	article:focus-within .submit {
		opacity: 1;
	}

	/* Across the card's top-right corner, overhanging it */
	.tag {
		position: absolute;
		z-index: 2;
		left: calc(208 * var(--u));
		top: calc(-40 * var(--u));
		box-sizing: border-box;
		width: calc(290 * var(--u));
		height: calc(87.22 * var(--u));
		margin: 0;
		padding: calc(11.32 * var(--u)) calc(11.34 * var(--u));
		background: var(--accent-orange);
	}

	.inner {
		display: flex;
		align-items: center;
		justify-content: center;
		width: calc(267.33 * var(--u));
		height: calc(64.58 * var(--u));
		background: var(--off-white);
		font: 700 calc(30 * var(--u)) / normal var(--font-sans);
		color: var(--accent-orange);
		white-space: nowrap;
	}

	.tag.bfts {
		left: calc(194 * var(--u));
		top: calc(-49 * var(--u));
		width: calc(299 * var(--u));
		height: calc(98 * var(--u));
		padding: calc(12.72 * var(--u)) calc(11.69 * var(--u));
	}

	.bfts .inner {
		width: calc(275.62 * var(--u));
		height: calc(72.57 * var(--u));
		font-size: calc(48 * var(--u));
	}

	.bfts img {
		position: absolute;
		left: calc(25.78 * var(--u));
		top: calc(22.44 * var(--u));
		width: calc(37.35 * var(--u));
		height: auto;
	}

	h3 {
		margin: calc(12 * var(--u)) 0 0;
		font: 400 calc(40 * var(--u)) / calc(42 * var(--u)) var(--font-serif);
		color: var(--off-white);
		text-align: center;
	}

	.hours {
		display: flex;
		align-items: center;
		gap: calc(16 * var(--u));
		margin: 0;
		font: 400 calc(40 * var(--u)) / normal var(--font-sans);
		color: var(--accent-orange);
		white-space: nowrap;
	}

	.approved .hours {
		color: var(--off-white);
	}

	/* A box rather than an image, so it snaps to whole screen pixels and never thins out */
	.rule {
		flex: 1;
		min-width: 0;
		height: max(1px, calc(1 * var(--u)));
		background: currentColor;
	}
</style>
