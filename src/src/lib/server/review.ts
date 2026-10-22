import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { ledger, projects, submissions, users } from '#lib/server/db/schema.ts';
import { decrypt } from '#lib/server/crypto.ts';
import { airtableEnabled, createSubmissionRecord } from '#lib/server/airtable.ts';
import { fetchDetails } from '#lib/server/auth/hackclub.ts';
import { publicUrl } from '#lib/server/origin.ts';
import { bftsFor, PROGRAM_START } from '#lib/server/program.ts';
import {
	getRobertProject,
	recordRobertOutcome,
	robertEnabled,
	sendToRobert,
	withdrawFromRobert,
	type RobertProject
} from '#lib/server/robert.ts';
import type { SessionUser } from '#lib/server/users.ts';

// Deciding on submitted projects, from the admin panel. Each decision is recorded everywhere it
// needs to be: here, in Robert when the project was sent there, and in Airtable for approvals.

/** A submission with what deciding on it needs */
async function load(submissionId: string) {
	const [row] = await db
		.select({ submission: submissions, project: projects, author: users })
		.from(submissions)
		.innerJoin(projects, eq(projects.id, submissions.projectId))
		.innerJoin(users, eq(users.id, projects.userId))
		.where(eq(submissions.id, submissionId));
	return row;
}

/** Asks Robert where a submission is up to, and keeps the answer */
export async function refreshRobert(submissionId: string, robertId: string): Promise<RobertProject> {
	const robert = await getRobertProject(robertId);
	await db
		.update(submissions)
		.set({ robertState: robert.state, robertTrustScore: robert.trustScore, robertNote: robert.note })
		.where(eq(submissions.id, submissionId));
	return robert;
}

/** Sends a submission to Robert for fraud review. Returns a problem, or null once sent. */
export async function sendSubmissionToRobert(submissionId: string): Promise<string | null> {
	if (!robertEnabled) return 'Robert isn’t set up: add ROBERT_API_KEY.';
	const row = await load(submissionId);
	if (!row) return 'That submission couldn’t be found.';
	const { submission, project, author } = row;
	if (submission.robertProjectId) return 'It’s already with Robert.';
	if (!project.repoUrl) return 'Robert needs a code link, and this project has none.';
	if (!author.slackId && !author.hackatimeUserId) {
		return 'Robert needs their Slack ID or Hackatime ID, and TRMNT has neither yet.';
	}

	try {
		const robert = await sendToRobert({
			externalId: submission.id,
			name: project.name,
			codeUrl: project.repoUrl,
			demoUrl: project.demoUrl,
			slackId: author.slackId,
			hackatimeId: author.hackatimeUserId,
			hackatimeProjects: project.hackatimeProjects.slice(0, 50)
		});
		await db
			.update(submissions)
			.set({ robertProjectId: robert.id, robertState: robert.state })
			.where(eq(submissions.id, submissionId));
		return null;
	} catch (err) {
		console.error('Sending to Robert failed', err);
		return err instanceof Error ? err.message : 'Sending to Robert failed.';
	}
}

/** Robert's view of a submission, if it was sent there; a problem string if that stops a decision */
async function robertBlocker(
	submissionId: string,
	robertId: string | null,
	deciding: 'approve' | 'reject'
): Promise<{ problem: string } | { robert: RobertProject | null }> {
	if (!robertId) return { robert: null };
	const robert = await refreshRobert(submissionId, robertId);
	if (deciding === 'approve' && robert.state === 'awaiting_review') {
		return { problem: 'Robert hasn’t finished its fraud review yet.' };
	}
	if (deciding === 'approve' && robert.state === 'rejected_fraud') {
		return { problem: 'Robert rejected this as fraud, so it can’t be approved.' };
	}
	return { robert };
}

/** "M/D/YYYY" in Eastern time, the program's, as Hack Club's justification examples write dates */
function usDate(date: Date) {
	return date.toLocaleDateString('en-US', { timeZone: 'America/New_York' });
}

/**
 * Approves a submission for `hours`, with the reviewer's human-written justification. Returns a
 * problem, or null once it's approved, recorded in Airtable and Robert, and its BFTs credited.
 */
