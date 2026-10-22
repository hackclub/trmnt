import { error, redirect, type RequestEvent } from '@sveltejs/kit';
import { resolve } from '$app/paths';

/** The signed-in user, or a redirect to sign in that comes back here afterwards */
export function requireUser({ locals, url }: Pick<RequestEvent, 'locals' | 'url'>) {
	if (!locals.user) {
		redirect(303, `${resolve('signin')}?redirectTo=${encodeURIComponent(url.pathname + url.search)}`);
	}
	return locals.user;
}

/** A signed-in admin. Anyone else gets a 404, so the admin panel doesn't show it exists. */
export function requireAdmin(event: Pick<RequestEvent, 'locals' | 'url'>) {
	const user = requireUser(event);
	if (!user.isAdmin) error(404);
	return user;
}

/** Only paths on this site, so a crafted link can't send someone elsewhere after signing in */
export function safeRedirect(value: unknown, fallback: string): string {
	return typeof value === 'string' && /^\/(?![/\\])/.test(value) ? value : fallback;
}
