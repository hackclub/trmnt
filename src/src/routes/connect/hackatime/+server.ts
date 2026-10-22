import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { requireUser, safeRedirect } from '#lib/server/auth/guard.ts';
import { saveFlow } from '#lib/server/auth/oauth-flow.ts';
import { publicUrl } from '#lib/server/origin.ts';
import {
	authorizationUrl,
	FLOW_COOKIE,
	HACKATIME_ORIGIN,
	hackatimeEnabled,
	newFlow
} from '#lib/server/hackatime.ts';
import type { RequestHandler } from './$types';

// Sends a signed-in user to Hackatime to let TRMNT read their coding time
export const GET: RequestHandler = async (event) => {
	requireUser(event);
	if (!hackatimeEnabled) error(503, 'Connecting Hackatime isn’t set up yet');

	const flow = newFlow(safeRedirect(event.url.searchParams.get('redirectTo'), resolve('home')));
	saveFlow(event.cookies, FLOW_COOKIE, resolve('connect/hackatime'), flow);

	redirect(
		302,
		await authorizationUrl(publicUrl(resolve('connect/hackatime/callback'), event.url), flow),
		{ external: [HACKATIME_ORIGIN] }
	);
};
