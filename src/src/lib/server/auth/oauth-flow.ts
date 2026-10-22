import type { Cookies } from '@sveltejs/kit';

/** Keeps an OAuth attempt's state while the browser is away at the provider */
export function saveFlow(cookies: Cookies, name: string, path: string, flow: object) {
	cookies.set(name, JSON.stringify(flow), {
		path,
		httpOnly: true,
		// Sent on the top-level redirect back from the provider
		sameSite: 'lax',
		maxAge: 10 * 60
	});
}

/** Reads and clears it. Null if it expired or never existed. */
export function takeFlow<T>(cookies: Cookies, name: string, path: string): T | null {
	const value = cookies.get(name);
	cookies.delete(name, { path });
	return value ? JSON.parse(value) : null;
}
