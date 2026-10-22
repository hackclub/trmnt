import { eq, sql } from 'drizzle-orm';
import { ADMIN_EMAILS } from '$app/env/private';
import { db } from '#lib/server/db/index.ts';
import { ledger, sessions, users, type User } from '#lib/server/db/schema.ts';
import { encrypt } from '#lib/server/crypto.ts';
import type { HackClubIdentity } from '#lib/server/auth/hackclub.ts';

/** What the rest of the app sees of whoever is signed in */
export type SessionUser = Pick<
	User,
	'id' | 'email' | 'name' | 'role' | 'hackClubId' | 'verificationStatus' | 'yswsEligible'
> & { isAdmin: boolean; hackatimeConnected: boolean };

export function toSessionUser(user: User): SessionUser {
	return {
		id: user.id,
		email: user.email,
		name: user.name,
		role: user.role,
		hackClubId: user.hackClubId,
		verificationStatus: user.verificationStatus,
		yswsEligible: user.yswsEligible,
		isAdmin: user.role === 'admin' || ADMIN_EMAILS.includes(user.email),
		hackatimeConnected: user.hackatimeAccessToken !== null
	};
}

/**
 * Why this user can't submit a project, or null if they can. Submitting takes a linked Hack Club
 * account whose identity verification makes them eligible for YSWS programs. Admins skip the
 * eligibility part so they can test submitting, since staff accounts aren't eligible.
 */
export function submitBlocker(
	user: SessionUser
): 'link_hack_club' | 'verify_identity' | 'verification_pending' | 'ineligible' | null {
	if (!user.hackClubId) return 'link_hack_club';
	if (user.isAdmin) return null;

	switch (user.verificationStatus) {
		case 'verified':
			return user.yswsEligible ? null : 'ineligible';
		case 'pending':
			return 'verification_pending';
		case 'ineligible':
			return 'ineligible';
		default:
			// Hasn't verified yet, or Hack Club didn't say
			return 'verify_identity';
	}
}

export async function findOrCreateByEmail(email: string): Promise<User> {
	const [created] = await db
		.insert(users)
		.values({ email })
		.onConflictDoNothing({ target: users.email })
		.returning();
	if (created) return created;

	const [existing] = await db.select().from(users).where(eq(users.email, email));
	return existing;
}

/**
 * Signs in with Hack Club: the account already linked to it, or else the account using the
 * same verified email (which then gets linked), or else a new account.
 */
export async function findOrCreateByHackClub(
	identity: HackClubIdentity
): Promise<User | 'no_email' | 'email_taken'> {
	const fields = await hackClubFields(identity);

	const [linked] = await db.select().from(users).where(eq(users.hackClubId, identity.hackClubId));
	if (linked) return update(linked, fields, identity);

	if (!identity.email) return 'no_email';
	const [sameEmail] = await db.select().from(users).where(eq(users.email, identity.email));
	if (sameEmail) {
		// That address already belongs to someone linked to a different Hack Club account
		if (sameEmail.hackClubId) return 'email_taken';
		return update(sameEmail, fields, identity);
	}

	const [created] = await db
		.insert(users)
		.values({ email: identity.email, name: identity.name, ...fields })
		.returning();
	return created;
}

/** Links Hack Club to an account that signed up with email, which is what lets it submit */
export async function linkHackClub(
	user: SessionUser,
	identity: HackClubIdentity
): Promise<User | 'linked_elsewhere'> {
	const [linked] = await db.select().from(users).where(eq(users.hackClubId, identity.hackClubId));
	if (linked && linked.id !== user.id) return 'linked_elsewhere';

	return update(user, await hackClubFields(identity), identity);
}

/** Bans someone and signs them out everywhere */
export async function banUser(userId: string, reason: string) {
	await db
		.update(users)
		.set({ bannedAt: new Date(), banReason: reason })
		.where(eq(users.id, userId));
	await db.delete(sessions).where(eq(sessions.userId, userId));
}

/** Lets someone back in, and stops a red Hackatime trust level banning them again */
export async function liftBan(userId: string) {
	await db
		.update(users)
		.set({ bannedAt: null, banReason: null, banLiftedAt: new Date() })
		.where(eq(users.id, userId));
}

/**
 * Bans someone Hackatime has banned (trust level red), unless an admin has already let them
 * back in. Returns whether they're banned now.
 */
export async function banIfRedOnHackatime(
	user: Pick<User, 'id' | 'bannedAt' | 'banLiftedAt'>,
	trustLevel: string | null
): Promise<boolean> {
	if (user.bannedAt) return true;
	if (trustLevel !== 'red' || user.banLiftedAt) return false;
	await banUser(user.id, 'Hackatime trust level is red');
	return true;
}

/** Reads through `client` when given one, e.g. a transaction that's about to spend */
export async function getBalance(
	userId: string,
	client: Pick<typeof db, 'select'> = db
): Promise<number> {
	const [row] = await client
		.select({ balance: sql<number>`coalesce(sum(${ledger.amount}), 0)`.mapWith(Number) })
		.from(ledger)
		.where(eq(ledger.userId, userId));
	return row.balance;
}

async function hackClubFields(identity: HackClubIdentity) {
	return {
		hackClubId: identity.hackClubId,
		slackId: identity.slackId,
		verificationStatus: identity.verificationStatus,
		yswsEligible: identity.yswsEligible,
		verificationCheckedAt: new Date(),
		hackClubAccessToken: await encrypt(identity.accessToken),
		hackClubRefreshToken: identity.refreshToken && (await encrypt(identity.refreshToken))
	};
}

/** Saves the Hack Club fields, filling in the name only if the account doesn't have one yet */
async function update(
	user: Pick<User, 'id' | 'name'>,
	fields: Awaited<ReturnType<typeof hackClubFields>>,
	identity: HackClubIdentity
): Promise<User> {
	const [updated] = await db
		.update(users)
		.set({ ...fields, name: user.name ?? identity.name })
		.where(eq(users.id, user.id))
		.returning();
	return updated;
}
