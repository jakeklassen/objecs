import { AudioManager } from "#/lib/audio-manager.ts";
import { Easing } from "#/lib/tween.ts";
import { Path, PathValue } from "dot-path-value";
import { Config } from "./config.ts";
import { SetRequired } from "type-fest";

type AnimationDetails = {
	name: string;
	sourceX: number;
	sourceY: number;
	width: number;
	height: number;
	frameWidth: number;
	frameHeight: number;
};

export type Frame = {
	sourceX: number;
	sourceY: number;
	width: number;
	height: number;
};

type Sprite = {
	frame: Frame;
	layer: number;
	opacity: number;
	paletteSwaps: Array<[from: HexColor, to: HexColor]>;
};

type SpriteAnimation = {
	delta: number;
	durationMs: number;
	frameRate: number;
	currentFrame: number;
	finished: boolean;
	loop: boolean;
	frames: Frame[];
	frameSequence: number[];
	animationDetails: AnimationDetails;
};

type Vector2d = {
	x: number;
	y: number;
};

type Transform = {
	position: Vector2d;
	scale: Vector2d;
	rotation: number;
};

type BoxCollider = {
	offsetX: number;
	offsetY: number;
	width: number;
	height: number;
};

type TextBlinkAnimation = {
	color: HexColor;
	colors: HexColor[];
	colorSequence: number[];
	currentColorIndex: number;
	delta: number;
	durationMs: number;
	frameRate: number;
};

type SpriteOutlineAnimation = {
	color: HexColor;
	colors: HexColor[];
	colorSequence: number[];
	currentColorIndex: number;
	delta: number;
	durationMs: number;
	frameRate: number;
};

export type HexColor = `#${string}`;

type Particle = {
	age: number;
	maxAge: number;
	color: string;
	isBlue?: boolean;
	radius: number;
	shape: "circle";
	spark?: boolean;
};

type Shockwave = {
	radius: number;
	targetRadius: number;
	color: HexColor;
	speed: number;
};

export interface TweenOptions {
	/**
	 * The delay in milliseconds before the tween starts.
	 * Defaults to 0.
	 */
	delay?: number;

	/**
	 * Regardless of other combinations of options, if you set
	 * destroyAfter to a number, the tween will be destroyed after
	 * that many milliseconds.
	 */
	destroyAfter?: number;

	/**
	 * The duration of the tween in milliseconds.
	 */
	duration: number;
	easing: (typeof Easing)[keyof typeof Easing];
	from: number;
	to: number;

	/**
	 * If you start at position 10 and tween position.x to 4, with
	 * fullSwing set to true, the tween will go from 10 to 14 and then
	 * back to 6. It treats the original from position as the origin.
	 */
	fullSwing?: boolean;

	/**
	 * Defaults to Infinity and only applies to yoyo tweens.
	 */
	maxIterations?: number;

	/**
	 * Defaults to false.
	 */
	yoyo?: boolean;

	events?: Array<"start" | "end" | "yoyo">;

	onComplete?: "remove" | undefined;
}

export type Tween<E extends TweenableEntity, P extends Path<E>> = {
	/**
	 * descriminator
	 */
	property: P;

	completed: boolean;
	delay: number;
	duration: number;
	destroyAfter: number;
	progress: number;
	iterations: number;
	maxIterations: number;
	time: number;
	start: number;
	end: number;
	change: number;
	from: number;
	to: number;
	fullSwing: boolean;
	easing: (typeof Easing)[keyof typeof Easing];
	yoyo: boolean;
	events: Array<"start" | "end" | "yoyo">;
	onComplete?: string;
};

/**
 * A type to denote the tweenable properties specifically.
 * We want to avoid types that have circular references.
 */
export type TweenableEntity = Pick<Required<Entity>, "transform" | "sprite">;

export type TweenablePaths = {
	[P in Path<TweenableEntity>]: PathValue<TweenableEntity, P> extends number
		? P
		: never;
}[Path<TweenableEntity>];

type Tweens = {
	[P in TweenablePaths]: Tween<TweenableEntity, P>;
}[TweenablePaths];