export async function approveSubmission(
	submissionId: string,
	reviewer: SessionUser,
	hours: number,
	justification: string,
	requestUrl: URL
): Promise<string | null> {
	const row = await load(submissionId);
	if (!row) return 'That submission couldn’t be found.';
	const { submission, project, author } = row;
	if (submission.status !== 'pending') return 'This has already been decided.';

	const loggedHours = submission.secondsLogged / 3600;
	if (!(hours > 0)) return 'Approve it for some number of hours, more than none.';
	if (hours > loggedHours + 0.005) {
		return `That’s more than the ${loggedHours.toFixed(2)} hours logged on it.`;
	}
	if (!justification.trim()) return 'Write a justification: the technical features behind these hours.';
	if (!airtableEnabled) return 'Airtable isn’t set up: add AIRTABLE_TOKEN and AIRTABLE_BASEID.';
	if (!project.thumbnailUrl || !project.repoUrl || !project.demoUrl || !project.description) {
		return 'It’s missing a screenshot, link or description the Unified YSWS database needs.';
	}

	const blocked = await robertBlocker(submissionId, submission.robertProjectId, 'approve').catch(
		(err) => ({ problem: `Robert couldn’t be reached: ${err instanceof Error ? err.message : err}` })
	);
	if ('problem' in blocked) return blocked.problem;

	// Their details come straight from Hack Club, rather than being kept here
	const details = author.hackClubAccessToken
		? await fetchDetails(await decrypt(author.hackClubAccessToken)).catch(() => null)
		: null;
	if (!details) return 'Their Hack Club details couldn’t be read. They may need to link Hack Club again.';
	const [address] = details.addresses;
	if (!address || !details.birthday) {
		return 'Their Hack Club account is missing an address or birthday.';
	}

	const approvedSeconds = Math.round(hours * 3600);
	const deflated = approvedSeconds < submission.secondsLogged - 18;
	let airtableRecordId: string;
	try {
		airtableRecordId = await createSubmissionRecord({
			'Code URL': project.repoUrl,
			'Playable URL': project.demoUrl,
			'Description': project.description,
			'Screenshot': [{ url: publicUrl(project.thumbnailUrl, requestUrl).href }],
			'First Name': details.firstName ?? address.firstName,
			'Last Name': details.lastName ?? address.lastName,
			'Email': details.email ?? author.email,
			'Phone Number': details.phoneNumber ?? address.phoneNumber,
			'GitHub Username': author.githubUsername,
			'Slack ID': author.slackId,
			'Address (Line 1)': address.line1,
			'Address (Line 2)': address.line2,
			'City': address.city,
			'State / Province': address.state,
			'Country': address.country,
			'ZIP / Postal Code': address.postalCode,
			'Birthday': details.birthday,
			'Hour estimate': Math.round(loggedHours * 100) / 100,
			'Optional - Override Hours Spent': Math.round(hours * 100) / 100,
			// The parts of the justification Hack Club asks programs to fill in automatically
			'Justification - Hackatime Project Name(s) + Date Range(s)': project.hackatimeProjects
				.map((name) => `${name} ${usDate(PROGRAM_START)}-${usDate(submission.createdAt)}`)
				.join(', '),
			'Justification - Submitter Hackatime ID': author.hackatimeUserId?.toString(),
			'Justification - Specific Technical Features': justification,
			'Justification - Deflation Justification': deflated
				? `Deflated from ${loggedHours.toFixed(2)} to ${hours} hours. ${justification}`
				: undefined
		});
	} catch (err) {
		console.error('Creating the Airtable record failed', err);
		return 'Airtable wouldn’t take the record, so nothing was approved. The server log has why.';
	}

	if (blocked.robert?.state === 'awaiting_outcome') {
		await recordRobertOutcome(blocked.robert.id, 'approved').catch((err) =>
			console.error('Recording the outcome in Robert failed', err)
		);
	}

	const bfts = bftsFor(approvedSeconds);
	await db.transaction(async (tx) => {
		await tx
			.update(submissions)
			.set({
				status: 'approved',
				secondsApproved: approvedSeconds,
				bftsAwarded: bfts,
				reviewerId: reviewer.id,
				reviewerNotes: justification,
				reviewedAt: new Date(),
				airtableRecordId,
				...(blocked.robert && { robertState: 'decided' })
			})
			.where(eq(submissions.id, submissionId));
		await tx.insert(ledger).values({
			userId: author.id,
			amount: bfts,
			reason: 'submission_approved',
			submissionId,
			createdById: reviewer.id
		});
	});
	return null;
}

/**
 * Rejects a submission. An ordinary rejection sends it back with a reason the participant sees,
 * and they can fix it and resubmit; a hard one is final, and its reason is optional. Returns a
 * problem, or null once it's rejected.
 */
export async function rejectSubmission(
	submissionId: string,
	reviewer: SessionUser,
	reason: string,
	hard: boolean
): Promise<string | null> {
	const row = await load(submissionId);
	if (!row) return 'That submission couldn’t be found.';
	if (row.submission.status !== 'pending') return 'This has already been decided.';
	if (!hard && !reason.trim()) return 'Say what needs changing, so they can fix it.';

	const robertId = row.submission.robertProjectId;
	if (robertId) {
		try {
			const { robert } = (await robertBlocker(submissionId, robertId, 'reject')) as {
				robert: RobertProject;
			};
			// Robert takes an outcome once its fraud review is done, and lets an unreviewed project be
			// withdrawn. A resubmission goes to Robert as a new project.
			if (robert.state === 'awaiting_outcome') {
				await recordRobertOutcome(robertId, 'rejected', reason.trim() || 'Rejected by the organizer');
			} else if (robert.state === 'awaiting_review') {
				await withdrawFromRobert(robertId, reviewer.name ?? reviewer.email);
			}
		} catch (err) {
			console.error('Telling Robert about a rejection failed', err);
		}
	}

	await db
		.update(submissions)
		.set({
			status: hard ? 'rejected' : 'changes_requested',
			reason: reason.trim() || null,
			reviewerId: reviewer.id,
			reviewedAt: new Date()
		})
		.where(eq(submissions.id, submissionId));
	return null;
}
