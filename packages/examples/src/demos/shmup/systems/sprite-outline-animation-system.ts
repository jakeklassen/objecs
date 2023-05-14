import { World } from 'objecs';
import { Entity } from '../entity.ts';

export function spriteOutlineAnimationSystemFactory({
  world,
}: {
  world: World<Entity>;
}) {
  const entities = world.archetype('spriteOutline', 'spriteOutlineAnimation');

  return function spriteOutlineAnimationSystem(dt: number) {
    for (const entity of entities.entities) {
      const { spriteOutline, spriteOutlineAnimation } = entity;

      spriteOutlineAnimation.delta += dt;

      if (spriteOutlineAnimation.delta >= spriteOutlineAnimation.frameRate) {
        spriteOutlineAnimation.delta = 0;
        spriteOutlineAnimation.currentColorIndex =
          (spriteOutlineAnimation.currentColorIndex + 1) %
          spriteOutlineAnimation.colorSequence.length;
      }

      spriteOutlineAnimation.color =
        spriteOutlineAnimation.colors[
          spriteOutlineAnimation.colorSequence[
            spriteOutlineAnimation.currentColorIndex
          ]
        ];

      spriteOutline.color = spriteOutlineAnimation.color;
    }
  };
}
