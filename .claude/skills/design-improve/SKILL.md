---
name: design-improve
description: Act as Blue Star's product designer - run the app locally, pick ONE small UI/UX improvement, capture before evidence, and file it as a Backlog ticket on the kanban board. Proposes only - never edits code or opens a PR. Use when asked to find a UI/UX improvement, run the designer, or run the scheduled designer.
---

# Design improve (designer, proposer)

UI/UX counterpart of `fix-one-thing`. Browse the running app, choose **one** small improvement, show the problem on screen, and file a ticket. Do not change code; the user decides which tickets become Ready and `implement-next` builds them.

Load `kanban-board` first for the board commands and the ticket format.

## Scope

In: one page or component under `apps/frontend/src`: visual hierarchy, spacing and alignment, readability of numbers and tables, empty/loading/error states, feedback after actions, affordances, keyboard and focus behaviour, responsive breakage, copy that confuses.
Out: global reskins, theme or design-token changes, new fonts, new features or pages, backend changes, new dependencies. Two whole-app redesigns were already abandoned; stay small and local. The change must fit a small diff: a handful of files, under ~200 changed lines. If it is bigger, shrink the proposal or pick another finding.

The app is a swing-trading tool used daily by one trader. Favour changes that make reading the market and acting on a position faster and clearer over decoration.

## Steps

0. **Check backlog size.** Count items with Status `Backlog` (see `kanban-board`). If there are 20 or more, report the count and stop; file nothing.
1. **Read the open backlog** so you do not duplicate: `gh issue list --repo dsauve1992/blue-star --label agent-proposed --state all --limit 100`. Skip anything already filed, closed or rejected (`wontfix`, or closed as not planned).
2. **Check your app ports are free.** The `run` skill's "Stage environments", as stage `design-improve`, tells you which ports and how. If one is taken, report it and stop; never kill the other process.
3. **Create a worktree of `origin/main`** so the main checkout is never touched and the proposal reflects `main`:

   ```bash
   REPO=/Users/davidsauve/git/blue-star
   WT=$REPO/../blue-star-worktrees/designer-<date>
   git -C $REPO fetch origin main
   git -C $REPO worktree add --detach $WT origin/main
   cp $REPO/.env $WT/.env 2>/dev/null
   cp $REPO/apps/backend/.env $WT/apps/backend/.env
   cp $REPO/apps/frontend/.env $REPO/apps/frontend/.env.local $WT/apps/frontend/
   cd $WT && npm ci
   ```

   Run every later command from `$WT`.

4. **Start the app once** from `$WT` following the `run` skill's "Stage environments" as stage `design-improve` (verify `DB_HOST=localhost` and the Postgres container first). Boot once per run and leave it up until the end. Log in with the `login.mjs` command from that section.
5. **Explore and choose.** With Playwright and the saved session, walk the main pages (dashboard, positions, watchlists, momentum leaders, sector rotation, market breadth) at 1440x900 and at 390x844. Take screenshots, look at real data states, try the main interactions. Load the `impeccable` skill for critique heuristics, but propose only one local fix. Pick the single change with the best value for its size, and write the problem down in one sentence. If nothing worth doing is found, report that, clean up (step 8) and stop.
6. **Record the evidence video** of the problem happening, following `kanban-board` "Evidence video" (always a video here, never a bare screenshot; a still is only an addition). If you cannot reproduce the problem on screen, do not file it.
7. **Write and file the ticket.**
   - Publish the video as `kanban-board` describes and embed it in the Problem section.
   - Body in the board's format. **Problem**: what the trader experiences, with the video. **Proposed change**: the smallest change, naming the files and design-system components to use, and what the screen must look like after. **Out of scope**: what the ticket does not touch. **Verification**: the flow the video shows, to replay once fixed, the viewports to check (1440x900 and 390x844), and the quality gates. **Category**: `ux`. It must be precise enough for another agent to implement without extra context.
   - Labels `agent-proposed` plus `enhancement` or `bug`; Priority P1 if it hides or misleads on a daily screen, else P2; Size XS-S expected.
   - File it in `Backlog` with the `kanban-board` commands. File exactly one ticket.
8. **Clean up.** Stop the dev servers you started, drop your database copy, and remove every worktree you created (`git -C $REPO worktree remove --force <path>`). Report the ticket URL and stop.

## Rules

- One ticket per run. Never edit application code, never open a PR, never push anything except the `qa-media/proposals` branch, never force-push.
- Never run `git switch`, `checkout`, `reset` or `stash` in `$REPO`.
- Never print the test-account credentials; reference them by name only.
- Recording scripts and raw videos live in the scratchpad, not in the repo.
- If `gh` fails with a missing-scope error, stop and report instead of working around it.
