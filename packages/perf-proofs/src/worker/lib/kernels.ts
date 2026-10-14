/**
 * The three serial collision kernels.
 *
 * All three select the SAME pairs, in the SAME order, and write them into a
 * caller-supplied `Int32Array` as [i0, j0, i1, j1, ...] where the values are
 * indices into `collidables.entities.raw`. Parity between them is asserted
 * before any timing is reported.
 *
 *   A. selectCurrentObject — faithful replica of the shmup collision kernel
 *   B. selectPrecomputed   — same objects, obvious inner-loop overhead removed
 *   C. packSnapshot + selectPacked — SoA layout the workers will consume
 */
import type { ReadonlyEntityCollection } from "objecs";
import { intersects } from "./aabb.ts";
import type { Entity } from "./entity.ts";

export type Collidable = Entity &
	Required<
		Pick<
			Entity,
			"boxCollider" | "collisionLayer" | "collisionMask" | "transform"
		>
	>;

/**
 * Upper bound on selected pairs: each selection consumes two entities, so at
 * most floor(n / 2) pairs can ever be accepted.
 */
export function maxPairs(count: number): number {
	return Math.floor(count / 2);
}

// ---------------------------------------------------------------------------
// A. serial/current-object
// ---------------------------------------------------------------------------

/**
 * Faithful replica of collision-system.ts:26-181.
 *
 * Deliberately preserves every cost the demo pays today:
 *   - `for...of` over the EntityCollection (nested iterator allocation)
 *   - `Set<Entity>` membership tests
 *   - the outer entity's AABB rebuilt on EVERY inner iteration
 *   - two temp AABB literals (four objects) allocated per pair test
 *   - `intersects()` helper-call chain
 *
 * The only addition is the `i`/`j` index counters, needed to report selected
 * pairs as indices. Two integer increments; everything else is untouched.
 *
 * Event classification is intentionally omitted — it does not influence which
 * pairs get selected, and it is measured separately.
 */
export function selectCurrentObject(
	entities: ReadonlyEntityCollection<Collidable>,
	handledEntities: Set<Collidable>,
	out: Int32Array,
): number {
	handledEntities.clear();

	let pairCount = 0;
	let i = -1;

	for (const entity of entities) {
		i++;

		if (handledEntities.has(entity)) {
			continue;
		}

		let j = -1;

		for (const otherEntity of entities) {
			j++;

			if (entity === otherEntity) {
				continue;
			}

			if (handledEntities.has(otherEntity)) {
				continue;
			}

			if (
				(entity.collisionLayer & otherEntity.collisionMask) !==
				entity.collisionLayer
			) {
				continue;
			}

			const { boxCollider, transform } = entity;

			const { boxCollider: otherBoxCollider, transform: otherTransform } =
				otherEntity;

			const x = transform.position.x + boxCollider.offsetX;
			const y = transform.position.y + boxCollider.offsetY;
			const otherX = otherTransform.position.x + otherBoxCollider.offsetX;
			const otherY = otherTransform.position.y + otherBoxCollider.offsetY;

			const aabb = {
				position: { x, y },
				width: boxCollider.width,
				height: boxCollider.height,
			};

			const otherAabb = {
				position: { x: otherX, y: otherY },
				width: otherBoxCollider.width,
				height: otherBoxCollider.height,
			};

			if (!intersects(aabb, otherAabb)) {
				continue;
			}

			out[pairCount * 2] = i;
			out[pairCount * 2 + 1] = j;
			pairCount++;

			handledEntities.add(entity);
			handledEntities.add(otherEntity);

			break;
		}
	}

	return pairCount;
}

// ---------------------------------------------------------------------------
// B. serial/precomputed
// ---------------------------------------------------------------------------

/**
 * Same plain entity objects, same greedy semantics — but:
 *   - indexed iteration over `.raw` instead of nested iterators
 *   - `Uint8Array` handled-flags instead of `Set<Entity>`
 *   - the outer entity's bounds hoisted out of the inner loop
 *   - zero temp AABB allocations
 *   - the rectangle test inlined
 *
 * This is the drop-in fix a reviewer would suggest for the demo without any
 * architectural change. If this captures most of the available speedup, the
 * Worker experiment is answering a question nobody needed to ask.
 */
