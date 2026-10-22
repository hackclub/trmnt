import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { users } from '#lib/server/db/schema.ts';
import { decrypt } from '#lib/server/crypto.ts';
import { fetchDetails } from '#lib/server/auth/hackclub.ts';
import { submitBlocker, type SessionUser } from '#lib/server/users.ts';

export type SubmitterProblem =
	| NonNullable<ReturnType<typeof submitBlocker>>
	| 'needs_address'
	| 'needs_birthday';

/**
 * Why this person can't submit, or null if they can. Hack Club is asked afresh, since
 * verification may have changed since they signed in, and what it says is kept. Beyond being
 * eligible, the program's database needs a mailing address and birthday for every submitter.
 */
export async function checkSubmitter(user: SessionUser): Promise<SubmitterProblem | null> {
	if (!user.hackClubId) return 'link_hack_club';

	const [row] = await db
		.select({ token: users.hackClubAccessToken })
		.from(users)
		.where(eq(users.id, user.id));
	const details = row?.token ? await fetchDetails(await decrypt(row.token)) : null;
	// A token that stopped working, or one granted before submitting needed more, means linking
	// Hack Club again
	if (!details || details.needsConsent) return 'link_hack_club';

	await db
		.update(users)
		.set({
			verificationStatus: details.verificationStatus,
			yswsEligible: details.yswsEligible,
			verificationCheckedAt: new Date()
		})
		.where(eq(users.id, user.id));

	const blocker = submitBlocker({
		...user,
		verificationStatus: details.verificationStatus,
		yswsEligible: details.yswsEligible
	});
	if (blocker) return blocker;
	if (details.addresses.length === 0) return 'needs_address';
	if (!details.birthday) return 'needs_birthday';
	return null;
}
