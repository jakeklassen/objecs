import { World } from "objecs";
import { CollisionMasks } from "../bitmasks.ts";
import { spriteAnimationFactory } from "../components/sprite-animation.ts";
import { spriteFactory } from "../components/sprite.ts";
import { config } from "../config.ts";
import { EnemyType } from "../constants.ts";
import { Entity } from "../entity.ts";
import { SpriteSheet } from "../spritesheet.ts";
import { animationDetailsFactory } from "../structures/animation-details.ts";

function enemyFactory<T extends Entity>({
	components,
	enemyName,
	world,
}: {
	components: T;
	enemyName: keyof typeof SpriteSheet.enemies;
	world: World<Entity>;
}) {
	const enemy = SpriteSheet.enemies[enemyName];

	return world.createEntity({
		boxCollider: enemy.boxCollider,
		collisionLayer: CollisionMasks.Enemy,
		collisionMask: CollisionMasks.PlayerProjectile | CollisionMasks.Player,
		enemyType: enemyName,
		health: config.entities.enemies[enemyName].startingHealth,
		// FIXME: Notice that we are not getting `sprite` errors when we're
		// missing because of the `typeof components`.
		sprite: spriteFactory({
			frame: {
				sourceX: enemy.frame.sourceX,
				sourceY: enemy.frame.sourceY,
				width: enemy.frame.width,
				height: enemy.frame.height,
			},
		}),
		spriteAnimation: spriteAnimationFactory(
			animationDetailsFactory(
				`${enemyName}-idle`,
				enemy.animations.idle.sourceX,
				enemy.animations.idle.sourceY,
				enemy.animations.idle.width,
				enemy.animations.idle.height,
				enemy.animations.idle.frameWidth,
				enemy.animations.idle.frameHeight,
			),
			400,
			true,
		),
		tagEnemy: true,
		...components,
	});
}

export function greenAlienFactory<T extends Entity>({
	components,
	world,
}: {
	components: T;
	world: World<Entity>;
}) {
	return enemyFactory({
		components,
		enemyName: EnemyType.GreenAlien,
		world,
	});
}

export function redFlameGuyFactory<T extends Entity>({
	components,
	world,
}: {
	components: T;
	world: World<Entity>;
}) {
	return enemyFactory({
		components,
		enemyName: EnemyType.RedFlameGuy,
		world,
	});
}

export function spinningShipFactory<T extends Entity>({
	components,
	world,
}: {
	components: T;
	world: World<Entity>;
}) {
	return enemyFactory({
		components,
		enemyName: EnemyType.SpinningShip,
		world,
	});
}

export function yellowShipFactory<T extends Entity>({
	components,
	world,
}: {
	components: T;
	world: World<Entity>;
}) {
	return enemyFactory({
		components,
		enemyName: EnemyType.YellowShip,
		world,
	});
}

export function bossFactory<T extends Entity>({
	components,
	world,
}: {
	components: T;
	world: World<Entity>;
}) {
	return enemyFactory({
		components,
		enemyName: EnemyType.Boss,
		world,
	});
}
