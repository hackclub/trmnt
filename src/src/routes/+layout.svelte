<script lang="ts">
	import '@fontsource/lora/400.css';
	import '@fontsource/lora/500.css';
	import '@fontsource/lora/500-italic.css';
	import '@fontsource/lora/700.css';
	import '@fontsource/figtree/400.css';
	import '@fontsource/figtree/400-italic.css';
	import '@fontsource/figtree/500-italic.css';
	import '@fontsource/figtree/700.css';
	import '../app.css';
	import { navigating } from '$app/state';
	import favicon from '#lib/assets/favicon.svg';
	import LoadingScreen from '#lib/components/LoadingScreen.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="page">
	<div class="artboard">
		{@render children()}
	</div>
</div>

{#if navigating.to}
	<LoadingScreen />
{/if}

<style>
	.page {
		/* Gives every section's --u a 1920px-wide reference to scale against */
		container-type: inline-size;
		/* Some exported art (the observability and notetaking paths) overhangs the artboard */
		overflow: clip;
		background: var(--maroon);
	}

	/* Centred once the window is wider than the scaled artboard */
	.artboard {
		width: calc(1920 * var(--u));
		margin: 0 auto;
	}
</style>
