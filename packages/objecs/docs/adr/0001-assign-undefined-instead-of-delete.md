# ADR 0001 — Reduce per-operation overhead in reactive archetype updates

- **Status:** Accepted
- **Date:** 2026-06-26
- **Area:** `packages/objecs/src/world.ts` (`removeEntityComponents`, `addEntityComponents`, `#getAffectedArchetypes`)

## Context

Adding and removing components is objecs' write hot path. Every call has to update
archetype membership reactively. Profiling the `ecs-benchmark` `add_remove` case and
the `game-benchmark` `mutation` game showed three avoidable costs on this path:

1. `removeEntityComponents` used `delete entity[component]`.
2. `#getAffectedArchetypes` always allocated a fresh `Set`, even when a single
   component changed (the common case).
3. `addEntityComponents` always allocated a `changedKeys` array, even for the
   single-component overload.

This ADR records three related decisions made together as one pass. Decision 1 is
the significant one — it **overturns a previously documented belief** that `delete`
was required for correctness.

## Decision 1 — Assign `undefined` instead of `delete`

`removeEntityComponents` now does `entity[component] = undefined` instead of
`delete entity[component]`.

### The prior belief (and why it was wrong)

The codebase previously documented (CLAUDE.md, "Performance Conventions"):

> Never set a component value to `undefined` … it would break archetype matching
> since the library uses `!== undefined` checks.

and, under "Investigated but not adopted":

> `delete` is 3–30x slower than `= undefined`: **Known cost we pay for correctness**
> (archetype matching requires `!== undefined`).

That reasoning is inverted. Because objecs defines component presence **exclusively**
as `entity[c] !== undefined` (verified: `archetype.ts:64,69,126`, `world.ts:235` are
the only presence checks; there is no `hasOwn`, `in`, or `Object.keys` anywhere in
the core), a component whose value is `undefined` is already treated as **absent**
by every code path:

- required component `=== undefined` → `matches()` returns `false` (correctly absent)
- excluded component `!== undefined` is `false` → passes the exclusion (correctly absent)

So `= undefined` is query-equivalent to `delete`. The "cost we pay for correctness"
was never actually required.

### Why `delete` was slow

`delete` forces V8 to drop the object out of its hidden class into **dictionary
(hash-table) mode**. That penalty is not paid once — it makes **every subsequent
property access and iteration** on that entity dramatically slower, for the rest of
the entity's life. Assigning `undefined` keeps the entity's shape (hidden class)
stable, so it stays in fast/monomorphic mode.

### Evidence

- Micro (`perf-proofs/src/object/delete-vs-set-undefined.ts`): `delete` is 3–30x
  slower than `= undefined`; isolated iteration over `delete`-ed entities was ~27x
  slower, the removal op itself ~8x.
- Macro `add_remove`: 8,160 → ~46,000 op/s.
- Game `mutation`: 325.8 → ~570 FPS (+75%). The `iterate` system dropped **−57%**
  purely because entities were no longer deopted, and `mutation` −32%.

## Decision 2 — Single-key fast path in `#getAffectedArchetypes`

When exactly one component changed, the set of affected archetypes is exactly that
component's entry in `#componentIndex`. Return that existing `Set` directly instead
of allocating a union `Set`; the return type was widened from `Set` to `Iterable`
and callers only iterate it (never mutate). A shared `NO_AFFECTED_ARCHETYPES` empty
constant covers the "no archetype references this component" case with no allocation.

- Maps to `perf-proofs/src/set/set-alloc-vs-alternatives.ts`.
- Zero allocation on every single-component add/remove.

## Decision 3 — No `changedKeys` array on single-component add

The single-component `addEntityComponents(entity, "x", value)` overload no longer
builds a `changedKeys` array to hand to `#getAffectedArchetypes`. It processes the
component's archetype set directly and returns early. The multi-component overload
still builds the array (unavoidable there).

- Marginal but large on add-heavy churn: with Decisions 1+2 alone `add_remove` was
  ~23,000 op/s; removing this per-call array allocation took it to ~46,000 (≈2x
  again), by cutting GC pressure.

## Consequences

- **A removed component's key now persists on the entity with an `undefined`
  value** rather than being deleted. This is invisible to queries and to
  `JSON.stringify` (which omits `undefined`), but it **is** observable via
  `Object.keys(entity)` and `"c" in entity`, which will now include removed
  components. Any consumer that inspects raw entity keys should use
  `entity.c !== undefined`, not `"c" in entity` / `Object.hasOwn`.
- This makes the "never use `Object.hasOwn`/`in` for presence" convention a
  **correctness** requirement, not just a micro-optimization: `hasOwn`/`in` would
  now report a removed component as present.
- Re-adding a previously-removed component is now slightly cheaper too: the key
  already exists on the shape, so no hidden-class transition occurs.

## References

- Code: `packages/objecs/src/world.ts` — `removeEntityComponents`,
  `addEntityComponents`, `#getAffectedArchetypes`, `#updateArchetypeMembership`
- Proofs: `packages/perf-proofs/src/object/delete-vs-set-undefined.ts`,
  `packages/perf-proofs/src/set/set-alloc-vs-alternatives.ts`
- Benchmarks: `ecs-benchmark` (`add_remove`), `game-benchmark` (`mutation`)
