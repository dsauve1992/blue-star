# Architecture principles

Strategic DDD rules for the backend. Tactical patterns (value objects, entities, use cases, repositories, wiring) live in the `backend-patterns` skill. Rejected proposals and corrections are logged in `decisions.md`.

## Modules are bounded contexts

- Each module in `apps/backend/src/modules` owns its domain model, its persistence and its language. A name means what its module says it means.
- A module owns its value objects, entities, events, errors and repository ports. Nothing outside the module reaches into `domain/`, `infrastructure/` or its repositories.
- The module barrel (`index.ts`) is the only public surface. Import another module through its barrel, never through its internals.

## Cross-module communication

- A module consumes another through that module's **use cases or queries**, exposed on its public surface. Never inject another module's repository or read its tables.
- If the owner lacks the query you need, add it to the owner. Do not work around it from the consumer.
- Dependencies are one-way and point downstream. The upstream module does not know its consumers. A cycle means a concept is misplaced or a query is missing.
- A consumer may import the owner's public value objects and types as the cost of the dependency. Do not duplicate them, and do not promote them to `shared/` to avoid the import.
- Ports for an external system (provider, notification, storage) belong to the module that needs them. A second module needing the same capability depends on the first module's use case, not on a copy of the adapter.

## Shared code

- `shared/` and `common/` hold only concepts no single module owns (`Symbol`, `DateRange`, indicator maths, error base classes, infrastructure plumbing).
- Test before promoting: does one module own the concept? Then it stays there, whatever the number of importers. A second importer alone never justifies moving it.
- Do not duplicate to avoid a dependency when the concept has one owner. Duplicate only when the two modules mean different things by the same name.

## Aggregates and persistence

- One aggregate, one repository interface in the domain layer, one implementation in infrastructure. State changes go through the aggregate, not around it.
- Positions are event-sourced (`positions` + `position_events`). Other modules use plain tables and do not read position tables directly.

## Boundary behaviour

- Domain code throws `DomainError` subclasses. Mapping to HTTP happens once, at the filter, never in controllers or use cases.
- A scheduled job that fails or produces nothing reports the failure. It never records success it did not achieve.

## Applying this

- Reviewing or proposing a structural change: name the owning module of each concept involved, the direction of each dependency, and which public surface it goes through. If you cannot name the owner, the proposal is not ready.
- Check `decisions.md` first. If a proposal contradicts a decision there, drop it.
