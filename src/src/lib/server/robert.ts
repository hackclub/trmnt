import { ROBERT_API_KEY } from '$app/env/private';

// Robert, Telescreen's review desk for YSWS submissions: https://telescreen.hackclub.com/robert/docs
// A project sent there gets a fraud score from 1 to 10. Four or below is a final fraud rejection;
// anything higher waits on the organizer's outcome, which approving or rejecting here records.
const ORIGIN = 'https://telescreen.hackclub.com';

export const robertEnabled = Boolean(ROBERT_API_KEY);

export type RobertState = 'awaiting_review' | 'awaiting_outcome' | 'rejected_fraud' | 'decided';

export interface RobertProject {
	id: string;
	state: RobertState;
	/** The fraud reviewer's score, once there is one */
	trustScore: number | null;
	note: string | null;
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
	if (!robertEnabled) throw new Error('Robert isn’t set up');
	const response = await fetch(new URL(path, ORIGIN), {
		method,
		headers: { Authorization: `Bearer ${ROBERT_API_KEY}`, 'Content-Type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body)
	});
	const result = await response.json().catch(() => null);
	if (!response.ok) {
		throw new Error(`Robert said ${response.status}: ${result?.message ?? 'no reason given'}`);
	}
	return result as T;
}

/**
 * Sends a submission for fraud review. `externalId` is our submission's ID, so sending it again
 * returns the same Robert project rather than making another.
 */
export async function sendToRobert(project: {
	externalId: string;
	name: string;
	codeUrl: string;
	demoUrl: string | null;
	slackId: string | null;
	hackatimeId: number | null;
	hackatimeProjects: string[];
}): Promise<RobertProject> {
	const sent = await call<{ id: string; state: RobertState }>('POST', '/api/v1/ysws/projects', {
		name: project.name,
		kind: 'hackatime',
		codeUrl: project.codeUrl,
		demoUrl: project.demoUrl ?? '',
		submitter: {
			...(project.slackId && { slackId: project.slackId }),
			...(project.hackatimeId && { hackatimeId: project.hackatimeId })
		},
		hackatimeProjects: project.hackatimeProjects,
		externalId: project.externalId
	});
	return { id: sent.id, state: sent.state, trustScore: null, note: null };
}

export async function getRobertProject(id: string): Promise<RobertProject> {
	const { project } = await call<{
		project: { id: string; state: RobertState; trustScore: number | null; review: { note: string | null } | null };
	}>('GET', `/api/v1/ysws/projects/${id}`);
	return {
		id: project.id,
		state: project.state,
		trustScore: project.trustScore,
		note: project.review?.note ?? null
	};
}

/** Records the organizer's final decision on a project that passed fraud review */
export async function recordRobertOutcome(
	id: string,
	status: 'approved' | 'rejected',
	reason?: string
) {
	await call('POST', `/api/v1/ysws/projects/${id}/outcome`, { status, reason });
}

/** Withdraws a project no fraud reviewer has scored yet */
export async function withdrawFromRobert(id: string, signedOffBy: string) {
	await call('DELETE', `/api/v1/ysws/projects/${id}`, { signedOffBy });
}

/**
 * Whether a webhook really came from Robert: X-Robert-Signature is "sha256=" and the hex
 * HMAC-SHA256 of "<X-Robert-Timestamp>.<raw body>" keyed by the signing secret. Timestamps more
 * than five minutes off are refused, so a captured request can't be replayed later.
 */
export async function verifyRobertWebhook(
	secret: string,
	headers: Headers,
	rawBody: string
): Promise<boolean> {
	const timestamp = headers.get('x-robert-timestamp') ?? '';
	const signature = headers.get('x-robert-signature') ?? '';
	if (!/^\d+$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
		return false;
	}

	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${rawBody}`));
	const expected = new TextEncoder().encode(`sha256=${new Uint8Array(mac).toHex()}`);
	const given = new TextEncoder().encode(signature);
	if (given.length !== expected.length) return false;
	return given.reduce((difference, byte, i) => difference | (byte ^ expected[i]), 0) === 0;
}
