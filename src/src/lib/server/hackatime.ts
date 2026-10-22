import * as oauth from 'openid-client';
import { HACKATIME_CLIENT_ID, HACKATIME_CLIENT_SECRET } from '$app/env/private';
import { PROGRAM_START } from '#lib/server/program.ts';

// Plain OAuth 2.0 with PKCE: https://hackatime.hackclub.com/docs/oauth/oauth-apps
// Its tokens last about 16 years, so there's no refreshing.
export const HACKATIME_ORIGIN = 'https://hackatime.hackclub.com';
const ORIGIN = HACKATIME_ORIGIN;
const SCOPE = 'profile read';

export const hackatimeEnabled = Boolean(HACKATIME_CLIENT_ID && HACKATIME_CLIENT_SECRET);

const configuration =
	hackatimeEnabled &&
	new oauth.Configuration(
		{
			issuer: ORIGIN,
			authorization_endpoint: `${ORIGIN}/oauth/authorize`,
			token_endpoint: `${ORIGIN}/oauth/token`
		},
		HACKATIME_CLIENT_ID!,
		HACKATIME_CLIENT_SECRET
	);

export const FLOW_COOKIE = 'hackatime_flow';

export interface ConnectFlow {
	state: string;
	codeVerifier: string;
	redirectTo: string;
}

export async function authorizationUrl(redirectUri: URL, flow: ConnectFlow): Promise<URL> {
	if (!configuration) throw new Error('Hackatime OAuth is not configured');
	return oauth.buildAuthorizationUrl(configuration, {
		redirect_uri: redirectUri.href,
		scope: SCOPE,
		state: flow.state,
		code_challenge: await oauth.calculatePKCECodeChallenge(flow.codeVerifier),
		code_challenge_method: 'S256'
	});
}

export function newFlow(redirectTo: string): ConnectFlow {
	return {
		state: oauth.randomState(),
		codeVerifier: oauth.randomPKCECodeVerifier(),
		redirectTo
	};
}

/** Exchanges the code Hackatime sent back for an access token */
export async function finishFlow(callbackUrl: URL, flow: ConnectFlow): Promise<string> {
	if (!configuration) throw new Error('Hackatime OAuth is not configured');
	const tokens = await oauth.authorizationCodeGrant(configuration, callbackUrl, {
		pkceCodeVerifier: flow.codeVerifier,
		expectedState: flow.state
	});
	return tokens.access_token;
}

/**
 * Names of the person's Hackatime projects that first appeared since the program started, which
 * are the ones a TRMNT project can count. Null when the token no longer works.
 */
export async function fetchNewProjectNames(accessToken: string): Promise<string[] | null> {
	// Hackatime ignores its `since` filter (checked 2026-10-22), so a project counts as new when
	// none of its time was logged before the program started
	const [sinceStart, allTime] = await Promise.all([
		fetchProjects(accessToken),
		fetchProjects(accessToken, null)
	]);
	if (!sinceStart || !allTime) return null;

	const allTimeSeconds = new Map(allTime.map((project) => [project.name, project.seconds]));
	return sinceStart
		.filter(
			(project) =>
				project.seconds > 0 &&
				Math.abs((allTimeSeconds.get(project.name) ?? 0) - project.seconds) <= 1
		)
		.map((project) => project.name);
}

/**
 * Time logged on these Hackatime projects between `start` and `end` (the end of today if left
 * out), with time on two at once counted once. Hackatime asks programs to get totals this way
 * rather than by adding projects' times together, which double counts that overlap. Null when
 * the token no longer works.
 */
export async function fetchSeconds(
	accessToken: string,
	names: string[],
	start: Date,
	end?: Date
): Promise<number | null> {
	if (names.length === 0) return 0;

	const url = new URL('/api/v1/users/my/stats', ORIGIN);
	// Comma-separated, so a project with a comma in its name can't be counted
	url.searchParams.set('filter_by_project', names.join(','));
	url.searchParams.set('start_date', start.toISOString());
	if (end) url.searchParams.set('end_date', end.toISOString());
	url.searchParams.set('total_seconds', 'true');
	// Splits time at the window's edges, so consecutive days add up to the whole
	url.searchParams.set('boundary_aware', 'true');

	const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
	if (response.status === 401 || response.status === 403) return null;
	if (!response.ok) throw new Error(`Hackatime returned ${response.status} for stats`);

	const body: { total_seconds: number } = await response.json();
	return Math.round(body.total_seconds);
}

