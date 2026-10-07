---
name: architect-review
description: Review Blue Star's big-picture architecture - module boundaries, useless coupling, misplaced shared code, cross-module mechanisms - and file ONE structural improvement as a Backlog ticket on the kanban board. Proposes only - never edits code. Use when asked for an architecture review, to find coupling between modules, or to run the scheduled architect.
---

# Architect review (proposer)

Big-picture counterpart of `fix-one-thing`. Look at modules and how they depend on each other, not at details inside a module. File **one** ticket and stop. Never change code.

Load `kanban-board` first for the board commands and the ticket format.

## Scope

In: coupling between modules (`apps/backend/src/*`, feature areas in `apps/frontend/src`), import cycles, a module reaching into another's internals (domain, repositories, value objects) instead of a public surface, duplicated concepts across modules, misplaced code (module-specific code in `shared/`, shared code stuck in one module), inconsistent cross-module mechanisms (events, queries, cron wiring, backend/Python-screener contract), frontend/backend contract drift.

Out: anything fixable inside one module (that is `fix-one-thing`), naming, formatting, tests of a single module, new features, dependency upgrades.

Respect existing decisions: a value object stays in its owning module until a second module imports it (then promote to `shared/`); follow `apps/backend/CLAUDE.md` and the `backend-patterns` skill for the intended layering.

Each proposal must be a **small, incremental step** toward a better structure (e.g. "stop module A importing B's repository; expose a query instead"), never a rewrite. If the right fix is large, propose its first step only and describe the destination in the ticket.

## Steps

0. **Check backlog size.** Count items with Status `Backlog`. If there are 20 or more, report the count and stop; file nothing.
1. **Read the open backlog** (`gh issue list --repo dsauve1992/blue-star --label agent-proposed --state all --limit 100`) so you do not duplicate or contradict an existing ticket.
2. **Map the dependencies with evidence, not impressions.** For each backend module, grep its imports of other modules (`rg "from '\.\./\.\./<other>" apps/backend/src/<module>`), build the module-to-module edge list, and look for cycles, hub modules everything depends on, and imports that cross into another module's `domain/`, `infrastructure/` or repositories. Do the same for the frontend feature folders and for the Python screeners' contract with the backend. Use `madge` or similar only if already installed.
3. **Pick the single most harmful coupling.** Rank by: cycles first, then deep imports into another module's internals, then misplaced shared code. Prefer findings where the fix is a contained step.
4. **Verify it** by reading both sides of the edge and every caller of the thing you propose to move or hide. Do not file speculative findings.
5. **Write the ticket** in the board's body format with category `architecture`. Problem: name the modules and the exact import edges (file:line). Proposed change: the first incremental step, files touched, and the resulting dependency direction. Out of scope: the rest of the restructuring. Verification: type-check, tests, and a re-run of the grep that proves the edge is gone. Label `enhancement`; Priority P1 for cycles or leaks into another module's domain, otherwise P2; Size honestly (S-L).
6. **File it in Backlog** using the `kanban-board` commands, report its URL, and stop.

If the dependency graph is clean enough that nothing is worth a ticket, say so and file nothing.
