import { World } from "objecs";
import { Entity } from "../entity.ts";

export function playerSystemFactory(
	world: World<Entity>,
	viewport: { width: number; height: number },
) {
	const players = world.archetype(
		"boxCollider",
		"direction",
		"playerTag",
		"transform",
	);

	return function playerSystem(_dt: number) {
		for (const entity of players.entities) {
			if (
				entity.transform.position.x + entity.boxCollider.offsetX >
				viewport.width - entity.boxCollider.width
			) {
				entity.transform.position.x =
					viewport.width -
					entity.boxCollider.width -
					entity.boxCollider.offsetX;
				entity.transform.scale.x = -1;
				entity.direction.x = -1;
			} else if (entity.transform.position.x + entity.boxCollider.offsetX < 0) {
				entity.transform.position.x = -entity.boxCollider.offsetX;
				entity.transform.scale.x = 1;
				entity.direction.x = 1;
			}
		}
	};
}
