<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import OptionRow from '#lib/components/admin/OptionRow.svelte';
	import { PROJECT_TYPES } from '#lib/projects.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const ROBERT_STATES: Record<string, string> = {
		awaiting_review: 'awaiting fraud review',
		awaiting_outcome: 'passed fraud review',
		rejected_fraud: 'rejected as fraud',
		decided: 'decided'
	};

	function select(id: string) {
		const url = new URL(page.url.href);
		url.searchParams.set('submission', id);
		return url.pathname + url.search;
	}

	const pending = $derived(data.active?.status === 'pending');
	const outcome = $derived(form?.submissionId === data.active?.id ? form : null);
</script>

{#if outcome}
	<!-- Not in Figma: how the last decision went -->
	<p class="outcome" role="status">{'done' in outcome ? outcome.done : outcome.message}</p>
{/if}

{#if data.active}
	{@const active = data.active}
	<form class="review" method="POST" use:enhance={() => async ({ update }) => update({ reset: false })}>
		<input type="hidden" name="submission" value={active.id} />

		<h2 class="title">
			<span class="rule lead"></span>
			<span class="name">{active.name}</span>
			<span class="rule rest"></span>
		</h2>

		<div class="screenshot">
			{#if active.screenshot}
				<img src={active.screenshot} alt="The project's screenshot" />
			{:else}
				<span>no screenshot</span>
			{/if}
		</div>

		<dl class="facts">
			<div><dt>project author:</dt><dd class="author">{active.author}</dd></div>
			<div><dt>current hours:</dt><dd class="current-hours">{active.hours.toFixed(1)}</dd></div>
			<div><dt>project type:</dt><dd>{PROJECT_TYPES[active.type]}</dd></div>
			<div>
				<dt>project language:</dt>
				<dd>{#await active.language}...{:then language}{language ?? 'unknown'}{/await}</dd>
			</div>
		</dl>

		<!-- Not in Figma: what else a reviewer needs to go on, and how a decided project went -->
		<div class="more">
			<p><b>hackatime:</b> {active.hackatimeProjects.join(', ') || 'none linked'}</p>
			{#if active.trustLevel}
				<p class:warning={active.trustLevel === 'red'}><b>hackatime trust:</b> {active.trustLevel}</p>
			{/if}
			{#if active.robertSent}
				{#await active.robert then robert}
					{#if robert}
						<p>
							<b>robert:</b> {ROBERT_STATES[robert.state] ?? robert.state}{robert.trustScore
								? `, scored ${robert.trustScore}/10`
								: ''}{robert.note ? ` — ${robert.note}` : ''}
						</p>
					{/if}
				{/await}
			{/if}
			{#if active.status === 'approved'}
				<p><b>approved</b> for {active.approvedHours?.toFixed(2)} hrs, +{active.bftsAwarded} BFTs</p>
			{:else if active.status === 'changes_requested'}
				<p><b>sent back:</b> {active.reason}</p>
			{:else if active.status === 'rejected'}
				<p><b>rejected</b>{active.reason ? `: ${active.reason}` : ''}</p>
			{/if}
			<p class="description" title={active.description}>{active.description}</p>
		</div>

		<button class="filled hard-reject" formaction="?/hardReject" disabled={!pending}>hard reject</button>

		<p class="heading approval-heading">- approval -</p>
		<label class="approve-for">
			Approve for:
			<input
				name="hours"
				type="number"
				step="0.01"
				min="0.01"
				max={active.hours.toFixed(2)}
				value={(active.approvedHours ?? active.hours).toFixed(2)}
				disabled={!pending}
			/>
			hrs
		</label>
		<label class="justification-label" for="justification">Justification:</label>
		<textarea
			id="justification"
			class="box justification"
			name="justification"
			placeholder="justification here: the technical features behind these hours, and why if you lowered them"
			disabled={!pending}>{active.justification ?? ''}</textarea
		>
		<button class="filled approve" formaction="?/approve" disabled={!pending}>approve</button>

		<!-- In place of Figma's "open in telescreen" -->
		{#if active.robertSent}
			<span class="link robert">with Robert</span>
		{:else}
			<button
				class="link robert"
				formaction="?/sendToRobert"
				disabled={!pending || !data.robertEnabled}
				title={data.robertEnabled ? undefined : 'Add ROBERT_API_KEY to send projects to Robert'}
			>
				send to Robert
			</button>
		{/if}
		<a class="link github" href={active.repoUrl} target="_blank" rel="noreferrer" class:missing={!active.repoUrl}>
			open github repo
		</a>
		<a class="link playable" href={active.demoUrl} target="_blank" rel="noreferrer" class:missing={!active.demoUrl}>
			open playable URL
		</a>

		<p class="heading rejection-heading">- rejection -</p>
		<textarea
			class="box reason"
			name="reason"
			aria-label="Rejection reason"
			placeholder="rejection reason here: they'll see it. optional for a hard reject."
			disabled={!pending}>{active.reason ?? ''}</textarea
		>
		<button class="filled reject" formaction="?/reject" disabled={!pending}>reject</button>
	</form>
{:else}
	<p class="empty">nothing waiting on review!</p>
{/if}

<div class="toggle">
	<!-- Not in Figma: switching to projects already reviewed -->
	<OptionRow
		label="showing:"
		param="view"
		options={[
			{ value: 'waiting', label: 'waiting' },
			{ value: 'reviewed', label: 'reviewed' }
		]}
	/>
</div>

<div class="queue">
	{#each data.queue as item (item.id)}
		<a class="item" class:current={item.id === data.active?.id} href={select(item.id)} data-sveltekit-noscroll>
			<div class="thumbnail">
				{#if item.thumbnail}<img src={item.thumbnail} alt="" />{/if}
			</div>
			<p class="item-name">{item.name}</p>
			<p class="by">{item.author}</p>
			<p class="item-hours"><span class="rule"></span>{(item.seconds / 3600).toFixed(1)}h</p>
		</a>
	{/each}
</div>

<style>
	.outcome,
	.empty {
		margin: calc(28 * var(--u)) 0 0;
		font: italic 500 calc(36 * var(--u)) / normal var(--font-sans);
		color: var(--accent-orange);
		text-align: center;
	}

	/* Everything inside is placed from the panel's top-left corner in Figma */
	.review {
		position: relative;
		width: calc(1488 * var(--u));
		height: calc(1243.88 * var(--u));
		margin: calc(78 * var(--u)) auto 0;
		background: #dddcdc;
		box-shadow: inset 0 0 0 calc(18 * var(--u)) var(--salmon);
	}

	.review > * {
		position: absolute;
		box-sizing: border-box;
		margin: 0;
	}

	.title {
		left: calc(38 * var(--u));
		right: calc(42 * var(--u));
		top: calc(27.88 * var(--u));
		display: flex;
		align-items: center;
		gap: calc(16 * var(--u));
		font: 400 calc(40 * var(--u)) / normal var(--font-serif);
		color: var(--dark-gray);
		white-space: nowrap;
	}

	.rule {
		height: max(1px, calc(1 * var(--u)));
		background: var(--accent-orange);
	}

	.lead {
		flex: none;
		width: calc(289 * var(--u));
	}

	.rest {
		flex: 1;
	}

	.name {
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.screenshot {
		left: calc(62 * var(--u));
		top: calc(113.88 * var(--u));
		width: calc(821 * var(--u));
		height: calc(473.52 * var(--u));
		display: flex;
		align-items: center;
		justify-content: center;
		border: calc(4 * var(--u)) solid var(--accent-orange);
		background: var(--off-white);
		font: italic 500 calc(48 * var(--u)) / normal var(--font-sans);
		color: var(--dark-gray);
	}

	.screenshot img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.facts {
		left: calc(902 * var(--u));
		top: calc(113.88 * var(--u));
		display: grid;
		gap: calc(7 * var(--u));
	}

	.facts div {
		display: flex;
		align-items: baseline;
		gap: calc(12 * var(--u));
		height: calc(43 * var(--u));
	}

	dt,
	dd {
		margin: 0;
		font: italic 500 calc(30 * var(--u)) / normal var(--font-sans);
		white-space: nowrap;
	}

	dt {
		font-size: calc(36 * var(--u));
		color: var(--dark-gray);
	}

	dd {
		color: var(--accent-orange);
	}

	.author {
		font-size: calc(24 * var(--u));
	}

	.current-hours {
		font-size: calc(36 * var(--u));
	}

	.more {
		left: calc(902 * var(--u));
		top: calc(318 * var(--u));
		width: calc(544 * var(--u));
		font: italic 500 calc(24 * var(--u)) / 1.25 var(--font-sans);
		color: var(--dark-gray);
	}

	.more p {
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.more .warning {
		color: var(--accent-orange);
	}

	.filled {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		border: none;
		background: var(--accent-orange);
		font: italic 500 calc(48 * var(--u)) / normal var(--font-sans);
		color: var(--off-white);
		cursor: pointer;
	}

	.filled:disabled,
	.link:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.hard-reject {
		left: calc(1012 * var(--u));
		top: calc(412.88 * var(--u));
		width: calc(339.59 * var(--u));
		height: calc(94 * var(--u));
	}

	.heading {
		width: calc(435 * var(--u));
		font: 400 calc(40 * var(--u)) / calc(50 * var(--u)) var(--font-serif);
		color: var(--dark-gray);
		text-align: center;
	}

	.approval-heading {
		left: calc(954 * var(--u));
		top: calc(585.88 * var(--u));
	}

	.rejection-heading {
		left: calc(255 * var(--u));
		top: calc(863.88 * var(--u));
	}

	.approve-for,
	.justification-label {
		font: italic 500 calc(36 * var(--u)) / normal var(--font-sans);
		color: var(--dark-gray);
	}

	.approve-for {
		left: calc(896 * var(--u));
		top: calc(652.88 * var(--u));
		display: flex;
		align-items: center;
		gap: calc(26 * var(--u));
	}

	.approve-for input {
		box-sizing: border-box;
		width: calc(234.56 * var(--u));
		height: calc(57 * var(--u));
		border: calc(8 * var(--u)) solid var(--accent-orange);
		background: var(--off-white);
		font: italic 500 calc(40 * var(--u)) / normal var(--font-sans);
		color: var(--dark-gray);
		text-align: center;
	}

	.justification-label {
		left: calc(898 * var(--u));
		top: calc(716.88 * var(--u));
	}

	.box {
		padding: calc(6 * var(--u)) calc(13 * var(--u));
		border: calc(8 * var(--u)) solid var(--accent-orange);
		background: var(--off-white);
		font: italic 500 calc(24 * var(--u)) / normal var(--font-sans);
		color: var(--dark-gray);
		resize: none;
	}

	.box::placeholder {
		color: var(--dark-gray);
	}

	.justification {
		left: calc(898 * var(--u));
		top: calc(766.88 * var(--u));
		width: calc(541 * var(--u));
		height: calc(348 * var(--u));
	}

	.approve {
		left: calc(999 * var(--u));
		top: calc(1124.88 * var(--u));
		width: calc(344 * var(--u));
		height: calc(83.6 * var(--u));
	}

	.link {
		left: calc(181 * var(--u));
		width: calc(583 * var(--u));
		height: calc(74.85 * var(--u));
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		border: calc(8 * var(--u)) solid var(--accent-orange);
		background: var(--off-white);
		font: italic 500 calc(48 * var(--u)) / normal var(--font-sans);
		color: var(--salmon);
		cursor: pointer;
	}

	.link.missing {
		opacity: 0.4;
		pointer-events: none;
	}

	.robert {
		top: calc(604.88 * var(--u));
	}

	span.robert {
		cursor: default;
	}

	.github {
		top: calc(692.88 * var(--u));
	}

	.playable {
		top: calc(781.88 * var(--u));
	}

	.reason {
		left: calc(202 * var(--u));
		top: calc(928.88 * var(--u));
		width: calc(541 * var(--u));
		height: calc(211 * var(--u));
	}

	.reject {
		left: calc(337 * var(--u));
		top: calc(1152.88 * var(--u));
		width: calc(271 * var(--u));
		height: calc(65.86 * var(--u));
	}

	.toggle {
		margin-top: calc(48 * var(--u));
	}

	.queue {
		display: grid;
		grid-template-columns: repeat(3, calc(435 * var(--u)));
		justify-content: center;
		gap: calc(41 * var(--u)) calc(60 * var(--u));
		margin-top: calc(48 * var(--u));
	}

	.item {
		display: block;
	}

	.thumbnail {
		position: relative;
		height: calc(295 * var(--u));
		background: black;
	}

	.thumbnail::after {
		content: '';
		position: absolute;
		inset: 0;
		box-shadow: inset 0 0 0 calc(18 * var(--u)) var(--salmon);
	}

	/* Not in Figma: which one is in the panel above */
	.current .thumbnail::after {
		box-shadow: inset 0 0 0 calc(18 * var(--u)) var(--accent-orange);
	}

	.thumbnail img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.item-name,
	.by {
		margin: calc(8 * var(--u)) 0 0;
		font: 400 calc(40 * var(--u)) / calc(42 * var(--u)) var(--font-serif);
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.item-name {
		margin-top: calc(12 * var(--u));
		color: var(--accent-orange);
	}

	.by {
		color: var(--dark-gray);
	}

	.item-hours {
		display: flex;
		align-items: center;
		gap: calc(16 * var(--u));
		margin: calc(2 * var(--u)) 0 0;
		font: 400 calc(40 * var(--u)) / normal var(--font-sans);
		color: var(--accent-orange);
	}

	.item-hours .rule {
		flex: 1;
	}
</style>
