import { dev } from '$app/env';
import {
	EMAIL_FROM,
	POSTMARK_SERVER_TOKEN,
	POSTMARK_SIGN_IN_TEMPLATE
} from '$app/env/private';
import { CODE_LIFETIME_MINUTES } from '#lib/server/auth/email-codes.ts';

export class EmailNotConfiguredError extends Error {}

/**
 * Sends the sign-in code through the Postmark template set up for it, which gets the `code` and
 * `minutes` variables. Without Postmark configured, development prints the code to the terminal
 * running the dev server instead.
 */
export async function sendSignInCode(email: string, code: string) {
	if (!POSTMARK_SERVER_TOKEN || !POSTMARK_SIGN_IN_TEMPLATE || !EMAIL_FROM) {
		if (dev) {
			console.log(`\n  Sign-in code for ${email}: ${code} (valid ${CODE_LIFETIME_MINUTES} minutes)\n`);
			return;
		}
		throw new EmailNotConfiguredError('Postmark is not configured');
	}

	// https://postmarkapp.com/developer/api/templates-api#email-with-template
	const response = await fetch('https://api.postmarkapp.com/email/withTemplate', {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			'X-Postmark-Server-Token': POSTMARK_SERVER_TOKEN
		},
		body: JSON.stringify({
			From: EMAIL_FROM,
			To: email,
			TemplateAlias: POSTMARK_SIGN_IN_TEMPLATE,
			TemplateModel: { code, minutes: CODE_LIFETIME_MINUTES },
			// The transactional stream, kept apart from anything bulk
			MessageStream: 'outbound',
			Tag: 'sign-in-code'
		})
	});

	const result: { ErrorCode: number; Message: string } = await response
		.json()
		.catch(() => ({ ErrorCode: -1, Message: response.statusText }));
	if (!response.ok || result.ErrorCode !== 0) {
		throw new Error(`Postmark didn't send the sign-in email (${result.ErrorCode}): ${result.Message}`);
	}
}
