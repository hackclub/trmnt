import * as oidc from 'openid-client';
import { HACKCLUB_AUTH_CLIENT_ID, HACKCLUB_AUTH_CLIENT_SECRET } from '$app/env/private';
import type { User } from '#lib/server/db/schema.ts';

// Hack Club Auth is a standard OpenID Connect provider: https://auth.hackclub.com/docs/oidc-guide
export const HACK_CLUB_AUTH_ORIGIN = 'https://auth.hackclub.com';
const ISSUER = new URL(HACK_CLUB_AUTH_ORIGIN);
/** Enough to sign in and to tell whether someone can submit */
const SIGN_IN_SCOPE = 'openid profile email name slack_id verification_status';
/**
 * Also what the program's database and prize shipping need. Asked for only when linking to
 * submit, so people just signing in to look around aren't asked for their address.
 */
const SUBMIT_SCOPE = `${SIGN_IN_SCOPE} address phone birthdate`;
/** Granted with SUBMIT_SCOPE; missing ones mean sending the person through Hack Club again */
const SUBMIT_ONLY_SCOPES = ['address', 'phone', 'birthdate'];

export const hackClubAuthEnabled = Boolean(HACKCLUB_AUTH_CLIENT_ID && HACKCLUB_AUTH_CLIENT_SECRET);

let configuration: Promise<oidc.Configuration> | undefined;

function getConfiguration() {
	configuration ??= oidc
		.discovery(ISSUER, HACKCLUB_AUTH_CLIENT_ID!, HACKCLUB_AUTH_CLIENT_SECRET)
		.catch((error) => {
			// Don't cache a failed lookup; try again on the next sign-in
			configuration = undefined;
			throw error;
		});
	return configuration;
}

/** What has to survive the round trip through Hack Club */
export interface Flow {
	state: string;
	nonce: string;
	codeVerifier: string;
}

export const FLOW_COOKIE = 'hackclub_flow';
/** Covers both /auth/hackclub, which sets it, and /auth/hcacallback, which reads it */
export const FLOW_COOKIE_PATH = '/auth';

/** The flow plus what to do once back: sign in, or link to the signed-in account */
export interface SignInFlow extends Flow {
	intent: 'signin' | 'link';
	redirectTo: string;
}

export async function startFlow(
	redirectUri: URL,
	intent: SignInFlow['intent']
): Promise<{ url: URL; flow: Flow }> {
	const config = await getConfiguration();
	const flow = {
		state: oidc.randomState(),
		nonce: oidc.randomNonce(),
		codeVerifier: oidc.randomPKCECodeVerifier()
	};
	const url = oidc.buildAuthorizationUrl(config, {
		redirect_uri: redirectUri.href,
		scope: intent === 'link' ? SUBMIT_SCOPE : SIGN_IN_SCOPE,
		state: flow.state,
		nonce: flow.nonce,
		code_challenge: await oidc.calculatePKCECodeChallenge(flow.codeVerifier),
		code_challenge_method: 'S256'
	});
	return { url, flow };
}

export interface HackClubIdentity {
	hackClubId: string;
	/** Only when Hack Club has verified it */
	email: string | null;
	name: string | null;
	slackId: string | null;
	verificationStatus: User['verificationStatus'];
	yswsEligible: boolean | null;
	accessToken: string;
	refreshToken: string | null;
}

/** Exchanges the code Hack Club sent back for the person's identity */
export async function finishFlow(callbackUrl: URL, flow: Flow): Promise<HackClubIdentity> {
	const config = await getConfiguration();
	const tokens = await oidc.authorizationCodeGrant(config, callbackUrl, {
		pkceCodeVerifier: flow.codeVerifier,
		expectedState: flow.state,
		expectedNonce: flow.nonce,
		idTokenExpected: true
	});
	const idToken = tokens.claims()!;
	// The docs don't promise every scope's claims are in the ID token, so merge in userinfo too
	const claims = { ...idToken, ...(await oidc.fetchUserInfo(config, tokens.access_token, idToken.sub)) };

	return {
		hackClubId: idToken.sub,
		email:
			claims.email_verified === true && typeof claims.email === 'string'
				? claims.email.toLowerCase()
				: null,
		name: typeof claims.name === 'string' ? claims.name : null,
		slackId: typeof claims.slack_id === 'string' ? claims.slack_id : null,
		verificationStatus: parseVerificationStatus(claims.verification_status),
		yswsEligible: typeof claims.ysws_eligible === 'boolean' ? claims.ysws_eligible : null,
		accessToken: tokens.access_token,
		refreshToken: tokens.refresh_token ?? null
	};
}

export interface HackClubAddress {
	firstName: string | null;
	lastName: string | null;
	line1: string | null;
	line2: string | null;
	city: string | null;
	state: string | null;
	postalCode: string | null;
	country: string | null;
	phoneNumber: string | null;
	primary: boolean;
}

/** What submitting and shipping need, read fresh from Hack Club each time rather than kept here */
export interface HackClubDetails {
	firstName: string | null;
	lastName: string | null;
	email: string | null;
	phoneNumber: string | null;
	/** YYYY-MM-DD */
	birthday: string | null;
	/** The primary one first */
	addresses: HackClubAddress[];
	/** The account hasn't granted all of this yet, so it has to go through Hack Club again */
	needsConsent: boolean;
}

// What /api/v1/me sends. Fields come and go with the granted scopes, and blank ones are left out.
// https://github.com/hackclub/auth/blob/main/app/views/api/v1/identities/_identity.jb
interface MeResponse {
	scopes: string[];
	identity: {
		first_name?: string;
		last_name?: string;
		primary_email?: string;
		phone_number?: string;
		birthday?: string;
		addresses?: {
			first_name?: string;
			last_name?: string;
			line_1?: string;
			line_2?: string;
			city?: string;
			state?: string;
			postal_code?: string;
			country?: string;
			phone_number?: string;
			primary?: boolean;
		}[];
	};
}

/** Null when the token no longer works, e.g. because they revoked access */
export async function fetchDetails(accessToken: string): Promise<HackClubDetails | null> {
	const response = await fetch(new URL('/api/v1/me', HACK_CLUB_AUTH_ORIGIN), {
		headers: { Authorization: `Bearer ${accessToken}` }
	});
	if (response.status === 401 || response.status === 403) return null;
	if (!response.ok) throw new Error(`Hack Club Auth returned ${response.status} for /me`);

	const { scopes, identity }: MeResponse = await response.json();
	const addresses = (identity.addresses ?? []).map((address) => ({
		firstName: address.first_name ?? null,
		lastName: address.last_name ?? null,
		line1: address.line_1 ?? null,
		line2: address.line_2 ?? null,
		city: address.city ?? null,
		state: address.state ?? null,
		postalCode: address.postal_code ?? null,
		country: address.country ?? null,
		phoneNumber: address.phone_number ?? null,
		primary: address.primary === true
	}));

	return {
		firstName: identity.first_name ?? null,
		lastName: identity.last_name ?? null,
		email: identity.primary_email?.toLowerCase() ?? null,
		phoneNumber: identity.phone_number ?? null,
		birthday: identity.birthday ?? null,
		addresses: addresses.toSorted((a, b) => Number(b.primary) - Number(a.primary)),
		needsConsent: SUBMIT_ONLY_SCOPES.some((scope) => !scopes.includes(scope))
	};
}

const VERIFICATION_STATUSES = ['needs_submission', 'pending', 'verified', 'ineligible'] as const;

function parseVerificationStatus(value: unknown): User['verificationStatus'] {
	return VERIFICATION_STATUSES.find((status) => status === value) ?? null;
}
