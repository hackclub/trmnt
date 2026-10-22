import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import {
	finishFlow,
	FLOW_COOKIE,
	FLOW_COOKIE_PATH,
	type HackClubIdentity,
	type SignInFlow
} from '#lib/server/auth/hackclub.ts';
import { takeFlow } from '#lib/server/auth/oauth-flow.ts';
import { createSession } from '#lib/server/auth/session.ts';
import { publicCallbackUrl } from '#lib/server/origin.ts';
import { findOrCreateByHackClub, linkHackClub } from '#lib/server/users.ts';
import type { RequestHandler } from './$types';

// Hack Club sends the browser back here with a code to exchange for the person's identity
export const GET: RequestHandler = async ({ url, cookies, locals }) => {
	const flow = takeFlow<SignInFlow>(cookies, FLOW_COOKIE, FLOW_COOKIE_PATH);
	if (!flow) fail('expired');

	let identity: HackClubIdentity;
	try {
		identity = await finishFlow(publicCallbackUrl(url), flow);
	} catch (err) {
		// Includes the person pressing "deny" at Hack Club, which comes back as an error response
		console.error('Hack Club sign-in failed', err);
		return fail('hackclub');
	}

	if (flow.intent === 'link') {
		if (!locals.user) return fail('expired');
		const result = await linkHackClub(locals.user, identity);
		if (result === 'linked_elsewhere') return fail('linked_elsewhere');
	} else {
		const user = await findOrCreateByHackClub(identity);
		if (typeof user === 'string') return fail(user);
		await createSession(cookies, user.id);
	}

	redirect(303, flow.redirectTo);
};

/** Problems are shown on the sign-in page, which knows what each reason means */
function fail(reason: string): never {
	redirect(303, `${resolve('signin')}?error=${reason}`);
}
