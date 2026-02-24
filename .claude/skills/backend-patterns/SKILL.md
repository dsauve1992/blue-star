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

Use specific domain errors, never generic `Error`:

| Error | When |
|-------|------|
| `InvariantError` | Invalid data, business rule violated |
| `StateError` | Operation invalid for current entity state |
| `ChronologyError` | Event timestamp out of order |

All extend `DomainError extends Error`.

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
- Always check ownership on existing resources:

```typescript
if (resource.userId.value !== authContext.userId.value) {
  throw new Error('User does not own this resource');
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
