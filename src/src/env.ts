import { defineEnvVars } from '@sveltejs/kit/env';

// Unset optional variables come through as undefined rather than ''
const optional = (value: string | undefined) => value || undefined;

export const variables = defineEnvVars({
	ORIGIN: {
		description: 'Where people reach the site, e.g. `https://trmnt.hackclub.com`. adapter-node needs it in production. In development, set it when a tunnel serves HTTPS but hands the dev server plain HTTP (Tailscale Funnel does), or OAuth redirect URIs come out as http://.',
		schema: optional
	},
	DATABASE_URL: {
		description: 'Postgres connection string. Orchard provides this for its managed databases.'
	},
	TOKEN_ENCRYPTION_KEY: {
		description: 'Encrypts the OAuth tokens stored for users. 32 random bytes, base64: `openssl rand -base64 32`',
		schema: (value) => {
			const key = Uint8Array.fromBase64(value ?? '');
			if (key.length !== 32) throw new Error('must be 32 random bytes, base64-encoded');
			return key;
		}
	},
	ADMIN_EMAILS: {
		description: 'Comma-separated emails of accounts that can use the admin panel.',
		schema: (value) =>
			(value ?? '')
				.split(',')
				.map((email) => email.trim().toLowerCase())
				.filter(Boolean)
	},
	HACKCLUB_AUTH_CLIENT_ID: {
		description: 'From the app registered at https://auth.hackclub.com/developer/apps. Signing in with Hack Club is off without it.',
		schema: optional
	},
	HACKCLUB_AUTH_CLIENT_SECRET: {
		description: 'Client secret for HACKCLUB_AUTH_CLIENT_ID.',
		schema: optional
	},
	HACKATIME_CLIENT_ID: {
		description: 'From an OAuth app registered under "My OAuth Apps" in Hackatime, with the `profile` and `read` scopes. Connecting Hackatime is off without it.',
		schema: optional
	},
	HACKATIME_CLIENT_SECRET: {
		description: 'Client secret for HACKATIME_CLIENT_ID.',
		schema: optional
	},
	POSTMARK_SERVER_TOKEN: {
		description: 'Server API token from the TRMNT server in Postmark. Sends sign-in codes; without it, development prints them to the terminal.',
		schema: optional
	},
	POSTMARK_SIGN_IN_TEMPLATE: {
		description: 'Alias of the Postmark template for sign-in codes. It gets the `code` and `minutes` variables.',
		schema: optional
	},
	EMAIL_FROM: {
		description: 'Sender for sign-in codes, e.g. `TRMNT <trmnt@hackclub.com>`. Must be a confirmed sender signature or domain in Postmark.',
		schema: optional
	}
});
