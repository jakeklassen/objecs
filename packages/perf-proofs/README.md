# perf-proofs

Evidence-based language micro-benchmarks using [mitata](https://github.com/evanwashere/mitata). Each file proves (or disproves) a specific JavaScript performance pattern relevant to the objecs ECS library.

## Running

```bash
# All benchmarks
pnpm start

# By category
pnpm start:object
pnpm start:array
pnpm start:map-set
pnpm start:set
pnpm start:iteration
pnpm start:function

# Individual benchmark
node --expose-gc src/object/hasown-vs-undefined-check.ts
```

## Benchmarks

### object/

- **hasown-vs-undefined-check** — `Object.hasOwn()` vs `!== undefined` vs `in` for property checks. Maps to archetype matching in `archetype.ts` and `world.ts`.
- **delete-vs-set-undefined** — `delete obj.prop` vs `obj.prop = undefined` for property removal. Maps to `world.ts:removeEntityComponents()`.

### array/

- **swap-pop-vs-splice** — O(1) swap-and-pop vs O(n) splice for unordered removal. Maps to `EntityCollection.remove()` in `world.ts`.
- **for-of-vs-for-index-vs-foreach** — Iteration patterns at various scales with realistic ECS workloads.
- **every-vs-for-loop** — `Array.every()` vs manual loops for small predicate arrays. Maps to `archetype.ts:matches()`.

### map-set/

- **map-vs-object-lookup** — `Map.get/has` vs plain object property access. Maps to `#componentIndex` and `EntityCollection.#indices`.

### array/ (continued)

- **fused-every-some** — `.every()` + `.some()` vs a single fused manual loop for archetype matching. Maps to `archetype.ts:matches()`.

### set/

- **set-alloc-vs-alternatives** — `new Set()` per-call dedup vs Array alternatives vs skipping dedup entirely. Maps to `World.#getAffectedArchetypes()`.
- **set-vs-array-iteration** — `for-of` over Set vs Array at typical ECS archetype counts. Maps to `World.#archetypes` iteration.
- **small-set-vs-small-array** — Set vs Array for small collections (2–15 items): has/includes, iteration, add/delete. Maps to `#componentIndex` values.

### iteration/

- **iterator-protocol-overhead** — `Symbol.iterator` delegation vs direct `.raw` array access. Maps to `EntityCollection` iterator.

### function/

- **call-vs-direct-invocation** — `Function.prototype.call()` vs direct invocation in tight loops. Maps to `EntityCollection.forEach()`.
