import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import {
	FLOW_COOKIE,
	FLOW_COOKIE_PATH,
	HACK_CLUB_AUTH_ORIGIN,
	hackClubAuthEnabled,
	startFlow,
	type SignInFlow
} from '#lib/server/auth/hackclub.ts';
import { safeRedirect } from '#lib/server/auth/guard.ts';
import { saveFlow } from '#lib/server/auth/oauth-flow.ts';
import { publicUrl } from '#lib/server/origin.ts';
import type { RequestHandler } from './$types';

// Sends the browser to Hack Club. `?intent=link` attaches Hack Club to the signed-in account
// instead of signing in, and asks for what submitting needs too. It's how email accounts become
// able to submit, and how Hack Club accounts that signed in with less grant the rest.
export const GET: RequestHandler = async ({ url, cookies, locals }) => {
	if (!hackClubAuthEnabled) error(503, 'Signing in with Hack Club isn’t set up yet');

	const intent = url.searchParams.get('intent') === 'link' ? 'link' : 'signin';
	if (intent === 'link' && !locals.user) redirect(303, resolve('signin'));

	const { url: authorizationUrl, flow } = await startFlow(
		publicUrl(resolve('auth/hcacallback'), url),
		intent
	);
	saveFlow(cookies, FLOW_COOKIE, FLOW_COOKIE_PATH, {
		...flow,
		intent,
		redirectTo: safeRedirect(url.searchParams.get('redirectTo'), resolve('home'))
	} satisfies SignInFlow);

	redirect(302, authorizationUrl, { external: [HACK_CLUB_AUTH_ORIGIN] });
};
