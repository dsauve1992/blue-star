---
name: pr-review
description: Review ONE Blue Star pull request as a three-party debate (one defender acting as the author, two challengers), let the defender fix or refuse each objection, and merge the PR when all three approve and CI is green. Use when asked to review the PR of a ticket In review, or to run the scheduled PR reviewer.
---

# PR review (defender + two challengers)

Reviews exactly one PR per run. Load `kanban-board` first for the board commands, the comment markers and the stance lines.

You are the **moderator**. You do not review, fix or judge anything yourself: you run the three roles as subagents, post each turn on the PR, enforce the round cap and merge. The roles never talk to each other directly; the PR comments are the conversation.

## Roles

- **DEFENDER**: the PR's author. Works in a worktree of the PR branch and is the only role allowed to edit code. For every objection it chooses one of: *fix* (commit and push), *refuse* (with a technical reason the challenger can check), or *defer* (the change is valid but belongs in its own ticket; it files that ticket in `Backlog` with `agent-proposed`, linked to the PR, and says so). It never closes an objection by silence.
- **REVIEWER-1, correctness and security**: wrong behaviour, missed edge cases, ownership/authorization (`backend-security`), error handling, data loss, race conditions.
- **REVIEWER-2, design and tests**: conformance with `backend-patterns` and `backend-testing`, module boundaries, scope creep against the ticket's "Out of scope", test quality (would the test fail if the fix were dropped?), surgical diff, comments policy in `CLAUDE.md`.

Challengers read the code and the diff, never edit anything, and must back each objection with `file:line` and a concrete failing scenario. An objection without one is ignored by the moderator. They approve once every objection they raised is fixed, deferred to a ticket they find acceptable, or refuted. Style preferences that `CLAUDE.md` does not require are not objections.

## Steps

1. **Resolve the PR.** The issue number is given to you. Make sure the ticket carries the `pr-review` label (add it if missing; a launcher may already have). The ticket body or its comments link the PR; otherwise `gh pr list --repo dsauve1992/blue-star --search "head:agent/<issue-number>-" --state open`. If there is no open PR, comment on the issue, move the ticket back to `Ready`, and stop. If the PR already merged, move the ticket to `Done` and stop.
2. **Check the PR is reviewable.** Do not start if the PR is a draft or has merge conflicts with `main`: label the ticket `needs-human`, comment why, stop.
3. **Worktree.** `git -C $REPO fetch origin` then a detached-from-main worktree of the PR branch next to the repo, `../blue-star-worktrees/review-<issue-number>`, via `gh pr checkout <pr> --detach` or `git worktree add`. Only the DEFENDER subagent is told this path. The main checkout `$REPO` is never touched (no `switch`, `checkout`, `reset`, `stash`).
4. **Round 1.** Run REVIEWER-1 and REVIEWER-2 in parallel against the diff and the ticket. Give each: the ticket body, the PR diff, the role description above, and the stance format. Post each result as its own PR comment (`gh pr comment`), first line `**[REVIEWER-1]**`, last line the stance.
5. **Defender turn.** Run DEFENDER with the ticket, the diff and both reviewer comments. It answers every objection, edits and pushes fixes to the PR branch from the worktree (no force-push, quality gates `npx tsc --noEmit && npm run lint && npm run test` must pass before each push), then returns its answer. Post it as a `**[DEFENDER]**` comment, ending with `STANCE: APPROVE` (it stands behind the PR as it now is), `STANCE: OBJECT` (it believes a challenger is wrong and says why) or `STANCE: DEFER-TO-TICKET`.
6. **Next round.** Re-run each challenger on the new diff with the defender's reply. Each posts a new comment: `STANCE: APPROVE` if satisfied, otherwise `STANCE: OBJECT` listing only the still-open objections. A challenger that is persuaded by a refusal must say so explicitly. Repeat steps 5 and 6.
7. **Stop conditions, checked after every round.**
   - **Consensus:** all three latest comments end in `STANCE: APPROVE` (a `DEFER-TO-TICKET` counts as approve for the defender if the new ticket exists). Go to step 8.
   - **Round cap:** after 3 full rounds without consensus, post a `**[MODERATOR]**` comment summarising what is still disputed, add the label `needs-human` to the ticket and the PR, remove the worktree, stop. Never merge in this case.
   - **Stalled:** if two consecutive rounds raise the identical objection and neither side moved, treat it as the round cap immediately.
8. **Merge.** Re-read the PR once more: the head SHA must be the one the challengers last reviewed; if the defender pushed after their last approval, run one more challenger round first. Require every check green (`gh pr checks <pr>`; if checks are still running wait for them, never merge on red or pending). Then `gh pr merge <pr> --squash --delete-branch`. Never use `--admin`, never bypass branch protection, never merge a PR that is not the ticket's own `agent/*` branch.
9. **Close out.** Move the ticket to `Done`, add the label `pr-reviewed`, post a short `**[MODERATOR]**` summary comment (rounds taken, objections fixed, refused, deferred, links to any new tickets). Remove the worktree (`git -C $REPO worktree remove --force <path>`, the branch is deleted by the merge) and stop.

## Rules

- One PR per run. Never review or merge a PR whose ticket you were not started for.
- The moderator never edits code and never overrules a role. If a role returns something malformed (no stance line), rerun that role once; if it fails again treat it as `OBJECT` and let the cap handle it.
- The defender may refuse; a refusal stands when the challenger replies `STANCE: APPROVE` to it. A challenger may not approve "to be done" with an objection it still believes: that is `needs-human` material.
- Deferred work always becomes a real ticket before the defender's `DEFER-TO-TICKET` stance is accepted; a promise to do it later is `OBJECT`.
- A role that needs to run the PR's app does so only through the `run` skill's "Stage environments" with the `pr-review` row of `kanban-board` "Local app ports", from the review worktree, and the moderator stops those servers and drops that database copy before merging or stopping.
- Never touch deployment. Merging to `main` is the end of this skill; `deploy` stays a manual user decision.
- If `gh` fails with a missing-scope error, stop and report instead of working around it.
