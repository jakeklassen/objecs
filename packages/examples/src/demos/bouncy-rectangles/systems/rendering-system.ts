import { World } from 'objecs';
import { Entity } from '../entity.ts';

export function redneringSystemFactory(
  world: World<Entity>,
  context: CanvasRenderingContext2D,
) {
  const renderables = world.archetype('color', 'position', 'rectangle');
  const canvas = context.canvas;

  return function renderingSystem() {
    context.clearRect(0, 0, canvas.width, canvas.height);

    for (const entity of renderables.entities) {
      context.fillStyle = entity.color;
      context.fillRect(
        entity.position.x,
        entity.position.y,
        entity.rectangle.width,
        entity.rectangle.height,
      );
    }
  };
}
