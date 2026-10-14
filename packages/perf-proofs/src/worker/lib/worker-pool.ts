/**
 * Small dedicated worker pool for the collision spike. Not a production
 * abstraction — just enough to measure honestly.
 *
 * Requirements (from the spike brief):
 *   - workers created once, before any benchmark timing;
 *   - all workers report ready before measurement starts;
 *   - monotonically increasing generation per job;
 *   - reject on worker error/exit;
 *   - clean terminate() afterwards;
 *   - no worker construction hidden in the measured path.
 */
import { Worker } from "node:worker_threads";
import { Control, controlSize } from "./control.mjs";

const WORKER_URL = new URL("./collision-worker.mjs", import.meta.url);

/** Shared snapshot as raw SABs, the shape passed to workers via workerData. */
export type SharedSnapshotBuffers = {
	left: SharedArrayBuffer;
	right: SharedArrayBuffer;
	top: SharedArrayBuffer;
	bottom: SharedArrayBuffer;
	layer: SharedArrayBuffer;
	mask: SharedArrayBuffer;
};

export type CollisionResult = {
	workerIndex: number;
	pairCount: number;
	/** [i0, j0, i1, j1, ...], indices into the packed snapshot. */
	pairs: Uint32Array;
};

type Pending = {
	remaining: number;
	results: (CollisionResult | undefined)[];
	resolve: (results: CollisionResult[]) => void;
	reject: (error: Error) => void;
};

export type Partition = { start: number; end: number };

/**
 * Split `count` outer indices into `workerCount` contiguous ascending ranges.
 * Contiguous + ascending is load-bearing: concatenating worker outputs by
 * worker index then reproduces global (i asc, j asc) candidate order without a
 * sort. See the deterministic-reduction requirement in the spike brief.
 */
export function partitionRange(
	count: number,
	workerCount: number,
): Partition[] {
	const partitions: Partition[] = [];
	const base = Math.floor(count / workerCount);
	const remainder = count % workerCount;

	let start = 0;

	for (let w = 0; w < workerCount; w++) {
		// Hand the first `remainder` workers one extra index so ranges differ by
		// at most one and cover [0, count) exactly.
		const size = base + (w < remainder ? 1 : 0);
		const end = start + size;

		partitions.push({ start, end });
		start = end;
	}

	return partitions;
}

export class WorkerPool {
	readonly workerCount: number;
	readonly control: Int32Array;

	#workers: Worker[] = [];
	#generation = 0;
	#pending = new Map<number, Pending>();
	#terminated = false;

	private constructor(workerCount: number, controlSab: SharedArrayBuffer) {
		this.workerCount = workerCount;
		this.control = new Int32Array(controlSab);
	}

	/**
	 * Spawn `workerCount` workers and resolve once every one has reported ready.
	 * Do this before benchmarking; worker startup must not land in the hot path.
	 */
	static async create(
		workerCount: number,
		snapshot: SharedSnapshotBuffers,
	): Promise<WorkerPool> {
		const controlSab = new SharedArrayBuffer(
			controlSize(workerCount) * Int32Array.BYTES_PER_ELEMENT,
		);

		const pool = new WorkerPool(workerCount, controlSab);

		const ready: Promise<void>[] = [];

		for (let w = 0; w < workerCount; w++) {
			const worker = new Worker(WORKER_URL, {
				workerData: {
					workerIndex: w,
					control: controlSab,
					snapshot,
				},
			});

			pool.#workers.push(worker);

			ready.push(
				new Promise<void>((resolve, reject) => {
					worker.once("message", (message: { type: string }) => {
						if (message.type === "ready") {
							resolve();
						} else {
							reject(
								new Error(
									`worker ${w} first message was ${message.type}, expected ready`,
								),
							);
						}
					});

					worker.once("error", reject);
					worker.once("exit", (code) => {
						if (code !== 0) {
							reject(new Error(`worker ${w} exited with code ${code}`));
						}
					});
				}),
			);
		}

		await Promise.all(ready);

		// Wire steady-state message/error handling after the ready handshake.
		for (let w = 0; w < workerCount; w++) {
			const worker = pool.#workers[w]!;

			worker.on("message", (message) => pool.#onMessage(message));
			worker.on("error", (error: Error) => pool.#onError(error));
		}

		return pool;
	}

	#onMessage(message: {
		type: string;
		generation: number;
		workerIndex: number;
		pairCount?: number;
		pairs?: Uint32Array;
	}): void {
		const pending = this.#pending.get(message.generation);

		if (pending === undefined) {
			return;
		}

		pending.results[message.workerIndex] = {
			workerIndex: message.workerIndex,
			pairCount: message.pairCount ?? 0,
			pairs: message.pairs ?? new Uint32Array(0),
		};

		pending.remaining--;

		if (pending.remaining === 0) {
			this.#pending.delete(message.generation);
			pending.resolve(pending.results as CollisionResult[]);
		}
	}

	#onError(error: Error): void {
		for (const pending of this.#pending.values()) {
			pending.reject(error);
		}

		this.#pending.clear();
	}

	#dispatch(
		build: (generation: number, workerIndex: number) => unknown,
	): Promise<CollisionResult[]> {
		if (this.#terminated) {
			return Promise.reject(new Error("pool terminated"));
		}

		const generation = ++this.#generation;

		return new Promise<CollisionResult[]>((resolve, reject) => {
			this.#pending.set(generation, {
				remaining: this.workerCount,
				results: new Array(this.workerCount).fill(undefined),
				resolve,
				reject,
			});

			for (let w = 0; w < this.workerCount; w++) {
				this.#workers[w]!.postMessage(build(generation, w));
			}
		});
	}

	/**
	 * Dispatch a zero-work job to every worker and resolve when all reply.
	 * This is the steady-state barrier floor.
	 */
	noop(): Promise<CollisionResult[]> {
		return this.#dispatch((generation) => ({ type: "noop", generation }));
	}

	/**
	 * Publish the current collider count and dispatch a collision job to each
	 * worker over its outer-index partition. The snapshot itself must already be
	 * packed into the shared buffers by the caller.
	 */
	collision(
		count: number,
		partitions: Partition[],
	): Promise<CollisionResult[]> {
		// Publish count with release semantics before waking workers.
		Atomics.store(this.control, Control.Count, count);
		Atomics.store(this.control, Control.Generation, this.#generation + 1);

		return this.#dispatch((generation, workerIndex) => {
			const { start, end } = partitions[workerIndex]!;

			return { type: "collision", generation, start, end };
		});
	}

	async terminate(): Promise<void> {
		this.#terminated = true;

		await Promise.all(this.#workers.map((worker) => worker.terminate()));

		this.#workers = [];
		this.#pending.clear();
	}
}
