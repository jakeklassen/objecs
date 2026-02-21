import type { Archetype } from "objecs";
import type { Entity, AntSimulationConfig } from "../types.ts";

/**
 * Movement system - applies velocity to position and keeps ants in bounds.
 */
export function createMovementSystem(
	ants: Archetype<Entity, ["position", "velocity", "ant"]>,
	config: AntSimulationConfig,
) {
	return () => {
		for (const ant of ants.entities) {
			ant.position.x += ant.velocity.x;
			ant.position.y += ant.velocity.y;

			// Clamp to bounds
			if (ant.position.x < 0) {
				ant.position.x = 0;
				ant.velocity.x *= -1;
			} else if (ant.position.x >= config.width) {
				ant.position.x = config.width - 1;
				ant.velocity.x *= -1;
			}

			if (ant.position.y < 0) {
				ant.position.y = 0;
				ant.velocity.y *= -1;
			} else if (ant.position.y >= config.height) {
				ant.position.y = config.height - 1;
				ant.velocity.y *= -1;
			}
		}
	};
}
