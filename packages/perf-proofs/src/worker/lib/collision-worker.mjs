/**
 * Persistent collision worker.
 *
 * Static config (worker index, control block, snapshot SABs) arrives once via
 * `workerData`. Per-job control arrives via `postMessage`. Bulk collider data
 * is read directly from the shared snapshot with ordinary TypedArray indexing —
 * no Atomics per field.
 *
 * Job types:
 *   "noop"      — respond immediately. Measures the pool's steady-state barrier
 *                 floor (dispatch + return with zero compute).
 *   "collision" — scan the assigned outer-index range [start, end) against all
 *                 colliders, emitting ordered candidate pairs. (Phase 3)
 */
import { parentPort, workerData } from "node:worker_threads";
import { Control } from "./control.mjs";

const { workerIndex, control: controlSab, snapshot } = workerData;

const control = new Int32Array(controlSab);

// Views over the shared snapshot. Present from startup; only the first `count`
// entries of each are meaningful for a given job.
const left = new Float64Array(snapshot.left);
const right = new Float64Array(snapshot.right);
const top = new Float64Array(snapshot.top);
const bottom = new Float64Array(snapshot.bottom);
const layer = new Uint32Array(snapshot.layer);
const mask = new Uint32Array(snapshot.mask);

// Reusable local output buffer. Grown (never shrunk) as needed; a right-sized
// copy is transferred back per job so the main thread owns detached memory.
let pairs = new Uint32Array(1024);

function ensureCapacity(pairCount) {
	// pairCount pairs need pairCount*2 slots.
	const needed = pairCount * 2;

	if (needed <= pairs.length) {
		return;
	}

	let capacity = pairs.length;

	while (capacity < needed) {
		capacity *= 2;
	}

	// Copy forward — candidates written so far must survive the grow, or the
	// reduction sees a truncated list and drops selections.
	const grown = new Uint32Array(capacity);
	grown.set(pairs);
	pairs = grown;
}

function runCollision(job) {
	const count = Atomics.load(control, Control.Count);
	const { start, end } = job;

	let pairCount = 0;

	for (let i = start; i < end; i++) {
		const layerI = layer[i];
		const leftI = left[i];
		const rightI = right[i];
		const topI = top[i];
		const bottomI = bottom[i];

		for (let j = 0; j < count; j++) {
			if (i === j) {
				continue;
			}

			if ((layerI & mask[j]) !== layerI) {
				continue;
			}

			if (
				leftI < right[j] &&
				rightI > left[j] &&
				topI < bottom[j] &&
				bottomI > top[j]
			) {
				ensureCapacity(pairCount + 1);
				pairs[pairCount * 2] = i;
				pairs[pairCount * 2 + 1] = j;
				pairCount++;
			}
		}
	}

	// Transfer a right-sized copy back; keep our growable buffer intact.
	const out = pairs.slice(0, pairCount * 2);

	parentPort.postMessage(
		{
			type: "collision",
			generation: job.generation,
			workerIndex,
			pairCount,
			pairs: out,
		},
		[out.buffer],
	);
}

parentPort.on("message", (job) => {
	switch (job.type) {
		case "noop": {
			parentPort.postMessage({
				type: "noop",
				generation: job.generation,
				workerIndex,
			});

			break;
		}

		case "collision": {
			runCollision(job);

			break;
		}

		default: {
			throw new Error(`unknown job type: ${job.type}`);
		}
	}
});

// Announce readiness. The pool waits for one of these from every worker before
// any benchmark measurement begins.
parentPort.postMessage({ type: "ready", workerIndex });
