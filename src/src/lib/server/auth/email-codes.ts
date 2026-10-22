import { eq, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { signInCodes } from '#lib/server/db/schema.ts';
import { sha256 } from '#lib/server/crypto.ts';

const LIFETIME = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
/** How long before another code can be sent to the same address, so the form can't flood an inbox */
const RESEND_AFTER = 30 * 1000;

export const CODE_LIFETIME_MINUTES = LIFETIME / 60_000;

/** Lowercased, or null if it doesn't look like an email address */
export function normalizeEmail(value: unknown): string | null {
	const email = String(value ?? '')
		.trim()
		.toLowerCase();
	return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

/** A six-digit code for the address, replacing any earlier one */
export async function issueCode(
	email: string
): Promise<{ code: string } | { retryInSeconds: number }> {
	const [existing] = await db.select().from(signInCodes).where(eq(signInCodes.email, email));
	const sinceLast = existing ? Date.now() - existing.createdAt.getTime() : Infinity;
	if (sinceLast < RESEND_AFTER) {
		return { retryInSeconds: Math.ceil((RESEND_AFTER - sinceLast) / 1000) };
	}

	const code = randomDigits(6);
	const row = {
		codeHash: hashCode(email, code),
		attempts: 0,
		expiresAt: new Date(Date.now() + LIFETIME),
		createdAt: new Date()
	};
	await db
		.insert(signInCodes)
		.values({ email, ...row })
		.onConflictDoUpdate({ target: signInCodes.email, set: row });
	return { code };
}

/** Whether the code is right. A correct code is used up; wrong guesses count toward a limit. */
export async function redeemCode(email: string, code: string): Promise<boolean> {
	const [row] = await db.select().from(signInCodes).where(eq(signInCodes.email, email));
	if (!row || row.expiresAt.getTime() <= Date.now() || row.attempts >= MAX_ATTEMPTS) return false;

	if (row.codeHash !== hashCode(email, code)) {
		await db
			.update(signInCodes)
			.set({ attempts: sql`${signInCodes.attempts} + 1` })
			.where(eq(signInCodes.email, email));
		return false;
	}

	await db.delete(signInCodes).where(eq(signInCodes.email, email));
	return true;
}

/** Drops a code that never reached its inbox, so asking again isn't held up by the resend wait */
export async function discardCode(email: string) {
	await db.delete(signInCodes).where(eq(signInCodes.email, email));
}

function hashCode(email: string, code: string) {
	return sha256(`${email}:${code}`);
}

/** Uniformly random, by rejecting the few values that would bias the remainder */
function randomDigits(length: number): string {
	const range = 10 ** length;
	const limit = Math.floor(0x1_0000_0000 / range) * range;
	const [value] = crypto.getRandomValues(new Uint32Array(1));
	return value < limit ? String(value % range).padStart(length, '0') : randomDigits(length);
}
