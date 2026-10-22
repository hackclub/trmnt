<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import { resolve } from '$app/paths';
	import Select from '#lib/components/Select.svelte';
	import diamond from '#lib/assets/figma/diamond-orange.svg';
	import { PROJECT_TYPES, SCREENSHOT_TYPES, type ProjectType } from '#lib/projects.ts';

	// The "project creation" popup, centred over Home with everything behind it dimmed and blurred
	let {
		hackatime,
		linkableProjects,
		problem
	}: {
		hackatime: { enabled: boolean; connected: boolean };
		/** Streamed from the server; null when Hackatime can't be read */
		linkableProjects: Promise<string[] | null>;
		/** Why the last attempt was turned down */
		problem?: string;
	} = $props();

	let dialog: HTMLDialogElement;
	let type = $state<ProjectType>('custom_plugin');
	let hackatimeProjects = $state<string[]>([]);
	let preview = $state<string | null>(null);

	const typeOptions = Object.entries(PROJECT_TYPES).map(([value, label]) => ({ value, label }));
	// Coming back from connecting Hackatime reopens the form
	const connectHackatime = `${resolve('connect/hackatime')}?redirectTo=${encodeURIComponent(`${resolve('home')}?create`)}`;

	export function show() {
		dialog.showModal();
	}

	function pickScreenshot(event: Event) {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		if (preview) URL.revokeObjectURL(preview);
		preview = file ? URL.createObjectURL(file) : null;
	}

	const submit: SubmitFunction = () => {
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
<dialog bind:this={dialog} aria-labelledby="project-form-title" onclick={closeOnBackdrop}>
	<form method="POST" action="?/createProject" enctype="multipart/form-data" use:enhance={submit}>
		<div class="panel"></div>

		<!-- Hairlines: two posts down to the screenshot, three from it to the panel's foot, and pairs
		     running out from either side of the create button -->
		{#each [282, 292] as x}
			<span class="post" style:--x={x} style:--y={52} style:--length={156}></span>
		{/each}
		{#each [705, 717, 729] as x}
			<span class="post" style:--x={x} style:--y={714} style:--length={556}></span>
		{/each}
		<span class="rail" style:--x={1191} style:--y={1014} style:--length={470}></span>
		<span class="rail" style:--x={1191} style:--y={1022} style:--length={155}></span>
		<span class="rail" style:--x={171} style:--y={1122} style:--length={357}></span>
		<span class="rail" style:--x={57} style:--y={1134} style:--length={471}></span>

		<h2 id="project-form-title">
			<img src={diamond} alt="" />
			project creation
			<img src={diamond} alt="" />
		</h2>

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
		<p class="screenshot-note">
			optional for now, but if you have a screenshot of your project running put it here!
		</p>

		<label class="label name-label" for="project-name">- name -</label>
		<!-- Opening the popup focuses this rather than the hidden file picker, which would hold the
		     upload button over a picked screenshot -->
		<!-- svelte-ignore a11y_autofocus -->
		<input
			autofocus
			id="project-name"
			class="name"
			name="name"
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
				{:then names}
					<!-- Their time adds up into this project's hours -->
					<Select
						name="hackatimeProjects"
						label="hackatime projects"
						options={(names ?? []).map((name) => ({ value: name, label: name }))}
						placeholder={names?.length ? 'pick your projects' : 'no projects yet'}
						multiple
						bind:values={hackatimeProjects}
					/>
				{/await}
			{/if}
		</div>

		<button class="create">create!</button>

		{#if problem}
			<!-- Not in Figma: why a project wasn't created -->
			<p class="problem" role="alert">{problem}</p>
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
		top: calc(99 * var(--u));
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

	.screenshot {
		position: absolute;
		left: calc(101 * var(--u));
		top: calc(208 * var(--u));
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

	.screenshot-note {
		position: absolute;
		left: calc(101 * var(--u));
		top: calc(730 * var(--u));
		/* Figma's box is shorter than its two lines, which overhang it evenly */
		display: flex;
		align-items: center;
		justify-content: center;
		width: calc(604 * var(--u));
		height: calc(39 * var(--u));
		margin: 0;
		font: italic 500 calc(24 * var(--u)) / normal var(--font-sans);
		color: var(--salmon);
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
		top: calc(336 * var(--u));
	}

	.hackatime-label {
		top: calc(515 * var(--u));
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
		top: calc(405 * var(--u));
		/* Its list opens over the fields below */
		z-index: 2;
	}

	.hackatime {
		top: calc(582 * var(--u));
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

	.create {
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
</style>
