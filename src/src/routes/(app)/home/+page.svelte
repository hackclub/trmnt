<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import AppHeader from '#lib/components/app/AppHeader.svelte';
	import ProjectCard from '#lib/components/app/ProjectCard.svelte';
	import ProjectForm from '#lib/components/app/ProjectForm.svelte';
	import SectionHeading from '#lib/components/SectionHeading.svelte';
	import plus from '#lib/assets/figma/plus.svg';
	import type { OwnProject } from '#lib/types.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let createForm: ProjectForm;
	let submitForm = $state<ProjectForm>();
	/** The project the submit popup is for */
	let submitting = $state<OwnProject | null>(null);

	// Projects waiting on a reviewer leave "your projects" for a section of their own
	const yours = $derived(data.yourProjects.filter((project) => project.status !== 'pending'));
	const underReview = $derived(data.yourProjects.filter((project) => project.status === 'pending'));

	async function openSubmit(project: OwnProject) {
		submitting = project;
		await tick();
		submitForm?.show();
	}

	// Coming back from connecting Hackatime or linking Hack Club partway through creating or
	// submitting a project reopens its form
	onMount(() => {
		if (page.url.searchParams.has('create')) createForm.show();
		const project = data.yourProjects.find((p) => p.id === page.url.searchParams.get('submit'));
		if (project) openSubmit(project);
	});
</script>

<svelte:head>
	<title>Home — TRMNT</title>
</svelte:head>