export type Entity = {
	boundToViewport?: true;
	boxCollider?: BoxCollider;

	/**
	 * The collision layer of the entity.
	 */
	collisionLayer?: number;

	/**
	 * The layers that this entity collides with.
	 * @example ```ts
	 * CollisionMasks.Enemy | CollisionMasks.EnemyProjectile
	 * ```
	 */
	collisionMask?: number;

	destroyOnViewportExit?: true;

	/**
	 * This should be used with `velocity` to move the entity.
	 * @example ```ts
	 * entity.transform.position.x += entity.velocity.x * entity.direction.x * delta;
	 * entity.transform.position.y += entity.velocity.y * entity.direction.y * delta;
	 * ```
	 */
	direction?: Vector2d;

	/**
	 * After the enemy has spawned, this is the destination that it will fly to.
	 */
	enemyDestination?: Vector2d;

	enemyState?:
		| "spawned"
		| "flyin"
		| "protect"
		| "attack"
		| "bossReady"
		| "boss1"
		| "boss2"
		| "boss3"
		| "boss4";
	enemyType?: keyof Config["entities"]["enemies"];
	event?: {
		type: "TweenEnd";
		entity: Entity;
	};
	eventDestroyBoss?: true;
	eventGameOver?: true;
	eventNextWave?: true;
	eventPlayerEnemyCollision?: {
		player: Entity;
		enemy: Entity;
	};
	eventPlayerPickupCollision?: {
		player: Entity;
		pickup: Entity;
	};
	eventPlayerProjectileBossCollision?: {
		projectile: Entity;
		boss: Entity;
		damage: number;
	};
	eventPlayerProjectileDestroy?: {
		projectile: Entity;
		shockWavePosition: Vector2d;
	};
	eventPlayerProjectileEnemyCollision?: {
		projectile: Entity;
		enemy: Entity;
		damage: number;
	};
	eventPlaySound?: {
		track: Parameters<AudioManager["play"]>[0];
		options: Parameters<AudioManager["play"]>[1];
	};
	eventSpawnWave?: {
		waveNumber: number;
	};
	eventTriggerCameraShake?: {
		strength: number;
		durationMs: number;
	};
	eventTriggerBomb?: true;
	eventTriggerEnemyAttack?: true;
	eventTriggerEnemyFire?: true;
	flash?: {
		alpha: number;
		color: HexColor;
		durationMs: number;
		elapsedMs: number;
	};
	health?: number;
	invulnerable?: {
		durationMs: number;
		elapsedMs: number;
	};
	localTransform?: Transform;
	muzzleFlash?: {
		color: string;
		durationMs: number;
		elapsed: number;
		initialSize: number;
		size: number;
	};
	parent?: SetRequired<Entity, "transform">;
	particle?: Particle;
	shockwave?: Shockwave;
	sprite?: Sprite;
	spriteAnimation?: SpriteAnimation;
	spriteOutline?: {
		color: HexColor;
	};
	spriteOutlineAnimation?: SpriteOutlineAnimation;
	spritesheet?: string;
	star?: {
		color: string;
	};
	tagBigBullet?: true;
	tagBomb?: true;
	tagBoss?: true;
	tagBullet?: true;
	tagDisabled?: true;
	tagEnemy?: true;
	tagEnemyBullet?: true;
	tagHud?: true;
	tagLateralHunter?: true;
	tagPlayer?: true;
	tagPlayerThruster?: true;
	tagPickup?: true;
	tagTextCherries?: true;
	tagTextScore?: true;
	tagStartScreenGreenAlien?: true;
	tagText?: true;
	tagYellowShip?: true;
	ttl?: {
		durationMs: number;
		elapsedMs: number;
		onComplete: "entity:destroy";
		trigger?: `nextWave:${number}`;
	};
	text?: {
		align?: "center" | "left";
		color: string;
		font: string;
		message: string;
	};
	textBlinkAnimation?: TextBlinkAnimation;
	trackPlayer?: {
		offset: Vector2d;
	};
	transform?: Transform;
	tweens?: Tweens[];
	velocity?: Vector2d;
};
