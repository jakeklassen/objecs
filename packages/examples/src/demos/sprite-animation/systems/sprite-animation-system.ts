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
					spriteAnimation.frameSequence[spriteAnimation.currentFrame];

				if (frameIndex == null) {
					console.warn(
						`Frame index is undefined for currentFrame ${spriteAnimation.currentFrame}`,
					);

					continue;
				}

				const frame = spriteAnimation.frames[frameIndex];

				if (frame == null) {
					console.warn(`Frame is undefined for frameIndex ${frameIndex}`);

					continue;
				}

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
