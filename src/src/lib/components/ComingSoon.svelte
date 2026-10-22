<script lang="ts">
	import SectionHeading from '#lib/components/SectionHeading.svelte';

	// Stands in for pages that exist in the navigation but not yet in Figma
	let { title }: { title: string } = $props();
</script>

<svelte:head>
	<title>{title} — TRMNT</title>
</svelte:head>

<main>
	<SectionHeading level={1}>{title}</SectionHeading>
	<p>coming soon...</p>
</main>

<style>
	main {
		padding: calc(177 * var(--u)) calc(58 * var(--u)) calc(113 * var(--u));
	}

	p {
		margin: calc(35 * var(--u)) 0 0 calc(60 * var(--u));
		font: 400 calc(48 * var(--u)) / normal var(--font-sans);
		color: var(--off-white);
	}
</style>
