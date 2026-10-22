import { requireUser } from '#lib/server/auth/guard.ts';
import { getBalance } from '#lib/server/users.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const user = requireUser(event);
	return {
		// Email accounts have no name until they link Hack Club
		user: { name: user.name ?? user.email, balance: await getBalance(user.id) }
	};
};
