import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

// The guides the ideas page links to. None are written yet, so each shows the same holding page
// until it gets a route of its own.
const GUIDES = ['plugins', 'backends', 'enclosures'];

export const load: PageLoad = ({ params }) => {
	if (!GUIDES.includes(params.guide)) error(404);
};
