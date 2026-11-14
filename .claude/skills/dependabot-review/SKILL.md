---
name: dependabot-review
description: Review ONE open Dependabot PR on Blue Star by proving the bump changes nothing - map its blast radius, exercise the affected features on main, apply the bump, exercise them again and compare - then merge it when behaviour is identical and CI is green, or block it for the user when behaviour changes. Use when asked to review or merge Dependabot PRs, handle dependency bumps, or run the scheduled Dependabot reviewer.
---

# Dependabot review

Dependabot PRs have no kanban ticket, so `pr-review` never picks them up. This skill handles exactly one of them per run. Its single question is: **does the app behave the same after the bump?** If it does, the bump merges. If it does not, or if making it work would change what a user sees or gets, the PR is blocked for the user.

`$REPO` is the main checkout. It is never switched, reset or stashed.

## Steps

1. **Pick the PR.** Load `kanban-board` for filing side findings. If the caller gives you a number, use it. Otherwise take the oldest PR from `gh pr list --repo dsauve1992/blue-star --author app/dependabot --state open --json number,title,labels,headRefName,createdAt` that has neither `needs-human` nor `dependabot-reviewed`. Its branch must start with `dependabot/`. Add the label `dependabot-review` as the claim (a launcher may already have). If the PR is a draft, comment why, add `needs-human` and go to step 7. If it has conflicts or is behind `main`:
   - **Dead end**: Dependabot has already answered a rebase request on this PR by saying it cannot rebase it (for example because the `dependabot.yml` entry that created it was deleted), or `main` already has every package at the PR's target version or newer. Close it with `gh pr close <pr> --comment "<the reason>"` and go to step 7. Dependabot opens a new PR if the bump is still needed.
   - **Otherwise**: comment `@dependabot rebase`, unless the last such request is still unanswered, and go to step 7; the next run picks the PR up again.

2. **Blast radius.** For every package the PR bumps (grouped `multi-*` PRs bump several), work out what can break and write it down before testing anything:
   - **Direct npm dependency**: find every import (`rg "from '<pkg>'|require\('<pkg>'\)" apps/`) and map each one to the feature it serves: a page or component on the frontend, an endpoint or job on the backend. Read the package's release notes or changelog between the two versions (`gh release list/view` on its repo, or the CHANGELOG in `node_modules` after install) and note every breaking or behavioural change that touches an API we call.
   - **Transitive npm dependency**: `npm ls <pkg>` in both trees shows which direct dependencies pull it in. The blast radius is whatever those parents serve. If only build or test tooling pulls it in, the blast radius is build, lint and tests.
   - **Docker base image**: the backend or frontend container. The radius is the production image build plus the app booting in it.
   - **GitHub Action**: the CI workflow that uses it. The PR's own CI run is the test. Check the release notes for changed inputs, outputs or defaults that our workflows rely on.

   Output a short list: package, version range, change type (patch, minor or major), affected features, the checks that will prove each one unchanged, and any release-note items that apply to us.

3. **Before: baseline on `main`.** Run `git -C $REPO fetch origin`, then add a detached worktree of `origin/main` at `../blue-star-worktrees/dependabot-<pr>-before` and run `npm ci` there. For each feature in the blast radius, run its checks and record the results:
   - **Tests and build**: `npx tsc --noEmit && npm run lint && npm run test`, plus `npm run build`. Record pass and fail counts, so that a test already failing on `main` is not later blamed on the bump.
   - **Backend features**: call the affected endpoints, or trigger the affected job, and save the responses.
   - **Frontend features**: start the app through the `run` skill's "Stage environments" with the `dependabot-review` entry of `.claude/stage-ports.json`, log in, and use Playwright to drive each affected page through the same steps. Save screenshots and record what each step showed: rendered values, chart shape, console errors.
   - **Docker**: `docker build` the affected Dockerfile and run the image on the stage's ports against the stage database copy (`-p <BE>:3000`, `DB_HOST=host.docker.internal`, `DB_DATABASE=<DB>`, `NOTIFICATIONS_ENABLED=false`, `CRON_ENABLED=false`, the rest from `apps/backend/.env`). Confirm it boots and passes `/api/health` (backend) or serves `/` (frontend). Record the runtime versions inside it, the boot log, and the responses of the public endpoints. Also run the Python CLIs the backend spawns, inside the image.
   - **GitHub Actions**: nothing to run locally. Note which jobs use the action.

   Stop the stage servers before going on; one stage runs one app at a time.

4. **After: apply the bump.** Add a worktree of the PR branch at `../blue-star-worktrees/dependabot-<pr>-after` and run `npm ci`. If type-checking, lint, the build or tests fail, find the cause:
   - A fix that keeps behaviour identical, such as a renamed import, a changed type signature or a moved option, may be committed to the PR branch. Run the quality gates, push without force, and describe the fix in the final comment.
   - A fix that would change what a feature does or shows is not allowed: no changed defaults, output, formatting, rendering, timing or data. Go to step 6, **Block**.

5. **Verify: same checks, same steps.** Repeat every check from step 3 on the after worktree with the same stage entry, then compare each result with its baseline. Small differences in timestamps or IDs that come from the data and not from the code are equal. Anything else is a difference: a changed value, layout or colour, a new console error, a missing element, a different response shape, a new test failure. For a GitHub Action bump, wait for the PR's checks and confirm every job that uses the action ran and passed.

6. **Decide.**
   - **Merge** when every check matches its baseline and `gh pr checks <pr>` is all green (wait while checks are pending; never merge on red or pending). The head SHA must be the one you verified. Post a comment with the blast radius, the checks run, "no behavioural difference", and any compatibility fix you pushed. Then run `gh pr merge <pr> --squash --delete-branch` and add `dependabot-reviewed`.
   - **Block** when any check differs, a needed fix would change behaviour, or you cannot exercise an affected feature, for example because it needs data the stage copy does not have. Post a comment with the blast radius, each difference with its before and after evidence, and what the user needs to decide. For screenshots, commit them under `docs/qa/dependabot-<pr>/` on a branch `qa-media/dependabot-<pr>` from a temporary worktree and link them by raw URL. Add `needs-human` and do not merge.

7. **Clean up**, whatever the outcome: stop the stage servers, drop the stage database, remove both worktrees with `git -C $REPO worktree remove --force <path>`, and remove the `dependabot-review` claim label. The label always comes off when a run ends, including a run that stopped at step 1 and a claim that a launcher added.

## Rules

- One PR per run, and only PRs authored by `app/dependabot` on a `dependabot/*` branch.
- A major version is not blocked for being major. It follows the same proof, with the release notes read in full.
- "Tests pass" alone is not proof when the blast radius includes a user-facing feature. That feature must be driven before and after.
- Never use `--admin`, never bypass branch protection, never force-push, and never touch deployment.
- Never change a Dependabot PR's version, and close one only in the dead-end case of step 1. Superseding is Dependabot's job.
- If `gh` fails with a missing-scope error, stop and report.

## Side findings

Something you notice that needs fixing or checking but is outside this run's scope: file it as described in `kanban-board` "Side findings", then carry on with this run.
