# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

objECS is a TypeScript Entity Component System (ECS) library for game development. It uses a pnpm monorepo structure.

## Monorepo Structure

- `packages/objecs/` - Core ECS library (published to npm as `objecs`)
- `packages/examples/` - Vite-based demo applications using the library
- `packages/ecs-benchmark/` - Benchmarks comparing objecs against other ECS libraries
- `packages/benchmark/` - Additional benchmarking utilities

## Common Commands

### Root-level
```bash
pnpm install              # Install all dependencies
pnpm lint                 # Lint all packages
pnpm lint:fix             # Fix lint issues
```

### Core Library (packages/objecs)
```bash
pnpm --filter objecs build        # Build the library (runs lint first)
pnpm --filter objecs test         # Run tests in watch mode
pnpm --filter objecs test run     # Run tests once
pnpm --filter objecs lint         # Lint the library
```

### Examples (packages/examples)
```bash
pnpm --filter examples dev        # Start Vite dev server
pnpm --filter examples build      # Build examples
```

### Benchmarks
```bash
pnpm --filter ecs-benchmark start # Run ECS comparison benchmarks
```

## Architecture

### Core Concepts

**World** (`packages/objecs/src/world.ts`): Container for all entities. Creates entities, manages archetypes, and handles component operations.

**Archetype** (`packages/objecs/src/archetype.ts`): A query that groups entities sharing the same component combination. Created via `world.archetype('component1', 'component2', ...)`. Supports `without()` for exclusion filters.

**Entity**: Plain JavaScript objects (must be `JsonObject` from type-fest). Components are simply properties on the entity object.

### Usage Pattern

```typescript
// Define entity type with all possible components
type Entity = {
  position?: { x: number; y: number };
  velocity?: { x: number; y: number };
  health?: number;
};

// Create world and entities
const world = new World<Entity>();
world.createEntity({ position: { x: 0, y: 0 }, velocity: { x: 1, y: 0 } });

// Create archetype query (entities matching these components)
const movingEntities = world.archetype('position', 'velocity');

// Iterate in systems
for (const entity of movingEntities.entities) {
  entity.position.x += entity.velocity.x * dt;
}
```

### Type Safety

- `SafeEntity<Entity, Components>` ensures queried components exist
- Archetypes return entities with required components as non-optional
- `createEntity()` with arguments requires at least one component

## Development Workflow

Uses [Conventional Commits](https://www.conventionalcommits.org/). For releases:
1. Run `bumpp` to interactively create a version tag
2. Create GitHub release to trigger publish workflow

## Testing

Tests use Vitest. Test files are colocated with source (`.test.ts` suffix).
