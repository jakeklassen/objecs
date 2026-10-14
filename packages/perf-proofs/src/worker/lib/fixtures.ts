/**
 * Deterministic collision fixtures.
 *
 * No `Math.random()` anywhere — every scenario is reproducible from a seed so
 * parity assertions and benchmark numbers refer to identical worlds.
 *
 * Layer/mask values are the real shmup assignments:
 *
 *   Player           layer Player           mask Enemy|EnemyProjectile|Pickup
 *   PlayerProjectile layer PlayerProjectile mask Enemy
 *   Enemy            layer Enemy            mask PlayerProjectile|Player
 *   EnemyProjectile  layer EnemyProjectile  mask Player
 *   Pickup           layer Pickup           mask Player
 */
import { World } from "objecs";
import { CollisionMasks, type Entity } from "./entity.ts";

/**
 * mulberry32 — small, fast, well-distributed enough for fixture placement.
 */
export function createRng(seed: number): () => number {
	let a = seed >>> 0;

	return function next() {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

type Kind =
	| "player"
	| "playerProjectile"
	| "enemy"
	| "enemyProjectile"
	| "pickup";

const KIND_SPECS: Record<
	Kind,
	{
		layer: number;
		mask: number;
		width: number;
		height: number;
		tag: Partial<Entity>;
	}
> = {
	player: {
		layer: CollisionMasks.Player,
		mask:
			CollisionMasks.Enemy |
			CollisionMasks.EnemyProjectile |
			CollisionMasks.Pickup,
		width: 8,
		height: 8,
		tag: { tagPlayer: true },
	},
	playerProjectile: {
		layer: CollisionMasks.PlayerProjectile,
		mask: CollisionMasks.Enemy,
		width: 1,
		height: 3,
		tag: { tagBullet: true },
	},
	enemy: {
		layer: CollisionMasks.Enemy,
		mask: CollisionMasks.PlayerProjectile | CollisionMasks.Player,
		width: 8,
		height: 8,
		tag: { tagEnemy: true, enemyType: "greenAlien" },
	},
	enemyProjectile: {
		layer: CollisionMasks.EnemyProjectile,
		mask: CollisionMasks.Player,
		width: 2,
		height: 2,
		tag: { tagEnemyBullet: true },
	},
	pickup: {
		layer: CollisionMasks.Pickup,
		mask: CollisionMasks.Player,
		width: 5,
		height: 5,
		tag: { tagPickup: true },
	},
};

function makeEntity(kind: Kind, x: number, y: number): Entity {
	const spec = KIND_SPECS[kind];

	return {
		boxCollider: {
			offsetX: 0,
			offsetY: 0,
			width: spec.width,
			height: spec.height,
		},
		collisionLayer: spec.layer,
		collisionMask: spec.mask,
		transform: {
			position: { x, y },
			scale: { x: 1, y: 1 },
			rotation: 0,
		},
		...spec.tag,
	};
}

export type Scenario = "no-hit" | "sparse" | "dense";

/**
 * Build a `World` populated with `count` collidables for the given scenario.
 *
 * Returns the world plus the collidables archetype, matching how the shmup
 * collision system acquires its entities.
 */
export function createFixture(
	scenario: Scenario,
	count: number,
	seed = 0x9e37,
) {
	const world = new World<Entity>();
	const rng = createRng(seed);

	if (scenario === "no-hit") {
		// Alternating PlayerProjectile / Enemy so the directional layer/mask test
		// passes in BOTH directions for most pairs — this maximises the number of
		// AABB tests actually evaluated. Grid spacing guarantees zero overlaps, so
		// the greedy loop never breaks early and scans the full candidate space.
		const cell = 16;
		const cols = Math.ceil(Math.sqrt(count));

		for (let i = 0; i < count; i++) {
			const kind: Kind = i % 2 === 0 ? "playerProjectile" : "enemy";
			const x = (i % cols) * cell;
			const y = Math.floor(i / cols) * cell;

			world.createEntity(makeEntity(kind, x, y));
		}
	} else if (scenario === "sparse") {
		// Shmup-like composition on a playfield sized to produce a small, stable
		// number of overlaps.
		const width = 320;
		const height = 180;

		for (let i = 0; i < count; i++) {
			let kind: Kind;

			if (i === 0) {
				kind = "player";
			} else {
				const roll = rng();

				if (roll < 0.45) {
					kind = "playerProjectile";
				} else if (roll < 0.75) {
					kind = "enemy";
				} else if (roll < 0.95) {
					kind = "enemyProjectile";
				} else {
					kind = "pickup";
				}
			}

			world.createEntity(makeEntity(kind, rng() * width, rng() * height));
		}
	} else {
		// Dense: same composition, but a playfield small enough that colliders
		// pile up. Exercises the early-`break` advantage of the greedy serial loop.
		const width = 48;
		const height = 32;

		for (let i = 0; i < count; i++) {
			const roll = rng();
			const kind: Kind =
				roll < 0.5 ? "playerProjectile" : roll < 0.9 ? "enemy" : "player";

			world.createEntity(makeEntity(kind, rng() * width, rng() * height));
		}
	}

	const collidables = world.archetype(
		"boxCollider",
		"collisionLayer",
		"collisionMask",
		"transform",
	);

	return { world, collidables };
}
