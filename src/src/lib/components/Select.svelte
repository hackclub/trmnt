<script lang="ts">
	import chevron from '#lib/assets/figma/chevron.svg';

	interface Option {
		value: string;
		label: string;
	}

	// A dropdown drawn the way the project form designs it, which a native <select> can't be in
	// every browser. It submits through hidden inputs, so it works in an ordinary form. With
	// `multiple`, picking an option toggles it, the list stays open, and the field lists what's
	// picked with commas between.
	let {
		name,
		label,
		options,
		value = $bindable(''),
		values = $bindable([]),
		multiple = false,
		placeholder = ''
	}: {
		name: string;
		label: string;
		options: Option[];
		/** What's picked, without `multiple` */
		value?: string;
		/** What's picked, with `multiple` */
		values?: string[];
		multiple?: boolean;
		placeholder?: string;
	} = $props();

	const id = $props.id();
	let root: HTMLDivElement;
	let open = $state(false);
	/** The option the keyboard or pointer is on */
	let active = $state(-1);

	const isPicked = (option: Option) =>
		multiple ? values.includes(option.value) : option.value === value;
	const shown = $derived(
		options
			.filter(isPicked)
			.map((option) => option.label)
			.join(', ')
	);

	function show() {
		if (options.length === 0) return;
		open = true;
		active = Math.max(0, options.findIndex(isPicked));
	}

	function choose(index: number) {
		const picked = options[index].value;
		if (!multiple) {
			value = picked;
			open = false;
		} else if (values.includes(picked)) {
			values = values.filter((v) => v !== picked);
		} else {
			// Kept in the list's order, so the field reads the same however they were picked
			values = options.map((option) => option.value).filter((v) => v === picked || values.includes(v));
		}
	}

	function onkeydown(event: KeyboardEvent) {
		switch (event.key) {
			case 'ArrowDown':
			case 'ArrowUp':
				event.preventDefault();
				if (!open) return show();
				active = Math.min(Math.max(active + (event.key === 'ArrowDown' ? 1 : -1), 0), options.length - 1);
				break;
			case 'Enter':
			case ' ':
				event.preventDefault();
				if (open && active >= 0) choose(active);
				else show();
				break;
			case 'Escape':
				// Close just the list, not the dialog it might be in
				if (open) {
					event.preventDefault();
					event.stopPropagation();
					open = false;
				}
				break;
			case 'Tab':
				open = false;
		}
	}
</script>

<svelte:window
	onpointerdown={(event) => {
		if (open && !root.contains(event.target as Node)) open = false;
	}}
/>

<div class="select" class:open class:multiple bind:this={root}>
	{#if multiple}
		{#each values as picked (picked)}
			<input type="hidden" {name} value={picked} />
		{/each}
	{:else}
		<input type="hidden" {name} {value} />
	{/if}
	<button
		type="button"
		class="field"
		role="combobox"
		aria-label={label}
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-controls="{id}-options"
		aria-activedescendant={open && active >= 0 ? `${id}-${active}` : undefined}
		disabled={options.length === 0}
		onclick={() => (open ? (open = false) : show())}
		{onkeydown}
	>
		<span class="shown">{shown || placeholder}</span>
		<img class="chevron" src={chevron} alt="" />
	</button>
	{#if open}
		<!-- Clicking an option leaves focus on the field, so the keyboard still works with the
		     list open, which it stays with `multiple` -->
		<ul
			class="options"
			role="listbox"
			id="{id}-options"
			aria-multiselectable={multiple}
			onmousedown={(event) => event.preventDefault()}
		>
			{#each options as option, index (option.value)}
				<!-- Keyboard use goes through the combobox button, as the listbox pattern intends -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<li
					id="{id}-{index}"
					role="option"
					aria-selected={isPicked(option)}
					class:active={index === active}
					class:picked={isPicked(option)}
					onpointerenter={() => (active = index)}
					onclick={() => choose(index)}
				>
					{option.label}
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.select {
		position: relative;
		width: calc(685 * var(--u));
	}

	.field {
		position: relative;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: calc(113 * var(--u));
		padding: 0 calc(100 * var(--u));
		border: calc(8 * var(--u)) solid var(--salmon);
		background: var(--off-white);
		font: italic 500 calc(48 * var(--u)) / normal var(--font-sans);
		color: var(--salmon);
		white-space: nowrap;
		cursor: pointer;
	}

	.field:disabled {
		cursor: default;
	}

	/* A long list of picks trails off rather than running under the chevron */
	.shown {
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.chevron {
		position: absolute;
		right: calc(31 * var(--u));
		top: calc(36 * var(--u));
		width: calc(62 * var(--u));
		height: auto;
	}

	.open .chevron {
		rotate: 180deg;
	}

	/* Hangs off the field's bottom edge, just inside its border */
	.options {
		position: absolute;
		z-index: 1;
		left: calc(4 * var(--u));
		right: calc(4 * var(--u));
		top: calc(109 * var(--u));
		max-height: calc(4 * 105 * var(--u));
		margin: 0;
		padding: 0;
		overflow-y: auto;
		list-style: none;
	}

	.options li {
		display: flex;
		align-items: center;
		justify-content: center;
		height: calc(105 * var(--u));
		background: var(--accent-orange);
		font: italic 500 calc(48 * var(--u)) / normal var(--font-sans);
		color: var(--off-white);
		white-space: nowrap;
		cursor: pointer;
	}

	/* Figma highlights the one under the pointer, which for a single pick is the one picked. With
	   several picked, the highlight marks each pick instead. */
	.options li.active,
	.multiple .options li.picked {
		background: var(--salmon);
		color: var(--maroon);
	}

	/* Not in Figma: which option the keyboard or pointer is on, when highlighting means picked */
	.multiple .options li.active {
		outline: calc(4 * var(--u)) solid var(--off-white);
		outline-offset: calc(-4 * var(--u));
	}

	.multiple .options li.active:not(.picked) {
		background: var(--accent-orange);
		color: var(--off-white);
	}
</style>
