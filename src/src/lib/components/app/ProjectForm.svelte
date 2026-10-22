<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import { resolve } from '$app/paths';
	import Select from '#lib/components/Select.svelte';
	import diamond from '#lib/assets/figma/diamond-orange.svg';
	import { PROJECT_TYPES, SCREENSHOT_TYPES, type ProjectType } from '#lib/projects.ts';
	import type { OwnProject } from '#lib/types.ts';

	// The popup for creating a project, centred over Home with everything behind it dimmed and
	// blurred. Given a project, it's the one for submitting that project instead: the same form,
	// filled in, laid out a little differently, and with the screenshot required.
	let {
		project,
		hackatime,
		linkableProjects,
		problem
	}: {
		/** The project being submitted; creating a project leaves this out */
		project?: OwnProject;
		hackatime: { enabled: boolean; connected: boolean };
		/** Streamed from the server; null when Hackatime can't be read */
		linkableProjects: Promise<string[] | null>;
		/** Why the last attempt was turned down, maybe with where to go about it */
		problem?: { message: string; link?: { href: string; label: string } };
	} = $props();

	/** Where things sit, in Figma pixels from the popup's top-left corner */
	const LAYOUTS = {
		create: {
			heading: 99,
			screenshot: 208,
			topPosts: { xs: [282, 292], length: 156 },
			bottomPosts: { y: 714, length: 556 },
			typeLabel: 336,
			type: 405,
			hackatimeLabel: 515,
			hackatime: 582
		},
		submit: {
			heading: 102,
			screenshot: 285,
			topPosts: { xs: [182, 192], length: 233 },
			bottomPosts: { y: 791, length: 479 },
			typeLabel: 349,
			type: 418,
			hackatimeLabel: 549,
			hackatime: 616
		}
	};

	// The popup is made afresh for each project it submits, so these start from that project
	/* svelte-ignore state_referenced_locally */
	const submitting = project;
	const layout = submitting ? LAYOUTS.submit : LAYOUTS.create;
	const titleId = $props.id();

	let dialog: HTMLDialogElement;
	/**
	 * Not in Figma: submitting takes a second step for the code link, playable link and
	 * description that the Unified YSWS database needs, which the designed panel has no room for
	 */
	let step = $state<1 | 2>(1);
	let type = $state<ProjectType>(submitting?.type ?? 'custom_plugin');
	let hackatimeProjects = $state<string[]>(submitting?.hackatimeProjects ?? []);
	let preview = $state<string | null>(submitting?.thumbnail ?? null);

	const typeOptions = Object.entries(PROJECT_TYPES).map(([value, label]) => ({ value, label }));
	// Coming back from connecting Hackatime reopens the form
	const reopen = submitting ? `${resolve('home')}?submit=${submitting.id}` : `${resolve('home')}?create`;
	const connectHackatime = `${resolve('connect/hackatime')}?redirectTo=${encodeURIComponent(reopen)}`;

	/** A project being submitted keeps its own Hackatime projects as options */
	function hackatimeOptions(linkable: string[] | null) {
		const names = [...new Set([...(submitting?.hackatimeProjects ?? []), ...(linkable ?? [])])];
		return names.map((name) => ({ value: name, label: name }));
	}

	export function show() {
		dialog.showModal();
	}

	function pickScreenshot(event: Event) {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
		preview = file ? URL.createObjectURL(file) : (submitting?.thumbnail ?? null);
	}

	const submit: SubmitFunction = ({ cancel }) => {
		// Enter on the first step moves on rather than submitting half the form
		if (submitting && step === 1) {
			cancel();
			step = 2;
			return;
		}
		return async ({ result, update }) => {
			if (result.type === 'redirect') {
				dialog.close();
				preview = null;
				hackatimeProjects = [];
			}
			await update();
		};
	};

	// The backdrop is part of the dialog element, so a click that lands on the dialog itself
	// rather than anything in it is a click outside the panel
	function closeOnBackdrop(event: MouseEvent) {
		if (event.target === dialog) dialog.close();
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog
	bind:this={dialog}
	aria-labelledby={titleId}
	onclick={closeOnBackdrop}
	style:--heading-top={layout.heading}
	style:--screenshot-top={layout.screenshot}
	style:--type-label-top={layout.typeLabel}
	style:--type-top={layout.type}
	style:--hackatime-label-top={layout.hackatimeLabel}
	style:--hackatime-top={layout.hackatime}
>
	<form
		method="POST"
		action={submitting ? '?/submitProject' : '?/createProject'}
		enctype="multipart/form-data"
		class:second-step={step === 2}
		use:enhance={submit}
	>
		{#if submitting}
			<input type="hidden" name="project" value={submitting.id} />
		{/if}
		<div class="panel"></div>

		<!-- Hairlines: two posts down to the screenshot, three from it to the panel's foot, and pairs
		     running out from either side of the main button -->
		{#each layout.topPosts.xs as x (x)}
			<span class="post" style:--x={x} style:--y={52} style:--length={layout.topPosts.length}></span>
		{/each}
		{#each [705, 717, 729] as x (x)}
			<span class="post" style:--x={x} style:--y={layout.bottomPosts.y} style:--length={layout.bottomPosts.length}></span>
		{/each}
		<span class="rail" style:--x={1191} style:--y={1014} style:--length={470}></span>
		<span class="rail" style:--x={1191} style:--y={1022} style:--length={155}></span>
		<span class="rail" style:--x={171} style:--y={1122} style:--length={357}></span>
		<span class="rail" style:--x={57} style:--y={1134} style:--length={471}></span>

		<h2 id={titleId}>
			<img src={diamond} alt="" />
			{submitting ? 'submit your project!' : 'project creation'}
			<img src={diamond} alt="" />
		</h2>

		{#if submitting}
			<p class="looking-good">looking good?</p>
		{/if}
		<div class="screenshot">
			{#if preview}
				<img class="preview" src={preview} alt="Your screenshot" />
			{/if}
			<label class="upload" class:has-preview={preview}>
				{preview ? 'change screenshot' : 'upload screenshot'}
				<input
					class="visually-hidden"
					type="file"
					name="screenshot"
					accept={SCREENSHOT_TYPES.join(',')}
					onchange={pickScreenshot}
				/>
			</label>
		</div>
		{#if submitting}
			<p class="screenshot-note submit-note">your screenshot should show your project running!</p>
		{:else}
			<p class="screenshot-note">
				optional for now, but if you have a screenshot of your project running put it here!
			</p>
		{/if}

		<label class="label name-label" for="{titleId}-name">- name -</label>
		<!-- Opening the popup focuses this rather than the hidden file picker, which would hold the
		     upload button over a picked screenshot -->
		<!-- svelte-ignore a11y_autofocus -->
		<input
			autofocus
			id="{titleId}-name"
			class="name"
			name="name"
			value={submitting?.name ?? ''}
			placeholder="your awesome project"
			maxlength="80"
			autocomplete="off"
			required
		/>

		<span class="label type-label">- type -</span>
		<div class="type">
			<Select name="type" label="type" options={typeOptions} bind:value={type} />
		</div>

		<span class="label hackatime-label">- hackatime projects -</span>
		<div class="hackatime">
			{#if !hackatime.enabled}
				<Select name="hackatimeProjects" label="hackatime projects" options={[]} placeholder="not set up yet" />
			{:else if !hackatime.connected}
				<a class="connect" href={connectHackatime} data-sveltekit-reload>connect hackatime</a>
			{:else}
				{#await linkableProjects}
					<Select name="hackatimeProjects" label="hackatime projects" options={[]} placeholder="loading..." />
				{:then linkable}
					{@const options = hackatimeOptions(linkable)}
					<!-- Their time adds up into this project's hours -->
					<Select
						name="hackatimeProjects"
						label="hackatime projects"
						{options}
						placeholder={options.length ? 'pick your projects' : 'no projects yet'}
						multiple
						bind:values={hackatimeProjects}
					/>
				{/await}
			{/if}
		</div>

		{#if submitting}
			<!-- The second step's fields, in the first step's style -->
			<label class="label second code-label" for="{titleId}-code">- code link -</label>
			<input
				id="{titleId}-code"
				class="field second code"
				name="codeUrl"
				type="url"
				value={submitting.repoUrl ?? ''}
				placeholder="https://github.com/you/your-project"
			/>
			<label class="label second playable-label" for="{titleId}-playable">- playable link -</label>
			<input
				id="{titleId}-playable"
				class="field second playable"
				name="playableUrl"
				type="url"
				value={submitting.demoUrl ?? ''}
				placeholder="where people can try it"
			/>
			<label class="label second description-label" for="{titleId}-description">- description -</label>
			<textarea
				id="{titleId}-description"
				class="field second description"
				name="description"
				maxlength="2000"
				placeholder="what it does and who it's for"
			>{submitting.description}</textarea>
			<button type="button" class="back second" onclick={() => (step = 1)}>back</button>
		{/if}

		{#if submitting && step === 1}
			<button type="button" class="main" onclick={() => (step = 2)}>next</button>
		{:else}
			<button class="main">{submitting ? 'submit' : 'create!'}</button>
		{/if}

		{#if problem}
			<!-- Not in Figma: why the last attempt was turned down -->
			<p class="problem" role="alert">
				{problem.message}
				{#if problem.link}
					<a href={problem.link.href} data-sveltekit-reload>{problem.link.label}</a>
				{/if}
			</p>
		{:else if submitting?.status === 'changes_requested' && submitting.reason}
			<!-- Not in Figma: what the reviewer asked for, while resubmitting -->
			<p class="review-note">needs changes: {submitting.reason}</p>
		{:else if submitting}
			<p class="review-note">
				your project will be reviewed shortly! keep an eye out in case i let you know it needs changes.
			</p>
		{/if}
	</form>
</dialog>

<style>
	/* Positions are from the popup's top-left corner in Figma */
	dialog {
		width: calc(1719 * var(--u));
		height: calc(1332 * var(--u));
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

	form,
	.panel {
		position: absolute;
	}

	form {
		inset: 0;
	}

	.panel {
		left: calc(57 * var(--u));
		top: calc(52 * var(--u));
		width: calc(1604 * var(--u));
		height: calc(1218 * var(--u));
		background: var(--off-white);
	}

	/* Hairlines are boxes, not images, so they snap to whole screen pixels and never thin out */
	.post,
	.rail {
		position: absolute;
		left: calc(var(--x) * var(--u));
		top: calc(var(--y) * var(--u));
	}

	.post {
		width: max(1px, calc(1 * var(--u)));
		height: calc(var(--length) * var(--u));
		background: var(--maroon);
	}

	.rail {
		width: calc(var(--length) * var(--u));
		height: max(1px, calc(1 * var(--u)));
		background: var(--accent-orange);
	}

	h2 {
		position: absolute;
		left: 0;
		right: 0;
		top: calc(var(--heading-top) * var(--u));
		display: flex;
		align-items: center;
		justify-content: center;
		gap: calc(16 * var(--u));
		margin: 0;
		font: 700 calc(48 * var(--u)) / normal var(--font-serif);
		color: var(--accent-orange);
	}

	h2 img {
		width: calc(48 * var(--u));
		height: auto;
	}

	.looking-good {
		position: absolute;
		left: calc(101 * var(--u));
		top: calc(215 * var(--u));
		width: calc(746 * var(--u));
		margin: 0;
		font: 700 calc(48 * var(--u)) / normal var(--font-serif);
		color: var(--accent-orange);
		text-align: center;
	}

	.screenshot {
		position: absolute;
		left: calc(101 * var(--u));
		top: calc(var(--screenshot-top) * var(--u));
		width: calc(746 * var(--u));
		height: calc(506 * var(--u));
		background: black;
	}

	/* The frame is drawn over the screenshot, as Figma's inside stroke is */
	.screenshot::after {
		content: '';
		position: absolute;
		inset: 0;
		box-shadow: inset 0 0 0 calc(18 * var(--u)) var(--salmon);
		pointer-events: none;
	}

	.preview {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.upload {
		position: absolute;
		left: calc(141 * var(--u));
		top: calc(197 * var(--u));
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: center;
		width: calc(465 * var(--u));
		height: calc(113 * var(--u));
		border: calc(8 * var(--u)) solid var(--accent-orange);
		background: black;
		font: italic 500 calc(48 * var(--u)) / normal var(--font-sans);
		color: var(--salmon);
		white-space: nowrap;
		cursor: pointer;
	}

	/* Out of the way of a picked screenshot until it's wanted */
	.upload.has-preview {
		opacity: 0;
	}

	.screenshot:hover .upload,
	.upload:focus-within {
		opacity: 1;
	}

	.screenshot-note,
	.review-note {
		position: absolute;
		display: flex;
		align-items: center;
		margin: 0;
		font: italic 500 calc(24 * var(--u)) / normal var(--font-sans);
		color: var(--salmon);
	}

	/* Figma's box is shorter than its two lines, which overhang it evenly */
	.screenshot-note {
		left: calc(101 * var(--u));
		top: calc(730 * var(--u));
		justify-content: center;
		width: calc(604 * var(--u));
		height: calc(39 * var(--u));
		text-align: center;
	}

	.screenshot-note.submit-note {
		left: calc(103 * var(--u));
		top: calc(796 * var(--u));
		justify-content: flex-start;
		text-align: left;
	}

	.review-note {
		left: calc(735 * var(--u));
		top: calc(1134 * var(--u));
		justify-content: center;
		width: calc(456 * var(--u));
		height: calc(95 * var(--u));
		font-size: calc(20 * var(--u));
		text-align: center;
	}

	.label {
		position: absolute;
		left: calc(908 * var(--u));
		width: calc(685 * var(--u));
		font: 500 calc(48 * var(--u)) / normal var(--font-serif);
		color: var(--accent-orange);
		text-align: center;
		white-space: nowrap;
	}

	.name-label {
		top: calc(167 * var(--u));
	}

	.type-label {
		top: calc(var(--type-label-top) * var(--u));
	}

	.hackatime-label {
		top: calc(var(--hackatime-label-top) * var(--u));
	}

	.name,
	.type,
	.hackatime {
		position: absolute;
		left: calc(908 * var(--u));
	}

	.name {
		top: calc(228 * var(--u));
	}

	.type {
		top: calc(var(--type-top) * var(--u));
		/* Its list opens over the fields below */
		z-index: 2;
	}

	.hackatime {
		top: calc(var(--hackatime-top) * var(--u));
		z-index: 1;
	}

	.name,
	.connect {
		box-sizing: border-box;
		width: calc(685 * var(--u));
		height: calc(113 * var(--u));
		border: calc(8 * var(--u)) solid var(--salmon);
		background: var(--off-white);
		font: italic 500 calc(48 * var(--u)) / normal var(--font-sans);
	}

	.name {
		padding: 0 calc(29 * var(--u));
		color: var(--dark-gray);
	}

	.name::placeholder {
		color: var(--salmon);
	}

	.connect {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--salmon);
		text-decoration: underline;
	}

	.main {
		position: absolute;
		left: calc(528 * var(--u));
		top: calc(990 * var(--u));
		width: calc(662.5 * var(--u));
		height: calc(161 * var(--u));
		border: calc(8 * var(--u)) solid var(--accent-orange);
		background: var(--off-white);
		font: italic 500 calc(62 * var(--u)) / normal var(--font-sans);
		color: var(--accent-orange);
		cursor: pointer;
	}

	/* Each step shows only its own parts; the other's stay in the form, so nothing is lost */
	.second {
		display: none;
	}

	.second-step .second {
		display: flex;
	}

	.second-step :is(.post, .looking-good, .screenshot, .screenshot-note, .name-label, .name, .type-label, .type, .hackatime-label, .hackatime) {
		display: none;
	}

	.second-step .label.second {
		display: block;
	}

	.code-label,
	.playable-label,
	.description-label {
		left: calc(160 * var(--u));
		width: calc(1400 * var(--u));
	}

	.code-label {
		top: calc(196 * var(--u));
	}

	.playable-label {
		top: calc(386 * var(--u));
	}

	.description-label {
		top: calc(576 * var(--u));
	}

	.field {
		position: absolute;
		left: calc(160 * var(--u));
		box-sizing: border-box;
		width: calc(1400 * var(--u));
		margin: 0;
		padding: 0 calc(29 * var(--u));
		border: calc(8 * var(--u)) solid var(--salmon);
		background: var(--off-white);
		font: italic 500 calc(48 * var(--u)) / normal var(--font-sans);
		color: var(--dark-gray);
	}

	.field::placeholder {
		color: var(--salmon);
	}

	.code,
	.playable {
		height: calc(113 * var(--u));
	}

	.code {
		top: calc(257 * var(--u));
	}

	.playable {
		top: calc(447 * var(--u));
	}

	.description {
		top: calc(637 * var(--u));
		height: calc(320 * var(--u));
		padding-top: calc(16 * var(--u));
		font-size: calc(36 * var(--u));
		resize: none;
	}

	.back {
		position: absolute;
		left: calc(300 * var(--u));
		top: calc(1040 * var(--u));
		padding: 0;
		border: none;
		background: none;
		font: italic 500 calc(48 * var(--u)) / normal var(--font-sans);
		color: var(--salmon);
		text-decoration: underline;
		cursor: pointer;
	}

	.problem {
		position: absolute;
		left: calc(57 * var(--u));
		top: calc(1170 * var(--u));
		width: calc(1604 * var(--u));
		margin: 0;
		font: 700 calc(32 * var(--u)) / normal var(--font-sans);
		color: var(--accent-orange);
		text-align: center;
	}

	.problem a {
		text-decoration: underline;
	}
</style>
