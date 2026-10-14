/**
 * SharedArrayBuffer-backed collision snapshot.
 *
 * Same SoA layout as the serial `CollisionSnapshot`, but every column lives in
 * a `SharedArrayBuffer` so workers read it directly. Holds both:
 *   - typed views, for packing on the main thread;
 *   - the raw SABs, to hand to workers via `workerData`.
 *
 * Fixed capacity — no growable SAB, per the spike brief (keeps the experiment
 * compatible with a wider runtime range). Grow by constructing a new one
 * outside the measured path.
 */
import type { SharedSnapshotBuffers } from "./worker-pool.ts";
import type { Collidable } from "./kernels.ts";

/** Next power of two >= n (min 1). */
export function nextPow2(n: number): number {
	if (n <= 1) {
		return 1;
	}

	let capacity = 1;

	while (capacity < n) {
		capacity *= 2;
	}

	return capacity;
}

export class SharedSnapshot {
	readonly capacity: number;
	count = 0;

	readonly buffers: SharedSnapshotBuffers;

	readonly left: Float64Array;
	readonly right: Float64Array;
	readonly top: Float64Array;
	readonly bottom: Float64Array;
	readonly layer: Uint32Array;
	readonly mask: Uint32Array;

	constructor(capacity: number) {
		this.capacity = capacity;

		const f64Bytes = capacity * Float64Array.BYTES_PER_ELEMENT;
		const u32Bytes = capacity * Uint32Array.BYTES_PER_ELEMENT;

		this.buffers = {
			left: new SharedArrayBuffer(f64Bytes),
			right: new SharedArrayBuffer(f64Bytes),
			top: new SharedArrayBuffer(f64Bytes),
			bottom: new SharedArrayBuffer(f64Bytes),
			layer: new SharedArrayBuffer(u32Bytes),
			mask: new SharedArrayBuffer(u32Bytes),
		};

		this.left = new Float64Array(this.buffers.left);
		this.right = new Float64Array(this.buffers.right);
		this.top = new Float64Array(this.buffers.top);
		this.bottom = new Float64Array(this.buffers.bottom);
		this.layer = new Uint32Array(this.buffers.layer);
		this.mask = new Uint32Array(this.buffers.mask);
	}

	/**
	 * O(n) pack of collider bounds into shared memory. Identical arithmetic to
	 * the serial `packSnapshot`, so results are bit-for-bit comparable.
	 */
	pack(raw: ReadonlyArray<Collidable>): void {
		const count = raw.length;

		const { left, right, top, bottom, layer, mask } = this;

		for (let i = 0; i < count; i++) {
			const entity = raw[i]!;
			const collider = entity.boxCollider;
			const position = entity.transform.position;

			const x = position.x + collider.offsetX;
			const y = position.y + collider.offsetY;

			left[i] = x;
			right[i] = x + collider.width;
			top[i] = y;
			bottom[i] = y + collider.height;

			layer[i] = entity.collisionLayer >>> 0;
			mask[i] = entity.collisionMask >>> 0;
		}

		this.count = count;
	}
}
