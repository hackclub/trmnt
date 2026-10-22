import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';

export default defineConfig({
	server: {
		// Under Bun, Vite's default 'localhost' only listens on IPv6 (::1), which tunnels that
		// connect to 127.0.0.1 can't reach. Browsers fall back to this for localhost.
		host: '127.0.0.1',
		// The Tailscale Funnel used for testing sign-in on a real HTTPS address
		allowedHosts: ['printer.osiris-atria.ts.net']
	},
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// No Bun adapter supports SvelteKit 3 yet (svelte-adapter-bun needs Kit 2). adapter-node's
			// output is plain JavaScript, and the Dockerfile runs it with bun.
			adapter: adapter(),

			// resolve() returns paths relative to the current request by default. Those break once
			// stored and used from another URL, like an OAuth callback's return path (which sent the
			// Hackatime callback to /connect/home). The site is always at the root, so absolute is fine.
			paths: { relative: false }
		}),
		// Must come after sveltekit(), so its buildApp hook runs after the adapter's
		keepBunAliveDuringBuild()
	]
});

/**
 * Under Bun, a process whose only remaining work is a finishing worker thread ends before the
 * worker's 'exit' event arrives. SvelteKit analyses and prerenders in workers and waits for that
 * event, so the build used to stop silently after "Analysing routes". Holding a timer open until
 * the last build step keeps the process alive long enough.
 */
function keepBunAliveDuringBuild(): Plugin {
	let timer: ReturnType<typeof setInterval> | undefined;
	const release = () => clearInterval(timer);

	return {
		name: 'keep-bun-alive-during-build',
		apply: 'build',
		buildStart() {
			timer ??= setInterval(() => {}, 1 << 30);
		},
		buildEnd(error) {
			if (error) release();
		},
		buildApp: { order: 'post', handler: async () => release() }
	};
}
