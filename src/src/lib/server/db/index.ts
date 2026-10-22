import { drizzle } from 'drizzle-orm/bun-sql';
import { DATABASE_URL } from '$app/env/private';
import * as schema from '#lib/server/db/schema.ts';

// Bun's built-in Postgres client, which connects lazily on the first query.
// Needs the bun runtime, so the dev server has to run with `bun --bun run dev`.
export const db = drizzle({ connection: DATABASE_URL, schema, casing: 'snake_case' });
