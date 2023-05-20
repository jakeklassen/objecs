import { World } from "objecs";
import { Entity } from "../entity.ts";

export function movementSystemFactory(world: World<Entity>) {
	const movables = world.archetype("direction", "transform", "velocity");

	return function movementSystem(dt: number) {
		for (const entity of movables.entities) {
			entity.transform.position.x +=
				entity.velocity.x * entity.direction.x * dt;

			entity.transform.position.y +=
				entity.velocity.y * entity.direction.y * dt;
		}
	};
}
