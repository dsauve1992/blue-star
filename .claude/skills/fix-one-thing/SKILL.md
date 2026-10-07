---
name: fix-one-thing
description: Find ONE small, local improvement in a Blue Star module (missing test, small refactor, bug, security concern, UX edge case or feedback) and file it as a Backlog ticket on the kanban board. Proposes only - never edits code. Use when asked to "fix one thing", find an improvement, or run the scheduled improvement proposer.
---

# Fix One Thing (proposer)

Detail-oriented counterpart of `architect-review`. Look inside **one module** for **one** small improvement and file a ticket. Do not change code; the user decides which tickets become Ready and `implement-next` builds them.

Load `kanban-board` first for the board commands and the ticket format.

## Scope

In: adding tests, small refactors, bug fixes, a security concern, UX improvements (edge cases, user feedback, interactions, state transitions).
Out: anything crossing a module boundary, renames or moves across modules, new features, dependency upgrades, broad cleanup. If the best finding is cross-module, file it with category `architecture` and a note that it belongs to `architect-review`, or skip it.

The fix must be implementable as a small diff (target: one module, a handful of files, under ~150 changed lines). If it is bigger, shrink the proposal or pick another finding.

## Steps

0. **Check backlog size.** Count items with Status `Backlog` (see `kanban-board`). If there are 20 or more, report the count and stop; file nothing.
1. **Pick a module** under `apps/backend/src/` or `apps/frontend/src/`. Prefer one with the fewest recent commits and the weakest tests (`git log --since=60.days --name-only`, compare against `*.spec.ts`/`*.test.tsx` presence). Vary the choice between runs.
2. **Read the open backlog** so you do not duplicate: `gh issue list --repo dsauve1992/blue-star --label agent-proposed --state all --limit 100`. Skip anything already filed, closed or rejected (`wontfix`).
3. **Find one candidate** by reading the module. Follow `apps/backend/CLAUDE.md` / `apps/frontend/CLAUDE.md` conventions; use `backend-patterns`, `backend-testing` and `backend-security` for backend judgement. Verify the problem is real (read the callers, run the code or the existing tests) before proposing. Do not file speculative findings.
4. **Capture evidence for visual findings.** If the problem is visible in the UI (visual bug, missing feedback, awkward interaction or state transition), reproduce it in the running app with the `run` skill and Playwright, and take a screenshot, or a short video when the problem is motion or a transition. Store media on branch `qa-media/proposals` under `docs/qa/proposals/<slug>/` (push that branch, never `main`), and embed the raw URLs in the ticket's Problem section. If you cannot reproduce it visually, do not file it as a visual ticket. Non-visual findings need no media.
5. **Write the ticket** in the board's body format. The plan must be precise enough for another agent to implement without extra context. Choose label from `bug`, `enhancement`, `documentation`, plus a category line in the body. Set Priority (P0 real bug or security, P1 likely user-visible, P2 hygiene) and Size (XS-S expected).
6. **File it in Backlog** using the `kanban-board` commands. File exactly one ticket, then stop and report its URL.

If nothing real is found in the chosen module after a fair read, say so and file nothing.
