import type { CanvasRenderingContext2D } from "canvas";
import { Archetype } from "objecs";
import type { BoidsConfig, Entity } from "../types.ts";

type RenderableEntity = Entity &
	Required<Pick<Entity, "position" | "velocity" | "sprite">>;

/**
 * Render system that draws boids as triangles pointing in their direction of travel.
 */
export function createRenderSystem(
	entities: Archetype<RenderableEntity, ["position", "velocity", "sprite"]>,
	ctx: CanvasRenderingContext2D,
	config: BoidsConfig,
) {
	return () => {
		// Clear canvas
		ctx.fillStyle = "#000000";
		ctx.fillRect(0, 0, config.width, config.height);

		for (const entity of entities.entities) {
			const pos = entity.position;
			const vel = entity.velocity;
			const sprite = entity.sprite;

			// Calculate rotation from velocity
			const angle = Math.atan2(vel.y, vel.x);

			ctx.save();
			ctx.translate(pos.x, pos.y);
			ctx.rotate(angle);

			// Draw triangle pointing in direction of travel
			ctx.fillStyle = sprite.color;
			ctx.beginPath();
			ctx.moveTo(sprite.size, 0);
			ctx.lineTo(-sprite.size, -sprite.size / 2);
			ctx.lineTo(-sprite.size, sprite.size / 2);
			ctx.closePath();
			ctx.fill();

			ctx.restore();
		}
	};
}
