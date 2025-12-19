import { easeLinear } from "#/lib/tween";
import { World } from "objecs";
import { getByPath, setByPath } from "dot-path-value";
import { Entity } from "../entity.ts";

export function tweenSystemFactory(world: World<Entity>) {
	const tweened = world.archetype("tweens");

	return function tweenSystem(dt: number) {
		for (const entity of tweened.entities) {
			const { tweens } = entity;

			for (let i = tweens.length - 1; i >= 0; i--) {
				const tween = tweens[i];

				if (tween == null) {
					continue;
				}

				tween.time += dt;
				tween.progress = tween.time / tween.duration;

				const property = getByPath(entity, tween.property);

				if (property == null) {
					throw new Error(`Property ${tween.property} not found on entity.`);
				}

				if (tween.progress >= 1) {
					tween.iterations++;
					tween.completed = true;
					setByPath(entity, tween.property, tween.to);

					if (
						tween.maxIterations !== Infinity &&
						tween.iterations >= tween.maxIterations &&
						tween.onComplete === "remove"
					) {
						tweens.splice(i, 1);

						continue;
					}

					if (tween.yoyo) {
						tween.progress = 0;
						tween.completed = false;
						tween.time = 0;
						[tween.from, tween.to] = [tween.to, tween.from];
						tween.change = tween.to - tween.from;
					}
				}

				if (!tween.completed) {
					const change = easeLinear(
						tween.time,
						tween.from,
						tween.change,
						tween.duration,
					);

					setByPath(entity, tween.property, change);
				}
			}
		}
	};
}
