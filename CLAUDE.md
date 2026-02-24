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

### Monorepo (Turborepo + npm workspaces)

- **apps/backend** - NestJS/DDD/CQRS API (port 3000, prefix `/api`) — see apps/backend/CLAUDE.md
- **apps/frontend** - React 19 + Vite SPA with Tailwind CSS — see apps/frontend/CLAUDE.md
- **apps/screener** - Python CLI for breakout/consolidation analysis (spawned by backend)
- **apps/theme_extractor** - Python CLI for investment theme extraction (spawned by backend)

### Database

- PostgreSQL with `db-migrate` (SQL migrations in `apps/backend/migrations/sqls/`)
- UUID primary keys; event sourcing: `positions` + `position_events` tables

### Deployment

- Docker Compose (`docker-compose.prod.yml`) with backend and frontend containers
- PostgreSQL managed separately by Ansible
- Backend on port 3000, frontend (nginx) on port 5173

## Coding Conventions

- Incremental development: make one change, run quality gates, fix issues, proceed
- See apps/backend/CLAUDE.md and apps/frontend/CLAUDE.md for domain-specific conventions
