import type { Archetype, World } from "objecs";
import type { Entity, AntSimulationConfig } from "../types.ts";

/**
 * Food pickup system - ants pick up food when close enough.
 */
export function createFoodPickupSystem(
	ants: Archetype<Entity, ["position", "velocity", "ant"]>,
	food: Archetype<Entity, ["position", "food"]>,
	world: World<Entity>,
	config: AntSimulationConfig,
) {
	const pickupRadiusSq = config.foodPickupRadius * config.foodPickupRadius;

	return () => {
		const foodToRemove: Entity[] = [];

		for (const ant of ants.entities) {
			if (ant.ant.hasFood) continue;

			for (const f of food.entities) {
				const dx = f.position.x - ant.position.x;
				const dy = f.position.y - ant.position.y;
				const distSq = dx * dx + dy * dy;

				if (distSq < pickupRadiusSq) {
					// Pick up food
					ant.ant.hasFood = true;
					// Turn around
					ant.velocity.x *= -1;
					ant.velocity.y *= -1;
					// Mark food for removal
					foodToRemove.push(f);
					break;
				}
			}
		}

		for (const f of foodToRemove) {
			world.deleteEntity(f);
		}
	};
}

/**
 * Nest delivery system - ants deliver food to nest.
 * Returns the current food count.
 */
export function createNestDeliverySystem(
	ants: Archetype<Entity, ["position", "velocity", "ant"]>,
	nestEntity: Archetype<Entity, ["position", "nest"]>,
	config: AntSimulationConfig,
) {
	return (): number => {
		let totalFood = 0;

		for (const nest of nestEntity.entities) {
			const nestRadiusSq = nest.nest.radius * nest.nest.radius;

			for (const ant of ants.entities) {
				if (!ant.ant.hasFood) continue;

				const dx = nest.position.x - ant.position.x;
				const dy = nest.position.y - ant.position.y;
				const distSq = dx * dx + dy * dy;

				if (distSq < nestRadiusSq) {
					// Deliver food
					ant.ant.hasFood = false;
					nest.nest.foodCollected++;
					// Turn around
					ant.velocity.x *= -1;
					ant.velocity.y *= -1;
				}
			}

			totalFood += nest.nest.foodCollected;
		}

		return totalFood;
	};
}
