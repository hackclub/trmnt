import type { Handle } from '@sveltejs/kit/hooks';
import { validateSession } from '#lib/server/auth/session.ts';
import { toSessionUser } from '#lib/server/users.ts';

export const handle: Handle = async ({ event, resolve }) => {
	const user = await validateSession(event.cookies);
	event.locals.user = user && toSessionUser(user);
	return resolve(event);
};
