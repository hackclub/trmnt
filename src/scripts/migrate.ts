// Applies any pending migrations in drizzle/. Run it with `bun run db:migrate`;
// the production container runs it before starting the server.
import { drizzle } from 'drizzle-orm/bun-sql';
import { migrate } from 'drizzle-orm/bun-sql/migrator';

const url = Bun.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const db = drizzle(url);
await migrate(db, { migrationsFolder: `${import.meta.dir}/../drizzle` });
db.$client.close();
console.log('Migrations applied');
