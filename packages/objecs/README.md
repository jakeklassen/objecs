# objECS

A lightweight, type-safe Entity Component System (ECS) for TypeScript game development.

[![npm version](https://img.shields.io/npm/v/objecs.svg)](https://www.npmjs.com/package/objecs)
[![npm downloads](https://img.shields.io/npm/dm/objecs.svg)](https://www.npmjs.com/package/objecs)

## Features

- **Simple API** - Entities are plain JavaScript objects, components are just properties
- **Type-safe** - Full TypeScript support with inferred types for queries
- **Zero dependencies** (only `type-fest` for utility types)
- **Small footprint** - ~2KB minified
- **Archetype-based queries** - Efficient entity filtering with component matching
- **Reactive archetypes** - Queries automatically update when entities change

## Live Demos

Check out the [demo site](https://objecs.netlify.app/) featuring several example games and simulations, including a full shoot-em-up game.

[View demo source code](https://github.com/jakeklassen/objecs/tree/main/packages/examples/src/demos)

## Installation

```bash
npm install objecs
```

## Quick Start

```typescript
import { World } from "objecs";

// 1. Define your entity type with all possible components
type Entity = {
  position?: { x: number; y: number };
  velocity?: { x: number; y: number };
  health?: number;
  player?: true;
  enemy?: true;
};

// 2. Create a world
const world = new World<Entity>();

// 3. Create entities with components
const player = world.createEntity({
  position: { x: 100, y: 100 },
  velocity: { x: 0, y: 0 },
  health: 100,
  player: true,
});

world.createEntity({
  position: { x: 200, y: 50 },
  velocity: { x: -50, y: 0 },
  health: 30,
  enemy: true,
});

// 4. Create archetypes (queries) to filter entities
const movables = world.archetype("position", "velocity");
const enemies = world.archetype("position", "health", "enemy");

// 5. Use archetypes in your systems
function movementSystem(dt: number) {
  for (const entity of movables.entities) {
    // TypeScript knows entity has position and velocity
    entity.position.x += entity.velocity.x * dt;
    entity.position.y += entity.velocity.y * dt;
  }
}
```

## API Reference

### World

The container for all entities and archetypes.

```typescript
const world = new World<Entity>();
```

#### `world.createEntity(components?)`

Creates a new entity, optionally with initial components.

```typescript
const entity = world.createEntity({
  position: { x: 0, y: 0 },
  sprite: { texture: "player.png" },
});
```

#### `world.deleteEntity(entity)`

Removes an entity from the world and all archetypes.

```typescript
world.deleteEntity(entity);
```

#### `world.archetype(...components)`

Creates an archetype query that matches entities with all specified components. The returned archetype's `entities` set automatically stays in sync as entities are added/removed/modified.

```typescript
const renderables = world.archetype("position", "sprite");

for (const entity of renderables.entities) {
  // entity.position and entity.sprite are guaranteed to exist
}
```

#### `world.addEntityComponents(entity, component, value)`

Adds a component to an existing entity.

```typescript
world.addEntityComponents(entity, "velocity", { x: 10, y: 0 });
```

#### `world.removeEntityComponents(entity, ...components)`

Removes components from an entity.

```typescript
world.removeEntityComponents(entity, "velocity", "acceleration");
```

### Archetype

Archetypes are queries that match entities with specific components.

#### `archetype.entities`

A `ReadonlySet` of entities matching the archetype.

#### `archetype.without(...components)`

Creates a new archetype that excludes entities with certain components.

```typescript
// Get all enemies that are NOT invulnerable
const vulnerableEnemies = world
  .archetype("position", "health", "enemy")
  .without("invulnerable");
```

## Patterns

### Systems as Functions

objECS doesn't prescribe how to structure systems. A simple pattern is factory functions:

```typescript
function createMovementSystem(world: World<Entity>) {
  const movables = world.archetype("position", "velocity");

  return function movementSystem(dt: number) {
    for (const entity of movables.entities) {
      entity.position.x += entity.velocity.x * dt;
      entity.position.y += entity.velocity.y * dt;
    }
  };
}

// Usage
const movementSystem = createMovementSystem(world);

function gameLoop(dt: number) {
  movementSystem(dt);
  // ... other systems
}
```

### Component Tags

Use `true` as a component value for tag components:

```typescript
type Entity = {
  player?: true;
  enemy?: true;
  invulnerable?: true;
};

world.createEntity({ player: true, invulnerable: true });
```

## Acknowledgments

Inspired by [miniplex](https://www.npmjs.com/package/miniplex).

## License

MIT
