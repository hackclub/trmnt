import type { Cookies } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { sessions, users } from '#lib/server/db/schema.ts';
import { randomToken, sha256 } from '#lib/server/crypto.ts';

const COOKIE = 'session';
const DAY = 24 * 60 * 60 * 1000;
const LIFETIME = 30 * DAY;
/** A session in use is pushed back out to the full lifetime once it's this close to expiring */
const RENEW_WITHIN = 15 * DAY;

export async function createSession(cookies: Cookies, userId: string) {
	const token = randomToken();
	const expiresAt = new Date(Date.now() + LIFETIME);
	await db.insert(sessions).values({ id: sha256(token), userId, expiresAt });
	setCookie(cookies, token, expiresAt);
}

/** The signed-in user for this request's cookie, renewing the session if it's due */
export async function validateSession(cookies: Cookies) {
	const token = cookies.get(COOKIE);
	if (!token) return null;

	const id = sha256(token);
	const [row] = await db
		.select({ expiresAt: sessions.expiresAt, user: users })
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(eq(sessions.id, id));

	if (!row || row.expiresAt.getTime() <= Date.now()) {
		if (row) await db.delete(sessions).where(eq(sessions.id, id));
		cookies.delete(COOKIE, { path: '/' });
		return null;
	}

	if (row.expiresAt.getTime() - Date.now() < RENEW_WITHIN) {
		const expiresAt = new Date(Date.now() + LIFETIME);
		await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, id));
		setCookie(cookies, token, expiresAt);
	}

	return row.user;
}

export async function endSession(cookies: Cookies) {
	const token = cookies.get(COOKIE);
	if (token) await db.delete(sessions).where(eq(sessions.id, sha256(token)));
	cookies.delete(COOKIE, { path: '/' });
}

function setCookie(cookies: Cookies, token: string, expires: Date) {
	cookies.set(COOKIE, token, { path: '/', httpOnly: true, sameSite: 'lax', expires });
}
