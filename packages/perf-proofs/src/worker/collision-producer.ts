/**
 * collision-producer.ts — Phases 3 & 4 of the parallel-producer spike.
 *
 * SharedArrayBuffer + persistent workers, measured against the serial controls
 * from Phase 1. Workers scan their outer-index range over the shared snapshot
 * and emit ordered candidate pairs; the main thread greedily reduces them into
 * the exact selected pairs the serial kernel produces.
 *
 * Correctness gate runs first: for every fixture AND the Phase-1 edge cases,
 * the parallel selected pairs must equal the serial ground truth, for each
 * worker count. The process exits non-zero without benchmarking on any mismatch.
 *
 * Two timings per worker count:
 *   end-to-end     — pack + dispatch + worker compute + return + reduce
 *   compute-only   — dispatch + compute + return + reduce (snapshot pre-packed)
 *
 * end-to-end is the number that decides whether this is useful for objecs.
 *
 *   node --expose-gc src/worker/collision-producer.ts
 */
import { availableParallelism, cpus } from "node:os";
import { bench, run, summary } from "mitata";
import { createFixture, type Scenario } from "./lib/fixtures.ts";
import {
	type Collidable,
	CollisionSnapshot,
	maxPairs,
	packSnapshot,
	selectPacked,
} from "./lib/kernels.ts";
import { buildWorld, EDGE_CASES, runAllKernels } from "./lib/parity.ts";
import { reduceCandidates } from "./lib/reduce.ts";
import { nextPow2, SharedSnapshot } from "./lib/shared-snapshot.ts";
import {
	type CollisionResult,
	partitionRange,
	WorkerPool,
} from "./lib/worker-pool.ts";

const SCENARIOS: ReadonlyArray<Scenario> = ["no-hit", "sparse", "dense"];

const SIZES = (process.env.SIZES ?? "256,512,1024,2048,4096")
	.split(",")
	.map((s) => Number.parseInt(s.trim(), 10))
	.filter((n) => Number.isFinite(n) && n > 0);

const MAX_WORKERS = Math.min(8, availableParallelism());

const WORKER_COUNTS = (process.env.WORKERS ?? "1,2,4,8")
	.split(",")
	.map((s) => Number.parseInt(s.trim(), 10))
	.filter((n) => Number.isFinite(n) && n > 0 && n <= MAX_WORKERS);

const maxSize = Math.max(...SIZES, 32);
const capacity = nextPow2(maxSize);

console.log("=".repeat(72));
console.log(
	"objecs parallel-producer spike — Phase 3/4: SAB collision workers",
);
console.log("=".repeat(72));
console.log(`node                  ${process.version}`);
console.log(`platform              ${process.platform}/${process.arch}`);
console.log(`cpu                   ${cpus()[0]?.model ?? "unknown"}`);
console.log(`availableParallelism  ${availableParallelism()}`);
console.log(`worker counts         ${WORKER_COUNTS.join(", ")}`);
console.log(`sizes                 ${SIZES.join(", ")}`);
console.log(`snapshot capacity     ${capacity}`);
console.log("=".repeat(72));
console.log();

// ---------------------------------------------------------------------------
// Shared state, allocated once outside every measured path.
// ---------------------------------------------------------------------------

const snapshot = new SharedSnapshot(capacity);

// One pool per worker count; workers share the single snapshot's buffers.
const pools = new Map<number, WorkerPool>();

for (const workerCount of WORKER_COUNTS) {
	pools.set(
		workerCount,
		await WorkerPool.create(workerCount, snapshot.buffers),
	);
}

console.log(`✓ ${pools.size} pools ready\n`);

const out = new Int32Array(Math.max(2, maxPairs(capacity) * 2));
const handled = new Uint8Array(capacity);

/**
 * Full parallel path: pack the shared snapshot, dispatch by outer-index
 * partition, greedily reduce the returned candidates into selected pairs.
 */
async function runParallel(
	pool: WorkerPool,
	raw: ReadonlyArray<Collidable>,
): Promise<number> {
	snapshot.pack(raw);

	const partitions = partitionRange(raw.length, pool.workerCount);
	const results = await pool.collision(raw.length, partitions);

	return reduceCandidates(results, raw.length, handled, out);
}

