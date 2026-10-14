# [Spike] Explore producer-only parallel systems with Workers + shared read snapshots

> **This is the original brief.** The spike is complete — results, numbers, and
> the recommendation live in [`README.md`](./README.md).

> **Spike / research issue — no public API commitment**
>
> Investigate whether objecs can gain meaningful CPU performance from persistent Worker threads / Web Workers while preserving its current plain-object entity/component API.
>
> The initial model is intentionally constrained:
>
> **A parallel system may read existing entity state, but it may not mutate existing entities or structurally mutate the `World`. Its only logical output is new entities (typically event entities), which are materialized on the main thread after a barrier.**

## Why this is worth exploring

objecs is deliberately optimized around ordinary JavaScript objects and fast cached archetype membership. The current hot-path API is excellent:

```ts
const movables = world.archetype("direction", "transform", "velocity");

for (const entity of movables.entities) {
	entity.transform.position.x += entity.velocity.x * entity.direction.x * dt;

	entity.transform.position.y += entity.velocity.y * entity.direction.y * dt;
}
```

Changing component storage to TypedArrays/native memory would be a large API/philosophy change. Parallel **producer** systems may provide a performance path that leaves the entity API untouched.

The shmup collision system is the best first candidate because it:

- reads collidable entities;
- does potentially expensive pairwise work;
- does **not mutate the colliding entities during detection**;
- communicates the result by creating collision event entities;
- currently executes an ordered nested loop over all collidables.

Relevant source:

- `packages/examples/src/demos/shmup/systems/collision-system.ts`
- `packages/examples/src/demos/shmup/scenes/gameplay-screen.ts`
- `packages/examples/src/demos/shmup/bitmasks.ts`
- `packages/examples/src/lib/collision/aabb.ts`

## Repository observations verified for this spike

Based on `main` as inspected on **2026-07-23**:

### objecs core

`packages/objecs/src/world.ts`:

- entities remain ordinary mutable JS objects;
- `EntityCollection` is array-backed for fast iteration and uses a `Map` for O(1) membership;
- removal is swap-and-pop;
- `archetype()` caches matching entity collections;
- affected archetypes are indexed by component;
- component removal assigns `undefined` rather than using `delete` to keep V8 hidden classes stable;
- `ComponentValue` intentionally excludes functions and symbols.

`packages/objecs/src/archetype.ts`:

- archetype membership tests use manual loops rather than `.every()` / `.some()`;
- archetypes remain reactive as components are added/removed.

This means the benchmark must compare Workers against an already optimized object ECS, not against a naive query-per-frame baseline.

### Existing performance infrastructure

`packages/perf-proofs` already exists specifically for evidence-based performance decisions.

It currently:

- uses `mitata`;
- runs benchmarks directly with Node and `--expose-gc`;
- uses TypeScript files executed by Node;
- contains benchmarks tied directly to objecs implementation choices;
- has category-specific scripts;
- uses TypeScript `NodeNext`;
- depends on `mitata@^1.0.34`.

This spike should live there rather than introducing a second benchmark framework.

Current commands include:

```bash
pnpm --filter perf-proofs start
pnpm --filter perf-proofs typecheck
```

Individual benchmark style:

```bash
node --expose-gc src/array/for-of-vs-for-index-vs-foreach.ts
```

### Runtime matrix

The normal objecs CI currently tests:

```text
Node 22.x
Node 24.x
Node 26.x
```

The spike should avoid a design that inherently requires Node 26-only APIs unless the benchmark demonstrates a compelling reason.

`node:worker_threads`, `SharedArrayBuffer`, transferable `ArrayBuffer`, and normal `Atomics` are sufficiently established for the proposed experiment.

### Browser build

The package build target is currently `chrome101`.

The examples use Vite, but the current:

- `packages/examples/vite.config.ts`
- root `netlify.toml`

do **not** configure cross-origin isolation headers.

Browser `SharedArrayBuffer` usage requires a cross-origin-isolated page, normally including:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Therefore:

> **Run the first performance spike under Node worker threads. Do not make browser deployment/header changes as part of the initial experiment.**

Browser support can be a follow-up if the Node results justify continuing.

---

# Hypothesis

For systems where:

