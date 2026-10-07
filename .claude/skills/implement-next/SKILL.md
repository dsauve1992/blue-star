---
name: implement-next
description: Pick the next ticket in the Ready column of the Blue Star kanban board, implement it following the ticket's plan, verify it (quality gates, and QA in the running app when behaviour is user-visible), open a PR and move the ticket to In review. Use when asked to implement the next ticket, or to run the scheduled implementer.
---

# Implement next (implementer)

Executes exactly one approved ticket per run. Load `kanban-board` first.

## Steps

1. **Check for work in flight.** If any ticket is already `In progress`, stop and report it; do not start another.
2. **Pick the ticket.** Items with Status `Ready`, ordered by Priority (P0 first), then oldest. If none, report "nothing ready" and stop.
3. **Claim it.** Move it to `In progress`, then branch from up-to-date `main`: `git switch -c agent/<issue-number>-<slug>`.
4. **Implement the plan in the ticket, and only that.** Respect "Out of scope". Follow the repo CLAUDE.md files: no comments by default, surgical diff, incremental changes with the quality gates between steps (`npx tsc --noEmit && npm run lint && npm run test`; frontend types with `tsc -b`). Add or update tests per the Verification section.
5. **If the plan does not match reality** (code moved, problem already fixed, the change is much larger than described): do not improvise. Comment on the issue with what you found, move the ticket back to `Backlog`, and stop.
6. **QA in the running app** when the change is user-visible, or when a refactor needs proof that behaviour is unchanged. Use the `run` skill to start the app, drive it with Playwright, and take screenshots before and after (stash or checkout `main` for the "before"). Backend-only changes: exercise the affected endpoint before and after instead. Video is optional and best-effort; screenshots are the baseline. Skip QA for pure test additions and say so in the PR.
7. **Open a PR** against `main`, one ticket per PR, body linking `Closes #<issue>`, summarising the change, listing verification run, and embedding QA screenshots. GitHub cannot attach binaries via CLI: commit them under `docs/qa/<issue-number>/` on a separate branch `qa-media/<issue-number>` and reference them by raw URL, keeping them out of the PR diff.
8. **Move the ticket to `In review`** and stop. Never merge, never move to `Done`.

## Rules

- One ticket per run, one PR per ticket.
- If the quality gates cannot be made to pass, leave the branch pushed, comment the failure on the issue, move the ticket back to `Ready`, and stop.
- Never push to `main` and never force-push.
