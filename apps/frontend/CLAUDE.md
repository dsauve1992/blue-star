# CLAUDE.md - Frontend

This file provides frontend-specific guidance. See the root CLAUDE.md for architecture overview and commands.

## Module Organization

### Directory Hierarchy
- `src/global/` - Shared across app: auth, api, design-system, routing, pages
- `src/<domain>/` - Domain modules: position, watchlist, stock-analysis, sector-rotation, fundamental

### Module Structure
```
domain-module/
├── api/              # API client class + types
├── components/       # UI components
├── constants/
│   ├── query-keys.ts # React Query key definitions
│   └── index.ts
├── hooks/            # Custom React hooks (data fetching)
└── pages/            # Page-level components
```

### Dependency Rules
- Global modules must NOT depend on domain modules
- Domain modules can depend on global modules
- No direct imports between domain modules
- Import from specific files, not index.ts (except design-system)
- Use named exports, avoid default exports

## React Query Patterns

### Query Keys (per module in constants/query-keys.ts)
```typescript
export const MODULE_QUERY_KEYS = {
  all: ['module-name'] as const,
  lists: () => [...MODULE_QUERY_KEYS.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...MODULE_QUERY_KEYS.lists(), filters] as const,
  details: () => [...MODULE_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...MODULE_QUERY_KEYS.details(), id] as const,
} as const;
```

### Hooks
- All data fetching through custom hooks, never direct `useQuery` in components
- Mutation hooks must invalidate related queries on success (`queryKey: MODULE_QUERY_KEYS.all`)
- Each hook file creates its own API client instance

### Query Client Defaults
- Stale time: 5 min, cache time: 10 min
- No retry on 4xx errors (up to 3 retries otherwise)
- `refetchOnWindowFocus: false`

## Component Patterns

### Structure
- Functional components with hooks
- Props via TypeScript interfaces
- Handle loading/error/empty states in every data-fetching component
- Use design system components from `src/global/design-system`

### Data Flow
```
API Client -> Custom Hook (useQuery/useMutation) -> Component
```

### State Management
- **Server state**: React Query (TanStack)
- **Local UI state**: useState
- **Global app state**: React Context (theme, auth)

## API Client

- Axios wrapper at `src/global/api/api-client.ts`
- Automatic Bearer token injection from Kinde auth
- Type-safe methods: `get<T>()`, `post<T, R>()`, `put<T, R>()`, `patch<T, R>()`, `delete<T>()`
- 10s default timeout
- Frontend types use primitives (matching JSON), backend DTOs use value objects

## Routing

- All routes defined in `src/global/routing/routes.config.ts` (single source of truth)
- `generateRoutes()` creates React Router routes with automatic `<ProtectedRoute>` wrapping
- Component mapping in `routeGenerator.tsx` via `componentMap`
- Navigation auto-generated from route config using `getNavigationRoutes(isAuthenticated)`
- To add a route: add to `routes.config.ts`, add component to `componentMap`

## Design System

### Stack
- Tailwind CSS + Radix UI primitives + CVA (class-variance-authority)
- Import from `src/global/design-system` (uses index.ts barrel export)
- Components: Button, Card, Input, Label, Badge, Alert, LoadingSpinner, MetricCard, DateInput, Separator, PageContainer

### Theme
- Light/dark mode via class-based Tailwind (`dark:` prefix)
- ThemeProvider manages document class
- Always test components in both themes

### Colors
- Primary: blue scale (50-900)
- Semantic: green (success/gains), red (danger/losses), amber (warning)
- Both themes must maintain WCAG AA contrast (4.5:1 minimum)

### Typography
- Primary: Inter (sans-serif)
- Monospace: JetBrains Mono (financial data, numbers)

### Animation
- Fast: 150ms (buttons, toggles)
- Standard: 300ms (theme changes, transitions)
- Slow: 500ms (complex state changes)
- Use transform/opacity for 60fps; respect `prefers-reduced-motion`

## Implementation Order for New Features
1. Define frontend types matching backend response structure
2. Create API client methods mirroring backend endpoints
3. Create query keys in `constants/query-keys.ts`
4. Create custom hooks in `hooks/`
5. Build page/components using the hooks
