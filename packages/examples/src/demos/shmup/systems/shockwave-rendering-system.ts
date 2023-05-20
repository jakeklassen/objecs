import { circ } from "#/lib/canvas.ts";
import { World } from "objecs";
import { Entity } from "../entity.ts";

export function shockwaveRenderingSystemFactory({
	context,
	world,
}: {
	context: CanvasRenderingContext2D;
	world: World<Entity>;
}) {
	const shockwaves = world.archetype("shockwave", "transform");

	return function shockwaveRenderingSystem() {
		for (const entity of shockwaves.entities) {
			const { shockwave, transform } = entity;

			context.fillStyle = shockwave.color;

			circ(
				context,
				transform.position.x | 0,
				transform.position.y | 0,
				shockwave.radius,
				shockwave.color,
			);
		}
	};
}
