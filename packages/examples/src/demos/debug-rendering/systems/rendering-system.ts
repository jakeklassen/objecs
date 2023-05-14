import { World } from 'objecs';
import { Entity } from '../entity.ts';

export function renderingSystemFactory(
  world: World<Entity>,
  context: CanvasRenderingContext2D,
  spriteSheet: HTMLImageElement,
) {
  const renderables = world.archetype('boxCollider', 'sprite', 'transform');

  return function renderingSystem(_dt: number) {
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);

    for (const entity of renderables.entities) {
      const { frame, opacity } = entity.sprite;
      const { position, rotation, scale } = entity.transform;

      context.globalAlpha = opacity;

      context.translate(position.x, position.y);
      context.rotate(rotation);
      context.scale(scale.x, scale.y);

      context.drawImage(
        spriteSheet,
        frame.sourceX,
        frame.sourceY,
        frame.width,
        frame.height,
        scale.x > 0 ? 0 : -frame.width,
        scale.y > 0 ? 0 : -frame.height,
        frame.width,
        frame.height,
      );

      context.globalAlpha = 1;
      context.resetTransform();
    }
  };
}
