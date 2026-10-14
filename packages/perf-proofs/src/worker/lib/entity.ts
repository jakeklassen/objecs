/**
 * Minimal entity shape for the parallel-producer collision spike.
 *
 * Mirrors the collision-relevant subset of the shmup demo's `Entity`
 * (packages/examples/src/demos/shmup/entity.ts) without dragging in `Config`,
 * `EnemyType`, tween paths, or the rest of the demo graph.
 *
 * Object *shape* is load-bearing here: the current collision kernel pays for
 * nested property access (`entity.transform.position.x`), so `Transform` keeps
 * its `scale`/`rotation` siblings even though collision never reads them.
 */

export type Vector2d = {
	x: number;
	y: number;
};

export type Transform = {
	position: Vector2d;
	scale: Vector2d;
	rotation: number;
};

export type BoxCollider = {
	offsetX: number;
	offsetY: number;
	width: number;
	height: number;
};

export type Entity = {
	boxCollider?: BoxCollider;
	collisionLayer?: number;
	collisionMask?: number;
	transform?: Transform;

	enemyType?: string;
	invulnerable?: {
		durationMs: number;
		elapsedMs: number;
	};

	tagBigBullet?: true;
	tagBomb?: true;
	tagBoss?: true;
	tagBullet?: true;
	tagEnemy?: true;
	tagEnemyBullet?: true;
	tagPickup?: true;
	tagPlayer?: true;
};

/**
 * Collision bits copied verbatim from
 * packages/examples/src/demos/shmup/bitmasks.ts
 */
export const CollisionMasks = {
	Player: 1 << 0,
	PlayerProjectile: 1 << 1,
	Enemy: 1 << 2,
	EnemyProjectile: 1 << 3,
	Pickup: 1 << 4,
};
