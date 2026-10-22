import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { endSession } from '#lib/server/auth/session.ts';
import type { RequestHandler } from './$types';

// POST only, so a link or prefetch can't sign anyone out
export const POST: RequestHandler = async ({ cookies }) => {
	await endSession(cookies);
	redirect(303, resolve('/(marketing)'));
};
