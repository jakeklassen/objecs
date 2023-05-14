import { World } from 'objecs';
import { transformFactory } from '../components/transform.ts';
import { Pico8Colors } from '../constants.ts';
import { Entity } from '../entity.ts';

export function destroyPlayerBulletFactory({
  bullet,
  shockwave,
  world,
}: {
  bullet: Entity;
  shockwave?: {
    location: NonNullable<Entity['transform']>['position'];
  };
  world: World<Entity>;
}) {
  world.deleteEntity(bullet);

  world.createEntity({
    eventPlaySound: {
      track: 'player-projectile-hit',
      options: {
        loop: false,
      },
    },
  });

  if (shockwave == null) {
    return;
  }

  world.createEntity({
    shockwave: {
      radius: 3,
      targetRadius: 6,
      color: Pico8Colors.Color9,
      speed: 30,
    },
    transform: transformFactory({
      position: {
        x: shockwave.location.x,
        y: shockwave.location.y,
      },
    }),
  });
}