```text
snapshot/setup work = O(n)
parallel computation = substantially more expensive than O(n)
output = relatively small
```

persistent workers plus shared read-only packed snapshots can outperform the current serial JS implementation without changing the public entity/component API.

Collision is especially favorable because the current worst-case detection work is approximately pairwise while snapshot packing is linear:

```text
pack colliders: O(n)
collision search: O(n²)
merge events: O(number of hits/candidates)
```

By contrast, a simple movement system is a poor first candidate:

```text
pack: O(n)
movement: O(n)
apply writes: O(n)
```

This spike is specifically intended to find the crossover point rather than assume parallel execution is automatically faster.

---

# Important correctness constraint: current collision behavior is order-dependent

Do **not** parallelize the current collision loop by having each Worker independently emit every collision it finds.

The existing shmup collision system has these semantics:

1. Iterate collidables in their current `EntityCollection` order.
2. Skip an outer entity if it has already been handled.
3. Iterate possible `otherEntity` values in collection order.
4. Skip the same entity and any already-handled entity.
5. Apply the collision-layer/mask predicate.
6. Test AABB intersection.
7. On the **first accepted collision**:
   - create the appropriate event entity;
   - add both entities to `handledEntities`;
   - `break` the inner loop.
8. Continue the outer loop.

Consequences:

- an entity participates in at most one accepted collision per collision-system invocation;
- which pair wins can depend on archetype/entity iteration order;
- the layer/mask test is directional in the current implementation;
- a naive parallel "emit all intersecting pairs" implementation changes gameplay behavior.

The spike must include a parallel implementation whose **final selected collision pairs exactly match the current serial semantics** for deterministic test inputs.

---

# Proposed spike architecture

## High-level flow

```text
main thread
────────────────────────────────────────────

objecs collidables
       │
       │ pack once
       ▼
SharedArrayBuffer collision snapshot
       │
       ├──────────────┬──────────────┐
       ▼              ▼              ▼
    worker 0       worker 1       worker 2 ...
       │              │              │
candidate pairs   candidate pairs   candidate pairs
       │              │              │
       └──────────────┴──────────────┘
                      │
                transferable
                 ArrayBuffers
                      │
                      ▼
            deterministic reduction
                      │
             selected collision pairs
                      │
                      ▼
          create normal objecs event
                 entities
```

Workers never receive or mutate ordinary entity objects.

The main-thread objecs API remains unchanged.

## Why the Worker output should initially be candidate pairs

Although the conceptual feature is "parallel systems produce entities", the shmup collision system has greedy `handledEntities` semantics.

The cleanest correct decomposition is:

### Parallel phase

Workers perform the expensive read-only predicate:

```text
layer/mask filtering
+
AABB intersection
```

and return ordered candidate pairs:

```text
outerIndex, innerIndex
```

### Main-thread reduction phase

The main thread reconstructs the current greedy behavior using the candidate pairs:

```ts
for (let i = 0; i < count; i++) {
	if (handled[i]) continue;

	for (const j of candidatesForOuterIndex(i)) {
		if (handled[j]) continue;

		// This is the first still-valid collision in the same order as today.
		select(i, j);
		handled[i] = true;
		handled[j] = true;
		break;
	}
}
```

### Materialization phase

Resolve the pair indices back to the original archetype array:

```ts
const entities = collidables.entities.raw;

const entity = entities[i];
const otherEntity = entities[j];
```

Then execute the existing collision classification logic and call:

```ts
world.createEntity(...)
```

exactly as the current collision system does.

This keeps Worker data compact and preserves real entity object identity in event components.

---

# Do not introduce entity IDs for the first spike

For this benchmark/prototype, use indexes into the frozen archetype snapshot:

```text
0 ... collidables.entities.raw.length - 1
```

Reason:

- the main thread does not mutate the world while the parallel collision phase is running;
- `collidables.entities.raw` therefore remains stable for the duration of the phase;
- pair indices are cheaper and simpler than adding identity machinery to `World`;
- event entities can still contain the existing entity object references after results return.

If a future scheduler allows world mutation while Workers are running, stable entity IDs/generations will need a separate design.

---

# Shared snapshot format

Do **not** structured-clone the entity object graph every frame.

