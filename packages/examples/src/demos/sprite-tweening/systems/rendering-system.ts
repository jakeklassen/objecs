import { World } from "objecs";
import { Entity } from "../entity.ts";

export function renderingSystemFactory(
	world: World<Entity>,
	context: CanvasRenderingContext2D,
	ship: HTMLImageElement,
) {
	const renderables = world.archetype("sprite", "transform");
	const canvas = context.canvas;

	return function renderingSystem(_dt: number) {
		context.clearRect(0, 0, canvas.width, canvas.height);

		for (const entity of renderables.entities) {
			const { sprite, transform } = entity;

			context.globalAlpha = sprite.opacity;
			context.translate(transform.position.x, transform.position.y);
			context.scale(transform.scale.x, transform.scale.y);
			context.rotate(transform.rotation);

			context.drawImage(
				ship,
				sprite.frame.sourceX,
				sprite.frame.sourceY,
				sprite.frame.width,
				sprite.frame.height,
				-sprite.frame.width / 2,
				-sprite.frame.height / 2,
				sprite.frame.width,
				sprite.frame.height,
			);

			context.globalAlpha = 1;
			context.resetTransform();
		}
	};
}
