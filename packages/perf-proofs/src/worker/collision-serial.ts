/**
 * collision-serial.ts — Phase 1 of the parallel-producer spike.
 *
 * Establishes the three serial controls the Worker variants must beat:
 *
 *   serial/current-object — faithful replica of the shmup collision kernel
 *   serial/precomputed    — same objects, obvious inner-loop overhead removed
 *   serial/packed         — SoA snapshot the Workers will consume (pack + scan)
 *
 * The critical question this file answers BEFORE any Worker is written:
 * is the opportunity actually parallelism, or is the demo simply leaving an
 * easy serial optimization on the table?
 *
 * Parity across all three kernels is asserted first; the process exits
 * non-zero without running benchmarks if any kernel disagrees.
 *
 *   node --expose-gc src/worker/collision-serial.ts
 */
import { availableParallelism, cpus } from "node:os";
import { bench, run, summary } from "mitata";
import { createFixture, type Scenario } from "./lib/fixtures.ts";
import {
	type Collidable,
	CollisionSnapshot,
	maxPairs,
	packSnapshot,
	selectCurrentObject,
	selectPacked,
	selectPrecomputed,
} from "./lib/kernels.ts";
import {
	assertParity,
	buildWorld,
	EDGE_CASES,
	runAllKernels,
} from "./lib/parity.ts";

const SCENARIOS: ReadonlyArray<Scenario> = ["no-hit", "sparse", "dense"];

const SIZES = (process.env.SIZES ?? "64,128,256,512,1024,2048,4096")
	.split(",")
	.map((s) => Number.parseInt(s.trim(), 10))
	.filter((n) => Number.isFinite(n) && n > 0);

// ---------------------------------------------------------------------------
// Environment metadata
// ---------------------------------------------------------------------------

console.log("=".repeat(72));
console.log("objecs parallel-producer spike — Phase 1: serial controls");
console.log("=".repeat(72));
console.log(`node                  ${process.version}`);
console.log(`platform              ${process.platform}/${process.arch}`);
console.log(`cpu                   ${cpus()[0]?.model ?? "unknown"}`);
console.log(`availableParallelism  ${availableParallelism()}`);
console.log(`sizes                 ${SIZES.join(", ")}`);
console.log("=".repeat(72));
console.log();

// ---------------------------------------------------------------------------
// Correctness first
// ---------------------------------------------------------------------------

let checks = 0;

try {
	for (const edgeCase of EDGE_CASES) {
		const { collidables } = buildWorld(edgeCase.specs);

		assertParity(
			`edge case: ${edgeCase.name}`,
			runAllKernels(collidables as never),
			edgeCase.expected,
		);

		checks++;
	}

	for (const scenario of SCENARIOS) {
		for (const size of SIZES) {
			const { collidables } = createFixture(scenario, size);

			assertParity(
				`fixture: ${scenario} n=${size}`,
				runAllKernels(collidables as never),
			);

			checks++;
		}
	}
} catch (error) {
	console.error((error as Error).message);
	console.error("Aborting: refusing to report timings for incorrect kernels.");
	process.exit(1);
}

console.log(`✓ kernel parity verified across ${checks} fixtures\n`);

// ---------------------------------------------------------------------------
// Workload characterisation
// ---------------------------------------------------------------------------

console.log("Selected pairs per scenario (accepted collisions):");
console.log("  scenario   n      accepted   %entities-consumed");

for (const scenario of SCENARIOS) {
	for (const size of SIZES) {
		const { collidables } = createFixture(scenario, size);
		const results = runAllKernels(collidables as never);
		const accepted = results.currentObject.length / 2;

		console.log(
			`  ${scenario.padEnd(10)} ${String(size).padEnd(6)} ` +
				`${String(accepted).padEnd(10)} ` +
				`${((accepted * 2 * 100) / size).toFixed(1)}%`,
		);
	}
}

console.log();

// ---------------------------------------------------------------------------
// Benchmarks
// ---------------------------------------------------------------------------

for (const scenario of SCENARIOS) {
	for (const size of SIZES) {
		const { collidables } = createFixture(scenario, size);

		const raw = collidables.entities.raw as ReadonlyArray<Collidable>;
		const entities = collidables.entities as never as Parameters<
			typeof selectCurrentObject
		>[0];

		// Everything below is allocated once, outside the measured path.
		const out = new Int32Array(Math.max(2, maxPairs(size) * 2));
		const handled = new Uint8Array(size);
		const handledSet = new Set<Collidable>();
		const snapshot = new CollisionSnapshot(size);

		// Pre-pack so the "scan only" bench does not depend on a prior bench in
		// this summary having populated the snapshot as a side effect.
		packSnapshot(raw, snapshot);

		summary(() => {
			bench(`serial/current-object — ${scenario} n=${size}`, () => {
				return selectCurrentObject(entities, handledSet, out);
			});

			bench(`serial/precomputed — ${scenario} n=${size}`, () => {
				return selectPrecomputed(raw, handled, out);
			});

			// Pack is included: production objecs must pay it every frame with
			// object component storage.
			bench(`serial/packed (pack+scan) — ${scenario} n=${size}`, () => {
				packSnapshot(raw, snapshot);
				return selectPacked(snapshot, handled, out);
			});

			// Scan only, to separate the packing cost from the layout benefit.
			bench(`serial/packed (scan only) — ${scenario} n=${size}`, () => {
				return selectPacked(snapshot, handled, out);
			});

			// Pack only — this is the per-frame tax any Worker design also pays.
			bench(`snapshot pack only — ${scenario} n=${size}`, () => {
				packSnapshot(raw, snapshot);
				return snapshot.count;
			});
		});
	}
}

await run();
