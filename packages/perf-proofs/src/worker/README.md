# Parallel producer systems — spike results

Investigating whether objecs can gain CPU performance from persistent Worker
threads while preserving the plain-object entity API. See [`SPIKE.md`](./SPIKE.md)
for the original brief.

## Status

| Phase                       | State        |
| --------------------------- | ------------ |
| 1 — serial controls         | **Complete** |
| 2 — Worker round-trip floor | **Complete** |
| 3 — SAB collision worker    | **Complete** |
| 4 — benchmark matrix        | **Complete** |
| 5 — recommendation          | **Complete** |

## Recommendation (TL;DR)

**Qualified go, narrow scope — but bank the serial win first.**

- The single-threaded `serial/packed` cleanup is ~10× and needs no threads or
  API change. Do that regardless. It alone takes the shmup collision demo from
  "blows the frame budget at n≈1024" to "fine past n≈2048".
- SAB + persistent workers add a **further 2.5–5.5× only in low-collision-density
  scenarios at n≥1024** (no-hit, sparse). Crossover vs the best serial is ~n=512.
- **Dense collisions are a loss at every size (0.24–0.50×).** The "emit all
  candidates, reduce on main" strategy forfeits the greedy early-`break` that
  makes serial fast under heavy overlap — workers do full O(n²) while serial
  short-circuits.
- The wins require an **async frame barrier**, which the current synchronous
  `Scene.update()` does not support. That integration cost is real and is an
  API/architecture decision, not a benchmark detail.

Net: worth a follow-up **only** if a target workload is genuinely large-N and
low-density. For the shmup demo specifically, a spatial broadphase would beat
both serial and this Worker design and should come first.

## Running

```bash
pnpm --filter perf-proofs start:worker      # builds objecs, then runs all worker benchmarks
node --expose-gc src/worker/collision-serial.ts   # Phase 1 only
SIZES=64,256 node --expose-gc src/worker/collision-serial.ts   # quick pass
```

`start:worker` rebuilds `objecs` first on purpose: perf-proofs imports the
published `dist` bundle (the package exports no `./src` subpath), so a stale
build would silently benchmark the wrong library.

## Correctness gate

The benchmark exits non-zero without printing timings if any kernel disagrees.
Two layers:

1. **Cross-kernel parity** — all three kernels must select identical pairs, in
   identical order, on every fixture.
2. **Hand-derived ground truth** — 11 of the 12 edge cases carry an `expected`
   pair list derived by hand from `collision-system.ts:26-181`, not captured
   from a kernel run. Cross-kernel agreement alone would happily confirm three
   identically-wrong kernels.

Layer 2 earned its keep immediately: two edge cases originally written as
"layer/mask mismatch, expect zero accepts" were wrong. `Enemy & Enemy` is
`4 & 4 === 4`, which **passes** the directional test — those fixtures were
accept-cases masquerading as reject-cases, and all three kernels "agreed" on
them. They now test what their names claim, and a genuine asymmetric case was
added (rejected as `(0,1)`, accepted as `(1,0)`).

## Phase 1 results

`AMD Ryzen 9 7950X3D` (16C/32T), Node v26.5.0, linux/x64,
`availableParallelism() = 32`. Single-threaded throughout.

Times are mitata `avg`. Lower is better.

### no-hit (full O(n²) scan, zero accepts — the serial worst case)

|    n | current-object | precomputed | packed (pack+scan) | packed vs current |
| ---: | -------------: | ----------: | -----------------: | ----------------: |
|  256 |        1.09 ms |      447 µs |             114 µs |          **9.6×** |
|  512 |        4.67 ms |     2.01 ms |             492 µs |          **9.5×** |
| 1024 |       17.98 ms |     7.23 ms |            1.75 ms |         **10.3×** |
| 2048 |       70.71 ms |    29.13 ms |            7.04 ms |         **10.0×** |
| 4096 |      297.38 ms |   129.56 ms |           27.66 ms |         **10.8×** |

### sparse (shmup-like mix)