Use a reusable packed `SharedArrayBuffer`.

For collision, the Worker only needs values used by the broad/narrow predicate.

Recommended first layout:

```ts
type CollisionSnapshot = {
	count: number;

	left: Float64Array;
	right: Float64Array;
	top: Float64Array;
	bottom: Float64Array;

	layer: Uint32Array;
	mask: Uint32Array;
};
```

Populate once per collision-system invocation:

```ts
for (let i = 0; i < entities.length; i++) {
	const entity = entities[i];

	const x = entity.transform.position.x + entity.boxCollider.offsetX;

	const y = entity.transform.position.y + entity.boxCollider.offsetY;

	left[i] = x;
	right[i] = x + entity.boxCollider.width;
	top[i] = y;
	bottom[i] = y + entity.boxCollider.height;

	layer[i] = entity.collisionLayer >>> 0;
	mask[i] = entity.collisionMask >>> 0;
}
```

Precomputing bounds is intentional.

The current collision implementation creates temporary AABB object literals inside the nested loop and repeatedly recomputes entity bounds. A fair Worker experiment must separately measure whether simply hoisting/prepacking this work on one thread already produces most of the speedup.

Use `Float64Array` initially rather than `Float32Array` so the spike does not silently change normal JS-number precision.

## Allocation policy

Do not allocate new shared input buffers every frame.

Create a reusable snapshot with a capacity.

On capacity overflow:

```text
newCapacity = next power of two >= entityCount
```

Reallocate outside the measured hot path where possible.

Do not rely on growable `SharedArrayBuffer` in the first implementation; ordinary fixed SABs keep the experiment compatible with a wider runtime range.

---

# Synchronization model

Use persistent workers.

**Do not create Workers inside the measured per-frame path.**

Node's own worker-thread documentation recommends pools for repeated CPU work because Worker startup overhead can exceed the work being offloaded.

## Control messages

For the first implementation:

- use `postMessage()` for small job-control messages;
- use a shared input SAB for collision data;
- use transferable `ArrayBuffer`s for each Worker's output;
- use a tiny shared `Int32Array` control block only where memory publication/synchronization is needed.

Do not use an Atomic operation for each collider field read.

The Worker should perform ordinary TypedArray reads over shared memory.

Atomics should be limited to synchronization/control state, e.g. generation/ready markers if used.

Example conceptual control block:

```ts
const enum ControlIndex {
	Generation = 0,
	Count = 1,
}
```

Main thread:

```ts
populateSnapshot();

Atomics.store(control, ControlIndex.Count, count);
Atomics.store(control, ControlIndex.Generation, generation);

worker.postMessage({
	type: "collision",
	generation,
	start,
	end,
});
```

Worker:

```ts
const publishedGeneration = Atomics.load(control, ControlIndex.Generation);

if (publishedGeneration !== job.generation) {
	throw new Error("stale collision job");
}

// Read snapshot with normal TypedArray indexing.
```

This is deliberately simple. Benchmarking a fully Atomics-driven job queue can be a separate variant after the basic Worker design works.

## Output

Each Worker should own its result buffer.

Suggested pair representation:

```ts
Uint32Array;
```

with:

```text
[i0, j0, i1, j1, i2, j2, ...]
```

When complete:

```ts
parentPort.postMessage(
	{
		generation,
		pairCount,
		pairs,
	},
	[pairs.buffer],
);
```

The output buffer is transferred back rather than cloned.

For reuse, maintain a small output-buffer pool and transfer replacement buffers back to Workers after merge, or allocate during the initial spike and measure the allocation cost explicitly.

---

# Work partitioning

Partition by **outer collision-loop index**.

For `W` workers and `N` collidables:

```text
worker 0: i = 0              ... split1 - 1
worker 1: i = split1         ... split2 - 1
...
worker W: i = finalSplit     ... N - 1
```

Each Worker scans `j` in ascending order.

Pseudo-code:

```ts
for (let i = start; i < end; i++) {
	for (let j = 0; j < count; j++) {
		if (i === j) continue;

		if ((layer[i] & mask[j]) !== layer[i]) {
			continue;
		}

		if (
			left[i] < right[j] &&
			right[i] > left[j] &&
			top[i] < bottom[j] &&
			bottom[i] > top[j]
		) {
			emitCandidate(i, j);
		}
	}
}
```

