<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import AdminCard from '#lib/components/admin/AdminCard.svelte';
	import OptionRow from '#lib/components/admin/OptionRow.svelte';
	import { ITEM_PICTURES } from '#lib/components/shop/item-pictures.ts';
	import { SHOP_ITEMS } from '#lib/shop.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const INCLUSIONS: Record<string, string> = { clarity_kit: 'clarity kit', byod_license: 'BYOD license' };

	/** Which value was just copied, to say so for a moment */
	let copied = $state<string | null>(null);
	async function copy(key: string, value: string) {
		await navigator.clipboard.writeText(value);
		copied = key;
		setTimeout(() => {
			if (copied === key) copied = null;
		}, 1500);
	}

	const short = (date: Date) => date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
</script>

{#snippet copyable(key: string, label: string, value: string | null | undefined)}
	<p class="detail">
		{label}:
		{#if value}
			<button type="button" class="copy" onclick={() => copy(key, value)}>
				{copied === key ? 'copied!' : 'click to copy'}
			</button>
		{:else}
			<span class="none">none</span>
		{/if}
	</p>
{/snippet}

<div class="controls">
	<OptionRow
		label="sort by:"
		param="sort"
		options={[
			{ value: 'date', label: 'order date' },
			{ value: 'participant', label: 'participant' },
			{ value: 'item', label: 'item type' }
		]}
	/>
	<form class="search" method="GET" data-sveltekit-keepfocus>
		<label for="search">search:</label>
		<input id="search" name="q" value={data.search} placeholder="your value here" />
		{#each ['sort', 'filter'] as param (param)}
			{#if page.url.searchParams.get(param)}
				<input type="hidden" name={param} value={page.url.searchParams.get(param)} />
			{/if}
		{/each}
	</form>
	<OptionRow
		label="filter"
		param="filter"
		options={[
			{ value: 'pending', label: 'pending only' },
			{ value: 'fulfilled', label: 'fulfilled only' },
			{ value: 'all', label: 'all' }
		]}
	/>
</div>

<div class="orders">
	{#each data.orders as order (order.id)}
		<AdminCard>
			{#snippet title()}
				<span class="item-name">{SHOP_ITEMS[order.item].name}</span>
				<span class="rule between"></span>
				<span>{order.participant}</span>
			{/snippet}

			<div class="body">
				<img class="picture" src={ITEM_PICTURES[order.item]} alt="" />

				<div class="details">
					<p class="inclusions">
						inclusions:
						{#if order.addOn}<span class="included">{INCLUSIONS[order.addOn]}</span>{:else}<span class="none">none</span>{/if}
					</p>
					{#await order.shipping}
						<p class="detail none">reading their Hack Club details...</p>
					{:then shipping}
						{#if order.digital}
							{@render copyable(`${order.id}-email`, 'email', shipping.email)}
						{:else}
							{@render copyable(`${order.id}-line1`, 'address', shipping.address?.line1)}
							{@render copyable(`${order.id}-line2`, 'address line 2', shipping.address?.line2)}
							{@render copyable(`${order.id}-phone`, 'phone #', shipping.phone)}
							{@render copyable(`${order.id}-email`, 'email', shipping.email)}
							{@render copyable(`${order.id}-city`, 'city', shipping.address?.city)}
							{@render copyable(`${order.id}-state`, 'state', shipping.address?.state)}
							<!-- Not in Figma, but shipping needs them -->
							{@render copyable(`${order.id}-zip`, 'zip', shipping.address?.postalCode)}
							{@render copyable(`${order.id}-country`, 'country', shipping.address?.country)}
						{/if}
					{/await}
				</div>

				<form class="actions" method="POST" use:enhance>
					<input type="hidden" name="order" value={order.id} />
					{#if order.status === 'pending'}
						<!-- Not in Figma: what to tell them when it ships or is cancelled -->
						<input class="small" name="tracking" placeholder="tracking # (optional)" />
						<input class="small" name="note" placeholder="note to them (optional)" />
					{:else}
						<p class="state">
							{order.status === 'fulfilled'
								? `fulfilled ${order.fulfilledAt ? short(order.fulfilledAt) : ''}${order.trackingNumber ? ` · ${order.trackingNumber}` : ''}`
								: `cancelled & refunded ${order.cancelledAt ? short(order.cancelledAt) : ''}`}
						</p>
					{/if}
					{#if form?.orderId === order.id}
						<p class="state" role="status">{'done' in form ? form.done : form.message}</p>
					{/if}
					<a class="contact" href={order.contact} target="_blank" rel="noreferrer">contact user</a>
					{#if order.status === 'pending'}
						<button class="fulfil" formaction="?/fulfil">mark fulfilled</button>
						<button class="cancel" formaction="?/cancel">cancel & refund</button>
					{/if}
				</form>
			</div>
		</AdminCard>
	{:else}
		<p class="empty">no orders here.</p>
	{/each}
</div>

<style>
	.controls {
		display: grid;
		gap: calc(25 * var(--u));
		margin-top: calc(28 * var(--u));
	}

	.search {
		display: flex;
		justify-content: center;
		gap: calc(34 * var(--u));
	}

	.search label,
	.search input {
		box-sizing: border-box;
		height: calc(75 * var(--u));
		font: italic 500 calc(48 * var(--u)) / normal var(--font-sans);
	}

	.search label {
		display: flex;
		align-items: center;
		justify-content: center;
		width: calc(257 * var(--u));
		background: var(--salmon);
		color: var(--dark-gray);
	}

	.search input {
		width: calc(1008 * var(--u));
		border: calc(8 * var(--u)) solid var(--accent-orange);
		background: transparent;
		color: var(--dark-gray);
		text-align: center;
	}

	.search input::placeholder {
		color: var(--salmon);
	}

	.orders {
		display: grid;
		gap: calc(60 * var(--u));
		margin-top: calc(61 * var(--u));
	}

	.item-name {
		color: var(--accent-orange);
	}

	.between {
		flex: none;
		width: calc(105 * var(--u));
	}

	.body {
		display: grid;
		grid-template-columns: calc(382 * var(--u)) 1fr calc(344 * var(--u));
		column-gap: calc(41 * var(--u));
		margin-top: calc(12 * var(--u));
		padding-left: calc(11 * var(--u));
	}

	.picture {
		width: calc(382 * var(--u));
		height: calc(334 * var(--u));
		object-fit: contain;
	}

	p {
		margin: 0;
	}

	.inclusions {
		font: italic 500 calc(48 * var(--u)) / normal var(--font-sans);
		color: black;
	}

	.included {
		color: var(--accent-orange);
		text-decoration: underline;
	}

	.details .detail {
		margin-left: calc(129 * var(--u));
		font: italic 500 calc(36 * var(--u)) / calc(43 * var(--u)) var(--font-sans);
		color: black;
	}

	.details .inclusions + .detail {
		margin-top: calc(16 * var(--u));
	}

	.copy {
		padding: 0;
		border: none;
		background: none;
		font: inherit;
		color: var(--accent-orange);
		cursor: pointer;
	}

	.none {
		color: var(--light-gray);
	}

	.actions {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		gap: calc(16 * var(--u));
	}

	.small {
		box-sizing: border-box;
		width: 100%;
		height: calc(56 * var(--u));
		padding: 0 calc(12 * var(--u));
		border: calc(4 * var(--u)) solid var(--accent-orange);
		background: var(--off-white);
		font: italic 500 calc(24 * var(--u)) / normal var(--font-sans);
		color: var(--dark-gray);
	}

	.small::placeholder {
		color: var(--salmon);
	}

	.state {
		font: italic 500 calc(28 * var(--u)) / normal var(--font-sans);
		color: var(--accent-orange);
		text-align: center;
	}

	.contact,
	.fulfil {
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: center;
		font: italic 500 calc(48 * var(--u)) / normal var(--font-sans);
	}

	.contact {
		width: calc(308 * var(--u));
		height: calc(74.85 * var(--u));
		border: calc(8 * var(--u)) solid var(--accent-orange);
		background: var(--off-white);
		color: var(--salmon);
	}

	.fulfil {
		width: calc(344 * var(--u));
		height: calc(83.6 * var(--u));
		border: none;
		background: var(--accent-orange);
		color: var(--off-white);
		cursor: pointer;
	}

	/* Not in Figma */
	.cancel {
		padding: 0;
		border: none;
		background: none;
		font: italic 500 calc(28 * var(--u)) / normal var(--font-sans);
		color: var(--salmon);
		text-decoration: underline;
		cursor: pointer;
	}

	.empty {
		font: italic 500 calc(36 * var(--u)) / normal var(--font-sans);
		color: var(--accent-orange);
		text-align: center;
	}
</style>