|    n | current-object | precomputed | packed (pack+scan) | packed vs current |
| ---: | -------------: | ----------: | -----------------: | ----------------: |
|  256 |        1.13 ms |      427 µs |             112 µs |         **10.1×** |
|  512 |        4.37 ms |     1.58 ms |             430 µs |         **10.2×** |
| 1024 |       14.88 ms |     5.18 ms |            1.66 ms |          **9.0×** |
| 2048 |       49.15 ms |    19.10 ms |            5.80 ms |          **8.5×** |
| 4096 |      181.30 ms |    62.19 ms |           19.30 ms |          **9.4×** |

### dense (heavy overlap — greedy `break` fires early and often)

|    n | current-object | precomputed | packed (pack+scan) | packed vs current |
| ---: | -------------: | ----------: | -----------------: | ----------------: |
|  256 |         310 µs |      101 µs |            42.7 µs |          **7.2×** |
|  512 |        1.13 ms |      379 µs |             149 µs |          **7.6×** |
| 1024 |        3.88 ms |     1.24 ms |             525 µs |          **7.4×** |
| 2048 |       14.40 ms |     4.39 ms |            1.83 ms |          **7.9×** |
| 4096 |       65.18 ms |    16.19 ms |            6.66 ms |          **9.8×** |

### Snapshot packing cost

Linear and cheap — **~15–16 ns per collider**, stable across all sizes:

|    n |     pack | ns/collider | % of packed end-to-end (no-hit) |
| ---: | -------: | ----------: | ------------------------------: |
|  256 |  4.02 µs |        15.7 |                            3.5% |
| 1024 | 15.24 µs |        14.9 |                            0.9% |
| 4096 | 65.70 µs |        16.0 |                           0.24% |

Packing is **not** a blocker. It is a rounding error at the sizes where
parallelism could plausibly help, and it is the same O(n) cost any Worker
design must pay.

## Findings

**1. The current demo kernel is leaving ~10× on the table, single-threaded.**
This is the headline. `serial/packed` beats the shipped collision code by
7–11× on one thread, across every scenario and size. Most of that is not the
TypedArray layout — it is the four temp objects allocated per pair test and the
outer entity's AABB being rebuilt on every inner iteration.

**2. The bar for Workers is `serial/packed`, not the current code.** Beating
`serial/current-object` with Workers would prove nothing. Any honest speedup
claim must clear 27.66 ms at no-hit n=4096, not 297 ms.

**3. Dense is cheaper than no-hit, not more expensive.** Greedy early-`break`
means heavy overlap _reduces_ serial work — dense n=4096 (65 ms) is 4.6× cheaper
than no-hit n=4096 (297 ms) for the current kernel. The serial worst case is the
zero-collision case, which is also the case with the smallest Worker output.
That is the most favourable possible shape for the parallel design.

**4. Frame-budget context.** At 60 FPS (16.67 ms/frame), `serial/packed`
handles n=2048 no-hit in 7.04 ms (42% of budget) and only exceeds the budget at
n=4096. The current kernel blows the frame budget at n≈1024. So the _demo_ has a
real problem — but it is a serial-optimization problem, not a parallelism one.

**5. Projected crossover (confirmed in Phase 2/3).** The floor landed near
~100 µs for 4 workers, the favourable end. Measured crossover vs the best serial
is ~n=512 for low-density scenarios. See below.

## Phase 2 — worker barrier floor

Steady-state cost of dispatching a zero-work job to every worker and waiting
for all to reply (`postMessage` round trip, through the event loop). Workers,
module parse, and the ready handshake are all excluded — only the round trip is
timed.

| workers | floor (µs/round-trip) |
| ------: | --------------------: |
|       1 |                   ~68 |
|       2 |                   ~80 |
|       4 |                  ~102 |
|       8 |                  ~169 |
|      16 |                  ~281 |

Two consequences: (a) ~100 µs of fixed overhead per dispatch at 4 workers means
anything whose whole serial job is under ~200 µs cannot win — that is n≤256
here; (b) the floor **grows** with worker count, because the main thread posts
to and drains every worker single-threaded. Going wide is not free.

