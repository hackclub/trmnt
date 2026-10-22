import { fail, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import {
	CODE_LIFETIME_MINUTES,
	discardCode,
	issueCode,
	normalizeEmail,
	redeemCode
} from '#lib/server/auth/email-codes.ts';
import { hackClubAuthEnabled } from '#lib/server/auth/hackclub.ts';
import { safeRedirect } from '#lib/server/auth/guard.ts';
import { createSession } from '#lib/server/auth/session.ts';
import { EmailNotConfiguredError, sendSignInCode } from '#lib/server/email.ts';
import { findOrCreateByEmail } from '#lib/server/users.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	const redirectTo = safeRedirect(url.searchParams.get('redirectTo'), resolve('home'));
	if (locals.user) redirect(303, redirectTo);

	return {
		redirectTo,
		hackClubAuthEnabled,
		codeLifetime: CODE_LIFETIME_MINUTES,
		/** Set by the Hack Club callback when something went wrong */
		problem: url.searchParams.get('error')
	};
};

export const actions: Actions = {
	sendCode: async ({ request }) => {
		const form = await request.formData();
		const email = normalizeEmail(form.get('email'));
		if (!email) {
			return fail(400, {
				email: String(form.get('email') ?? ''),
				message: 'That doesn’t look like an email address.'
			});
		}

		const issued = await issueCode(email);
		if ('retryInSeconds' in issued) {
			// A code went out moments ago, so keep them on the step where they enter it
			return fail(429, {
				email,
				codeSent: true,
				message: `Wait ${issued.retryInSeconds} seconds before asking for another code.`
			});
		}

		try {
			await sendSignInCode(email, issued.code);
		} catch (err) {
			await discardCode(email);
			if (err instanceof EmailNotConfiguredError) {
				return fail(503, { email, message: 'Email sign-in isn’t available yet.' });
			}
			console.error('Sending a sign-in code failed', err);
			return fail(502, { email, message: 'We couldn’t send your code. Try again in a minute.' });
		}
		return { email, codeSent: true };
	},

	verifyCode: async ({ request, cookies }) => {
		const form = await request.formData();
		const email = normalizeEmail(form.get('email'));
		const code = String(form.get('code') ?? '').replace(/\D/g, '');
		if (!email || !(await redeemCode(email, code))) {
			return fail(400, {
				email: email ?? '',
				codeSent: true,
				message: 'That code is wrong or has expired.'
			});
		}

		const user = await findOrCreateByEmail(email);
		if (user.bannedAt) {
			return fail(403, { email, codeSent: true, message: 'This account has been banned from TRMNT.' });
		}
		await createSession(cookies, user.id);
		redirect(303, safeRedirect(form.get('redirectTo'), resolve('home')));
	}
};