Important:

> Do **not** reduce this to only `i < j` during the first spike.

The current layer/mask predicate is directional and the current nested-loop ordering is observable through greedy handling. The benchmark must preserve existing behavior before exploring algorithmic changes.

Because workers own contiguous `i` ranges and scan `j` ascending, concatenating result buffers by Worker range preserves global `(i, j)` order without a sort.

---

# Deterministic reduction

Given candidate output in global `(i, j)` order:

```ts
const handled = new Uint8Array(count);

for (const [i, j] of orderedCandidates) {
	if (handled[i] !== 0) continue;
	if (handled[j] !== 0) continue;

	selectPair(i, j);

	handled[i] = 1;
	handled[j] = 1;
}
```

However, verify this against the original exact control flow.

The original implementation breaks after the first collision for an outer entity and skips an already-handled outer entity entirely. A flat ordered-pair reduction should be equivalent **only if** candidates are globally ordered exactly as the original nested loop evaluates them.

Add explicit tests for this equivalence.

If in doubt, store or merge candidates grouped by outer `i` and implement the original nested control structure literally.

---

# Event creation remains on the main thread

Once pair `(i, j)` is selected:

```ts
const entity = entities[i];
const otherEntity = entities[j];
```

Run the existing event-classification code on the original entity objects.

Examples currently produced by the shmup collision system include:

```text
eventPlayerProjectileBossCollision
eventPlayerProjectileEnemyCollision
eventPlayerPickupCollision
eventPlayerEnemyCollision
```

Do not attempt to serialize entity references into Worker output.

This is a core advantage of the design:

```text
Workers: numbers only
Main thread: real objecs entities
```

---

# Worker pool requirements

Implement a small dedicated pool for the spike, not a production abstraction.

Suggested location:

```text
packages/perf-proofs/src/worker/
  collision-parallel.ts
  collision-worker.mjs
  worker-pool.ts
  fixtures.ts
```

Using `.mjs` for the Worker entry is acceptable and avoids making worker startup depend on TypeScript execution support. `packages/perf-proofs/tsconfig.json` already has `allowJs: true`.

Pool requirements:

- workers are created once before benchmarks;
- all workers must report ready before measurement starts;
- each job has a monotonically increasing generation/job ID;
- reject on Worker error/exit;
- support clean `terminate()` after benchmarks;
- do not accidentally keep extra Worker creation in the benchmark body;
- default worker counts should be capped by available CPU parallelism.

Recommended worker-count matrix:

```text
1
2
4
min(8, availableParallelism)
```

Use:

```ts
import { availableParallelism } from "node:os";
```

Do not assume every benchmark machine has 8 useful cores.

---

# Benchmark plan

## Location

Add a new category:

```text
packages/perf-proofs/src/worker/
```

Add a package script:

```json
"start:worker": "for f in src/worker/*.ts; do echo \"\\n--- $f ---\"; node --expose-gc \"$f\"; done"
```

If helper `.ts` files should not execute directly, prefer one benchmark entry:

```text
src/worker/collision-producer.ts
```

and keep helpers as `.mjs`, or put helpers under a nested `lib/` directory and make `start:worker` target known benchmark filenames.

Recommended command:

```bash
pnpm --filter perf-proofs start:worker
```

Typecheck:

```bash
pnpm --filter perf-proofs typecheck
```

Normal library regression checks:

```bash
pnpm --filter objecs test -- --run
pnpm --filter objecs build
```

## Use mitata

Follow the existing perf-proofs style:

```ts
import { bench, run, summary } from "mitata";
```

Mitata supports asynchronous benchmarks, so Worker round trips can be measured with async benchmark bodies.

Run with `--expose-gc`, consistent with the rest of the package.

---

# Required benchmark variants

The benchmark must distinguish **parallelism gains** from simpler serial optimizations.

## A. Current-style serial object baseline

Reproduce the current shmup collision kernel as faithfully as practical:

- plain JS entity objects;
- outer + inner iteration;
- directional layer/mask test;
- compute AABB values from nested transform/collider objects;
- current greedy handled behavior;
- same result checksum.

