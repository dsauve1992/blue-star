---
name: deploy
description: Deploy Blue Star's current origin/main to the Raspberry Pi (artemis.local) via the home-lab-infrastructure Ansible playbook. Use when asked to deploy, ship, push to prod, or release Blue Star to the Pi.
---

# Deploying Blue Star to the Pi

Deployment lives in a separate repo, `~/git/home-lab-infrastructure`, and
always deploys whatever is currently on `origin/main` for Blue Star — not
local uncommitted changes.

## Preconditions

- Confirm the branch you care about is merged and pushed to `origin/main`
  (`git status`, `git log origin/main -1`). If there's unpushed/uncommitted
  work the user wants deployed, push it first.
- This is a deploy to a shared server — always confirm with the user before
  running the playbook.

## Command

Plain `ansible-playbook` fails in this shell with `ERROR: Ansible requires
blocking IO on stdin/stdout/stderr` — wrap it in `script`:

```bash
cd ~/git/home-lab-infrastructure && script -q /dev/null ansible-playbook playbooks/site.yml --tags deploy --vault-password-file ~/.vault_pass
```

This targets `artemis.local` and redeploys the `docker-compose.prod.yml`
backend (port 3000) and frontend (nginx, port 5173) containers, pulling
`origin/main`. The role only rebuilds images when the git checkout or
`.env.production` template changed; add `-e force_rebuild=true` to force a
rebuild otherwise (e.g. after a base-image/dependency change with no code
diff).

The playbook's own "Wait for backend to be healthy" task
(`playbooks/roles/deploy/tasks/main.yml`) already retries `/api/health` ~30
times and reports `Backend health: OK/UNHEALTHY` in its final "Deployment
completed!" message — read that instead of re-polling separately.

## If the backend comes back UNHEALTHY

Check container status/logs directly on the Pi (docker requires sudo there):

```bash
ssh -i ~/.ssh/id_rsa artemis@artemis.local "sudo docker compose -f /opt/blue-star/docker-compose.prod.yml --env-file /opt/blue-star/.env.production ps"
ssh -i ~/.ssh/id_rsa artemis@artemis.local "sudo docker compose -f /opt/blue-star/docker-compose.prod.yml --env-file /opt/blue-star/.env.production logs backend --tail 80"
```

Known failure mode: `apps/backend/Dockerfile` explicitly `COPY`s each Python
sub-app (screener, theme_extractor, leader-scan, market-breadth-universe,
...) individually — it does **not** copy `apps/*` wholesale. A PR that adds
a new Python module the backend spawns (a new
`Python*Service`/`infrastructure/services/python-*.service.ts`) but forgets
to add its `COPY apps/<new-app> ./apps/<new-app>` line in _both_ Docker
stages will pass local dev (no Docker there) and crash-loop in prod with
"script not found at /app/apps/<new-app>/main.py". If you hit that, fix the
Dockerfile, commit, push to `main`, and redeploy — the pushed commit alone
triggers the rebuild.

## After deploying

Confirm `Backend health: OK` in the playbook output. If a fix was needed and
pushed, mention the commit hash pushed to `main` in your summary.
