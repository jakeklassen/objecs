import { World } from 'objecs';
import { Entity } from '../entity.ts';

export function playerEnemyCollisionEventCleanupSystemFactory({
  world,
}: {
  world: World<Entity>;
}) {
  const events = world.archetype('eventPlayerEnemyCollision');

  return function playerEnemyCollisionEventCleanupSystem() {
    for (const entity of events.entities) {
      world.deleteEntity(entity);
    }
  };
}