Do not include rendering or unrelated game logic.

Name example:

```text
serial/current-object
```

## B. Optimized serial object baseline

Before introducing Workers, remove obvious inner-loop overhead while keeping normal objects.

At minimum:

- precompute collider bounds once per entity;
- avoid temporary AABB object allocations;
- inline the rectangle comparison.

This answers:

> Is the performance opportunity actually "Workers", or is the collision demo simply leaving an easy serial optimization on the table?

Name:

```text
serial/precomputed
```

## C. Packed TypedArray serial baseline

Pack the same `left/right/top/bottom/layer/mask` layout intended for Workers, but execute the pair loop on the main thread.

This isolates:

- object-property access;
- snapshot packing;
- TypedArray data layout;
- Worker scheduling.

Measure:

```text
pack
compute
reduce
end-to-end
```

Name:

```text
serial/packed
```

## D. Worker + structured-clone control (optional but useful)

Send packed ordinary `ArrayBuffer`/TypedArray input without SAB, allowing cloning or transfer according to the chosen control.

This is useful for demonstrating whether shared input memory materially matters.

Do not make this variant block the spike if time is limited.

Name:

```text
worker/clone
```

## E. SharedArrayBuffer + persistent Workers

The primary experiment.

For each Worker count:

```text
worker/sab/1
worker/sab/2
worker/sab/4
worker/sab/8
```

or cap to `availableParallelism()`.

Measure both:

```text
compute-only after snapshot is ready
```

and:

```text
end-to-end:
pack + dispatch + worker compute + return + deterministic reduction
```

The end-to-end number is the one that determines whether this is useful for objecs.

---

# Required workload sizes

Start with:

```text
64
128
256
512
1_024
2_048
4_096
```

Only add `8_192+` if benchmark duration remains reasonable.

Pairwise work grows quickly. Do not let mitata spend minutes repeatedly running a pathological `N²` case.

It is acceptable to use fewer samples or separate large-N runs when needed, but document the configuration.

---

# Required workload scenarios

Use deterministic fixture generation. Do not use uncontrolled `Math.random()` inside setup.

A tiny seeded xorshift/LCG helper is sufficient; do not add a dependency.

## 1. No-hit / worst-search case

Arrange colliders so none overlap.

Purpose:

- current serial implementation scans close to the full candidate space;
- Worker output stays tiny;
- this should be one of the most favorable cases for parallel computation.

## 2. Sparse shmup-like case

Create a mix of:

```text
Player
PlayerProjectile
Enemy
EnemyProjectile
Pickup
```

using the collision bits currently defined in:

`packages/examples/src/demos/shmup/bitmasks.ts`

Current masks:

```ts
Player: 1 << 0;
PlayerProjectile: 1 << 1;
Enemy: 1 << 2;
EnemyProjectile: 1 << 3;
Pickup: 1 << 4;
```

Use positions/sizes that generate a small, reproducible number of overlaps.

Purpose:

- approximate the actual demo's filtering behavior;
- avoid benchmarking only synthetic worst cases.

## 3. Dense-overlap case

Many colliders overlap.

Purpose:

- stress candidate output;
- expose cases where the current greedy serial loop benefits heavily from early `break`;
- show whether "emit every candidate then reduce" is a poor strategy under dense collisions.

A loss here is acceptable and informative.

---

# Measure the stages separately

The benchmark report must include these timings or dedicated microbenchmarks:

```text
1. snapshot packing
2. worker dispatch/barrier overhead with zero/minimal work
3. collision compute
4. result transfer
5. deterministic reduction
6. total end-to-end
```

This is necessary to answer where the crossover comes from.

Also capture:

```text
Node version
OS
CPU model if easy to obtain
availableParallelism()
worker count
entity count
scenario
candidate pair count
accepted pair count
```

Recommended Node helpers:

```ts
process.version;
process.platform;
process.arch;
availableParallelism();
cpus()[0]?.model;
```

---

# Add a Worker round-trip floor benchmark

Before collision results are interpreted, establish the minimum steady-state cost of the pool.

Add a tiny benchmark that:

1. starts workers before measurement;
2. dispatches a generation/job with no collision work;
3. waits for all workers to respond.