<!-- A full-width rule paired with a shorter one, which the second divider mirrors -->
{#snippet divider(flipped: boolean)}
	<div class="divider" class:flipped>
		<span class="full"></span>
		<span class="short"></span>
	</div>
{/snippet}

<AppHeader user={data.user} />

<main>
	<h1 class="visually-hidden">Home</h1>

	<!-- Not in Figma: hours stay at zero until this is done, so it needs saying somewhere -->
	{#if data.hackatime.enabled && !data.hackatime.connected}
		<p class="notice">
			{data.hackatime.failed
				? 'Hackatime didn’t connect. Try again:'
				: 'Your coding time comes from Hackatime.'}
			<a href={resolve('connect/hackatime')} data-sveltekit-reload>connect Hackatime</a>
		</p>
	{/if}

	<section>
		<SectionHeading>your projects</SectionHeading>
		<div class="grid yours">
			{#each yours as project (project.id)}
				<ProjectCard
					{project}
					frame={project.status === 'approved' ? 'approved' : 'plain'}
					onsubmit={() => openSubmit(project)}
				/>
			{/each}
		</div>
	</section>

	<button class="create" type="button" onclick={() => createForm.show()}>
		<img src={plus} alt="" />
		create a project
	</button>

	{#if underReview.length > 0}
		<section class="under-review">
			<h2>- under review -</h2>
			<div class="reviewing">
				{#each underReview as project (project.id)}
					<ProjectCard {project} frame="review" />
				{/each}
			</div>
		</section>
	{/if}

	{@render divider(false)}
	<section>
		<SectionHeading>latest projects</SectionHeading>
		{#if data.latestProjects.length === 0}
			<p class="placeholder">nothing yet!</p>
		{:else}
			<div class="grid">
				{#each data.latestProjects as project (project.id)}
					<ProjectCard {project} />
				{/each}
			</div>
		{/if}
	</section>
	{@render divider(true)}

	<a class="shop" href={resolve('shop')}><span>shop!</span></a>
</main>

<ProjectForm
	bind:this={createForm}
	hackatime={data.hackatime}
	linkableProjects={data.linkableProjects}
	problem={form?.create}
/>

<!-- Made afresh for each project, so the form starts from that project's details -->
{#if submitting}
	{#key submitting.id}
		<ProjectForm
			bind:this={submitForm}
			project={submitting}
			hackatime={data.hackatime}
			linkableProjects={data.linkableProjects}
			problem={form?.submit?.projectId === submitting.id ? form.submit : undefined}
		/>
	{/key}
{/if}

<style>
	main {
		padding: calc(35 * var(--u)) 0 calc(181 * var(--u));
	}

	section,
	.notice {
		padding: 0 calc(108 * var(--u));
	}

	.notice {
		margin: 0 0 calc(24 * var(--u));
		font: 400 calc(32 * var(--u)) / normal var(--font-sans);
		color: var(--off-white);
	}

	.notice a {
		color: var(--salmon);
		text-decoration: underline;
	}

	/* Figma sets the latest row a touch further below its heading than yours */
	.divider + section {
		--below-heading: 38;
		margin-top: calc(58.5 * var(--u));
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, calc(435 * var(--u)));
		gap: calc(57 * var(--u));
		margin-top: calc(var(--below-heading, 35) * var(--u));
	}

	/* Three centred columns, set further below the heading so the tags across the first row's
	   corners clear it */
	.grid.yours {
		grid-template-columns: repeat(3, calc(435 * var(--u)));
		justify-content: center;
		gap: calc(104 * var(--u)) calc(139 * var(--u));
		margin-top: calc(57 * var(--u));
	}

	/* Between the rules that run out to the card column's edges */
	.under-review {
		padding: 0;
		margin-bottom: calc(122.5 * var(--u));
	}

	.under-review h2 {
		position: relative;
		margin: 0;
		font: italic 500 calc(48 * var(--u)) / normal var(--font-serif);
		color: var(--salmon);
		text-align: center;
	}

	.under-review h2::before,
	.under-review h2::after {
		content: '';
		position: absolute;
		top: calc(31 * var(--u));
		width: calc(691 * var(--u));
		height: max(1px, calc(1 * var(--u)));
		background: white;
	}

	.under-review h2::before {
		left: calc(51 * var(--u));
	}

	.under-review h2::after {
		left: calc(1177 * var(--u));
	}

	.reviewing {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: calc(104 * var(--u)) calc(139 * var(--u));
		margin-top: calc(54 * var(--u));
	}

	/* Takes up a row of cards' height, so the page keeps its shape while there are none */
	.placeholder {
		display: grid;
		place-items: center;
		height: calc(397 * var(--u));
		margin: calc(var(--below-heading, 35) * var(--u)) 0 0;
		font: 400 calc(48 * var(--u)) / normal var(--font-sans);
		color: var(--off-white);
	}

	/* Three quarters of its size in Figma, centred where Figma centres it; --b is one of its Figma
	   pixels at that scale */
	.create {
		--b: calc(0.75 * var(--u));
		display: flex;
		align-items: center;
		gap: calc(40 * var(--b));
		width: calc(819 * var(--b));
		height: calc(176 * var(--b));
		margin: calc(82 * var(--u)) auto calc(118.5 * var(--u));
		padding: 0 0 0 calc(43 * var(--b));
		border: none;
		background: var(--accent-orange);
		font: 400 calc(80 * var(--b)) / normal var(--font-sans);
		color: white;
		cursor: pointer;
	}

	.create img {
		width: calc(111 * var(--b));
		height: auto;
	}

	.divider {
		display: flex;
		flex-direction: column;
		gap: calc(32 * var(--u));
		margin: 0 calc(106 * var(--u));
	}

	/* Boxes rather than images, so they snap to whole screen pixels and never thin out */
	.divider span {
		display: block;
		height: max(1px, calc(3 * var(--u)));
		background: var(--salmon);
	}

	.full {
		width: 100%;
	}

	.short {
		align-self: flex-end;
		width: calc(1119 * var(--u));
	}

	.divider.flipped {
		flex-direction: column-reverse;
		margin-top: calc(104.5 * var(--u));
	}

	.flipped .short {
		align-self: flex-start;
	}

	/* An off-white panel set into an orange slab, a little off-centre the way Figma has it */
	.shop {
		position: relative;
		display: block;
		width: calc(502 * var(--u));
		height: calc(187 * var(--u));
		margin: calc(200.5 * var(--u)) auto 0;
		background: var(--accent-orange);
	}

	.shop span {
		position: absolute;
		left: calc(27 * var(--u));
		top: calc(26 * var(--u));
		display: flex;
		align-items: center;
		justify-content: center;
		width: calc(451 * var(--u));
		height: calc(135.44 * var(--u));
		background: var(--off-white);
		font: 400 calc(80 * var(--u)) / normal var(--font-sans);
		color: var(--accent-orange);
	}
</style>
