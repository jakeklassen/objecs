/**
 * Correctness harness.
 *
 * The benchmark aborts rather than printing performance results if any kernel
 * disagrees about which pairs get selected. Performance numbers for a kernel
 * that computes the wrong answer are worse than no numbers at all.
 */
import { World } from "objecs";
import { CollisionMasks, type Entity } from "./entity.ts";
import {
	type Collidable,
	CollisionSnapshot,
	maxPairs,
	packSnapshot,
	selectCurrentObject,
	selectPacked,
	selectPrecomputed,
} from "./kernels.ts";

export type Spec = {
	layer: number;
	mask: number;
	x: number;
	y: number;
	w?: number;
	h?: number;
};

export function buildWorld(specs: ReadonlyArray<Spec>) {
	const world = new World<Entity>();

	for (const spec of specs) {
		world.createEntity({
			boxCollider: {
				offsetX: 0,
				offsetY: 0,
				width: spec.w ?? 8,
				height: spec.h ?? 8,
			},
			collisionLayer: spec.layer,
			collisionMask: spec.mask,
			transform: {
				position: { x: spec.x, y: spec.y },
				scale: { x: 1, y: 1 },
				rotation: 0,
			},
		});
	}

	const collidables = world.archetype(
		"boxCollider",
		"collisionLayer",
		"collisionMask",
		"transform",
	);

	return { world, collidables };
}

const { Player, PlayerProjectile, Enemy, Pickup } = CollisionMasks;

const PROJECTILE = { layer: PlayerProjectile, mask: Enemy };
const ENEMY = { layer: Enemy, mask: PlayerProjectile | Player };
const PLAYER = { layer: Player, mask: Enemy | Pickup };

/**
 * Hand-built cases covering the ordering hazards called out in the spike.
 *
 * `expected` is derived BY HAND from the control flow in
 * collision-system.ts:26-181 — not captured from a kernel run. Cross-kernel
 * agreement alone would happily confirm three identically-wrong kernels; these
 * literals are what tie the kernels to the real shmup semantics.
 *
 * Recall the test is directional:
 *   skip unless (entity.collisionLayer & otherEntity.collisionMask) === entity.collisionLayer
 */
export const EDGE_CASES: ReadonlyArray<{
	name: string;
	specs: ReadonlyArray<Spec>;
	/** Flat [i0, j0, i1, j1, ...]; `undefined` = hand-derivation impractical. */
	expected?: ReadonlyArray<number>;
}> = [
	{ name: "zero entities", specs: [], expected: [] },
	{
		name: "one entity",
		specs: [{ ...PROJECTILE, x: 0, y: 0 }],
		expected: [],
	},
	{
		name: "two colliding",
		specs: [
			{ ...PROJECTILE, x: 0, y: 0 }, // [0,8] x [0,8]
			{ ...ENEMY, x: 4, y: 4 }, // [4,12] x [4,12]
		],
		// i=0,j=1: layer 2 & mask 3 === 2, boxes overlap -> select (0,1)
		expected: [0, 1],
	},
	{
		name: "two non-colliding",
		specs: [
			{ ...PROJECTILE, x: 0, y: 0 },
			{ ...ENEMY, x: 100, y: 100 },
		],
		expected: [],
	},
	{
		name: "layer/mask rejects both directions (boxes DO overlap)",
		specs: [
			// PlayerProjectile(2)/mask Enemy(4) vs Player(1)/mask Pickup(16)
			{ layer: PlayerProjectile, mask: Enemy, x: 0, y: 0 },
			{ layer: Player, mask: Pickup, x: 2, y: 2 },
		],
		// i=0,j=1: 2 & 16 = 0 !== 2 -> skip
		// i=1,j=0: 1 & 4  = 0 !== 1 -> skip
		expected: [],
	},
	{
		name: "directional: rejected as (0,1) but accepted as (1,0)",
		specs: [
			// Proves the pair is emitted in the correct order, and that the
			// predicate is genuinely asymmetric.
			{ layer: PlayerProjectile, mask: Enemy, x: 0, y: 0 },
			{ layer: Enemy, mask: 0, x: 2, y: 2 },
		],
		// i=0,j=1: 2 & 0 = 0 !== 2 -> skip, entity 0 finds no partner
		// i=1,j=0: 4 & 4 = 4 === 4, boxes overlap -> select (1,0)
		expected: [1, 0],
	},
	{
		name: "three entities competing for the same partner",
		specs: [
			{ ...PROJECTILE, x: 0, y: 0 },
			{ ...ENEMY, x: 2, y: 2 },
			{ ...PROJECTILE, x: 4, y: 4 },
		],
		// i=0 takes 1 and breaks; i=1 handled; i=2 finds 0 and 1 both handled.
		expected: [0, 1],
	},
	{
		name: "multiple disjoint collisions",
		specs: [
			{ ...PROJECTILE, x: 0, y: 0 },
			{ ...ENEMY, x: 2, y: 2 },
			{ ...PROJECTILE, x: 200, y: 200 },
			{ ...ENEMY, x: 202, y: 202 },
		],
		expected: [0, 1, 2, 3],
	},
	{
		// The case the spike calls out explicitly:
		//   entity 0 overlaps 1 and 2
		//   entity 1 overlaps 0 and 3
		name: "greedy contention: 0-{1,2}, 1-{0,3}",
		specs: [
			{ ...PROJECTILE, x: 0, y: 0 }, // [0,8]
			{ ...ENEMY, x: 1, y: 1 }, // [1,9]
			{ ...ENEMY, x: 2, y: 2 }, // [2,10]
			{ ...PROJECTILE, x: 3, y: 3 }, // [3,11]
		],
		// i=0 takes the FIRST valid partner (1), not (2). i=1 handled.
		// i=2 (Enemy) then finds j=3 (PlayerProjectile): 4 & 4 === 4 -> (2,3).
		expected: [0, 1, 2, 3],
	},
	{
		name: "all 16 overlapping and mutually compatible — pairs off in order",
		specs: Array.from({ length: 16 }, () => ({
			// Enemy layer & Enemy mask -> 4 & 4 === 4, so these DO accept.
			layer: Enemy,
			mask: Enemy,
			x: 0,
			y: 0,
		})),
		// Greedy consumes them two at a time in index order.
		expected: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
	},
	{
		name: "all 16 overlapping, layer/mask never matches — zero accepts",
		specs: Array.from({ length: 16 }, () => ({
			// Enemy layer(4) vs Player mask(1) -> 4 & 1 = 0 !== 4.
			layer: Enemy,
			mask: Player,
			x: 0,
			y: 0,
		})),
		expected: [],
	},
	{
		name: "dense overlap pile",
		specs: Array.from({ length: 24 }, (_, i) => ({
			...(i % 3 === 0 ? PROJECTILE : i % 3 === 1 ? ENEMY : PLAYER),
			x: i % 5,
			y: Math.floor(i / 5) % 5,
		})),
		// Hand-derivation impractical; cross-kernel agreement only.
	},
];

