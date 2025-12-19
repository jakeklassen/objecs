# Hierarchy and Scene Graph Ideas for objECS

This document captures ideas for implementing parent-child hierarchy and scene graph functionality in objECS, inspired by [Wicked Engine's ECS article](https://wickedengine.net/2019/09/entity-component-system/).

## Current State

The shmup demo uses a simple pattern for hierarchy:

```typescript
// Entity type has parent reference
parent?: SetRequired<Entity, "transform">;
localTransform?: Transform;

// local-transform-system.ts manually updates child positions
entity.transform.position.x =
  entity.parent.transform.position.x + entity.localTransform.position.x;
```

This works but doesn't handle:
- Deep hierarchies (grandchildren)
- Processing order (parent must update before child)
- Rotation/scale inheritance
- Attach/detach operations

## Wicked Engine's Approach

Key concepts from the C++ implementation:

1. **HierarchyComponent** - stores parent entity + parent's inverse world matrix at attach time
2. **Ordering guarantee** - parents are always processed before children (topological sort)
3. **Attach/Detach operations** - handle matrix math and maintain ordering
4. **Two transforms** - local (relative to parent) and world (absolute)

## Challenges for objECS

| Wicked Engine | objECS |
|---------------|--------|
| Integer entity IDs | Object references |
| Ordered arrays per component | Unordered Sets |
| Component managers with sorting | Simple archetypes |

## Potential Approaches

### Approach 1: Depth-based Sorting (Pattern-based)

Add a `hierarchyDepth` to entities and sort before processing. This is more of a "pattern" than a native feature - users implement it in their entity types and systems.

```typescript
type Entity = {
  transform?: Transform;
  localTransform?: Transform;  // Position relative to parent
  parent?: Entity;
  hierarchyDepth?: number;     // 0 = root, 1 = child of root, etc.
  children?: Set<Entity>;      // Optional: for fast traversal
};

function hierarchySystemFactory(world: World<Entity>) {
  const hierarchical = world.archetype("transform", "localTransform", "parent");

  return function hierarchySystem() {
    // Sort by depth to ensure parents update before children
    const sorted = [...hierarchical.entities].sort(
      (a, b) => (a.hierarchyDepth ?? 0) - (b.hierarchyDepth ?? 0)
    );

    for (const entity of sorted) {
      const parent = entity.parent!;

      // Compose local transform with parent's world transform
      entity.transform.position.x =
        parent.transform!.position.x + entity.localTransform.position.x;
      entity.transform.position.y =
        parent.transform!.position.y + entity.localTransform.position.y;
      // ... rotation, scale would need matrix math
    }
  };
}
```

With utility functions:

```typescript
function attachToParent(
  world: World<Entity>,
  child: Entity,
  parent: Entity
) {
  const parentDepth = parent.hierarchyDepth ?? 0;

  world.addEntityComponents(child, "parent", parent);
  world.addEntityComponents(child, "hierarchyDepth", parentDepth + 1);

  // Store current world position as local offset
  if (child.transform && parent.transform) {
    world.addEntityComponents(child, "localTransform", {
      position: {
        x: child.transform.position.x - parent.transform.position.x,
        y: child.transform.position.y - parent.transform.position.y,
      },
      rotation: child.transform.rotation - parent.transform.rotation,
      scale: { ...child.transform.scale },
    });
  }

  // Track children for fast detach/reparenting
  parent.children ??= new Set();
  parent.children.add(child);
}

function detachFromParent(world: World<Entity>, child: Entity) {
  const parent = child.parent;
  if (!parent) return;

  parent.children?.delete(child);
  world.removeEntityComponents(child, "parent", "localTransform", "hierarchyDepth");
}
```

**Pros:**
- Simple, fits objECS philosophy
- No new abstractions needed
- Users can customize behavior

**Cons:**
- Sorting cost O(n log n) per frame
- Manual bookkeeping required
- Easy to forget depth updates

---

### Approach 2: SceneGraph Class (Structured)

A dedicated hierarchy manager that works alongside the ECS:

```typescript
class SceneGraph<Entity extends { transform?: Transform }> {
  #roots = new Set<Entity>();
  #parentMap = new Map<Entity, Entity>();
  #childrenMap = new Map<Entity, Set<Entity>>();
  #depthMap = new Map<Entity, number>();

  attach(child: Entity, parent: Entity) {
    this.detach(child); // Remove from current parent if any

    this.#parentMap.set(child, parent);

    const children = this.#childrenMap.get(parent) ?? new Set();
    children.add(child);
    this.#childrenMap.set(parent, children);

    this.#updateDepths(child, this.getDepth(parent) + 1);
    this.#roots.delete(child);
  }

  detach(entity: Entity) {
    const parent = this.#parentMap.get(entity);
    if (parent) {
      this.#childrenMap.get(parent)?.delete(entity);
      this.#parentMap.delete(entity);
      this.#roots.add(entity);
      this.#updateDepths(entity, 0);
    }
  }

  getParent(entity: Entity): Entity | undefined {
    return this.#parentMap.get(entity);
  }

  getChildren(entity: Entity): ReadonlySet<Entity> {
    return this.#childrenMap.get(entity) ?? new Set();
  }

  getDepth(entity: Entity): number {
    return this.#depthMap.get(entity) ?? 0;
  }

  // Iterate in topological order (parents before children)
  *traverse(): Generator<Entity> {
    const visited = new Set<Entity>();

    function* visit(entity: Entity, graph: SceneGraph<Entity>): Generator<Entity> {
      if (visited.has(entity)) return;
      visited.add(entity);

      yield entity;

      for (const child of graph.getChildren(entity)) {
        yield* visit(child, graph);
      }
    }

    for (const root of this.#roots) {
      yield* visit(root, this);
    }
  }

  #updateDepths(entity: Entity, depth: number) {
    this.#depthMap.set(entity, depth);
    for (const child of this.#childrenMap.get(entity) ?? []) {
      this.#updateDepths(child, depth + 1);
    }
  }
}
```

Usage:

```typescript
const world = new World<Entity>();
const sceneGraph = new SceneGraph<Entity>();

const player = world.createEntity({ transform: {...} });
const thruster = world.createEntity({ transform: {...}, localTransform: {...} });

sceneGraph.attach(thruster, player);

// In system - iterate in correct order
function hierarchySystem() {
  for (const entity of sceneGraph.traverse()) {
    const parent = sceneGraph.getParent(entity);
    if (parent && entity.localTransform && entity.transform && parent.transform) {
      // Update world transform from parent + local
    }
  }
}
```

**Pros:**
- Clean separation of concerns
- Guarantees correct traversal order
- Centralized hierarchy management
- Could be published as `objecs-hierarchy` package

**Cons:**
- Additional data structure to maintain
- Need to sync with entity lifecycle (delete entity = detach)
- Slight indirection

---

### Approach 3: Matrix-based Transforms (Full Scene Graph)

For proper rotation/scale inheritance, matrix math is needed:

```typescript
type Transform = {
  position: Vector2d;
  rotation: number;
  scale: Vector2d;
  localMatrix?: Mat3;  // Computed from position/rotation/scale
  worldMatrix?: Mat3;  // Cached world matrix (local * parent.world)
};

function composeTransform(local: Transform, parentWorld: Mat3): Mat3 {
  const localMatrix = Mat3.fromTRS(local.position, local.rotation, local.scale);
  return Mat3.multiply(parentWorld, localMatrix);
}

function decomposeMatrix(matrix: Mat3): { position: Vector2d; rotation: number; scale: Vector2d } {
  // Extract position, rotation, scale from matrix
}
```

This would require a small math library (or use gl-matrix).

---

## Recommendations

1. **Start with Approach 1** for simple cases (position-only parenting)
2. **Evolve to Approach 2** if hierarchy becomes central to the game
3. **Add Approach 3** only if rotation/scale inheritance is needed

The SceneGraph class (Approach 2) could potentially be:
- A separate package (`objecs-hierarchy`)
- Built into objECS core with opt-in usage
- Documented as a recommended pattern

## Open Questions

- Should SceneGraph automatically sync with World entity deletions?
- Should transforms be split into `localTransform` and `worldTransform` always?
- How to handle dirty flags / caching for performance?
- Should hierarchy be query-able via archetypes? (e.g., `world.archetype("parent")`)

## References

- [Wicked Engine ECS](https://wickedengine.net/2019/09/entity-component-system/)
- [Unity's Transform hierarchy](https://docs.unity3d.com/Manual/class-Transform.html)
- [Bevy's Parent/Children components](https://bevyengine.org/learn/book/getting-started/hierarchy/)