Measure for:

```text
1 worker
2 workers
4 workers
8 workers (where available)
```

This gives an empirical lower bound for any future parallel objecs system.

If a system does less CPU work than the Worker barrier costs, it should never be auto-parallelized.

---

# Correctness tests

Performance numbers are not sufficient.

Add deterministic assertions before invoking `run()`.

For each fixture:

```ts
const serial = runCurrentSerial(fixture);
const parallel = await runParallel(fixture);

assert.deepStrictEqual(parallel.selectedPairs, serial.selectedPairs);
```

Test at least:

- zero entities;
- one entity;
- two colliding entities;
- two non-colliding entities;
- three entities where two possible collisions compete for the same entity;
- directional layer/mask mismatch;
- multiple disjoint collisions;
- dense overlaps;
- worker partition boundaries.

Especially include a fixture where:

```text
entity 0 collides with 1 and 2
entity 1 collides with 0 and 3
```

to prove greedy ordering is preserved.

The benchmark should abort rather than print performance results if correctness differs.

---

# Observable checksum / anti-optimization requirement

Ensure benchmark work has an observable result.

For example:

```ts
return acceptedPairCount + candidatePairCount;
```

or consume a checksum.

Do not benchmark loops whose results can be proven dead by V8.

Mitata also provides `do_not_optimize()` if needed.

---

# Avoid benchmark contamination

Do not include these in the measured steady-state Worker path unless they are deliberately being measured:

```text
Worker construction
Worker module parsing
initial SAB allocation
initial pool handshake
capacity growth
fixture generation
```

Run warmup/ready steps before benchmark measurement.

Conversely, **do include snapshot packing in the end-to-end variant**, because production objecs must pay that cost every frame with the current object storage model.

---

# Candidate result-buffer strategy

Start simple.

Each Worker can grow a normal local JS number array and pack it into a `Uint32Array` before returning.

Then add a lower-allocation version if profiling says output allocation matters.

Potential strategies:

### Simple

```ts
const pairs: number[] = [];
pairs.push(i, j);
```

then:

```ts
const output = Uint32Array.from(pairs);
```

### Reusable capacity

Maintain a reusable `Uint32Array`, doubling when full.

Because transferring the underlying `ArrayBuffer` detaches it from the Worker, return replacement buffers from the main thread or use a two-buffer pool.

Do not build a complicated lock-free shared output queue before measurements show it is needed.

---

# Why not have Workers directly mutate shared objecs state?

Out of scope.

Ordinary objecs entities are normal JS objects in one isolate/heap. Workers cannot directly share those objects.

Moving component storage into SABs would be a fundamentally different ECS/storage project and would change the API/performance model much more substantially.

The purpose of this spike is to test whether **packing only the read subset needed by expensive producer systems** is enough.

---

# Why not use Atomics for every value?

Also out of scope and likely counterproductive.

The intended model is phased:

```text
main writes snapshot
       ↓
publish/barrier
       ↓
workers read snapshot only
       ↓
workers return output
       ↓
main mutates World
```

Bulk collider data should be normal TypedArray reads.

Atomics are for synchronization/control, not for every `x`, `y`, `width`, etc.

---

# Browser follow-up, only if Node results are promising

If this spike shows a worthwhile crossover, a second issue should test Dedicated Web Workers.

Important existing repo constraint:

The examples currently do not configure cross-origin isolation.

For a browser SAB prototype, add local Vite server headers such as:

```ts
server: {
  headers: {
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
  },
},
```

and equivalent deployment headers.

Before doing that, audit all demo assets/resources for COEP compatibility.

Do **not** make these deployment changes in the Node performance spike.

A non-SAB fallback could later use transferable `ArrayBuffer` double-buffering, but that is a separate measurement.

---

# Production scheduler/API questions deliberately left open

Do not commit objecs to an API during the spike.

If the benchmark succeeds, a later design issue can evaluate an API such as:

```ts
parallelProducer({
	// Declarative read requirements / snapshot builder
	reads: ["boxCollider", "collisionLayer", "collisionMask", "transform"],

	// Worker implementation / job description
	worker: new URL("./collision.worker.js", import.meta.url),

	// Only main-thread World mutation is allowed here.
	merge(world, results) {
		for (const result of results) {
			world.createEntity(result);
		}
	},
});
```

