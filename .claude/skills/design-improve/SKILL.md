---
name: design-improve
description: Act as Blue Star's product designer - run the app locally, pick ONE small UI/UX improvement, implement it, record a before/after QA video, and open a PR with the recording embedded. No kanban ticket. Use when asked to improve the UI/UX, run the designer, or run the scheduled designer.
---

# Design improve (designer)

Ships one small UI/UX improvement per run, end to end: browse the running app, choose, implement, record, open a PR. Unlike `fix-one-thing` + `implement-next`, there is no ticket; the PR itself is the proposal and the user accepts it by merging.

## Scope

In: one page or component under `apps/frontend/src`: visual hierarchy, spacing and alignment, readability of numbers and tables, empty/loading/error states, feedback after actions, affordances, keyboard and focus behaviour, responsive breakage, copy that confuses.
Out: global reskins, theme or design-token changes, new fonts, new features or pages, backend changes, new dependencies. Two whole-app redesigns were already abandoned; stay small and local. Target a handful of files and under ~200 changed lines.

The app is a swing-trading tool used daily by one trader. Favour changes that make reading the market and acting on a position faster and clearer over decoration.

## Steps

1. **Guard against pile-up.** List designer PRs: `gh pr list --repo dsauve1992/blue-star --state all --search "head:designer/" --limit 50 --json number,title,state,headRefName`. If 10 or more are open, report them and stop. Read the open, merged and closed ones so you neither repeat an idea nor re-propose one that was closed unmerged.
2. **Check the app ports are free.** `lsof -nP -iTCP:3000 -iTCP:5173 -sTCP:LISTEN`. If 5173 is taken (the user or `implement-next` is running the app), report it and stop; never kill the other process. If only 3000 is taken, use the `run` skill's free-backend-port recipe.
3. **Create the worktree** so the main checkout is never touched:

   ```bash
   REPO=/Users/davidsauve/git/blue-star
   WT=$REPO/../blue-star-worktrees/designer-<slug>
   git -C $REPO fetch origin main
   git -C $REPO worktree add -b designer/<slug> $WT origin/main
   cp $REPO/.env $WT/.env 2>/dev/null
   cp $REPO/apps/backend/.env $WT/apps/backend/.env
   cp $REPO/apps/frontend/.env $REPO/apps/frontend/.env.local $WT/apps/frontend/
   cd $WT && npm ci
   ```

   Use a provisional slug (e.g. the date) and rename the branch with `git branch -m` once the improvement is chosen. Run every later command from `$WT`.

4. **Start the app once** from `$WT` following the `run` skill (verify `DB_HOST=localhost` and the Postgres container first; `npm run dev`). Every backend boot sends a push notification to the user's phone, so boot once per run and leave it up until the end. Log in with `node .claude/skills/run/login.mjs`.
5. **Explore and choose.** With Playwright and the saved session, walk the main pages (dashboard, positions, watchlists, momentum leaders, sector rotation, market breadth) at 1440x900 and at 390x844. Take screenshots, look at real data states, try the main interactions. Load the `impeccable` skill for critique heuristics, but apply only one local fix. Pick the single change with the best value for its size, and write down the problem in one sentence before coding. If nothing worth doing is found, report that, clean up (step 10) and stop.
6. **Record the "before".** Write a Playwright script under the scratchpad (never in the repo) that uses the saved session, `recordVideo: { dir, size: { width: 1440, height: 900 } }` with the same viewport, and `slowMo: 400`, and walks the exact flow that shows the problem: navigate, pause 1-2 s on the area, perform the interaction. Keep it 10-30 s. Run it now, before any code change, and keep the `.webm`.
7. **Implement** in `$WT/apps/frontend/src`, following `apps/frontend/CLAUDE.md`: design-system components, no comments, surgical diff, loading/error/empty states preserved. Then run the quality gates: `npx tsc --noEmit && npm run lint && npm run test`, plus `cd apps/frontend && npx tsc -b`. Fix until green.
8. **Record the "after"** with the same script (Vite hot-reloads the change; reload the page first). Watch both recordings frame by frame via screenshots: the after must clearly show the improvement and no regression. If it does not, iterate on step 7 or abandon the change. Convert each recording:

   ```bash
   ffmpeg -y -i before.webm -c:v libx264 -pix_fmt yuv420p -movflags +faststart before.mp4
   ffmpeg -y -i before.webm -vf "fps=10,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" before.gif
   ```

   Same for `after`. Keep each GIF under ~8 MB (lower fps or width if needed).

9. **Publish the media and open the PR.**
   - Commit and push the code on `designer/<slug>` with a conventional message (`feat(<module>): ...` or `fix(<module>): ...`).
   - Media goes on a separate branch so it stays out of the PR diff: from a temporary worktree of `origin/main`, create `qa-media/designer-<slug>`, add `docs/qa/designer-<slug>/{before,after}.{gif,mp4}` plus the key screenshots, commit and push.
   - Open the PR against `main` with `gh pr create`. Body sections: **Problem** (what a trader experiences today), **Change** (what and why, files touched), **QA recording** (before/after GIFs embedded inline via `https://raw.githubusercontent.com/dsauve1992/blue-star/qa-media/designer-<slug>/docs/qa/designer-<slug>/after.gif`, with links to the full mp4s), **Verification** (gates run, viewports checked), **Out of scope / follow-ups**.
10. **Clean up.** Stop the dev servers you started, remove every worktree you created (`git -C $REPO worktree remove --force <path>`; branches stay). Report the PR URL.

## Rules

- One improvement per run, one PR per run. Never merge, never push to `main`, never force-push.
- Never run `git switch`, `checkout`, `reset` or `stash` in `$REPO`. If a step fails after commits exist, push the branch before removing the worktree.
- If the quality gates cannot be made green, or the recording does not show a clear improvement, open nothing: report what was tried, push nothing, clean up.
- Never print the test-account credentials; reference them by name only.
- Recording scripts and raw videos live in the scratchpad, not in the code branch.
