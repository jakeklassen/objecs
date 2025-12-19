# objECS

A lightweight, type-safe Entity Component System (ECS) for TypeScript game development.

[![npm version](https://img.shields.io/npm/v/objecs.svg)](https://www.npmjs.com/package/objecs)
[![npm downloads](https://img.shields.io/npm/dm/objecs.svg)](https://www.npmjs.com/package/objecs)

## Why objECS?

- **Simple mental model** - Entities are plain JavaScript objects, components are just properties
- **Type-safe** - Full TypeScript support with inferred types for archetype queries
- **Tiny** - ~2KB minified with only one dependency
- **Reactive queries** - Archetypes automatically update when entities change

## Live Demos

Check out the [demo site](https://objecs.netlify.app/) featuring example games and simulations built with objECS.

The featured demo is [Cherry Bomb](https://objecs.netlify.app/src/demos/shmup/), a shoot-em-up game ported from [Lazy Devs](https://www.youtube.com/@LazyDevs) pico-8 tutorials.

[shmup-demo.webm](https://github.com/jakeklassen/objecs/assets/1383068/994302b7-7b98-4b46-b785-fd0fd183ffdc)

[Browse demo source code](https://github.com/jakeklassen/objecs/tree/main/packages/examples/src/demos)

## Quick Example

```typescript
import { World } from "objecs";

// Define your entity type
type Entity = {
	position?: { x: number; y: number };
	velocity?: { x: number; y: number };
	health?: number;
	enemy?: true;
};

// Create world and entities
const world = new World<Entity>();

world.createEntity({
	position: { x: 100, y: 100 },
	velocity: { x: 0, y: 0 },
	health: 100,
});

world.createEntity({
	position: { x: 200, y: 50 },
	velocity: { x: -50, y: 0 },
	enemy: true,
});

// Query entities by components
const movables = world.archetype("position", "velocity");

// Use in systems
function movementSystem(dt: number) {
	for (const entity of movables.entities) {
		// TypeScript knows entity has position and velocity
		entity.position.x += entity.velocity.x * dt;
		entity.position.y += entity.velocity.y * dt;
	}
}
```

## Installation

```bash
npm install objecs
```

## Documentation

See the [full documentation](./packages/objecs/README.md) for API reference and usage patterns.

## Repository Structure

This is a monorepo containing:

| Package                                            | Description                         |
| -------------------------------------------------- | ----------------------------------- |
| [packages/objecs](./packages/objecs)               | Core ECS library (published to npm) |
| [packages/examples](./packages/examples)           | Demo games and examples             |
| [packages/ecs-benchmark](./packages/ecs-benchmark) | Benchmarks comparing ECS libraries  |

## Development

```bash
# Install dependencies
pnpm install

# Run examples dev server
pnpm --filter examples dev

# Build the library
pnpm --filter objecs build

# Run tests
pnpm --filter objecs test

# Run benchmarks
pnpm --filter ecs-benchmark start
```

## Contributing

This project uses [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

## Acknowledgments

Inspired by [miniplex](https://www.npmjs.com/package/miniplex).

## License

MIT
