---
name: devops-review
description: Review Blue Star's delivery and runtime plumbing (Dockerfiles, docker-compose.prod.yml, CI workflow, nginx, health checks, migrations, env handling, build/turbo config, logging) and file ONE small devops improvement as a Backlog ticket on the kanban board. Proposes only - never edits code. Use when asked for a devops review, to harden CI or the Docker build, or to run the scheduled devops proposer.
---

# DevOps Review (proposer)

Infrastructure counterpart of `fix-one-thing` and `architect-review`. Look at how Blue Star is built, tested, packaged and run, and file **one** small improvement. Do not change code; the user decides which tickets become Ready and `implement-next` builds them.

Load `kanban-board` first for the board commands and the ticket format.

## Scope

In, files in this repo:

- `apps/*/Dockerfile`, `docker-compose.prod.yml`, `apps/backend/docker-compose.yml`, `.dockerignore`
- `.github/workflows/*`, `.github/actions/*`
- `apps/frontend/nginx.conf`
- `package.json` / `turbo.json` scripts and caching, `.tool-versions`, Node version consistency
- `.env.production.example` vs the env vars the code actually reads
- migration and startup flow (`apps/backend/migrations`, `apps/backend/scripts`)
- health endpoint and Docker healthchecks, graceful shutdown, logging, resource limits, restart behaviour
- supply-chain hygiene (pinned base images and actions, `npm ci`, lockfile use, secrets in build args or logs)

### CI config checks

Treat CI as its own area and compare it against what the repo claims to enforce (`CLAUDE.md` quality gates, `package.json` scripts, `apps/*/package.json`):

- **Coverage gaps:** does CI run every gate locally required (lint, type-check, unit, integration/e2e tests, build)? Does the type-check really check the frontend (`tsc -b` with project references, the root `check-types` can be a no-op)? Are the Python apps (`apps/screener`, `apps/theme_extractor`) tested or linted? Are migrations applied against Postgres in CI? Do the Docker images build?
- **Correctness:** triggers (`develop` branch that may not exist), job `needs`, services and env matching what tests read, `NODE_VERSION` vs `.tool-versions` and the Dockerfiles.
- **Speed and cost:** redundant `node_modules` caching on top of `setup-node` cache, no `concurrency` group cancelling superseded runs, no `timeout-minutes`, jobs repeating the same install, uploaded artifacts nobody consumes.
- **Safety:** no top-level `permissions:` (least privilege), actions pinned by tag instead of SHA, secrets exposed to PR jobs.
- **Evidence:** `gh run list` and `gh run view --log-failed` for failure and flake rates, `gh run view` job timings for the slowest step.

Out: application logic, feature work, dependency upgrades, anything inside `~/git/home-lab-infrastructure` (the Ansible repo is read-only context: read it to understand how the Pi is deployed, never edit it, and never run its playbooks). If the best finding lives there, file it here with a note that the fix belongs in that repo, or skip it.

The fix must be a small diff (a handful of files, under ~150 changed lines). If it is bigger, shrink the proposal or pick another finding.

## Steps

0. **Check backlog size.** Count items with Status `Backlog` (see `kanban-board`). If there are 20 or more, report the count and stop; file nothing.
1. **Pick one area** from the scope list (CI config counts as an area). Vary the choice between runs: check the open and closed `devops` tickets and prefer an area with none.
2. **Read the existing tickets** so you do not duplicate: `gh issue list --repo dsauve1992/blue-star --label agent-proposed --state all --limit 100`. Skip anything already filed, closed or rejected (`wontfix`).
3. **Find one candidate** by reading the files. Verify the problem is real before proposing: run the check (`docker build` for image size or cache misses, `actionlint` or `gh workflow view` for workflow errors, compare env vars via `rg "process.env|configService.get"` against the example file, inspect recent CI runs with `gh run list --repo dsauve1992/blue-star --limit 20` for flakiness or slow steps). Do not file speculative findings or generic best-practice lists.
4. **Write the ticket** in the board's body format. The plan names the exact files and the change, and the Verification section states a command that proves it (for example a build that succeeds, an image size before and after, a workflow run). Use label `enhancement` or `bug`, category `devops`. Set Priority (P0 broken or leaking secrets, P1 slows or endangers deploys or CI, P2 hygiene) and Size (XS-S expected).
5. **File it in Backlog** using the `kanban-board` commands. File exactly one ticket, then stop and report its URL.

If nothing real is found in the chosen area after a fair read, say so and file nothing.
