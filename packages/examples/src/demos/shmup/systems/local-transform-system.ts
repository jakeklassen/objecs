import { World } from "objecs";
import { Entity } from "../entity.js";

/**
 * Move entities relative to their parent.
 */
export function localTransformSystemFactory({
	world,
}: {
	world: World<Entity>;
}) {
	const children = world.archetype("localTransform", "parent", "transform");

	return function localTransformSystem() {
		for (const entity of children.entities) {
			entity.transform.position.x =
				entity.localTransform.position.x + entity.parent.transform.position.x;

			entity.transform.position.y =
				entity.localTransform.position.y + entity.parent.transform.position.y;
		}
	};
}
