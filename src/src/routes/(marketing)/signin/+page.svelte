<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// Reasons the Hack Club callback can send back
	const problems: Record<string, string> = {
		expired: 'That sign-in took too long. Try again.',
		hackclub: 'Hack Club couldn\'t sign you in. Try again.',
		no_email: 'Your Hack Club account doesn\'t have a verified email address.',
		email_taken: 'That email belongs to an account linked to a different Hack Club account.',
		linked_elsewhere: 'That Hack Club account is already linked to another TRMNT account.',
		banned: 'This account has been banned from TRMNT.'
	};

	const query = $derived(`?redirectTo=${encodeURIComponent(data.redirectTo)}`);

	// Hairlines running in from the window's edges at the top: [y, length]
	const leftLines = [
		[72, 792],
		[87, 678],
		[102, 774]
	];
</script>

<svelte:head>
	<title>Sign in — TRMNT</title>
</svelte:head>

<main class="signin">
	{#each leftLines as [y, length]}
		<span class="line from-left" style:--y={y} style:--length={length}></span>
	{/each}
	<span class="line from-right" style:--y={87} style:--length={780}></span>
	<!-- Diagonals across the top corners -->
	<span class="diagonal left-a"></span>
	<span class="diagonal left-b"></span>
	<span class="diagonal right-a"></span>
	<span class="diagonal right-b"></span>

	<!-- Ornaments in the bottom corners, each set kept in its corner of the window -->
	<div class="corner left">
		<span class="upright" style:--x={48} style:--y={839}></span>
		<span class="upright" style:--x={78} style:--y={964}></span>
		<span class="slant" style:--x={0} style:--y={940} style:--length={240.78} style:--angle={-34.68}></span>
		<span class="slant" style:--x={0} style:--y={960} style:--length={240.78} style:--angle={-34.68}></span>
		<span class="arc" style:--cx={0.5} style:--cy={1079} style:--r={142.8}></span>
	</div>
	<div class="corner right">
		<span class="arc" style:--cx={1890} style:--cy={1047} style:--r={234}></span>
		<span class="arc" style:--cx={1913} style:--cy={1070} style:--r={211}></span>
		<span class="arc" style:--cx={1938.75} style:--cy={1095.75} style:--r={184.75}></span>
		<span class="slant" style:--x={1613} style:--y={891} style:--length={256.84} style:--angle={47.05}></span>
		<span class="slant" style:--x={1656} style:--y={823} style:--length={352.28} style:--angle={46.61}></span>
		<span class="slant" style:--x={1705} style:--y={790} style:--length={316.99} style:--angle={47.05}></span>
	</div>

	<h1>sign-in</h1>

	{#if data.hackClubAuthEnabled}
		<!-- A full page load, since this leaves the site for Hack Club -->
		<a class="button hack-club" href={resolve('auth/hackclub') + query} data-sveltekit-reload>
			sign in with hack club
		</a>
	{/if}

	<span class="line short" style:--y={509}></span>
	<span class="line long" style:--y={530}></span>
	<span class="line long" style:--y={550}></span>
	<span class="line short" style:--y={570}></span>

	<h2>sign in with your email</h2>

	{#if form?.codeSent}
		<form class="row" method="POST" action="?/verifyCode" use:enhance>
			<input type="hidden" name="email" value={form.email} />
			<input type="hidden" name="redirectTo" value={data.redirectTo} />
			<input
				class="field"
				name="code"
				placeholder="your code"
				aria-label="code"
				inputmode="numeric"
				autocomplete="one-time-code"
				maxlength="6"
				required
			/>
			<button class="button">sign in</button>
		</form>
	{:else}
		<form class="row" method="POST" action="?/sendCode" use:enhance>
			<input
				class="field"
				type="email"
				name="email"
				placeholder="your email"
				aria-label="email"
				value={form?.email ?? ''}
				autocomplete="email"
				required
			/>
			<button class="button">get a code</button>
		</form>
	{/if}

	<!-- Not in Figma: what's said after a code is sent, and when something goes wrong -->
	<div class="notes">
		{#if form?.codeSent}
			<p>
				we sent a code to {form.email}. it works for {data.codeLifetime} minutes.
				<a href={query}>use a different email</a>
			</p>
		{/if}
		{#if form?.message}
			<p class="problem" role="alert">{form.message}</p>
		{:else if data.problem}
			<p class="problem" role="alert">
				{problems[data.problem] ?? 'Something went wrong signing in. Try again.'}
			</p>
		{/if}
	</div>
</main>

<style>
	/* Sign-in is one 1080px-tall screen, so like the shop it fills the window's height rather than
	   the 1470px the front page fits. The gutter is worked out again from the new --u. */
	:global(.artboard:has(> .signin)) {
		--u: min(100cqw / 1920, 100svh / 1080);
		--gutter: calc((100cqw - 1920 * var(--u)) / 2);
	}

	main {
		position: relative;
		height: calc(1080 * var(--u));
		/* Narrow windows leave room below; reaching the bottom keeps the corner ornaments there */
		min-height: 100svh;
	}

	/* Hairlines are boxes, not images, so they snap to whole screen pixels and never thin out */
	.line,
	.diagonal {
		position: absolute;
		height: max(1px, calc(1 * var(--u)));
		background: var(--salmon);
	}

	.line {
		top: calc(var(--y) * var(--u));
	}

	/* These carry on into a wide window's margins, to the window's edges */
	.from-left {
		left: calc(-1 * var(--gutter));
		width: calc(var(--length) * var(--u) + var(--gutter));
	}

	.from-right {
		right: calc(-1 * var(--gutter));
		width: calc(var(--length) * var(--u) + var(--gutter));
	}

	.long {
		left: calc(468 * var(--u));
		width: calc(984 * var(--u));
	}

	.short {
		left: calc(832 * var(--u));
		width: calc(255 * var(--u));
		background: var(--accent-orange);
	}

	/* Each starts at Figma's end point and turns about it, so it meets the window's corner edge */
	.diagonal {
		transform-origin: 0 50%;
	}

	.left-a {
		left: calc(-1 * var(--gutter));
		top: calc(117 * var(--u));
		width: calc(153.26 * var(--u));
		rotate: -49.76deg;
	}

	.left-b {
		left: calc(-1 * var(--gutter));
		top: calc(138 * var(--u));
		width: calc(179 * var(--u));
		rotate: -50.44deg;
	}

	.right-a {
		left: calc(1705 * var(--u) + var(--gutter));
		top: calc(20.3 * var(--u));
		width: calc(304 * var(--u));
		rotate: 44.99deg;
	}

	.right-b {
		left: calc(1745 * var(--u) + var(--gutter));
		top: calc(31.3 * var(--u));
		width: calc(246.9 * var(--u));
		rotate: 44.87deg;
	}

	/* As big as the artboard, so what's inside keeps Figma's coordinates and is cropped where
	   Figma's frame crops it, but pinned to the window's bottom corner */
	.corner {
		position: absolute;
		bottom: 0;
		width: calc(1920 * var(--u));
		height: calc(1080 * var(--u));
		overflow: clip;
		pointer-events: none;
	}

	.corner.left {
		left: calc(-1 * var(--gutter));
	}

	.corner.right {
		right: calc(-1 * var(--gutter));
	}

	.upright,
	.slant,
	.arc {
		position: absolute;
	}

	.upright,
	.slant {
		left: calc(var(--x) * var(--u));
		top: calc(var(--y) * var(--u));
	}

	/* Down to the frame's bottom edge */
	.upright {
		width: max(1px, calc(1 * var(--u)));
		height: calc((1080 - var(--y)) * var(--u));
		background: var(--off-white);
	}

	/* From the left end, turned about it */
	.slant {
		width: calc(var(--length) * var(--u));
		height: max(1px, calc(1 * var(--u)));
		background: var(--off-white);
		transform-origin: 0 50%;
		rotate: calc(var(--angle) * 1deg);
	}

	/* Whole circles, given by centre and radius, that the corner crops to arcs. The border
	   straddles the radius like Figma's stroke. */
	.arc {
		left: calc((var(--cx) - var(--r) - 0.5) * var(--u));
		top: calc((var(--cy) - var(--r) - 0.5) * var(--u));
		box-sizing: border-box;
		width: calc((2 * var(--r) + 1) * var(--u));
		aspect-ratio: 1;
		border: max(1px, calc(1 * var(--u))) solid var(--salmon);
		border-radius: 50%;
	}

	h1,
	h2 {
		position: absolute;
		left: 0;
		right: 0;
		margin: 0;
		text-align: center;
		white-space: nowrap;
	}

	h1 {
		top: calc(20 * var(--u));
		font: italic 500 calc(96 * var(--u)) / normal var(--font-serif);
		color: var(--accent-orange);
	}

	h2 {
		top: calc(629 * var(--u));
		font: 500 calc(48 * var(--u)) / normal var(--font-serif);
		color: var(--salmon);
	}

	.button {
		display: flex;
		align-items: center;
		justify-content: center;
		height: calc(105 * var(--u));
		padding: 0;
		border: none;
		background: var(--accent-orange);
		font: italic 500 calc(48 * var(--u)) / normal var(--font-sans);
		color: var(--off-white);
		white-space: nowrap;
		cursor: pointer;
	}

	.hack-club {
		position: absolute;
		left: calc((1920 - 677) / 2 * var(--u));
		top: calc(286 * var(--u));
		width: calc(677 * var(--u));
	}

	.row {
		position: absolute;
		left: calc(440 * var(--u));
		top: calc(766 * var(--u));
		display: flex;
		align-items: center;
		gap: calc(32 * var(--u));
	}

	.row .button {
		width: calc(331 * var(--u));
	}

	.field {
		box-sizing: border-box;
		width: calc(677 * var(--u));
		height: calc(113 * var(--u));
		padding: 0 calc(29 * var(--u));
		border: calc(8 * var(--u)) solid var(--salmon);
		background: var(--off-white);
		font: italic 500 calc(48 * var(--u)) / normal var(--font-sans);
		color: var(--dark-gray);
	}

	.field::placeholder {
		color: var(--salmon);
	}

	.notes {
		position: absolute;
		left: calc(440 * var(--u));
		top: calc(910 * var(--u));
		width: calc(1040 * var(--u));
		display: flex;
		flex-direction: column;
		gap: calc(12 * var(--u));
		font: 400 calc(32 * var(--u)) / normal var(--font-sans);
		color: var(--off-white);
		text-align: center;
	}

	.notes p {
		margin: 0;
	}

	.notes a {
		color: var(--salmon);
		text-decoration: underline;
	}

	.problem {
		color: var(--salmon);
		font-weight: 700;
	}
</style>
