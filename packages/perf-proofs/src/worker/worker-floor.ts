/**
 * worker-floor.ts — Phase 2 of the parallel-producer spike.
 *
 * Establishes the steady-state barrier floor: the minimum cost of dispatching
 * a job to every worker and waiting for all to respond, with ZERO collision
 * work. This is the empirical lower bound for any parallel objecs system — a
 * system doing less CPU work than this should never be auto-parallelised.
 *
 * Worker construction, module parsing, and the ready handshake all happen
 * before measurement. Only the round trip is timed.
 *
 *   node --expose-gc src/worker/worker-floor.ts
 */
import { availableParallelism, cpus } from "node:os";
import { bench, run, summary } from "mitata";
import { SharedSnapshot } from "./lib/shared-snapshot.ts";
import { WorkerPool } from "./lib/worker-pool.ts";

const MAX_WORKERS = Math.min(16, availableParallelism());

// 1, 2, 4, 8, ... up to availableParallelism (capped at 16).
const WORKER_COUNTS = (() => {
	const counts: number[] = [];

	for (let w = 1; w <= MAX_WORKERS; w *= 2) {
		counts.push(w);
	}

	// Include the exact cap if it is not already a power of two we hit.
	if (counts[counts.length - 1] !== MAX_WORKERS) {
		counts.push(MAX_WORKERS);
	}

	return counts;
})();

console.log("=".repeat(72));
console.log("objecs parallel-producer spike — Phase 2: worker barrier floor");
console.log("=".repeat(72));
console.log(`node                  ${process.version}`);
console.log(`platform              ${process.platform}/${process.arch}`);
console.log(`cpu                   ${cpus()[0]?.model ?? "unknown"}`);
console.log(`availableParallelism  ${availableParallelism()}`);
console.log(`worker counts         ${WORKER_COUNTS.join(", ")}`);
console.log("=".repeat(72));
console.log();

// A tiny shared snapshot is required to construct the pool (workers hold views
// over it). The floor benchmark never reads it.
const snapshot = new SharedSnapshot(16);

// Build every pool up front, outside the measured path.
const pools: WorkerPool[] = [];

for (const workerCount of WORKER_COUNTS) {
	pools.push(await WorkerPool.create(workerCount, snapshot.buffers));
}

console.log(
	`✓ ${pools.length} pools ready (workers spawned, handshake done)\n`,
);

summary(() => {
	for (let i = 0; i < pools.length; i++) {
		const pool = pools[i]!;

		bench(`barrier floor — ${pool.workerCount} worker(s)`, async () => {
			await pool.noop();
		});
	}
});

await run();

// Report a single-number summary of mean round trips too, since mitata's
// async timing includes event-loop scheduling that is easy to misread.
console.log("\nManual round-trip means (1000 iters each, after warmup):");

for (const pool of pools) {
	// Warmup.
	for (let i = 0; i < 200; i++) {
		await pool.noop();
	}

	const iters = 1000;
	const start = process.hrtime.bigint();

	for (let i = 0; i < iters; i++) {
		await pool.noop();
	}

	const end = process.hrtime.bigint();
	const nsPer = Number(end - start) / iters;

	console.log(
		`  ${String(pool.workerCount).padStart(2)} worker(s): ` +
			`${(nsPer / 1000).toFixed(2)} µs/round-trip`,
	);
}

console.log();

await Promise.all(pools.map((pool) => pool.terminate()));
