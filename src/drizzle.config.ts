import { defineConfig } from 'drizzle-kit';

// Only used to generate migrations (`bun run db:generate`); scripts/migrate.ts applies them
export default defineConfig({
	dialect: 'postgresql',
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	casing: 'snake_case'
});
