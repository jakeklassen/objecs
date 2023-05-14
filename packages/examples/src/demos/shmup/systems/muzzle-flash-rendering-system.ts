import { fillCircle } from '#/lib/canvas.ts';
import { World } from 'objecs';
import { Pico8Colors } from '../constants.ts';
import { Entity } from '../entity.ts';

export function muzzleFlashRenderingSystemFactory({
  world,
  context,
}: {
  world: World<Entity>;
  context: CanvasRenderingContext2D;
}) {
  const muzzleFlashes = world.archetype('muzzleFlash', 'transform');

  return function muzzleFlashRenderingSystem() {
    for (const entity of muzzleFlashes.entities) {
      const { muzzleFlash, transform } = entity;

      context.translate(transform.position.x | 0, transform.position.y | 0);
      context.rotate(transform.rotation);
      context.scale(transform.scale.x, transform.scale.y);

      fillCircle(context, 0, 0, muzzleFlash.size, Pico8Colors.Color7);

      context.resetTransform();
    }
  };
}
