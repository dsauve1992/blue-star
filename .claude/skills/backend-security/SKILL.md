---
name: backend-security
description: Use when building or reviewing anything that touches the auth/ownership boundary in the Blue Star backend — controllers, use cases that read/mutate existing resources, new API endpoints, @Public() routes, or any handler that accepts a resource id from the client.
---

# Blue Star Backend Security

The backend's authorization model is simple but easy to get wrong. This skill is the
threat model and the non-negotiable rules. For the *mechanics* (which error to throw,
how it maps to HTTP, where errors live) see the `backend-patterns` skill.

## The one rule that matters: authentication ≠ authorization

The global `AuthGuard` populates `req.user` and proves the caller is **logged in**. It
proves **nothing** about whether they own the resource they're acting on. Ownership is a
separate, explicit check that every use case must perform itself.

> A logged-in user passing someone else's `watchlistId` / `positionId` is the default
> attack. If a handler takes an id from the client and doesn't check ownership, it is an
> IDOR (Insecure Direct Object Reference), full stop.

This is not hypothetical: the `watchlist-monitoring` module shipped without this check —
any authenticated user could activate/deactivate monitoring on, or read the status of,
any watchlist by guessing an id. That's the bug this skill exists to prevent.

## Rules

1. **Every use case that reads or mutates an existing resource takes `authContext` and
   verifies ownership.** No exceptions for "internal-looking" or read-only endpoints —
   reading another user's data is still a breach. Construction-only use cases (create a
   brand-new resource owned by the caller) don't need a lookup, but they must still set
   ownership from `authContext`, never from the request body.

2. **Trust ids from the client only after an ownership check.** A `watchlistId` /
   `positionId` in a path param or body is attacker-controlled. Load the resource, then
   compare `resource.userId.value === authContext.userId.value` before using it.

3. **Child resources derive ownership from their parent aggregate.** Don't trust a child
   id in isolation, and don't denormalize a `userId` onto the child to dodge the parent
   lookup. Load the parent via its read repository and check the parent's owner. (See the
   `backend-patterns` "Use Cases" section for the code.)

4. **Reject with the typed error, not a bare `Error`.** `throw new AuthorizationError(...)`
   → 403, `throw new NotFoundError(...)` → 404, via `DomainErrorFilter`. A bare `Error`
   leaks as a 500 and tells the caller nothing — and historically these were written as
   `throw new Error('User does not own this ...')`, which is the anti-pattern. Don't
   reintroduce it.

5. **Prefer "not found" semantics where leaking existence is itself a risk.** Returning
   403 confirms the resource exists. For sensitive resources, returning 404 for both
   "doesn't exist" and "exists but not yours" avoids that enumeration leak. Default to
   403 for ownership (clearer), but make it a deliberate choice for sensitive data.

6. **`@Public()` endpoints need a deliberate justification.** Anything marked `@Public()`
   bypasses `AuthGuard` entirely. It must touch no user-owned data and, ideally, no
   expensive/abusable operation. The `stock-analysis` `consolidations/run` and
   `rs-ratings/run` POST endpoints are public and kick off expensive Python jobs — that's
   a known, accepted trade-off, but new public endpoints must clear the same bar
   explicitly, not by omission.

7. **Order the guards: not-found before ownership.** Load → null check (`NotFoundError`)
   → ownership check (`AuthorizationError`) → do the work. Never mutate, then check.

8. **Parameterized SQL only.** All queries use `$1, $2` placeholders via `DatabaseService`
   — never string-interpolate client input into SQL. (The codebase is clean here; keep it
   that way.)

## Controller responsibilities

The controller builds `AuthContext` from `req.user` and passes it as the **second
argument** to `useCase.execute(request, authContext)` — mirror the watchlist controller
exactly. A handler that accepts a resource id but never reads `req.user` is the first
red flag to look for in review.

```typescript
async activate(@Param('watchlistId') id: string, @Req() req: AuthenticatedRequest) {
  const authContext: AuthContext = { userId: req.user.userId };
  return this.activateMonitoringUseCase.execute(
    { watchlistId: WatchlistId.of(id), /* ... */ },
    authContext,
  );
}
```

## Review checklist (use when reviewing a controller/use-case diff)

- [ ] Does every use case operating on an existing resource take `authContext`?
- [ ] Is ownership checked before any read/return/mutation?
- [ ] For child resources, is ownership derived from the parent aggregate?
- [ ] Are rejections `AuthorizationError` / `NotFoundError`, not bare `Error`?
- [ ] Does the controller pass `authContext` from `req.user` (not from the body)?
- [ ] Any new `@Public()` endpoint — is it justified and free of user-owned data?
- [ ] Is all SQL parameterized?
