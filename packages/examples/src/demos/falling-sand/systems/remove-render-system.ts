import { World } from 'objecs';
import { Entity } from '../entity.ts';

export function removeRenderSystemFactory(world: World<Entity>) {
  const rerenderable = world.archetype('render');

  /**
   * This system removes the `render` component from entities that have it.
   */
  return function removeRenderSystem() {
    for (const entity of rerenderable.entities) {
      world.removeEntityComponents(entity, 'render');
    }
  };
}
