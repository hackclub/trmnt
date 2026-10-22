# TRMNT

A Hack Club YSWS for the [TRMNL](https://usetrmnl.com) e-ink ecosystem. Teens build plugins,
servers and hardware for TRMNL, track their time with Hackatime, submit their projects for review,
and spend the BFTs they earn in the shop.

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

The production container applies pending migrations each time it starts.

## Daily activity

`bun run activity` records how long everyone worked on their linked Hackatime projects today and
yesterday, which is what Hack Club's daily active users chart counts. It calls
`/internal/track-activity` on the running site, using `CRON_SECRET`. In production it runs hourly.

## Deploying

TRMNT deploys to [Orchard](https://k.hackclub.dev), Hack Club's hosting:

- **Build:** `src/Dockerfile`, with `src/` as the build context. The server listens on port 3000.
  Run one replica, since migrations run on startup.
- **Database:** an Orchard Postgres database in the same project, its internal address as
  `DATABASE_URL`.
- **Settings:** everything in `src/env.ts`, with `ORIGIN=https://trmnt.hackclub.com` and fresh
  values for `TOKEN_ENCRYPTION_KEY` and `CRON_SECRET`.
- **Sign-in:** register `https://trmnt.hackclub.com/auth/hcacallback` with the Hack Club Auth app and
  `https://trmnt.hackclub.com/connect/hackatime/callback` with the Hackatime app.
- **Activity check:** an Orchard job running `bun scripts/track-activity.ts` in the deployment's
  image, hourly (`5 * * * *`).
- **Robert:** its outcome webhook goes to `https://trmnt.hackclub.com/internal/robert-webhook`, with
  the signing secret it issues as `ROBERT_WEBHOOK_SECRET`.

The admin panel is at `/admin`, for the accounts listed in `ADMIN_EMAILS`.
