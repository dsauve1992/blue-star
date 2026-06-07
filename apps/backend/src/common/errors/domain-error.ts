/**
 * Shared base for all domain errors and the two cross-cutting boundary errors.
 *
 * `DomainError` is the single base every module's error taxonomy extends, so the
 * HTTP-boundary exception filter can recognise any domain error with a single
 * `instanceof DomainError` (no string-name matching).
 *
 * `AuthorizationError` (403) and `NotFoundError` (404) live here rather than in a
 * single domain module because they are *boundary* concerns shared across every
 * bounded context. Module-specific errors (e.g. `StateError`, `InvariantError`,
 * `ChronologyError`) stay in each module's `domain-errors.ts` and extend this base.
 */
export class DomainError extends Error {}

/** Caller is authenticated but does not own / may not act on the resource → 403. */
export class AuthorizationError extends DomainError {}

/** Requested resource does not exist → 404. */
export class NotFoundError extends DomainError {}
