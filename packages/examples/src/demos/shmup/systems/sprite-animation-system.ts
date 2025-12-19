import { World } from "objecs";
import { Entity } from "../entity.ts";

export function spriteAnimationSystemFactory({
	world,
}: {
	world: World<Entity>;
}) {
	const spriteAnimatables = world.archetype("spriteAnimation", "sprite");

	return function spriteAnimationSystem(dt: number) {
		for (const entity of spriteAnimatables.entities) {
			const { spriteAnimation, sprite } = entity;

			if (spriteAnimation.finished && !spriteAnimation.loop) {
				world.removeEntityComponents(entity, "spriteAnimation");

				continue;
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