This is an async barrier (through the event loop). An `Atomics.wait`/`notify`
blocking barrier would likely be several times tighter and would also fit a
synchronous game loop — but it cannot fix the dense-collision loss below, which
is algorithmic, and the large-N wins already have negligible barrier cost. Left
as a follow-up (see below).

## Phase 3/4 — SAB collision workers, end-to-end

`worker/sab/<W>` = pack shared snapshot → dispatch by outer-index partition →
workers emit ordered candidate pairs → main-thread greedy reduce. **Parity with
the serial ground truth is asserted for every fixture and every worker count
before any timing prints** (84 combinations green).

Reference = Phase-1 `serial/packed` (isolated run, no worker threads alive —
the honest "best serial you would actually ship" bar). Best worker = fastest
end-to-end across W ∈ {1,2,4,8}. Speedup = serial ÷ best-worker; **>1 = worker
win**, **<1 = worker loss**.

### no-hit (zero collisions — most favourable for workers)

|    n | serial/packed | best worker (W) |   speedup |
| ---: | ------------: | --------------: | --------: |
|  256 |        114 µs |     153 µs (2W) |   0.75× ✗ |
|  512 |        492 µs |     276 µs (4W) | **1.78×** |
| 1024 |       1.75 ms |     590 µs (8W) | **2.97×** |
| 2048 |       7.04 ms |    1.27 ms (8W) | **5.54×** |
| 4096 |      27.66 ms |    5.33 ms (8W) | **5.19×** |

### sparse (shmup-like mix)

|    n | serial/packed | best worker (W) |   speedup |
| ---: | ------------: | --------------: | --------: |
|  256 |        112 µs |     165 µs (4W) |   0.68× ✗ |
|  512 |        430 µs |     258 µs (4W) | **1.67×** |
| 1024 |       1.66 ms |     578 µs (8W) | **2.87×** |
| 2048 |       5.80 ms |    1.81 ms (8W) | **3.20×** |
| 4096 |      19.30 ms |    7.82 ms (8W) | **2.47×** |

### dense (heavy overlap) — workers LOSE at every size

|    n | serial/packed | best worker (W) | speedup |
| ---: | ------------: | --------------: | ------: |
|  256 |       42.7 µs |     180 µs (4W) | 0.24× ✗ |
|  512 |        149 µs |     397 µs (4W) | 0.38× ✗ |
| 1024 |        525 µs |    1.06 ms (8W) | 0.50× ✗ |
| 2048 |       1.83 ms |    3.70 ms (8W) | 0.49× ✗ |
| 4096 |       6.66 ms |   15.14 ms (8W) | 0.44× ✗ |

**Why dense loses.** The serial greedy loop breaks on the first accepted
collision per outer entity, so heavy overlap makes it _finish early_. The
workers must emit **every** candidate pair (no `break`, no `handled` check —
that state only exists after the reduction) to keep the reduction deterministic,
so they do the full O(n²) plus a large output transfer. Serial short-circuits;
workers cannot. This is the failure mode the spike brief predicted, and it is
informative rather than a defect.

**Pack and transfer are not the bottleneck.** end-to-end ≈ compute-only across
the board (e.g. dense n=4096: 15.14 ms vs 15.24 ms), confirming the snapshot
pack (~16 ns/collider) and result transfer are negligible next to the compute.
The cost is the wasted candidate work, not the plumbing.

### Answers to the brief's ten questions

1. **Barrier floor?** ~68 µs (1W) → ~102 µs (4W) → ~281 µs (16W), `postMessage`.
2. **Snapshot pack cost?** ~15–16 ns/collider, linear, <1% of end-to-end at
   the sizes that matter.
3. **Precomputed vs current serial?** ~2.5× from the cleanup alone; ~10× with
   the packed layout.
4. **Where does 2W beat optimized serial?** ~n=1024 for no-hit/sparse; never for
   dense.
5. **Where does 4W beat optimized serial?** ~n=512 for no-hit/sparse; never for
   dense.
6. **Candidate density effect?** Decisive. Low density → workers win big;
   high density → workers lose because serial early-`break` wins.
7. **Does reduction matter to perf?** No — reduction is cheap (O(candidates));
   it is the worker-side full-candidate _emission_ that costs, not the reduce.