/** The language most of the time on these projects since `start` went into, if any */
export async function fetchTopLanguage(
	accessToken: string,
	names: string[],
	start: Date
): Promise<string | null> {
	if (names.length === 0) return null;
	const url = new URL('/api/v1/users/my/stats', ORIGIN);
	url.searchParams.set('features', 'languages');
	url.searchParams.set('filter_by_project', names.join(','));
	url.searchParams.set('start_date', start.toISOString());

	const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
	if (!response.ok) return null;
	const body: { data?: { languages?: { name: string; total_seconds: number }[] } } = await response.json();
	const [top] = (body.data?.languages ?? []).toSorted((a, b) => b.total_seconds - a.total_seconds);
	return top?.name ?? null;
}

export type TrustLevel = 'blue' | 'green' | 'red';

/**
 * Who the person is on Hackatime: their numeric ID, which reviews cite, and their trust level.
 * Red means Hackatime has banned them, and Hack Club's rule is to ban them from the program too.
 * Null when the token no longer works.
 */
export async function fetchMe(
	accessToken: string
): Promise<{ id: number; trustLevel: TrustLevel | null; githubUsername: string | null } | null> {
	const response = await fetch(new URL('/api/v1/authenticated/me', ORIGIN), {
		headers: { Authorization: `Bearer ${accessToken}` }
	});
	if (response.status === 401 || response.status === 403) return null;
	if (!response.ok) throw new Error(`Hackatime returned ${response.status} for /me`);

	const body: {
		id: number;
		github_username?: string | null;
		trust_factor?: { trust_level?: string };
	} = await response.json();
	return {
		id: body.id,
		trustLevel: parseTrustLevel(body.trust_factor?.trust_level),
		githubUsername: body.github_username || null
	};
}

/**
 * The trust level of whoever has this Slack ID on Hackatime, which anyone can look up. Null when
 * they have no Hackatime account.
 */
export async function fetchTrustBySlackId(slackId: string): Promise<TrustLevel | null> {
	const response = await fetch(
		new URL(`/api/v1/users/${encodeURIComponent(slackId)}/trust_factor`, ORIGIN)
	);
	if (response.status === 404) return null;
	if (!response.ok) throw new Error(`Hackatime returned ${response.status} for a trust factor`);
	const body: { trust_level?: string } = await response.json();
	return parseTrustLevel(body.trust_level);
}

function parseTrustLevel(level: unknown): TrustLevel | null {
	return level === 'blue' || level === 'green' || level === 'red' ? level : null;
}

export interface HackatimeProject {
	name: string;
	/** Logged since `start` */
	seconds: number;
}

/**
 * Every Hackatime project the person has, with its time since `start`: the program's start
 * unless told otherwise, and all of it for null. Null when the token no longer works, e.g.
 * because they revoked access.
 */
export async function fetchProjects(
	accessToken: string,
	start: Date | null = PROGRAM_START
): Promise<HackatimeProject[] | null> {
	const url = new URL('/api/v1/authenticated/projects', ORIGIN);
	// `start` bounds the time counted; projects themselves are listed whenever they were made
	if (start) url.searchParams.set('start', start.toISOString());
	url.searchParams.set('include_archived', 'true');

	const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
	if (response.status === 401 || response.status === 403) return null;
	if (!response.ok) throw new Error(`Hackatime returned ${response.status} for its projects`);

	const body: { projects: { name: string; total_seconds: number }[] } = await response.json();
	return body.projects.map((project) => ({
		name: project.name,
		seconds: Math.round(project.total_seconds)
	}));
}
