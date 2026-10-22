import { dev } from '$app/env';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

// A permanent view of the loading screen for working on it, since real navigations are
// usually too quick for it to show. Not part of production builds.
export const load: PageLoad = () => {
	if (!dev) error(404);
};
