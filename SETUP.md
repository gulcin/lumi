# Lumi family sync and voice chat

The site on GitHub Pages is static. Progress still lives in the browser first. Optional sync and the “why?” chat go through a small Cloudflare Worker, which talks to ClickHouse Managed Postgres. There is no Supabase project.

The Worker applies `db/migrations/*.sql` itself. A laptop does not need to open port 5432.

## What gets stored

A family is a random code (four words and 8 hex characters). The database stores only the SHA-256 hash of that code. Progress JSON can include the child’s first name or nickname, lesson state, badges, interests, acorns, and chat text. Photos stay in IndexedDB on the device and are never uploaded. Do not put a surname, school, address, or other personal data in the nickname.

## 1. Create ClickHouse Managed Postgres

1. In ClickHouse Cloud, create a Managed Postgres service.
2. Allow connections from anywhere (the Worker’s egress addresses are not fixed).
3. Copy the connection string. TLS is required. Use `sslmode=require` (not `verify-full`). The Worker does not have your instance CA file.
4. Prefer the **direct** host on port 5432, not the PgBouncer pooler. Migrations take a transaction advisory lock, which needs one connection for the whole transaction.

Example:

```text
postgresql://postgres:PASSWORD@your-instance.pg.clickhouse.cloud:5432/postgres?sslmode=require
```

You do not run this string from your own machine. The owner’s network cannot reach port 5432. The Worker can.

## 2. Deploy the Worker

From the repo:

```bash
cd worker
npm ci
npx wrangler login
npx wrangler secret put DATABASE_URL
npx wrangler secret put ADMIN_TOKEN
```

`ADMIN_TOKEN` is a long random string you invent (for example `openssl rand -hex 24`). It is only for `POST /admin/migrate`.

Voice chat needs one model key. Set either or both:

```bash
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put OPENAI_API_KEY
```

Optional model overrides are Worker variables `ANTHROPIC_MODEL` (default `claude-3-5-haiku-latest`) and `OPENAI_MODEL` (default `gpt-4o-mini`). If neither key is set, lessons and sync still work. Chat replies that the voice feature is not switched on, and the chat button stays available only when the site was built with an API URL.

Deploy:

```bash
npx wrangler deploy
```

Note the `*.workers.dev` URL.

`worker/wrangler.toml` allows browser calls only from `https://gulcin.github.io`. Chat is limited to 30 messages per family per hour, and note polishing to 10 per hour. Those counters live in Postgres.

### Optional Hyperdrive

Hyperdrive can pool the same Postgres database. Create a config, then uncomment the `[[hyperdrive]]` block in `worker/wrangler.toml` and set its id. The Worker uses `HYPERDRIVE.connectionString` when that binding exists, and skips its own `ssl: 'require'` because Hyperdrive terminates TLS. Keep `DATABASE_URL` as a fallback until the binding is in place.

## 3. Apply the schema

The Worker bundles `db/migrations/*.sql`. On the first request it creates `schema_migrations` if needed, takes `pg_advisory_xact_lock`, and runs any file not already recorded. Later requests in that isolate skip the work. Two isolates cannot apply the same file at once because of the lock.

You can also trigger it by hand (this does not use port 5432 on your machine):

```bash
curl -X POST "https://YOUR-WORKER.workers.dev/admin/migrate" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

A successful body looks like `{"applied":["001_init.sql"],"skipped":[]}`. The next call reports the file under `skipped`. A missing or wrong token returns 401. `GET /health` returns `{"ok":true}` after migrations have run.

`001_init.sql` creates `families`, `children`, `progress_documents`, `chat_messages`, and `rate_limits`, and runs `CREATE EXTENSION IF NOT EXISTS pgcrypto` so `gen_random_uuid()` is available. [pgcrypto is supported](https://clickhouse.com/docs/products/managed-postgres/extensions) on ClickHouse Managed Postgres.

`npm run migrate` (`scripts/migrate.mjs`) is optional and only for a machine that can open port 5432. If that port is blocked, ignore the script and use the Worker.

## 4. Point GitHub Pages at the Worker

In the GitHub repo, add an Actions **variable** (not a secret) named `VITE_LUMI_API_URL` with the Worker origin, no trailing slash:

```text
https://YOUR-WORKER.workers.dev
```

Re-run the Pages workflow, or push to `main`. The build bakes that URL into the static site. If the variable is unset, the site builds with sync, chat, and note polishing hidden, and progress stays on the device exactly as before.

## 5. Join another device

In Grown-ups → Backup, create a family code. The QR code opens `https://gulcin.github.io/lumi/#sync=CODE`. On the other device, scan it or paste the code. The app merges progress by topic timestamp: attempts are unioned, mastery stays on if either device has it, and the later device wins nickname and outfit. The code is the key. The API does not list families.

## Learner profile and themes

Theme groups and learner-profile trait names follow the public IB Primary Years Programme names. Lumi’s map from each lesson to a theme is unofficial. The International Baccalaureate does not endorse this app. See the note in the grown-up theme view.
