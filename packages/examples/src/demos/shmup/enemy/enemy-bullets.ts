import { deg2rad } from '#/lib/math.ts';
import { World } from 'objecs';
import { SetRequired } from 'type-fest';
import { CollisionMasks } from '../bitmasks.ts';
import { spriteAnimationFactory } from '../components/sprite-animation.ts';
import { spriteFactory } from '../components/sprite.ts';
import { transformFactory } from '../components/transform.ts';
import { EnemyType, Pico8Colors } from '../constants.ts';
import { Entity } from '../entity.ts';
import { SpriteSheet } from '../spritesheet.ts';
import { animationDetailsFactory } from '../structures/animation-details.ts';

export function fire({
  angle,
  enemy,
  speed,
  triggerSound,
  world,
}: {
  angle: number;
  enemy: Entity;
  speed: number;
  triggerSound: boolean;
  world: World<Entity>;
}) {
  const transform = transformFactory({
    position: {
      x: enemy.transform?.position.x ?? 0 + 3,
      y: enemy.transform?.position.y ?? 0 + 6,
    },
  });

  if (enemy.enemyType === EnemyType.YellowShip) {
    transform.position.x = (enemy.transform?.position.x ?? 0) + 6;
    transform.position.y = (enemy.transform?.position.y ?? 0) + 13;
  } else if (enemy.enemyType === EnemyType.Boss) {
    transform.position.x = (enemy.transform?.position.x ?? 0) + 13;
    transform.position.y = (enemy.transform?.position.y ?? 0) + 22;
  }

  const boxCollider = {
    offsetX: SpriteSheet.enemyBullet.boxCollider.offsetX,
    offsetY: SpriteSheet.enemyBullet.boxCollider.offsetY,
    width: SpriteSheet.enemyBullet.boxCollider.width,
    height: SpriteSheet.enemyBullet.boxCollider.height,
  };

  const sprite = spriteFactory({
    frame: {
      sourceX: SpriteSheet.enemyBullet.frame.sourceX,
      sourceY: SpriteSheet.enemyBullet.frame.sourceY,
      width: SpriteSheet.enemyBullet.frame.width,
      height: SpriteSheet.enemyBullet.frame.height,
    },
  });

  const spriteAnimation = spriteAnimationFactory(
    animationDetailsFactory(
      'enemy-bullet',
      SpriteSheet.enemyBullet.animations.idle.sourceX,
      SpriteSheet.enemyBullet.animations.idle.sourceY,
      SpriteSheet.enemyBullet.animations.idle.width,
      SpriteSheet.enemyBullet.animations.idle.height,
      SpriteSheet.enemyBullet.animations.idle.frameWidth,
      SpriteSheet.enemyBullet.animations.idle.frameHeight,
    ),
    250,
    true,
    [0, 1, 2, 1],
  );

  const velocity = {
    x: Math.sin(deg2rad(angle)) * speed,
    y: Math.cos(deg2rad(angle)) * speed,
  };

  const direction = {
    x: Math.sign(velocity.x),
    y: Math.sign(velocity.y),
  };

  velocity.x = Math.abs(velocity.x);
  velocity.y = Math.abs(velocity.y);

  world.createEntity({
    boxCollider,
    collisionLayer: CollisionMasks.EnemyProjectile,
    collisionMask: CollisionMasks.Player,
    direction,
    destroyOnViewportExit: true,
    sprite,
    spriteAnimation,
    tagEnemyBullet: true,
    transform,
    velocity,
  });

  if (enemy.enemyType !== EnemyType.Boss) {
    world.addEntityComponents(enemy, 'flash', {
      alpha: 1,
      color: Pico8Colors.Color7,
      durationMs: 120,
      elapsedMs: 0,
    });
  }

  if (triggerSound) {
    world.createEntity({
      eventPlaySound: {
        track: enemy.tagBoss ? 'boss-projectile' : 'enemy-projectile',
        options: {
          loop: false,
        },
      },
    });
  }
}

export function fireSpread({
  base = Math.random(),
  count,
  enemy,
  speed,
  world,
}: {
  base?: number;
  count: number;
  enemy: Entity;
  speed: number;
  world: World<Entity>;
}) {
  for (let i = 0; i < count; i++) {
    const angle = (360 / count) * i + base * 360;

    fire({
      angle: angle + i,
      enemy,
      speed,
      triggerSound: false,
      world,
    });
  }

  world.createEntity({
    eventPlaySound: {
      track: 'enemy-projectile',
      options: {
        loop: false,
      },
    },
  });
}

export function aimedFire({
  enemy,
  target,
  world,
}: {
  enemy: SetRequired<Entity, 'transform'>;
  target: NonNullable<Entity['transform']>;
  world: World<Entity>;
}) {
  const angle = Math.atan2(
    target.position.x +
      4 -
      (enemy.transform.position.x + (enemy.sprite?.frame.width ?? 0) / 2),
    target.position.y +
      4 -
      (enemy.transform.position.y + (enemy.sprite?.frame.width ?? 0) / 2),
  );

  fire({
    angle: angle * (180 / Math.PI),
    enemy,
    speed: 60,
    triggerSound: true,
    world: world,
  });
}
