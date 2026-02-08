# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Blue Star is a financial trading platform with position management, watchlists, stock analysis, sector rotation tracking, and fundamental analysis. It's a TypeScript/Python monorepo deployed to a Raspberry Pi via Docker.

## Common Commands

```bash
# Install dependencies
npm ci

# Build all apps
npm run build

# Run all apps in dev mode
npm run dev

# Run backend only / frontend only
npm run dev:backend
npm run dev:frontend

# Lint and type-check
npm run lint
npm run check-types

# Run all tests
npm run test

# Run backend tests only
cd apps/backend && npm test

# Run a single backend test file
cd apps/backend && npx jest src/position/use-cases/open-position.use-case.spec.ts

# Run backend tests in watch mode
cd apps/backend && npx jest --watch

# Run backend e2e tests
cd apps/backend && npx jest --config ./test/jest-e2e.json

# Run backend integration tests (requires Docker for TestContainers)
cd apps/backend && npx jest --testPathPattern integration

# Database migrations (from apps/backend/)
npx db-migrate create --env dev migration-name --sql-file
npx db-migrate up --env dev
npx db-migrate down --env dev

# Quality gates (run after every change)
npx tsc --noEmit && npm run lint && npm run test
```

## Architecture

### Monorepo Structure (Turborepo + npm workspaces)

- **apps/backend** - NestJS API server (port 3000, prefix `/api`)
- **apps/frontend** - React 19 + Vite SPA with Tailwind CSS
- **apps/screener** - Python CLI for breakout/consolidation analysis (spawned by backend)
- **apps/theme_extractor** - Python CLI for investment theme extraction (spawned by backend)

### Backend Architecture (DDD + Clean Architecture + CQRS)

Layers (dependency direction: outer depends on inner):
```
Domain (entities, value objects, repository interfaces)
  <- Application (use cases)
    <- Infrastructure (repository implementations, external services)
      <- API (controllers, mappers)
```

**Key patterns:**
- **Value objects** over primitives: `PositionId.of()`, `Ticker.of()`, `Price.of()`, `Quantity.of()`
- **CQRS**: Separate read/write repository interfaces in the domain layer
- **Event sourcing** for positions: `Position.fromEvents()` reconstructs state from BUY/SELL/STOP_LOSS events
- **Use case pattern**: Each use case is an `@Injectable()` with an `execute(request, authContext)` method
- **Repository tokens**: String-based DI tokens (e.g., `POSITION_WRITE_REPOSITORY`)
- **No ORM**: Direct SQL queries with `pg` library, connection pooling via `DatabaseService`
- **Auth**: JWT via Passport, global AUTH_GUARD; use cases validate user ownership of resources
- **Python integration**: Backend spawns Python processes for screener/theme_extractor, captures stdout as JSON

**Backend modules:** Position, Watchlist, MarketData, StockAnalysis, Themes, SectorRotation, Fundamental, Notification (ntfy.sh), Auth

**Module directory structure:**
```
module-name/
├── domain/
│   ├── entities/          # Aggregate roots (.entity.ts)
│   ├── value-objects/     # Immutable VOs (kebab-case.ts)
│   └── repositories/     # Interfaces (.interface.ts)
├── use-cases/             # Application services (.use-case.ts)
├── infrastructure/
│   ├── repositories/      # SQL implementations (.repository.ts)
│   └── services/          # External service integrations
└── api/                   # Controllers + API mappers
```

### Frontend Architecture

- **React 19** with React Router 7, TanStack React Query, Kinde OAuth
- **Styling**: Tailwind CSS + Radix UI primitives + CVA for variants
- **Charts**: ECharts + Lightweight Charts (TradingView)
- **Module organization**: `src/global/` for shared (auth, api, design-system, routing), domain modules at `src/<module>/` with `api/`, `components/`, `hooks/`, `pages/`, `constants/`
- **Routing**: Centralized config in `src/global/routing/routes.config.ts` with automatic protection
- **React Query keys**: Module-specific factories in `constants/query-keys.ts` (hierarchical: `all > lists > list > details > detail`)
- **API client**: Axios wrapper with automatic Bearer token injection from Kinde

### Database

- PostgreSQL with `db-migrate` (SQL-based migrations in `apps/backend/migrations/sqls/`)
- UUID primary keys, VARCHAR(255) for external auth IDs
- Event sourcing tables: `positions` + `position_events`

### Testing

- **Backend unit tests**: Jest with Arrange-Act-Assert, mock repository interfaces (not implementations), use domain value objects
- **Backend integration tests**: TestContainers for PostgreSQL
- **Frontend**: No tests currently configured
- **CI**: GitHub Actions - lint + typecheck, test (with Postgres service), then build

### Deployment

- Docker Compose (`docker-compose.prod.yml`) with backend and frontend containers
- PostgreSQL managed separately by Ansible
- Backend on port 3000, frontend (nginx) on port 5173

## Coding Conventions

- Write self-documenting code; only comment complex business logic, workarounds, or external API constraints
- Use `import type` for interfaces used in decorators
- Use value objects in DTOs, not primitives
- Implementation order for new features: domain layer -> repository interfaces -> use cases -> infrastructure -> API controllers
- Frontend features: backend first, then frontend types, API client, React Query hooks, components
- Incremental development: make one change, run quality gates, fix issues, proceed
