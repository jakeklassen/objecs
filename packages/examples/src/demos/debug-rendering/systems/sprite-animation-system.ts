import { World } from "objecs";
import { Entity } from "../entity.ts";

export function spriteAnimationSystemFactory(world: World<Entity>) {
	const spriteAnimatables = world.archetype("spriteAnimation", "sprite");

	return function spriteAnimationSystem(dt: number) {
		for (const { spriteAnimation, sprite } of spriteAnimatables.entities) {
			if (spriteAnimation.finished && !spriteAnimation.loop) {
				// You could do something like spawn a SpriteAnimationFinishedEvent here.
				// Then handle it in another system.
			}

			spriteAnimation.delta += dt;

			if (spriteAnimation.delta >= spriteAnimation.frameRate) {
				spriteAnimation.delta = 0;

				spriteAnimation.currentFrame =
					(spriteAnimation.currentFrame + 1) %
					spriteAnimation.frameSequence.length;

				const frameIndex =
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					spriteAnimation.frameSequence[spriteAnimation.currentFrame]!;

				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				const frame = spriteAnimation.frames[frameIndex]!;

				sprite.frame = frame;

				if (
					spriteAnimation.currentFrame ===
					spriteAnimation.frameSequence.length - 1
				) {
					spriteAnimation.finished = true;
				}
			}
		}
	};
}
