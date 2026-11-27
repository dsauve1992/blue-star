# Decisions

Standing decisions that apply to every agent and every session. Check a proposal against this list before filing or implementing it. Each entry is a generalised rule with its reason, not a per-ticket note.

## Module ownership

- **A value object belongs to the module whose concept it is.** A downstream module importing the owning module's value objects is an accepted one-way dependency, not a leak. Promote to `shared/` only when no single module owns the concept (`Symbol`, `DateRange`). A second importer alone is not enough.
  Why: moving owned concepts into `shared/` turns it into a catch-all. Rejected in #94 (`WatchlistId`, `WatchlistTicker` stay in `watchlist`).

## API routes

- **A route with no frontend caller that exists to re-run a job by hand carries `@ManualTrigger()`** (`shared/decorators/manual-trigger.decorator.ts`). A route so marked is in use: do not remove it as dead code. An uncalled route without the marker is a removal candidate.
  Why: these routes are the way to re-run a failed or skipped scheduled job, and nothing in the code otherwise distinguishes them from leftovers. Kept on 2026-11-26 when the potent-scan triggers were proposed for removal.

## How to add an entry

When a ticket or PR is rejected, or the user corrects an agent, add the generalised rule here with a one-line _Why_ and the ticket or PR number. Do not log the individual ticket.
