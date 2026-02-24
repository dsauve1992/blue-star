---
name: backend-testing
description: Use when writing or reviewing tests in the Blue Star backend — use case unit tests, repository integration tests, or API controller tests.
---

# Blue Star Testing Conventions

Three test types, each targeting a different layer.

## 1. Use Case Tests (`*.spec.ts`)

**What to test:** business logic and orchestration. Mock all repositories.

**Rules:**
- Arrange-Act-Assert, always
- Mock repository **interfaces**, not concrete implementations
- Use domain value objects in test data — never raw primitives
- Mock UUID: `jest.spyOn(UuidGeneratorService, 'generate').mockReturnValue('test-uuid')`
- **Write use cases:** assert on what was **saved** (the mutation), not the return value
- **Read use cases:** assert on the return value
- Exact assertions: `toEqual` with full objects, not `expect.objectContaining`
- Use `toHaveBeenNthCalledWith` over separate `toHaveBeenCalledTimes` + `toHaveBeenCalledWith`
- Test names: behavior-focused — `"should create and save a position with the correct data"`

**Setup pattern:**
```typescript
beforeEach(async () => {
  mockRepo = {
    save: jest.fn().mockResolvedValue(undefined),
    getById: jest.fn(),
  } as jest.Mocked<PositionWriteRepository>;

  const module = await Test.createTestingModule({
    providers: [
      MyUseCase,
      { provide: REPO_TOKEN, useValue: mockRepo },
    ],
  }).compile();

  useCase = module.get<MyUseCase>(MyUseCase);
});
```

**Write use case assertion (assert on the saved entity):**
```typescript
it('should create and save a position with the correct data', async () => {
  jest.spyOn(UuidGeneratorService, 'generate').mockReturnValue('test-uuid-123');

  await useCase.execute(request, authContext);

  const expectedPosition = Position.fromEvents(PositionId.of('test-uuid-123'), userId, [...]);
  expect(mockRepo.save).toHaveBeenCalledWith(expectedPosition);
});
```

---

## 2. Repository Integration Tests (`*.integration.spec.ts`)

**What to test:** SQL correctness and repository contract against real PostgreSQL (TestContainers).

**Rules:**
- `beforeAll` for module/DB setup, `afterAll` to close module
- `beforeEach`: `DELETE FROM` dependent tables first (e.g. `position_events` before `positions`)
- Compare value objects with `toEqual(Ticker.of('AAPL'))` — never unwrap `.value` in assertions
- `findById` returns `null` when not found; `getById` throws `InvariantError`
- Type-assert raw DB rows: `const row = result.rows[0] as MyRowType`
- Use fixed UUID strings for predictable test data

**Setup pattern:**
```typescript
beforeAll(async () => {
  module = await Test.createTestingModule({
    imports: [await ConfigModule.forRoot({ isGlobal: true })],
    providers: [
      DatabaseService,
      { provide: 'REPO_TOKEN', useClass: PostgresMyRepository },
    ],
  }).compile();
  await module.init();
  repository = module.get('REPO_TOKEN');
  databaseService = module.get(DatabaseService);
});

afterAll(async () => { await module.close(); });

beforeEach(async () => {
  await databaseService.query('DELETE FROM position_events');
  await databaseService.query('DELETE FROM positions');
});
```

**Read repository pattern (insert raw SQL, assert via repository):**
```typescript
it('should return null when position not found', async () => {
  const result = await repository.findById(PositionId.of('non-existent-id'));
  expect(result).toBeNull();
});
```

---

## 3. API Controller Tests (`*.spec.ts` in `api/`)

**What to test:** request parsing (raw body → value objects), use case delegation, and response mapping. Mock all use cases.

**Rules:**
- Mock use cases, not repositories — the controller never touches repos
- Assert that the use case was called with the correct **value object** DTOs
- Assert that the response matches the mapper output
- Test both happy path and invalid input (value object construction throws)

**Setup pattern:**
```typescript
beforeEach(async () => {
  mockUseCase = { execute: jest.fn() } as jest.Mocked<OpenPositionUseCase>;
  mockMapper = { mapOpenPositionResponse: jest.fn() } as jest.Mocked<PositionApiMapper>;

  const module = await Test.createTestingModule({
    controllers: [PositionController],
    providers: [
      { provide: OpenPositionUseCase, useValue: mockUseCase },
      { provide: PositionApiMapper, useValue: mockMapper },
    ],
  }).compile();

  controller = module.get<PositionController>(PositionController);
});
```

**Request parsing assertion:**
```typescript
it('should parse raw body and call use case with value objects', async () => {
  const req = { user: { userId: UserId.of('user-123') } } as AuthenticatedRequest;
  const body = { instrument: 'AAPL', quantity: 100, price: 150.5, stop: 140.0, timestamp: '2024-01-15T10:30:00.000Z' };

  await controller.openPosition(body, req);

  expect(mockUseCase.execute).toHaveBeenCalledWith(
    {
      instrument: Ticker.of('AAPL'),
      quantity: Quantity.of(100),
      price: Price.of(150.5),
      stop: StopPrice.of(140.0),
      timestamp: IsoTimestamp.of('2024-01-15T10:30:00.000Z'),
    },
    { userId: UserId.of('user-123') },
  );
});
```

---

## Test Infrastructure

| File | Purpose |
|------|---------|
| `test/config/globalSetup.ts` | Database provisioning (TestContainers) |
| `jest.setup.ts` | Global UUID mock (default) |

Override global UUID mock locally with `jest.spyOn` when a specific value is needed.

`@typescript-eslint/unbound-method` is disabled globally — Jest mock patterns trigger it. Do **not** add per-line disables.

## Commands

```bash
cd apps/backend && npm test                              # All unit tests
cd apps/backend && npx jest src/path/to/file.spec.ts    # Single file
cd apps/backend && npx jest --watch                     # Watch mode
cd apps/backend && npx jest --testPathPattern integration # Integration (requires Docker)
```
