<script lang="ts" module>
	import type { AddOn } from '#lib/shop.ts';

	/** A button on the popup, placed in Figma pixels from its top-left corner */
	export interface Choice {
		label: string;
		x: number;
		y: number;
		width: number;
		height: number;
		/** Font size in Figma pixels; 46 unless the label needs to fit */
		size?: number;
		/** Orders the item with this extra, or with none for ''. Leaving it out closes the popup. */
		addOn?: AddOn | '';
		/** Shown crossed out when the order would cost more than the balance */
		affordable?: boolean;
	}
</script>

<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import Hatch from '#lib/components/shop/Hatch.svelte';
	import gift from '#lib/assets/figma/shop/gift-salmon.svg';
	import giftTall from '#lib/assets/figma/shop/gift-salmon-tall.svg';
	import type { ShopItemId } from '#lib/shop.ts';

	// The orange popups that "buy!" opens, centred over the dimmed and blurred shop. Sizes and
	// positions are in Figma pixels from the popup's top-left corner.
	let {
		item,
		message,
		height,
		messageTop,
		messageHeight,
		tag,
		choices
	}: {
		item: ShopItemId;
		message: string;
		height: number;
		messageTop: number;
		messageHeight: number;
		/** What an extra adds to the price, e.g. "+75" */
		tag?: { amount: string; y: number; tall: boolean };
		choices: Choice[];
	} = $props();

	let dialog: HTMLDialogElement;

	export function show() {
		dialog.showModal();
	}

	const submit: SubmitFunction = () => {
		return async ({ update }) => {
			// The outcome shows on the page underneath, along with the new balance
			dialog.close();
			await update();
		};
	};

	// The backdrop is part of the dialog element, so a click that lands on the dialog itself
	// rather than anything in it is a click outside the popup
	function closeOnBackdrop(event: MouseEvent) {
		if (event.target === dialog) dialog.close();
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog bind:this={dialog} style:--height={height} onclick={closeOnBackdrop}>
	<p class="message" style:--top={messageTop} style:--height={messageHeight}>{message}</p>

	{#if tag}
		<p class="tag" class:tall={tag.tall} style:--y={tag.y}>
			<img src={tag.tall ? giftTall : gift} alt="" />
			<span class="amount">{tag.amount}<span class="visually-hidden">{' BFTs'}</span></span>
		</p>
	{/if}

	<form method="POST" action="?/buy" use:enhance={submit}>
		<input type="hidden" name="item" value={item} />
		{#each choices as choice (choice.label)}
			<button
				class="choice"
				style:--x={choice.x}
				style:--y={choice.y}
				style:--width={choice.width}
				style:--height={choice.height}
				style:--size={choice.size ?? 46}
				type={choice.addOn === undefined ? 'button' : 'submit'}
				name={choice.addOn === undefined ? undefined : 'addOn'}
				value={choice.addOn}
				disabled={choice.affordable === false}
				onclick={choice.addOn === undefined ? () => dialog.close() : undefined}
			>
				{choice.label}
				{#if choice.affordable === false}
					<Hatch width={choice.width} height={choice.height} />
				{/if}
			</button>
		{/each}
	</form>
</dialog>

<style>
	dialog {
		width: calc(1204 * var(--u));
		height: calc(var(--height) * var(--u));
		max-width: none;
		max-height: none;
		margin: auto;
		padding: 0;
		border: none;
		overflow: visible;
		background: var(--accent-orange);
	}

	/* The ::backdrop doesn't see the page's variables in every browser, so these are literal */
	dialog::backdrop {
		background: rgb(58 58 58 / 0.45);
		backdrop-filter: blur(6px);
	}

	.message,
	.tag,
	.choice {
		position: absolute;
		box-sizing: border-box;
		margin: 0;
	}

	.message {
		left: calc(70.84 * var(--u));
		top: calc(var(--top) * var(--u));
		width: calc(1057.32 * var(--u));
		height: calc(var(--height) * var(--u));
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--off-white);
		font: 700 calc(64 * var(--u)) / normal var(--font-sans);
		color: var(--accent-orange);
		text-align: center;
	}

	/* The balance's box, in salmon, saying what an extra adds */
	.tag {
		left: calc(71 * var(--u));
		top: calc(var(--y) * var(--u));
		width: calc(486 * var(--u));
		height: calc(131 * var(--u));
		background: var(--salmon);
	}

	.tag img {
		position: absolute;
		left: calc(42 * var(--u));
		top: calc(30 * var(--u));
		width: calc(58.18 * var(--u));
		height: auto;
	}

	.amount {
		position: absolute;
		left: calc(19 * var(--u));
		top: calc(17 * var(--u));
		display: flex;
		align-items: center;
		justify-content: center;
		width: calc(448 * var(--u));
		height: calc(97 * var(--u));
		background: var(--off-white);
		font: 700 calc(64 * var(--u)) / normal var(--font-sans);
		color: var(--accent-orange);
	}

	/* Figma stretches the box taller on the DIY Kit's popup */
	.tag.tall {
		height: calc(154.8 * var(--u));
	}

	.tag.tall img {
		top: calc(35.45 * var(--u));
		width: calc(58.17 * var(--u));
	}

	.tag.tall .amount {
		top: calc(20.09 * var(--u));
		height: calc(114.63 * var(--u));
	}

	/* The icon sits on top of the amount's box */
	.tag img {
		z-index: 1;
	}

	.choice {
		left: calc(var(--x) * var(--u));
		top: calc(var(--y) * var(--u));
		width: calc(var(--width) * var(--u));
		height: calc(var(--height) * var(--u));
		padding: 0;
		border: none;
		background: var(--maroon);
		font: 400 calc(var(--size) * var(--u)) / normal var(--font-sans);
		color: white;
		cursor: pointer;
	}

	.choice:disabled {
		cursor: not-allowed;
	}
</style>
