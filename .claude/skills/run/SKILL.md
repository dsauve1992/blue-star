---
name: run
description: Launch and drive the Blue Star app locally (NestJS backend + Vite frontend, against the local Docker Postgres). Use when asked to run, start, launch, or screenshot the app, or to verify a change works in the real running app rather than just tests.
---

# Running Blue Star locally

Two pieces: NestJS backend (port 3000, prefix `/api`), Vite frontend (port
5173). Both apps already have working `.env` files checked out locally —
nothing to create.

**Dev points at the local Docker Postgres, never the Pi.** `apps/backend/.env`
must have `DB_HOST=localhost` / `DB_PORT=5432` / `DB_DATABASE=blue_star_db`;
`database.json`'s `dev` block reads the same `DB_*` vars. The container is
`blue-star-postgres` from `apps/backend/docker-compose.yml`. Before launching,
always verify — refuse to start if either check fails:

```bash
grep -E '^DB_HOST=' apps/backend/.env          # must print DB_HOST=localhost
docker ps --filter name=blue-star-postgres --format '{{.Names}} {{.Status}}'
```

If the container is down: `npm run db:up --workspace=backend` (needs Docker
Desktop). If `DB_HOST` is anything else (e.g. `artemis.local`), stop and tell
the user — `predev` and `StartupService` run `db-migrate up` unconfirmed against
whatever host is configured.

There is no `psql` on this machine; inspect the DB with
`docker exec blue-star-postgres psql -U blue_star_user -d blue_star_db`.

## Standard launch (everything)

From the repo root:

```bash
npm run dev
```

`predev` runs `db-migrate up` against the local database (no confirmation
prompt), then turbo starts both dev servers.

Expect on backend boot:

- `predev` runs Python venv setup for `apps/screener` and `apps/theme_extractor`
  (~15–30s of pip "Requirement already satisfied" noise — normal).
- Nest compiles in watch mode, debugger on 9229.
- The app's `StartupService` runs `db-migrate up` _again_ on its own boot
  (`onModuleInit`), independent of `predev`. Gotcha: in watch mode the backend
  restarts on every file change, so a freshly scaffolded migration whose
  `up.sql` is still empty gets recorded as run. If a column you just added is
  missing, `DELETE FROM migrations WHERE name LIKE '%<migration>%'` and rerun
  `npm run migrate:up --workspace=backend`.
- **The backend sends a real ntfy push notification to the user's phone on every
  startup** ("Sending startup notification") — the same channel real production
  restarts use. Don't restart it in a tight loop.

Ready when the log shows `Nest application successfully started` (~30–45s cold).

## One app at a time

```bash
npm run dev:backend    # does NOT run migrate
npm run dev:frontend
```

If you need migrations applied without a full boot:

```bash
npm run migrate:up --workspace=backend
```

## Port conflicts — the IPv4/IPv6 trap

Other projects on this machine (elia, `~/git/app/frontend`) often hold ports
3000/3001 — but they bind **`[::1]` (IPv6 loopback) only**, while Nest binds all
interfaces and Vite binds `[::1]`. Consequences:

- `curl http://localhost:<port>` may silently hit the _wrong_ app: a Vite SPA
  returns HTML with HTTP 200 for **any** path, including `/api/health`, so a
  smoke test against `localhost` can false-positive. Always check
  `lsof -nP -iTCP:3000 -iTCP:5173 -sTCP:LISTEN` before launching, and note
  which process owns what.
- Don't kill the other project's dev servers. Run the backend on a free port
  instead and point the frontend at it via **`127.0.0.1`, not `localhost`**
  (browsers and curl resolve `localhost` to `::1` first and would hit the
  other app):

```bash
# backend (from apps/backend/)
PORT=3002 npm run dev
# frontend (from apps/frontend/) — shell env overrides .env
VITE_API_URL=http://127.0.0.1:3002/api npm run dev
```

- Probe the backend at `http://127.0.0.1:<port>`, the frontend at
  `http://localhost:5173` (Vite listens on `[::1]` only, so `127.0.0.1:5173`
  refuses connections).

## Smoke tests (drive it, don't just launch it)

Backend — public routes, no auth needed:

```bash
curl http://127.0.0.1:3000/api/health              # {"status":"ok",...}
curl http://127.0.0.1:3000/api/leader-scan/latest  # real data from Postgres
```

Most other routes require a Kinde JWT; public ones are marked `@Public()` in
their controllers.

Frontend — open `http://localhost:5173` in a browser (claude-in-chrome works)
and screenshot. Unauthenticated you get the "Trade Smarter with Blue Star"
landing page; the dashboard and app pages sit behind Kinde login — never
automate the login form. The rendered landing page plus a clean console is the
pass condition.

## Shutdown

Kill the dev processes (Ctrl-C / stop the background tasks). Leave the
Postgres container running unless asked (`npm run db:down --workspace=backend`).
