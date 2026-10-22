# TRMNT

make projects for the TRMNL eco-system, get free stuff for it! a [Hack Club](https://hackclub.com) YSWS for you, by guac.

The site is a SvelteKit app run with Bun, in `src/`:

- `src/src/routes`: pages and endpoints. The landing page and sign-in are in `(marketing)`, Home and
  the shop in `(app)`, and the admin panel in `admin`.
- `src/src/lib/server`: server code, including sign-in (Hack Club Auth or email codes), Hackatime,
  reviews, the shop, and the Airtable, Robert and Slack integrations.
- `src/drizzle`: database migrations, generated from `src/src/lib/server/db/schema.ts`.
- `src/scripts`: applying migrations, and the hourly activity check.

## Running it locally

You need [Bun](https://bun.sh) and Docker.

```sh
cd src
bun install
cp .env.example .env    # then fill it in; every variable is described in src/env.ts
bun run db:start        # Postgres, from compose.yaml
bun run db:migrate
bun --bun run dev       # --bun matters: the database client is Bun's own
```

Without Postmark set up, email sign-in codes are printed in the dev server's terminal. Signing in
with Hack Club or connecting Hackatime needs OAuth apps whose redirect URIs match the address you
use. To test through an HTTPS tunnel, set `ORIGIN` to the tunnel's address and sign in there.

## Changing the database

Edit `src/src/lib/server/db/schema.ts`, then:

```sh
bun run db:generate --name what_changed
bun run db:migrate
```