But the actual collision example suggests a generic abstraction may need a reduction/finalization phase:

```text
snapshot -> parallel detect -> deterministic reduce -> emit entities
```

Do not force this into the public API before the performance case is proven.

---

# Sync-vs-async game-loop issue

The current shmup scene update is synchronous:

```ts
for (const system of this.systems) {
	system(delta);
}
```

A browser Worker barrier is naturally asynchronous.

Do not change `Scene.update()` as part of this benchmark.

If this feature moves toward production, explicitly evaluate:

## Option A — async barrier

```ts
await parallelProducerPhase();
```

Pros:

- same-frame semantics.

Cons:

- introduces async scheduling into the game update pipeline.

## Option B — one-frame pipelining

```text
frame N: dispatch detection
frame N+1: consume results
```

Pros:

- current synchronous main loop can remain mostly intact;
- main thread can perform other work while workers run.

Cons:

- event latency changes by one frame;
- requires double-buffered snapshots;
- semantics differ from the current collision system.

## Option C — explicit parallel phase owned by application

Do not make all systems implicitly async. Expose a separate opt-in mechanism.

This API decision is explicitly **not part of the spike**.

---

# Suggested implementation sequence for the agent

## Phase 1 — establish serial controls

1. Create deterministic collision fixtures.
2. Implement `serial/current-object`.
3. Implement `serial/precomputed`.
4. Implement `serial/packed`.
5. Confirm selected-pair equivalence where applicable.
6. Record whether precomputation alone materially improves the shmup collision kernel.

## Phase 2 — Worker floor

1. Implement a persistent `WorkerPool`.
2. Start workers outside benchmark timing.
3. Measure empty/minimal job round-trip for 1/2/4/8 workers.
4. Ensure clean shutdown.

## Phase 3 — shared collision worker

1. Implement reusable SAB snapshot.
2. Partition outer indices.
3. Workers produce ordered candidate pairs.
4. Main thread concatenates/merges in original evaluation order.
5. Apply deterministic greedy reduction.
6. Assert exact parity with serial selected pairs.

## Phase 4 — benchmark matrix

Run:

```text
serial/current-object
serial/precomputed
serial/packed
worker/sab/1
worker/sab/2
worker/sab/4
worker/sab/8 if useful
```

across:

```text
64
128
256
512
1024
2048
4096
```

and:

```text
no-hit
sparse/shmup-like
dense
```

## Phase 5 — report

Add a short Markdown report under:

```text
packages/perf-proofs/src/worker/README.md
```

or update `packages/perf-proofs/README.md`.

Report:

- machine/runtime;
- worker counts;
- crossover entity counts;
- best speedup;
- worst regression;
- snapshot cost;
- barrier cost;
- result-transfer/reduction cost;
- whether optimized serial already captures most of the gain;
- recommendation.

---

# Go / no-go criteria

This is a spike, so avoid inventing a benchmark victory.

Recommend continuing toward an objecs feature only if the data shows a meaningful region where the **end-to-end** Worker version beats the best reasonable serial version.

A useful signal would be something like:

```text
>= 1.25x end-to-end improvement
```

for a workload size that is plausibly useful to real games/simulations, with larger workloads scaling further.

A stronger result would be:

```text
2x+ at high collision counts
```

with a clear, measurable crossover point.

Recommend **not** adding a parallel-system abstraction if:

- Workers only beat the unoptimized current collision code but not `serial/precomputed`;
- snapshot packing dominates;
- the crossover only occurs at impractically large workloads;
- candidate output/reduction destroys gains for realistic densities;
- scheduling/API complexity outweighs measured benefit.

A no-go result is still a successful spike.

---

# Possible follow-up optimizations if the first Worker version is promising

Do not implement all of these up front.

1. **Spatial broadphase**
   - grid/spatial hash/sweep-and-prune;
   - likely much larger collision win than threading the same O(n²) algorithm.

2. **Shared persistent output buffers**
   - only if transferable output allocation is measurable.

3. **Atomics-based job queue**
   - only if `postMessage` control overhead is material.

