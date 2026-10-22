<script lang="ts">
	import { page } from '$app/state';

	// A labelled row of choices kept in the address, like "sort by: order date | participant".
	// Picking one keeps the page's other choices.
	let {
		label,
		param,
		options
	}: {
		label: string;
		/** The query parameter the choice is kept in; the first option is the default */
		param: string;
		options: { value: string; label: string }[];
	} = $props();

	const current = $derived(page.url.searchParams.get(param) ?? options[0].value);

	function href(value: string) {
		const url = new URL(page.url.href);
		url.searchParams.set(param, value);
		// A new sort or filter starts back at the first page
		url.searchParams.delete('page');
		return url.pathname + url.search;
	}
</script>

<div class="row">
	<span class="label">{label}</span>
	{#each options as option (option.value)}
		<a
			class="option"
			class:active={option.value === current}
			href={href(option.value)}
			data-sveltekit-noscroll
			aria-current={option.value === current ? 'true' : undefined}
		>
			{option.label}
		</a>
	{/each}
</div>

<style>
	.row {
		display: flex;
		gap: calc(42 * var(--u));
		justify-content: center;
	}

	.label,
	.option {
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: center;
		height: calc(75 * var(--u));
		font: italic 500 calc(48 * var(--u)) / normal var(--font-sans);
		white-space: nowrap;
	}

	.label {
		width: calc(257 * var(--u));
		margin-right: calc(-8 * var(--u));
		background: var(--salmon);
		color: var(--dark-gray);
	}

	.option {
		width: calc(308 * var(--u));
		border: calc(8 * var(--u)) solid var(--accent-orange);
		color: var(--salmon);
	}

	/* Not in Figma: which choice is in effect, marked the way the current tab is */
	.option.active {
		background: var(--accent-orange);
		color: var(--dark-gray);
	}
</style>
