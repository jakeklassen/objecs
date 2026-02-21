import { Archetype } from "objecs";
import type { BoidsConfig, Entity } from "../types.ts";

type PositionEntity = Entity & Required<Pick<Entity, "position">>;

/**
 * Bounds system that wraps entities around screen edges (toroidal wrapping).
 */
export function createBoundsSystem(
	entities: Archetype<PositionEntity, ["position"]>,
	config: BoidsConfig,
) {
	return () => {
		const { width, height } = config;

		for (const entity of entities.entities) {
			const pos = entity.position;

			if (pos.x < 0) {
				pos.x += width;
			} else if (pos.x >= width) {
				pos.x -= width;
			}

			if (pos.y < 0) {
				pos.y += height;
			} else if (pos.y >= height) {
				pos.y -= height;
			}
		}
	};
}
