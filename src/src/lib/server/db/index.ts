import { SQL } from 'bun';
import { drizzle } from 'drizzle-orm/bun-sql';
import { DATABASE_URL } from '$app/env/private';
import * as schema from '#lib/server/db/schema.ts';

// Bun's built-in Postgres client, which connects lazily on the first query.
// Needs the bun runtime, so the dev server has to run with `bun --bun run dev`.
//
// The dev server re-runs this module whenever the schema or anything it imports changes, and a
// fresh client each time left the old ones' connections open until Postgres ran out of them.
// Keeping the client on globalThis carries it across those re-runs.
const shared = globalThis as typeof globalThis & { trmntSql?: SQL };
shared.trmntSql ??= new SQL(DATABASE_URL);

export const db = drizzle({ client: shared.trmntSql, schema, casing: 'snake_case' });
