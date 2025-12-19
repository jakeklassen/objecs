# objecs Performance Improvement Plan

## Benchmark Results (Baseline)

```
> ecs-benchmark@ start
> node src/bench.js objecs miniplex

objecs
  packed_5        139,836 op/s
  simple_iter     80,937 op/s
  frag_iter       44,291 op/s
  entity_cycle    7,556 op/s
  add_remove      21,209 op/s

miniplex
  packed_5        180,113 op/s
  simple_iter     178,320 op/s
  frag_iter       50,361 op/s
  entity_cycle    2,176 op/s
  add_remove      2,100 op/s
```

| Benchmark | objecs | miniplex | Winner | Gap |
|-----------|--------|----------|--------|-----|
| packed_5 | 139,836 | 180,113 | miniplex | **-22%** |
| simple_iter | 80,937 | 178,320 | miniplex | **-55%** |
| frag_iter | 44,291 | 50,361 | miniplex | -12% |
| entity_cycle | 7,556 | 2,176 | **objecs** | +247% |
| add_remove | 21,209 | 2,100 | **objecs** | +910% |

## Key Architectural Differences

| Aspect | objecs | miniplex |
|--------|--------|----------|
| Entity storage | `Set<Entity>` | `Array + Map<Entity, index>` |
| Removal | `Set.delete()` | Swap-and-pop (O(1)) |
| Iterator | Set's default | Custom, reuses result object |
| Query caching | None (new each call) | Cached by config key |
| Component check | `component in entity` | `entity[component] !== undefined` |
| Events | None | onEntityAdded/Removed (causes overhead) |

## Analysis

### Why miniplex wins iteration benchmarks:
1. **Array iteration is ~2x faster than Set iteration** in V8
2. **Custom iterator reuses result object** (avoids GC pressure)
3. **Better cache locality** with contiguous array memory

### Why objecs wins mutation benchmarks:
1. **No event emission overhead** (miniplex emits events on every add/remove)
2. **Simpler removeComponent** (miniplex copies entity to create "future" state)
3. **Leaner code paths** for add/remove operations

## Refactor Guidelines

1. **Cannot sacrifice DX or type safety** - maintain the current API and TypeScript experience
2. **Validate with benchmarks**: `pnpm --filter ecs-benchmark start objecs miniplex`
3. **Tests must pass**: `pnpm --filter objecs test --run`

## Plan of Attack

### Phase 1: Switch to Array + Map (Highest Impact)

**Goal:** Close the 55% gap in `simple_iter`

1. Replace `Set<Entity>` with `Array<Entity>` for storage
2. Add `Map<Entity, number>` for O(1) index lookups
3. Implement swap-and-pop removal to maintain O(1) deletion
4. Create optimized custom iterator that reuses result objects

**Expected impact:** 40-60% improvement in iteration benchmarks

### Phase 2: Query/Archetype Caching

**Goal:** Reduce redundant archetype creation overhead

1. Cache archetypes by component signature (sorted, stringified)
2. Return existing archetype if query already exists
3. This matches miniplex's behavior

**Expected impact:** Reduced memory allocation, faster repeated queries

### Phase 3: Micro-optimizations

1. Change `component in entity` → `entity[component] !== undefined`
2. Inline hot-path operations where possible
3. Avoid creating closures in frequently-called methods

### Phase 4: Maintain Mutation Advantage

Ensure our changes don't regress entity_cycle and add_remove performance:
- Keep event-free design
- Avoid copying entities for "future" state checks

## Risk Assessment

| Change | Risk | Mitigation |
|--------|------|------------|
| Array + Map | Medium - API change for iteration | Keep `ReadonlySet` facade or expose array |
| Swap-and-pop | Low - internal detail | Entity order becomes undefined (usually fine for ECS) |
| Query caching | Low | Use weak references if memory is concern |

## Progress Log

### Phase 1 Results ✅

Converted from `Set<Entity>` to `EntityCollection` (Array + Map) with native array iteration delegation.

**Before (baseline with Set):**
```
objecs
  packed_5        139,836 op/s
  simple_iter     80,937 op/s
  frag_iter       44,291 op/s
  entity_cycle    7,556 op/s
  add_remove      21,209 op/s
```

**After Phase 1:**
```
objecs
  packed_5        156,720 op/s (+12%)
  simple_iter     155,658 op/s (+92%)
  frag_iter       49,980 op/s (+13%)
  entity_cycle    3,970 op/s (-47%)
  add_remove      22,525 op/s (+6%)
```

**Comparison with miniplex after Phase 1:**
| Benchmark | objecs | miniplex | Diff |
|-----------|--------|----------|------|
| packed_5 | 156,720 | 183,637 | -15% |
| simple_iter | 155,658 | 161,876 | -4% |
| frag_iter | 49,980 | 51,206 | -2% |
| entity_cycle | 3,970 | 2,247 | +77% ✅ |
| add_remove | 22,525 | 2,092 | +977% ✅ |

**Key changes:**
- Created `EntityCollection` class with Array + Map internals
- Added `ReadonlyEntityCollection` interface (simpler than `ReadonlySet` to avoid ES2024 Iterator Helpers complexity)
- Implemented swap-and-pop O(1) removal
- Delegated iteration to native array iterator for maximum performance

**Tradeoff:** entity_cycle regressed 47% from baseline, but still 77% faster than miniplex. The regression is likely due to Map overhead for index tracking.

### Phase 2 Results
- [ ] Pending

### Phase 3 Results
- [ ] Pending

### Final Results
- [ ] Pending
