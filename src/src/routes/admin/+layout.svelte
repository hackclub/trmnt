<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const TABS = [
		{ label: 'projects', href: resolve('admin') },
		{ label: 'users', href: resolve('admin/users') },
		{ label: 'fulfillment', href: resolve('admin/fulfillment') }
	];
</script>

<svelte:head>
	<title>Admin — TRMNT</title>
</svelte:head>

<!-- An off-white panel inside an orange frame, as the Figma admin pages are -->
<div class="frame">
	<main class="panel">
		<h1>- TRMNT Admin -</h1>
		<p class="subtitle">probably time to ban some kids</p>

		<nav>
			{#each TABS as tab (tab.href)}
				<a href={tab.href} class:active={page.url.pathname === tab.href} aria-current={page.url.pathname === tab.href ? 'page' : undefined}>
					{tab.label}
				</a>
			{/each}
		</nav>

		{@render children()}
	</main>
</div>

<style>
	.frame {
		padding: calc(61.26 * var(--u)) calc(28 * var(--u));
		background: var(--accent-orange);
	}

	.panel {
		display: block;
		min-height: calc(1080 * var(--u));
		padding: calc(43 * var(--u)) 0 calc(120 * var(--u));
		background: var(--off-white);
	}

	h1 {
		margin: 0;
		font: 700 calc(48 * var(--u)) / normal var(--font-serif);
		color: var(--accent-orange);
		text-align: center;
	}

	.subtitle {
		margin: calc(13 * var(--u)) 0 0;
		font: italic 500 calc(48 * var(--u)) / normal var(--font-sans);
		color: black;
		text-align: center;
	}

	nav {
		display: flex;
		justify-content: center;
		gap: calc(38 * var(--u));
		margin-top: calc(58 * var(--u));
	}

	nav a {
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: center;
		width: calc(465 * var(--u));
		height: calc(113 * var(--u));
		border: calc(8 * var(--u)) solid var(--accent-orange);
		font: italic 500 calc(48 * var(--u)) / normal var(--font-sans);
		color: var(--salmon);
	}

	nav a.active {
		background: var(--accent-orange);
		color: var(--dark-gray);
	}
</style>
