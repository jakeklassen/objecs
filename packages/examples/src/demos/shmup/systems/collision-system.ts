import { World } from "objecs";
import { Config } from "../config.ts";
import { EnemyType } from "../constants.ts";
import { Entity } from "../entity.ts";

/**
 * System that detects collisions between entities and raises events.
 */
export function collisionSystemFactory({
	config,
	world,
}: {
	config: Config;
	world: World<Entity>;
}) {
	const collidables = world.archetype(
		"boxCollider",
		"collisionLayer",
		"collisionMask",
		"transform",
	);

	const handledEntities = new Set<Entity>();

	return function collisionSystem() {
		handledEntities.clear();

		for (const entity of collidables.entities) {
			if (handledEntities.has(entity)) {
				continue;
			}

			const { boxCollider, transform } = entity;
			const collisionLayer = entity.collisionLayer;

			// Hoist the outer entity's bounds out of the inner loop. The previous
			// version recomputed these for every otherEntity.
			const left = transform.position.x + boxCollider.offsetX;
			const top = transform.position.y + boxCollider.offsetY;
			const right = left + boxCollider.width;
			const bottom = top + boxCollider.height;

			for (const otherEntity of collidables.entities) {
				if (entity === otherEntity) {
					continue;
				}

				if (handledEntities.has(otherEntity)) {
					continue;
				}

				// Make sure entityA's collision layer is a subset of entityB's
				// collision mask
				if ((collisionLayer & otherEntity.collisionMask) !== collisionLayer) {
					continue;
				}

				const otherBoxCollider = otherEntity.boxCollider;
				const otherTransform = otherEntity.transform;

				const otherLeft = otherTransform.position.x + otherBoxCollider.offsetX;
				const otherTop = otherTransform.position.y + otherBoxCollider.offsetY;

				// Inlined AABB intersection test. The previous version allocated
				// two temp AABB literals (four objects) on every pair check; this
				// reads the hoisted bounds directly. Same comparison as
				// `intersects()` in lib/collision/aabb.ts.
				if (
					!(
						left < otherLeft + otherBoxCollider.width &&
						right > otherLeft &&
						top < otherTop + otherBoxCollider.height &&
						bottom > otherTop
					)
				) {
					continue;
				}

				// Determine entity types

				const player = entity.tagPlayer
					? entity
					: otherEntity.tagPlayer
						? otherEntity
						: null;

				const pickup = entity.tagPickup
					? entity
					: otherEntity.tagPickup
						? otherEntity
						: null;

				const enemy =
					entity.tagEnemy || entity.tagBoss
						? entity
						: otherEntity.tagEnemy || otherEntity.tagBoss
							? otherEntity
							: null;

				const playerBullet =
					entity.tagBullet || entity.tagBigBullet || entity.tagBomb
						? entity
						: otherEntity.tagBullet ||
							  otherEntity.tagBigBullet ||
							  otherEntity.tagBomb
							? otherEntity
							: null;

				const enemyBullet = entity.tagEnemyBullet
					? entity
					: otherEntity.tagEnemyBullet
						? otherEntity
						: null;

				if (playerBullet != null && enemy != null) {
					let damage = config.entities.player.projectiles.bullet.damage;

					if (playerBullet.tagBigBullet) {
						damage = config.entities.player.projectiles.bigBullet.damage;
					} else if (playerBullet.tagBomb) {
						damage = config.entities.player.projectiles.bomb.damage;
					}

					// Boss will get it's own collision event
					if (enemy.enemyType === EnemyType.Boss) {
						world.createEntity({
							eventPlayerProjectileBossCollision: {
								projectile: playerBullet,
								boss: enemy,
								damage,
							},
						});
					} else {
						world.createEntity({
							eventPlayerProjectileEnemyCollision: {
								projectile: playerBullet,
								enemy,
								damage,
							},
						});
					}
				} else if (player != null) {
					if (pickup != null) {
						world.createEntity({
							eventPlayerPickupCollision: {
								player,
								pickup,
							},
						});
					} else if (player.invulnerable == null) {
						if (enemyBullet != null) {
							world.createEntity({
								eventPlayerEnemyCollision: {
									player,
									enemy: enemyBullet,
								},
							});
						} else if (enemy != null) {
							world.createEntity({
								eventPlayerEnemyCollision: {
									player,
									enemy,
								},
							});
						}
					}
				}

				handledEntities.add(entity);
				handledEntities.add(otherEntity);

				// We're done with this entity, so break out of the loop
				break;
			}
		}
	};
}