export type KernelResults = {
	currentObject: number[];
	precomputed: number[];
	packed: number[];
};

function toPairList(out: Int32Array, pairCount: number): number[] {
	return Array.from(out.subarray(0, pairCount * 2));
}

/**
 * Run all three kernels over the same collidables and return their selected
 * pairs as plain arrays for comparison.
 */
export function runAllKernels(collidables: {
	entities: { raw: ReadonlyArray<Collidable>; size: number };
}): KernelResults {
	const raw = collidables.entities.raw;
	const count = raw.length;

	const capacity = Math.max(1, count);
	const out = new Int32Array(Math.max(2, maxPairs(count) * 2));
	const handled = new Uint8Array(capacity);
	const snapshot = new CollisionSnapshot(capacity);

	const entities = collidables.entities as never as Parameters<
		typeof selectCurrentObject
	>[0];

	const aCount = selectCurrentObject(entities, new Set(), out);
	const a = toPairList(out, aCount);

	const bCount = selectPrecomputed(raw, handled, out);
	const b = toPairList(out, bCount);

	packSnapshot(raw, snapshot);
	const cCount = selectPacked(snapshot, handled, out);
	const c = toPairList(out, cCount);

	return { currentObject: a, precomputed: b, packed: c };
}

function fmtPairs(pairs: ReadonlyArray<number>): string {
	const out: string[] = [];

	for (let i = 0; i < pairs.length; i += 2) {
		out.push(`(${pairs[i]},${pairs[i + 1]})`);
	}

	return out.length === 0 ? "<none>" : out.join(" ");
}

/**
 * Assert all kernels agree, and — when ground truth is supplied — that they
 * agree with the hand-derived expectation rather than merely with each other.
 */
export function assertParity(
	label: string,
	results: KernelResults,
	expected?: ReadonlyArray<number>,
): void {
	const { currentObject, precomputed, packed } = results;

	const a = fmtPairs(currentObject);
	const b = fmtPairs(precomputed);
	const c = fmtPairs(packed);

	if (a !== b || a !== c) {
		throw new Error(
			`Kernel parity mismatch — ${label}\n` +
				`  serial/current-object: ${a}\n` +
				`  serial/precomputed:    ${b}\n` +
				`  serial/packed:         ${c}\n`,
		);
	}

	if (expected !== undefined) {
		const want = fmtPairs(expected);

		if (a !== want) {
			throw new Error(
				`Ground-truth mismatch — ${label}\n` +
					`  expected (hand-derived): ${want}\n` +
					`  actual   (all kernels):  ${a}\n`,
			);
		}
	}
}