export function selectPrecomputed(
	raw: ReadonlyArray<Collidable>,
	handled: Uint8Array,
	out: Int32Array,
): number {
	const count = raw.length;

	handled.fill(0, 0, count);

	let pairCount = 0;

	for (let i = 0; i < count; i++) {
		if (handled[i] !== 0) {
			continue;
		}

		const entity = raw[i]!;
		const collider = entity.boxCollider;
		const position = entity.transform.position;

		const layer = entity.collisionLayer;

		// Hoisted: the current implementation recomputes these for every j.
		const left = position.x + collider.offsetX;
		const top = position.y + collider.offsetY;
		const right = left + collider.width;
		const bottom = top + collider.height;

		for (let j = 0; j < count; j++) {
			if (i === j) {
				continue;
			}

			if (handled[j] !== 0) {
				continue;
			}

			const other = raw[j]!;

			if ((layer & other.collisionMask) !== layer) {
				continue;
			}

			const otherCollider = other.boxCollider;
			const otherPosition = other.transform.position;

			const otherLeft = otherPosition.x + otherCollider.offsetX;
			const otherTop = otherPosition.y + otherCollider.offsetY;

			if (
				left < otherLeft + otherCollider.width &&
				right > otherLeft &&
				top < otherTop + otherCollider.height &&
				bottom > otherTop
			) {
				out[pairCount * 2] = i;
				out[pairCount * 2 + 1] = j;
				pairCount++;

				handled[i] = 1;
				handled[j] = 1;

				break;
			}
		}
	}

	return pairCount;
}

// ---------------------------------------------------------------------------
// C. serial/packed
// ---------------------------------------------------------------------------

/**
 * Reusable struct-of-arrays snapshot — the exact layout the Workers will read
 * from a SharedArrayBuffer. Allocated with a capacity and grown to the next
 * power of two, never reallocated inside the measured path.
 *
 * `Float64Array` (not Float32Array) so the spike does not silently change
 * normal JS number precision.
 */
export class CollisionSnapshot {
	capacity: number;
	count = 0;

	left: Float64Array;
	right: Float64Array;
	top: Float64Array;
	bottom: Float64Array;
	layer: Uint32Array;
	mask: Uint32Array;

	constructor(capacity: number, shared = false) {
		this.capacity = capacity;

		const f64 = () =>
			shared
				? new Float64Array(
						new SharedArrayBuffer(capacity * Float64Array.BYTES_PER_ELEMENT),
					)
				: new Float64Array(capacity);

		const u32 = () =>
			shared
				? new Uint32Array(
						new SharedArrayBuffer(capacity * Uint32Array.BYTES_PER_ELEMENT),
					)
				: new Uint32Array(capacity);

		this.left = f64();
		this.right = f64();
		this.top = f64();
		this.bottom = f64();
		this.layer = u32();
		this.mask = u32();
	}
}

/**
 * O(n) pack. Measured separately AND included in end-to-end, because
 * production objecs must pay this every frame with object component storage.
 */
export function packSnapshot(
	raw: ReadonlyArray<Collidable>,
	snapshot: CollisionSnapshot,
): void {
	const count = raw.length;

	const { left, right, top, bottom, layer, mask } = snapshot;

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

	snapshot.count = count;
}

/**
 * Greedy scan over the packed snapshot. Identical control flow to the
 * original nested loop, reading only TypedArrays.
 */
export function selectPacked(
	snapshot: CollisionSnapshot,
	handled: Uint8Array,
	out: Int32Array,
): number {
	const { count, left, right, top, bottom, layer, mask } = snapshot;

	handled.fill(0, 0, count);

	let pairCount = 0;

	for (let i = 0; i < count; i++) {
		if (handled[i] !== 0) {
			continue;
		}

		const layerI = layer[i]!;
		const leftI = left[i]!;
		const rightI = right[i]!;
		const topI = top[i]!;
		const bottomI = bottom[i]!;

		for (let j = 0; j < count; j++) {
			if (i === j) {
				continue;
			}

			if (handled[j] !== 0) {
				continue;
			}

			if ((layerI & mask[j]!) !== layerI) {
				continue;
			}

			if (
				leftI < right[j]! &&
				rightI > left[j]! &&
				topI < bottom[j]! &&
				bottomI > top[j]!
			) {
				out[pairCount * 2] = i;
				out[pairCount * 2 + 1] = j;
				pairCount++;

				handled[i] = 1;
				handled[j] = 1;

				break;
			}
		}
	}

	return pairCount;
}
