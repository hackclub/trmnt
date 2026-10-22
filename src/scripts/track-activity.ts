// Asks the running site to record today's activity (see src/lib/server/activity.ts). An Orchard
// job runs this on a schedule with the deployment's environment; locally, `bun run activity`.
const origin = Bun.env.ORIGIN || 'http://127.0.0.1:5173';
const secret = Bun.env.CRON_SECRET;
if (!secret) throw new Error('CRON_SECRET is not set');

const response = await fetch(new URL('/internal/track-activity', origin), {
	method: 'POST',
	headers: { Authorization: `Bearer ${secret}` }
});
if (!response.ok) {
	throw new Error(`Tracking activity failed: ${response.status} ${await response.text()}`);
}
console.log('Activity tracked', await response.json());
