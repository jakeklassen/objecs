import { SetRequired } from "type-fest";
import { sortEntitiesByPosition } from "../entity/sort-entities-by-position.ts";
import { Entity } from "../entity.ts";

export function determinePickableEnemies<
	T extends SetRequired<Entity, "transform">,
>(entities: Iterable<T>) {
	return sortEntitiesByPosition(
		[...entities].filter((entity) => entity.enemyState === "protect"),
	);
}
