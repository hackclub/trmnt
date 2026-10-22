/** Hackatime time logged before this doesn't count. Midnight on Thursday the 22nd, Eastern time. */
export const PROGRAM_START = new Date('2026-10-22T00:00:00-04:00');

/** BFTs earned per hour a reviewer approves */
export const BFTS_PER_HOUR = 25;

/** What approved time is worth: paid for exactly, then rounded to the nearest whole BFT */
export function bftsFor(seconds: number): number {
	return Math.round((seconds / 3600) * BFTS_PER_HOUR);
}
