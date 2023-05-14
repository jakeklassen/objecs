import { rndInt } from '#/lib/math.ts';
import { World } from 'objecs';
import { Entity } from '../entity.ts';

export function eventSystemFactory({ world }: { world: World<Entity> }) {
  const events = world.archetype('event');

  return function eventSystem() {
    for (const entity of events.entities) {
      const { event } = entity;

      world.deleteEntity(entity);

      switch (event.type) {
        case 'TweenEnd': {
          const { entity } = event;

          if (
            entity.tagStartScreenGreenAlien === true &&
            entity.transform != null
          ) {
            entity.transform.position.x = 30 + rndInt(60);
          }

          break;
        }
      }
    }
  };
}
