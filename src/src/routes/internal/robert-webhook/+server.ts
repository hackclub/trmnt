import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { ROBERT_WEBHOOK_SECRET } from '$app/env/private';
import { db } from '#lib/server/db/index.ts';
import { submissions } from '#lib/server/db/schema.ts';
import { verifyRobertWebhook } from '#lib/server/robert.ts';
import type { RequestHandler } from './$types';

interface OutcomeSet {
	event: 'outcome.set';
	projectId: string;
	outcome: { status: 'approved' | 'rejected'; reason: string | null; trustScore: number | null };
}

// Robert posts here when a submission reaches its final outcome. Most outcomes are decisions made
// in the admin panel, already recorded. The one that isn't is a fraud rejection: Robert's reviewer
// scored it 4 or below, which ends it.
export const POST: RequestHandler = async ({ request }) => {
	if (!ROBERT_WEBHOOK_SECRET) error(404);
	const body = await request.text();
	if (!(await verifyRobertWebhook(ROBERT_WEBHOOK_SECRET, request.headers, body))) error(401);

	const payload: { event: string } = JSON.parse(body);
	if (payload.event !== 'outcome.set') return new Response(null, { status: 204 });
	const { projectId, outcome } = payload as OutcomeSet;

	const [submission] = await db
		.select({ id: submissions.id, status: submissions.status })
		.from(submissions)
		.where(eq(submissions.robertProjectId, projectId));
	// Not one of ours, or already gone
	if (!submission) return new Response(null, { status: 204 });

	const fraud = outcome.status === 'rejected' && submission.status === 'pending';
	await db
		.update(submissions)
		.set({
			robertState: fraud ? 'rejected_fraud' : 'decided',
			robertTrustScore: outcome.trustScore,
			...(fraud && {
				status: 'rejected' as const,
				reviewedAt: new Date(),
				// Robert's note is for reviewers; the participant just sees that it was rejected
				robertNote: outcome.reason
			})
		})
		.where(and(eq(submissions.id, submission.id), eq(submissions.robertProjectId, projectId)));
	return new Response(null, { status: 204 });
};