4. **Double-buffered snapshots**
   - for pipelining Worker compute with main-thread systems/render prep.

5. **Multiple parallel producer systems**
   - collision, AI sensing, visibility, procedural generation.

6. **Read-set metadata**
   - useful later for scheduler conflict analysis.

7. **Auto threshold**
   - keep small workloads on main thread;
   - dispatch only above empirically measured crossover.

---

# Definition of done

- [ ] New Worker benchmark category exists under `packages/perf-proofs`.
- [ ] Uses the existing mitata benchmark stack.
- [ ] Persistent Worker pool; Worker startup excluded from steady-state timing.
- [ ] Shared read-only collision snapshot implemented.
- [ ] Workers never receive ordinary entity objects.
- [ ] Workers return compact candidate pair data.
- [ ] Main-thread reduction preserves the current shmup greedy collision ordering exactly.
- [ ] Correctness assertions cover ordering/contention cases.
- [ ] Benchmarks include current serial, optimized serial, packed serial, and SAB Worker variants.
- [ ] Measurements cover at least 1/2/4 Workers where hardware allows.
- [ ] Measurements cover no-hit, sparse, and dense collision scenarios.
- [ ] End-to-end timing includes snapshot packing.
- [ ] Worker round-trip floor is measured separately.
- [ ] Results identify the crossover point, if any.
- [ ] Results include runtime/hardware metadata.
- [ ] `pnpm --filter perf-proofs typecheck` passes.
- [ ] Existing objecs build/tests remain passing.
- [ ] A written recommendation says **continue** or **do not continue**, based on data.
- [ ] No public objecs API change is required to complete the spike.

---

# Expected conclusion format

The implementing agent should finish the spike with a table similar to:

| Scenario |    N | Serial current | Serial optimized | SAB 1W | SAB 2W | SAB 4W | Best end-to-end |
| -------- | ---: | -------------: | ---------------: | -----: | -----: | -----: | --------------: |
| no-hit   |  512 |                |                  |        |        |        |                 |
| no-hit   | 1024 |                |                  |        |        |        |                 |
| sparse   | 1024 |                |                  |        |        |        |                 |
| sparse   | 2048 |                |                  |        |        |        |                 |
| dense    | 1024 |                |                  |        |        |        |                 |

And answer these questions explicitly:

1. What is the steady-state Worker barrier floor?
2. How much does snapshot packing cost per collider?
3. How much faster is precomputed serial collision than the current object implementation?
4. At what `N`, if any, does SAB + 2 Workers beat optimized serial?
5. At what `N`, if any, does SAB + 4 Workers beat optimized serial?
6. How does candidate density affect the crossover?
7. Does deterministic reduction materially affect performance?
8. Does this justify a general objecs parallel-producer API?
9. If yes, should production use same-frame async barriers or one-frame pipelining?
10. Which other objecs workloads appear likely to benefit?

---

# References

Repository:

- https://github.com/jakeklassen/objecs
- https://github.com/jakeklassen/objecs/tree/main/packages/perf-proofs
- https://github.com/jakeklassen/objecs/blob/main/packages/objecs/src/world.ts
- https://github.com/jakeklassen/objecs/blob/main/packages/objecs/src/archetype.ts
- https://github.com/jakeklassen/objecs/blob/main/packages/examples/src/demos/shmup/systems/collision-system.ts
- https://github.com/jakeklassen/objecs/blob/main/packages/examples/src/demos/shmup/scenes/gameplay-screen.ts
- https://github.com/jakeklassen/objecs/blob/main/packages/examples/src/demos/shmup/bitmasks.ts
- https://github.com/jakeklassen/objecs/blob/main/packages/examples/src/lib/collision/aabb.ts
- https://github.com/jakeklassen/objecs/blob/main/.github/workflows/ci.yml

Worker/shared-memory references:

- Node Worker Threads: https://nodejs.org/download/release/latest/docs/api/worker_threads.html
- SharedArrayBuffer: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer
- Atomics.wait: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics/wait
- Atomics.waitAsync: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics/waitAsync
- Browser cross-origin isolation: https://developer.mozilla.org/en-US/docs/Web/API/Window/crossOriginIsolated
- mitata: https://www.npmjs.com/package/mitata
