---
name: implement-next
description: Pick the next ticket in the Ready column of the Blue Star kanban board, implement it following the ticket's plan, verify it (quality gates, and QA in the running app when behaviour is user-visible), open a PR and move the ticket to In review. Use when asked to implement the next ticket, or to run the scheduled implementer.
---

# Implement next (implementer)

Executes exactly one approved ticket per run. Load `kanban-board` first.

## Steps

1. **Check for work in flight.** If any ticket is already `In progress`, stop and report it; do not start another.
2. **Pick the ticket.** Items with Status `Ready`, ordered by Priority (P0 first), then oldest. If none, report "nothing ready" and stop.
3. **Claim it.** Move it to `In progress`, then work in a dedicated worktree so the main checkout, which the user may be using, is never touched (no `git switch`/`checkout` there):

   ```bash
   REPO=/Users/davidsauve/git/blue-star
   WT=$REPO/../blue-star-worktrees/agent-<issue-number>-<slug>
   git -C $REPO fetch origin main
   git -C $REPO worktree add -b agent/<issue-number>-<slug> $WT origin/main
   cp $REPO/.env $WT/.env 2>/dev/null; cd $WT && npm ci
   ```

   Run every later command from `$WT`. Copy any other untracked env file the `run` skill needs from `$REPO`.
4. **Implement the plan in the ticket, and only that, using the adversarial loop.** The ticket body (Problem, Proposed change, Out of scope, Verification) is the spec. `adversarial-loop` has `disable-model-invocation`, so do not call it through the Skill tool: Read `~/.claude/skills/adversarial-loop/SKILL.md` and follow it. You are the orchestrator and do not edit code yourself; builder and critic subagents work in `$WT` (tell them the absolute path and to never touch `$REPO`). Add to both builder and critic prompts: respect "Out of scope"; follow the repo CLAUDE.md files (no comments by default, surgical diff); run the quality gates between steps (`npx tsc --noEmit && npm run lint && npm run test`; frontend types with `tsc -b`); add or update tests per the Verification section. Loop until a fresh critic returns PASS, including the final whole-diff pass. Disagreements with the critic and spec ambiguities go in the PR body. If one issue keeps resurfacing after 3+ rounds, treat it as step 5 (plan does not match reality). Do not push or open the PR from inside the loop; steps 6-8 stay yours.
5. **If the plan does not match reality** (code moved, problem already fixed, the change is much larger than described): do not improvise. Comment on the issue with what you found, move the ticket back to `Backlog`, and stop.
6. **QA in the running app** when the change is user-visible, or when a refactor needs proof that behaviour is unchanged. Use the `run` skill to start the app, drive it with Playwright, and take screenshots before and after (for the "before", add a second detached worktree of `origin/main` next to `$WT`, or stash in `$WT`). Backend-only changes: exercise the affected endpoint before and after instead. Video is optional and best-effort; screenshots are the baseline. Skip QA for pure test additions and say so in the PR.
7. **Open a PR** against `main`, one ticket per PR, body linking `Closes #<issue>`, summarising the change, listing verification run, and embedding QA screenshots. GitHub cannot attach binaries via CLI: commit them under `docs/qa/<issue-number>/` on a separate branch `qa-media/<issue-number>` (from a temporary worktree, not `$WT`) and reference them by raw URL, keeping them out of the PR diff.
8. **Move the ticket to `In review`**, then remove the worktrees you created (`git -C $REPO worktree remove --force $WT`, same for any "before" or media worktree; the branches stay) and stop. Never merge, never move to `Done`.

## Rules

- One ticket per run, one PR per ticket.
- If the quality gates cannot be made to pass, leave the branch pushed, comment the failure on the issue, move the ticket back to `Ready`, and stop.
- Never push to `main` and never force-push.
- Never run `git switch`, `checkout`, `reset` or `stash` in the main checkout (`$REPO`). If a stage fails, still remove the worktree, unless the branch has unpushed commits: push the branch first.
- Ports and the local Postgres are shared with the main checkout; if the app cannot start because they are taken, treat it as a failed QA step, not a reason to stop the other process.
