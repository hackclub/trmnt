# Builds TRMNT and serves it with bun. Orchard builds this with frontend/ as the context.
# Configuration comes from the environment at runtime (see src/env.ts), not at build time.

FROM oven/bun:1.3 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
# SvelteKit validates required env vars while it analyses the build. These placeholders only get
# past that check; they aren't baked in, and the real values come from Orchard at runtime.
RUN DATABASE_URL=postgres://build-placeholder \
	TOKEN_ENCRYPTION_KEY=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA= \
	bun --bun run build

# Only what the server needs at runtime
FROM oven/bun:1.3 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1.3-slim
WORKDIR /app
ENV NODE_ENV=production
# Room for a 5 MB project screenshot plus the rest of the form (the default is 512K)
ENV BODY_SIZE_LIMIT=6M
COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY drizzle ./drizzle
COPY scripts/migrate.ts ./scripts/
USER bun
EXPOSE 3000
# Migrations run first so the schema always matches the code that's starting
CMD ["sh", "-c", "bun scripts/migrate.ts && exec bun build/index.js"]
