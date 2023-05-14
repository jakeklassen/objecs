import { World } from 'objecs';
import { Entity } from '../entity.ts';

export function playerProjectileEnemyCollisionEventCleanupSystemFactory({
  world,
}: {
  world: World<Entity>;
}) {
  const events = world.archetype('eventPlayerProjectileEnemyCollision');

  return function playerProjectileEnemyCollisionEventCleanupSystem() {
    for (const entity of events.entities) {
      world.deleteEntity(entity);
    }
  };
}
