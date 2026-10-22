import { requireAdmin } from '#lib/server/auth/guard.ts';
import type { LayoutServerLoad } from './$types';

// Admins only; anyone else gets a 404. Each tab's own load checks again, since loads run in parallel.
export const load: LayoutServerLoad = (event) => {
	requireAdmin(event);
};