8. **Justify a general parallel-producer API?** Only for large-N, low-density
   producer workloads, and only with an async barrier. Not on collision alone.
9. **Same-frame async vs one-frame pipelining?** The measured wins require an
   async barrier; `Scene.update()` is synchronous today. One-frame pipelining
   avoids restructuring the loop at the cost of one frame of event latency.
   Undecided — deferred to an API design issue, not the spike.
10. **Other workloads likely to benefit?** Anything O(>n) read-only per frame
    with small output and _low_ result density: spatial queries / AI sensing /
    visibility / procedural generation. Collision specifically is better served
    by a broadphase.

## Open concern for the go/no-go

Threading an O(n²) algorithm buys at most `W`×. A spatial broadphase (uniform
grid / sweep-and-prune) is a strictly larger win on one thread and composes with
threading afterwards. Follow-up #1 in the spike brief anticipated this, and the
Phase 1 data supports it: the algorithmic ceiling is far above the parallel one.

This does not invalidate the spike — the question "can objecs parallelise
producer systems at all" is worth answering on its own terms, and collision is
a convenient probe. But if the motivating goal is _making shmup collision fast_,
the honest ordering is: precompute + pack (10×, done, no API change) → broadphase
→ only then consider Workers.

## Layout

```
src/worker/
  SPIKE.md                  the original brief (this doc reports its results)
  collision-serial.ts       Phase 1 — three serial kernels (executable)
  worker-floor.ts           Phase 2 — barrier floor (executable)
  collision-producer.ts     Phase 3/4 — SAB workers, end-to-end matrix (executable)
  lib/
    entity.ts               minimal collision-relevant Entity + CollisionMasks
    aabb.ts                 verbatim copy of the demo's aabb helpers
    fixtures.ts             seeded deterministic worlds (no Math.random)
    kernels.ts              the three serial kernels + CollisionSnapshot
    parity.ts               edge cases, ground truth, parity assertions
    control.mjs             shared control-block layout (Int32 slots)
    collision-worker.mjs    persistent worker entry (noop + collision jobs)
    worker-pool.ts          WorkerPool + range partitioning
    shared-snapshot.ts      SAB-backed snapshot (packing views + raw buffers)
    reduce.ts               deterministic greedy candidate reduction
```

`lib/` is excluded from the aggregate `pnpm start` script — only top-level
`src/worker/*.ts` files are executable benchmarks.

### Environment knobs

```bash
# Phase 1
node --expose-gc src/worker/collision-serial.ts
SIZES=256,1024 node --expose-gc src/worker/collision-serial.ts

# Phase 2
node --expose-gc src/worker/worker-floor.ts

# Phase 3/4
node --expose-gc src/worker/collision-producer.ts
SIZES=512,2048 WORKERS=2,4 node --expose-gc src/worker/collision-producer.ts
```

### Measurement caveat

The Phase 3/4 process keeps every worker pool alive at once (up to 4 pools ×
8 workers). Idle workers do not burn CPU, but the in-process `serial/packed`
reference in that run measured 30–60% slower on some samples than the isolated
Phase-1 run (e.g. no-hit n=2048: 11.4 ms in-process vs 7.04 ms isolated). The
speedup tables above deliberately use the **faster, isolated Phase-1 serial** as
the reference — the conservative choice, since a faster serial baseline makes
the worker wins _harder_ to claim, not easier.

## Follow-ups (not done — ranked)

1. **Bank the serial win.** Apply the `serial/precomputed`+pack cleanup to the
   real `collision-system.ts`; validate in a macro/game benchmark. ~10×, no API
   change, no threads. Highest value, lowest risk.
2. **Spatial broadphase** (uniform grid / sweep-and-prune). Beats both serial
   and this Worker design for collision; composes with threading afterwards.
3. **`Atomics.wait`/`notify` blocking barrier** variant of the pool. Would lower
   the small-N floor and suit a synchronous game loop. Won't fix the dense loss.
4. **Re-scope the Worker experiment** onto a genuinely large-N, low-density,
   O(>n) read-only producer (AI sensing / visibility / procedural generation)
   where the candidate-emission strategy does not forfeit an early-`break`.
