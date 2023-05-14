import { World } from 'objecs';
import { Entity } from '../entity.ts';

export function redneringSystemFactory(
  world: World<Entity>,
  context: CanvasRenderingContext2D,
) {
  const renderables = world.archetype('color', 'rectangle', 'transform');

  return function renderingSystem() {
    context.clearRect(0, 0, 640, 480);

    for (const entity of renderables.entities) {
      context.fillStyle = entity.color;
      context.fillRect(
        entity.transform.position.x,
        entity.transform.position.y,
        entity.rectangle.width,
        entity.rectangle.height,
      );
    }
  };
}
