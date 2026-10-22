import { SLACK_BOT_TOKEN } from '$app/env/private';

// Hack Club's Slack, through a bot: profile pictures for the admin panel, and messages to people
// about their orders. Everything here quietly does nothing until SLACK_BOT_TOKEN is set.
export const slackEnabled = Boolean(SLACK_BOT_TOKEN);

/** Where to find someone on Hack Club's Slack, for contacting them */
export function slackProfileUrl(slackId: string) {
	return `https://hackclub.slack.com/team/${slackId}`;
}

async function call<T>(method: string, args: Record<string, string>): Promise<T> {
	// As a form, since some methods (users.info among them) ignore arguments sent as JSON
	const response = await fetch(`https://slack.com/api/${method}`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
		body: new URLSearchParams(args)
	});
	const result = await response.json();
	if (!result.ok) throw new Error(`Slack's ${method} failed: ${result.error}`);
	return result as T;
}

/** Pictures change rarely, so each is asked for at most hourly */
const avatars = new Map<string, { url: string | null; until: number }>();

/** Someone's Slack profile picture; null without Slack set up or a picture */
export async function slackAvatar(slackId: string): Promise<string | null> {
	if (!slackEnabled) return null;
	const cached = avatars.get(slackId);
	if (cached && cached.until > Date.now()) return cached.url;

	const url = await call<{ user: { profile: { image_192?: string } } }>('users.info', { user: slackId })
		.then((result) => result.user.profile.image_192 ?? null)
		.catch((err) => {
			console.error('Reading a Slack profile failed', err);
			return null;
		});
	avatars.set(slackId, { url, until: Date.now() + 60 * 60 * 1000 });
	return url;
}

/** Messages someone directly. Returns whether it was sent. */
export async function sendSlackDm(slackId: string, text: string): Promise<boolean> {
	if (!slackEnabled) return false;
	try {
		const { channel } = await call<{ channel: { id: string } }>('conversations.open', { users: slackId });
		await call('chat.postMessage', { channel: channel.id, text });
		return true;
	} catch (err) {
		console.error('Messaging on Slack failed', err);
		return false;
	}
}
