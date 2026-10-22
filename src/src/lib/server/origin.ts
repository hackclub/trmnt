import { ORIGIN } from '$app/env/private';

/**
 * A URL on the site as people reach it, for OAuth redirect URIs. A request's own origin can be
 * wrong behind a tunnel: Tailscale Funnel serves HTTPS but hands the dev server plain HTTP, and
 * providers reject an http:// redirect URI that wasn't registered.
 */
export function publicUrl(path: string, requestUrl: URL): URL {
	return new URL(path, ORIGIN ?? requestUrl.origin);
}

/** The URL a provider sent the browser back to, as the provider saw it */
export function publicCallbackUrl(requestUrl: URL): URL {
	return publicUrl(requestUrl.pathname + requestUrl.search, requestUrl);
}
