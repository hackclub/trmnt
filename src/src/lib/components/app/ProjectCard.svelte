<script lang="ts">
	import type { Project } from '#lib/types.ts';

	let { project }: { project: Project } = $props();
</script>

<article>
	<div class="thumbnail">
		{#if project.thumbnail}
			<img src={project.thumbnail} alt="" />
		{/if}
	</div>
	<h3>{project.name}</h3>
	<p class="hours">
		<span class="rule"></span>
		{project.hours.toFixed(1)}h
	</p>
</article>

<style>
	article {
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
		box-shadow: inset 0 0 0 calc(18 * var(--u)) var(--salmon);
	}

	.thumbnail img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
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

	/* A box rather than an image, so it snaps to whole screen pixels and never thins out */
	.rule {
		flex: 1;
		min-width: 0;
		height: max(1px, calc(1 * var(--u)));
		background: var(--accent-orange);
	}
</style>
