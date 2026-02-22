# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

objECS is a TypeScript Entity Component System (ECS) library for game development. It uses a pnpm monorepo structure.

## Monorepo Structure

- `packages/objecs/` - Core ECS library (published to npm as `objecs`)
- `packages/examples/` - Vite-based demo applications using the library
- `packages/ecs-benchmark/` - Benchmarks comparing objecs against other ECS libraries
- `packages/benchmark/` - Additional benchmarking utilities
- `packages/game-benchmark/` - Game simulation benchmarks (boids, ants) with multi-trial support
- `packages/perf-proofs/` - Mitata micro-benchmarks proving JavaScript performance patterns

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
pnpm --filter ecs-benchmark start                  # Run ECS comparison benchmarks
pnpm --filter perf-proofs start                     # Run all micro-benchmarks
pnpm --filter perf-proofs start:object              # Run object pattern benchmarks
```

### Game Benchmarks
```bash
# Boids benchmark, no rendering, 10 trials × 10s, objecs only
node packages/game-benchmark/src/index.ts --no-render -g boids -d 10 -t 10 -l objecs
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

## Performance Conventions

### Never use `Object.hasOwn()` for component presence checks

In the core library (`packages/objecs/src/`), always use `entity[component] !== undefined` instead of `Object.hasOwn(entity, component)`.

```typescript
// WRONG — ~10% slower due to static method call overhead
Object.hasOwn(entity, component as string)

// CORRECT — V8 inline-caches simple property reads
entity[component as string] !== undefined
```

**Why this is safe:** objecs uses `delete entity[component]` to remove components, never sets them to `undefined`. So `!== undefined` is semantically equivalent to `hasOwn` for our use case, but V8 can inline-cache property reads while `Object.hasOwn` goes through full function call machinery.

**Measured impact:** +8–12% across all benchmarks (iteration, mutation, entity lifecycle).

### Use manual loops instead of `.every()`/`.some()` in hot paths

In archetype matching and similar hot paths, use `for-of` loops with early returns instead of `.every()` + `.some()` with callbacks.

```typescript
// WRONG — callback overhead per iteration
const matches = components.every(c => entity[c] !== undefined);
const excluded = excluding?.some(c => entity[c] !== undefined) ?? false;

// CORRECT — fused loop, no closures, early exit
for (const c of components) {
  if (entity[c as string] === undefined) return false;
}
for (const c of excluding) {
  if (entity[c as string] !== undefined) return false;
}
return true;
```

**Measured impact:** +1.4% FPS in game benchmarks, +0.5–2.7% across ECS suite. The gain comes from eliminating closure allocation and function call overhead, not from the loop style itself.

### Never set a component value to `undefined`

Components must be removed via `world.removeEntityComponents(entity, 'component')` which uses `delete`. Setting a component to `undefined` would break archetype matching since the library uses `!== undefined` checks.

### Micro-benchmark vs macro-benchmark caveat

Micro-benchmarks (perf-proofs) are directionally useful but can mislead. Always validate with macro benchmarks (`ecs-benchmark`, `game-benchmark --no-render`) using 10+ trials before landing changes. Example: Array iteration is ~3x faster than Set iteration in isolation, but replacing `#archetypes` Set with Array caused a -12.2% regression in `add_remove` due to V8 IC/shape changes in surrounding code.

### Investigated but not adopted

These patterns showed micro-benchmark wins but didn't hold up or aren't worth the trade-offs:

- **`#archetypes` Set → Array**: +3-4% iteration, but -12% add_remove regression
- **`delete` is 3–30x slower than `= undefined`**: Known cost we pay for correctness (archetype matching requires `!== undefined`)
- **`Map` vs object for lookups**: Map is faster — validates current `EntityCollection.#indices` and `#componentIndex` design
- **`.call()` overhead**: Up to 3.2x at 10k entities — users should prefer `for...of` over `archetype.entities.forEach()`

## Testing

Tests use Vitest. Test files are colocated with source (`.test.ts` suffix).
