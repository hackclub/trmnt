<script lang="ts">
	import { resolve } from '$app/paths';
	import BalancePill from '#lib/components/app/BalancePill.svelte';
	import type { User } from '#lib/types.ts';

	let { user }: { user: User } = $props();
</script>

<header>
	<a class="name" href={resolve('home')}>{user.name}</a>
	<BalancePill balance={user.balance} />
	<!-- Not in Figma: tucked under the balance so it doesn't move anything that is -->
	<form class="sign-out" method="POST" action={resolve('auth/signout')}>
		<button>sign out</button>
	</form>
</header>

<style>
	header {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: calc(73 * var(--u));
		padding: calc(31 * var(--u)) calc(48 * var(--u)) 0 0;
	}

	.name {
		position: relative;
		font: 700 calc(64 * var(--u)) / normal var(--font-sans);
		color: var(--accent-orange);
		white-space: nowrap;
	}

	/* Short rules level with the balance's top and bottom edges, off the name's two ends */
	.name::before,
	.name::after {
		content: '';
		position: absolute;
		width: calc(92 * var(--u));
		height: max(1px, calc(2 * var(--u)));
		background: var(--accent-orange);
	}

	.name::before {
		right: 0;
		top: calc(-27 * var(--u));
	}

	.name::after {
		left: 0;
		bottom: calc(-27 * var(--u));
	}

	.sign-out {
		position: absolute;
		right: calc(48 * var(--u));
		top: calc(170 * var(--u));
	}

	.sign-out button {
		padding: 0;
		border: none;
		background: none;
		font: 400 calc(32 * var(--u)) / normal var(--font-sans);
		color: var(--salmon);
		text-decoration: underline;
		cursor: pointer;
	}
</style>
