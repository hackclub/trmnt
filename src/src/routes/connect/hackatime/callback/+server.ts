import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { resolve } from '$app/paths';
import { requireUser } from '#lib/server/auth/guard.ts';
import { takeFlow } from '#lib/server/auth/oauth-flow.ts';
import { encrypt } from '#lib/server/crypto.ts';
import { db } from '#lib/server/db/index.ts';
import { publicCallbackUrl } from '#lib/server/origin.ts';
import { users } from '#lib/server/db/schema.ts';
import { finishFlow, FLOW_COOKIE, type ConnectFlow } from '#lib/server/hackatime.ts';
import type { RequestHandler } from './$types';

// Hackatime sends the browser back here with a code to exchange for an access token
export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);
	const flow = takeFlow<ConnectFlow>(event.cookies, FLOW_COOKIE, resolve('connect/hackatime'));
	// Home explains what went wrong
	const failed = `${resolve('home')}?hackatime=failed`;
	if (!flow) redirect(303, failed);

	let token: string;
	try {
		token = await finishFlow(publicCallbackUrl(event.url), flow);
	} catch (err) {
		// Includes the person pressing "deny", which comes back as an error response
		console.error('Connecting Hackatime failed', err);
		redirect(303, failed);
	}

	await db
		.update(users)
		// Clearing the sync time makes the next page load fetch their hours straight away
		.set({ hackatimeAccessToken: await encrypt(token), hackatimeSyncedAt: null })
		.where(eq(users.id, user.id));

	redirect(303, flow.redirectTo);
};
