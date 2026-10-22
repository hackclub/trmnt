import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { screenshots } from '#lib/server/db/schema.ts';
import type { RequestHandler } from './$types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Public, since project cards show other people's projects too
export const GET: RequestHandler = async ({ params }) => {
	if (!UUID.test(params.id)) error(404);

	const [screenshot] = await db
		.select({ contentType: screenshots.contentType, data: screenshots.data })
		.from(screenshots)
		.where(eq(screenshots.projectId, params.id));
	if (!screenshot) error(404);

	return new Response(screenshot.data, {
		headers: {
			'Content-Type': screenshot.contentType,
			// Links carry a version, so a replaced screenshot gets a new URL
			'Cache-Control': 'public, max-age=31536000, immutable',
			// Only image types are accepted, and this stops a browser second-guessing that
			'X-Content-Type-Options': 'nosniff'
		}
	});
};
