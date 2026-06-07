---
name: backend-patterns
description: Use when building or modifying backend features in Blue Star — creating value objects, entities, repository interfaces, use cases, infrastructure repositories, or wiring NestJS modules.
---

# Blue Star Backend Patterns

Architecture: DDD + Clean Architecture + CQRS. Dependency direction: Domain ← Application ← Infrastructure ← API.

## Value Objects

Private constructor, static factory, fail-fast validation. No primitives in DTOs.

```typescript
export class Ticker {
  private constructor(public readonly value: string) {}

  static of(sym: string): Ticker {
    if (!/^[A-Z][A-Z0-9.-]{0,15}$/.test(sym)) throw new InvariantError(`Invalid ticker: ${sym}`);
    return new Ticker(sym);
  }
}
```

Two factory patterns:
- `Ticker.of(s)` — from existing value (validate)
- `PositionId.new()` — generate new (calls `UuidGeneratorService.generate()`)

Use `import type` for interfaces used in decorators.

## Entities

Aggregate roots with business logic — never anemic. Private constructor, static factory.

**Event-sourced entity** (Position pattern):
- `Position.open(...)` — creates and validates initial state
- `Position.fromEvents(id, userId, events[])` — reconstructs from event stream
- Events: `BUY`, `SELL`, `STOP_LOSS` — validated chronologically

## Domain Errors

Use specific domain errors, **never** generic `throw new Error(...)` in the domain or
use-case layers. A bare `Error` becomes an HTTP 500; a `DomainError` is mapped to the
right status by the global filter (see below).

| Error | When | HTTP |
|-------|------|------|
| `InvariantError` | Invalid data, business rule violated | 400 |
| `StateError` | Operation invalid for current entity state | 400 |
| `ChronologyError` | Event timestamp out of order | 400 |
| `AuthorizationError` | Caller authenticated but does not own / may not act on the resource | 403 |
| `NotFoundError` | Requested resource does not exist | 404 |

The shared base `DomainError`, plus the cross-cutting `AuthorizationError` and
`NotFoundError`, live in **`src/common/errors`** (one identity app-wide). Module-specific
errors (`InvariantError`, `StateError`, `ChronologyError`) live in each module's
`domain/domain-errors.ts`, which **re-exports** the shared base and extends it:

```typescript
// src/modules/position/domain/domain-errors.ts
export { DomainError, AuthorizationError, NotFoundError } from '../../../common/errors';
import { DomainError } from '../../../common/errors';

export class ChronologyError extends DomainError {}
export class StateError extends DomainError {}
export class InvariantError extends DomainError {}
```

So consumers always import from their own module path (`from '../domain/domain-errors'`),
never reach across modules, yet every error shares one `DomainError` identity.

### Error → HTTP mapping (the boundary)

`DomainErrorFilter` (`src/common/filters/domain-error.filter.ts`, wired globally via
`APP_FILTER` in `app.module.ts`) catches everything and maps by `instanceof`:
`AuthorizationError` → 403, `NotFoundError` → 404, any other `DomainError` → 400,
NestJS `HttpException`s pass through, anything else is rethrown → 500. Use cases just
throw the right `DomainError` subtype; never touch HTTP status codes in a use case.

## Repository Interfaces (domain layer)

CQRS split — separate read and write interfaces:

```typescript
// Write: throws if not found
export interface PositionWriteRepository {
  save(position: Position): Promise<void>;
  getById(positionId: PositionId): Promise<Position>;  // throws InvariantError
}

// Read: returns null if not found
export interface PositionReadRepository {
  findById(positionId: PositionId): Promise<Position | null>;
  findByUserId(userId: UserId): Promise<Position[]>;
  findAll(): Promise<Position[]>;
}
```

Injected via string tokens: `@Inject(POSITION_WRITE_REPOSITORY)`. Tokens defined in `constants/tokens.ts`.

## Use Cases

Single `execute(request, authContext)` method. Orchestrate domain operations — no business logic here.

```typescript
@Injectable()
export class OpenPositionUseCase {
  constructor(
    @Inject(POSITION_WRITE_REPOSITORY)
    private readonly repo: PositionWriteRepository,
  ) {}

  async execute(request: OpenPositionRequestDto, authContext: AuthContext): Promise<OpenPositionResponseDto> {
    const position = Position.open({ userId: authContext.userId, ...request });
    await this.repo.save(position);
    return { positionId: position.id };
  }
}
```

**Rules:**
- DTOs use value objects, not primitives
- Write use cases return minimal data (just IDs)
- Read use cases return full entities
- **Any use case that reads or mutates an *existing* resource takes `authContext` and
  verifies ownership** — this is mandatory, not optional. The global `AuthGuard` only
  proves the caller is logged in (authentication), never that they own the object
  (authorization). Skipping the check is an IDOR. See the `backend-security` skill.

Load the resource, then guard before doing anything with it:

```typescript
const resource = await this.readRepo.findById(request.id);
if (!resource) {
  throw new NotFoundError(`Resource ${request.id.value} not found`);
}
if (resource.userId.value !== authContext.userId.value) {
  throw new AuthorizationError('User does not own this resource');
}
```

**Child resources derive ownership from their parent.** If the entity has no `userId`
of its own (e.g. `WatchlistMonitoring` belongs to a `Watchlist`), load the parent
aggregate via its read repository and check the parent's `userId` — do **not** add a
redundant `userId` to the child:

```typescript
// watchlist-monitoring use case: ownership comes from the parent watchlist
const watchlist = await this.watchlistReadRepository.findById(request.watchlistId);
if (!watchlist) {
  throw new NotFoundError(`Watchlist ${request.watchlistId.value} not found`);
}
if (watchlist.userId.value !== authContext.userId.value) {
  throw new AuthorizationError('User does not own this watchlist');
}
```

## Infrastructure Repository (SQL)

Direct SQL with `pg` library via `DatabaseService`. No ORM.

```typescript
@Injectable()
export class PositionWriteRepository implements PositionWriteRepositoryInterface {
  constructor(private readonly db: DatabaseService) {}

  async save(position: Position): Promise<void> {
    await this.db.transaction(async (client) => {
      await client.query('INSERT INTO positions ...', [...]);
      await client.query('INSERT INTO position_events ...', [...]);
    });
  }
}
```

**Event sourcing tables:** `positions` (current state snapshot) + `position_events` (full event stream). Repository reconstructs entity via `Position.fromEvents()`.

## NestJS Module Wiring

```typescript
@Module({
  imports: [DatabaseModule],
  controllers: [PositionController],
  providers: [
    { provide: POSITION_WRITE_REPOSITORY, useClass: PositionWriteRepository },
    { provide: POSITION_READ_REPOSITORY, useClass: PositionReadRepository },
    PositionApiMapper,
    OpenPositionUseCase,
    GetPositionsUseCase,
  ],
})
export class PositionModule {}
```

## Database Conventions

- UUID primary keys, `VARCHAR(255)` for external auth IDs
- `TIMESTAMP WITH TIME ZONE` for all timestamps
- Indexes on foreign keys and frequent query columns
- Migrations in `migrations/sqls/` — never edit generated JS wrappers
- Always write both up and down migrations

## Implementation Order for New Features

1. Domain value objects
2. Repository interfaces in domain layer
3. Use case with value object DTOs
4. Infrastructure repository (SQL)
5. Wire in NestJS module
6. API controller + mapper