/** Reduce a pre-fetched candidate set (snapshot already packed & dispatched). */
function selectedPairsFromOut(pairCount: number): number[] {
	return Array.from(out.subarray(0, pairCount * 2));
}

// ---------------------------------------------------------------------------
// Correctness gate
// ---------------------------------------------------------------------------

let checks = 0;

try {
	for (const workerCount of WORKER_COUNTS) {
		const pool = pools.get(workerCount)!;

		// Edge cases.
		for (const edgeCase of EDGE_CASES) {
			const { collidables } = buildWorld(edgeCase.specs);
			const raw = collidables.entities.raw as ReadonlyArray<Collidable>;

			const truth = runAllKernels(collidables as never).currentObject;

			const pairCount = await runParallel(pool, raw);
			const got = selectedPairsFromOut(pairCount);

			if (JSON.stringify(got) !== JSON.stringify(truth)) {
				throw new Error(
					`parallel mismatch (${workerCount}w) — edge case: ${edgeCase.name}\n` +
						`  serial:   ${JSON.stringify(truth)}\n` +
						`  parallel: ${JSON.stringify(got)}\n`,
				);
			}

			checks++;
		}

		// Fixtures.
		for (const scenario of SCENARIOS) {
			for (const size of SIZES) {
				const { collidables } = createFixture(scenario, size);
				const raw = collidables.entities.raw as ReadonlyArray<Collidable>;

				const truth = runAllKernels(collidables as never).currentObject;

				const pairCount = await runParallel(pool, raw);
				const got = selectedPairsFromOut(pairCount);

				if (JSON.stringify(got) !== JSON.stringify(truth)) {
					throw new Error(
						`parallel mismatch (${workerCount}w) — ${scenario} n=${size}\n` +
							`  serial select count:   ${truth.length / 2}\n` +
							`  parallel select count: ${got.length / 2}\n`,
					);
				}

				checks++;
			}
		}
	}
} catch (error) {
	console.error((error as Error).message);
	console.error("Aborting: refusing to report timings for incorrect kernels.");
	await Promise.all([...pools.values()].map((pool) => pool.terminate()));
	process.exit(1);
}

console.log(
	`✓ parallel parity verified across ${checks} fixture/worker combinations\n`,
);

// ---------------------------------------------------------------------------
// Benchmarks
// ---------------------------------------------------------------------------

for (const scenario of SCENARIOS) {
	for (const size of SIZES) {
		const { collidables } = createFixture(scenario, size);
		const raw = collidables.entities.raw as ReadonlyArray<Collidable>;

		// Serial reference, packed once for the "scan only" comparison.
		const serialSnapshot = new CollisionSnapshot(size);
		packSnapshot(raw, serialSnapshot);

		// Pre-pack the shared snapshot for the compute-only parallel benches.
		const partitionsByWorkers = new Map(
			WORKER_COUNTS.map((w) => [w, partitionRange(size, w)]),
		);

		summary(() => {
			// Reference line: best serial end-to-end (pack + scan).
			bench(`serial/packed (pack+scan) — ${scenario} n=${size}`, () => {
				packSnapshot(raw, serialSnapshot);
				return selectPacked(serialSnapshot, handled, out);
			});

			for (const workerCount of WORKER_COUNTS) {
				const pool = pools.get(workerCount)!;
				const partitions = partitionsByWorkers.get(workerCount)!;

				bench(`worker/sab/${workerCount} end-to-end — ${scenario} n=${size}`, async () => {
					snapshot.pack(raw);
					const results = await pool.collision(size, partitions);
					return reduceCandidates(results, size, handled, out);
				});

				bench(`worker/sab/${workerCount} compute-only — ${scenario} n=${size}`, async () => {
					const results: CollisionResult[] = await pool.collision(
						size,
						partitions,
					);
					return reduceCandidates(results, size, handled, out);
				});
			}
		});
	}
}

await run();

await Promise.all([...pools.values()].map((pool) => pool.terminate()));
