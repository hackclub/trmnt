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
