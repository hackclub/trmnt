<script lang="ts">
	import type { LayoutProps } from './$types';

	// Pages draw their own headers: Home has the name and balance, the shop just the balance
	let { children }: LayoutProps = $props();
</script>

{@render children()}
