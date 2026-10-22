<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import AdminCard from '#lib/components/admin/AdminCard.svelte';
	import OptionRow from '#lib/components/admin/OptionRow.svelte';
	import { SHOP_ITEMS } from '#lib/shop.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	/** "10/22", as the design writes dates */
	const short = (date: Date | string) =>
		new Date(date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', timeZone: 'UTC' });
	/** "October 26th, 2026" */
	function long(date: Date) {
		const day = date.getDate();
		const suffix = [11, 12, 13].includes(day % 100) ? 'th' : (['th', 'st', 'nd', 'rd'][day % 10] ?? 'th');
		return `${date.toLocaleDateString('en-US', { month: 'long' })} ${day}${suffix}, ${date.getFullYear()}`;
	}

	function pageHref(number: number) {
		const url = new URL(page.url.href);
		url.searchParams.set('page', String(number));
		return url.pathname + url.search;
	}
</script>

<p class="stat">total ever: {data.totalEver}</p>
<p class="stat">active today: {data.activeToday}</p>

<div class="controls">
	<OptionRow
		label="sort by:"
		param="sort"
		options={[
			{ value: 'joined', label: 'date joined' },
			{ value: 'active', label: 'last active' },
			{ value: 'name', label: 'name' }
		]}
	/>
	<form class="search" method="GET" data-sveltekit-keepfocus>
		<label for="search">search:</label>
		<input id="search" name="q" value={data.search} placeholder="name, email or slack ID" />
		{#if page.url.searchParams.get('sort')}
			<input type="hidden" name="sort" value={page.url.searchParams.get('sort')} />
		{/if}
	</form>
</div>

<div class="people">
	{#each data.people as person (person.id)}
		<AdminCard>
			{#snippet title()}
				<span class="who">{person.name ?? person.email}</span>
			{/snippet}

			<div class="body">
				<div class="picture">
					{#await person.avatar then avatar}
						{#if avatar}
							<img src={avatar} alt="" />
						{:else}
							<span>user’s slack PFP</span>
						{/if}
					{/await}
				</div>

				<div class="middle">
					<p>date joined: {short(person.createdAt)}</p>
					<p>last active: {person.lastActive ? short(person.lastActive) : 'never'}</p>
					<p>current projects:</p>
					<ul>
						{#each person.currentProjects as name, i (i)}<li>{name}</li>{:else}<li class="none">none</li>{/each}
					</ul>
					<p>approved projects:</p>
					<ul>
						{#each person.approvedProjects as name, i (i)}<li>{name}</li>{:else}<li class="none">none</li>{/each}
					</ul>
				</div>

				<div class="right">
					<p>email: {person.email}</p>
					<p>slack ID: {person.slackId ?? 'none'}</p>
					<!-- Not in Figma: what Hackatime thinks of them, and whether they're banned -->
					{#if person.trustLevel}
						<p class:warning={person.trustLevel === 'red'}>hackatime trust: {person.trustLevel}</p>
					{/if}
					{#if person.bannedAt}
						<p class="warning">banned: {person.banReason}</p>
					{/if}
				</div>
			</div>

			<p class="history-label">order history:</p>
			<ul class="history">
				{#each person.orders as order (order.id)}
					<li>
						{SHOP_ITEMS[order.item].name} on {long(order.createdAt)} - ID [{order.id.slice(0, 8)}]{order.status ===
						'cancelled'
							? ' (cancelled)'
							: ''}
					</li>
				{:else}
					<li class="none">none</li>
				{/each}
			</ul>

			{#if form?.userId === person.id}
				<p class="outcome" role="status">{'done' in form ? form.done : form.message}</p>
			{/if}

			<div class="actions">
				<a class="contact" href={person.contact} target="_blank" rel="noreferrer">contact user</a>
				<form method="POST" action={person.bannedAt ? '?/unban' : '?/ban'} use:enhance>
					<input type="hidden" name="user" value={person.id} />
					<button class="ban">{person.bannedAt ? 'unban user' : 'ban user'}</button>
				</form>
			</div>
		</AdminCard>
	{:else}
		<p class="empty">nobody matches that.</p>
	{/each}
</div>

{#if data.pages > 1}
	<!-- Not in Figma: there are more people than fit on one page -->
	<nav class="pages">
		{#if data.pageNumber > 1}<a href={pageHref(data.pageNumber - 1)}>← previous</a>{/if}
		<span>page {data.pageNumber} of {data.pages}</span>
		{#if data.pageNumber < data.pages}<a href={pageHref(data.pageNumber + 1)}>next →</a>{/if}
	</nav>
{/if}

<style>
	.stat {
		display: flex;
		align-items: center;
		justify-content: center;
		width: calc(1469 * var(--u));
		height: calc(113 * var(--u));
		margin: calc(36 * var(--u)) auto 0;
		background: var(--accent-orange);
		font: italic 500 calc(48 * var(--u)) / normal var(--font-sans);
		color: var(--dark-gray);
	}

	.stat + .stat {
		margin-top: calc(22 * var(--u));
	}

	.controls {
		display: grid;
		gap: calc(25 * var(--u));
		margin-top: calc(31 * var(--u));
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

	.people {
		display: grid;
		gap: calc(60 * var(--u));
		margin-top: calc(38 * var(--u));
	}

	.people :global(.card) {
		min-height: calc(868 * var(--u));
	}

	.who {
		color: var(--dark-gray);
	}

	.body {
		display: grid;
		grid-template-columns: calc(305 * var(--u)) calc(503 * var(--u)) 1fr;
		column-gap: calc(29 * var(--u));
		margin-top: calc(44 * var(--u));
	}

	p,
	li {
		margin: 0;
		font: italic 500 calc(36 * var(--u)) / calc(43 * var(--u)) var(--font-sans);
		color: var(--dark-gray);
	}

	ul {
		margin: calc(10 * var(--u)) 0 calc(10 * var(--u)) calc(159 * var(--u));
		padding: 0;
		list-style: none;
	}

	li {
		overflow: hidden;
		color: var(--accent-orange);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	li.none {
		color: var(--light-gray);
	}

	.picture {
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: center;
		width: calc(305 * var(--u));
		height: calc(305 * var(--u));
		border: calc(4 * var(--u)) solid var(--accent-orange);
		background: var(--off-white);
		font: italic 500 calc(36 * var(--u)) / normal var(--font-sans);
		color: var(--dark-gray);
		overflow: hidden;
	}

	.picture img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.right {
		text-align: center;
	}

	.warning {
		color: var(--accent-orange);
	}

	.history-label {
		margin: calc(24 * var(--u)) 0 0 calc(24 * var(--u));
	}

	.history {
		margin-left: calc(120 * var(--u));
		margin-bottom: calc(190 * var(--u));
	}

	.outcome {
		color: var(--accent-orange);
	}

	/* In the card's bottom-right corner, however tall the lists make it */
	.actions {
		position: absolute;
		right: calc(42 * var(--u));
		bottom: calc(46 * var(--u));
		display: grid;
		justify-items: center;
		gap: calc(16 * var(--u));
	}

	.contact,
	.ban {
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

	.ban {
		width: calc(344 * var(--u));
		height: calc(83.6 * var(--u));
		border: none;
		background: var(--accent-orange);
		color: var(--off-white);
		cursor: pointer;
	}

	.empty,
	.pages {
		font: italic 500 calc(36 * var(--u)) / normal var(--font-sans);
		color: var(--accent-orange);
		text-align: center;
	}

	.pages {
		display: flex;
		justify-content: center;
		gap: calc(40 * var(--u));
		margin-top: calc(40 * var(--u));
	}

	.pages a {
		color: var(--salmon);
		text-decoration: underline;
	}
</style>
