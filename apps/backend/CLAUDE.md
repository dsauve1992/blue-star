# CLAUDE.md - Backend

This file provides backend-specific guidance. See the root CLAUDE.md for architecture overview and commands.

## DDD Patterns

### Value Objects
- Private constructor, static factory: `Price.of(n)`, `PositionId.new()`, `Ticker.of(s)`
- Validate invariants at construction (fail-fast)
- Use in DTOs, not primitives - no primitive obsession
- Use `import type` for interfaces in decorators

### Entities
- Aggregate roots with business logic (not anemic)
- Position uses event sourcing: `Position.open()` to create, `Position.fromEvents()` to reconstruct
- Events: BUY, SELL, STOP_LOSS with chronological validation

### Repository Interfaces (in domain layer)
- **Write**: `save()`, `getById()` (throws if not found)
- **Read**: `findById()` (returns null), `findAll()`, `search()`, `count()`
- Injected via string tokens: `@Inject(POSITION_WRITE_REPOSITORY)`

### Use Cases
- Single `execute(request, authContext)` method
- Orchestrate domain operations, no business logic here
- Always validate user ownership for operations on existing resources
- Write use cases return minimal data (just IDs); read use cases return full entities

### Authorization
Every use case operating on existing resources must check:
```typescript
if (resource.userId.value !== authContext.userId.value) {
  throw new UnauthorizedError('User does not own this resource');
}
```

### NestJS Module Wiring
```typescript
@Module({
  providers: [
    MyUseCase,
    { provide: REPOSITORY_TOKEN, useClass: RepositoryImplementation },
  ],
})
```

### Domain Errors
Use `InvariantError`, `StateError`, `ChronologyError` - not generic Error.

## Database Conventions

### No ORM
Direct SQL with `pg` library. Use `DatabaseService` for queries and transactions.

### Migrations (db-migrate with SQL files)
```bash
npx db-migrate create --env dev migration-name --sql-file   # Creates up/down SQL files
npx db-migrate up --env dev
npx db-migrate down --env dev
```
- SQL files in `migrations/sqls/` (never edit generated JS wrappers)
- UUID primary keys, VARCHAR(255) for external auth IDs
- Always include indexes on foreign keys and frequent query columns
- Use `TIMESTAMP WITH TIME ZONE` for all timestamps
- Test both up and down migrations

### Event Sourcing Tables
Positions use dual-table pattern: `positions` (current state) + `position_events` (event stream). Repository reconstructs entity from events using `Position.fromEvents()`.

### Transactions
```typescript
await this.databaseService.transaction(async (client) => {
  // All queries within use the same client
});
```

## Testing Rules

### Unit Tests (*.spec.ts)
- **Arrange-Act-Assert** pattern, always
- Mock repository **interfaces**, not concrete implementations
- Use domain value objects in test data, not primitives
- Mock UUID generation: `jest.spyOn(UuidGeneratorService, 'generate').mockReturnValue('test-uuid')`
- For write use cases: assert on **mutations** (what was saved), not return values
- Use exact assertions (`toEqual` with full objects), not `expect.objectContaining`
- Use `toHaveBeenNthCalledWith` over separate `toHaveBeenCalledTimes` + `toHaveBeenCalledWith`
- Test names must be behavior-focused: "should create and save a position with the correct data"

### Integration Tests (*.integration.spec.ts)
- Test repository contract behavior against real PostgreSQL via TestContainers
- Follow TDD: one failing test -> make it pass -> refactor
- Compare value objects with `toEqual(Ticker.of('AAPL'))`, never access `.value` in assertions
- Clean database state in `beforeEach` (DELETE FROM tables)
- Type-assert database rows: `const row = result.rows[0] as DatabaseRowType`

### Test Setup
- Global setup in `test/config/globalSetup.ts` (database provisioning)
- Global mocks in `jest.setup.ts` (UUID generator default)
- Override global mocks locally with `jest.spyOn` when tests need specific values

### ESLint in Tests
`@typescript-eslint/unbound-method` is disabled globally in eslint config (Jest mock patterns trigger it). Do not add per-line disables.

## Implementation Order for New Features
1. Domain value objects
2. Repository interfaces in domain
3. Use case with value object DTOs
4. Infrastructure repository implementation (SQL)
5. Wire up in NestJS module
6. API controller + mapper
