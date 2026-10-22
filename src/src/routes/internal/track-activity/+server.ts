import { error, json } from '@sveltejs/kit';
import { CRON_SECRET } from '$app/env/private';
import { trackActivity } from '#lib/server/activity.ts';
import type { RequestHandler } from './$types';

// Records today's activity. Called on a schedule by scripts/track-activity.ts, which holds the
// shared secret; nothing else should know it.
export const POST: RequestHandler = async ({ request }) => {
	if (!CRON_SECRET) error(404);
	if (!(await sameSecret(request.headers.get('authorization') ?? '', `Bearer ${CRON_SECRET}`))) {
		error(401);
	}
	return json(await trackActivity());
};

/** Compares hashes, so how long it takes says nothing about how much of the secret was right */
async function sameSecret(given: string, expected: string): Promise<boolean> {
	const hash = async (value: string) =>
		new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
	const [a, b] = await Promise.all([hash(given), hash(expected)]);
	return a.reduce((difference, byte, i) => difference | (byte ^ b[i]), 0) === 0;
}
