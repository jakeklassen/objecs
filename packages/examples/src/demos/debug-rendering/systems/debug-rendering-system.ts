import { World } from "objecs";
import { Entity } from "../entity.ts";

export function debugRenderingSystemFactory(
	world: World<Entity>,
	context: CanvasRenderingContext2D,
	config: Readonly<{ debug: boolean }>,
) {
	const debuggables = world.archetype("boxCollider", "transform");

	return function debugRenderingSystem(_dt: number) {
		if (!config.debug) {
			return;
		}

		for (const entity of debuggables.entities) {
			context.translate(
				entity.transform.position.x,
				entity.transform.position.y,
			);
			context.rotate(entity.transform.rotation);
			context.scale(entity.transform.scale.x, entity.transform.scale.y);

			context.globalAlpha = 0.3;

			context.fillStyle = "red";
			context.fillRect(
				entity.transform.scale.x > 0
					? entity.boxCollider.offsetX
					: -entity.boxCollider.offsetX - entity.boxCollider.width,
				entity.transform.scale.y > 0
					? entity.boxCollider.offsetY
					: -entity.boxCollider.offsetY - entity.boxCollider.height,
				entity.boxCollider.width,
				entity.boxCollider.height,
			);

			context.globalAlpha = 1;
			context.resetTransform();
		}
	};
}
