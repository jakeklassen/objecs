import type { Archetype } from "objecs";
import type { Entity, AntSimulationConfig } from "../types.ts";
import type { PheromoneMap } from "../pheromone-map.ts";

/**
 * Pheromone deposit system - ants leave pheromone trails.
 * - Ants carrying food leave "food" trail (leads others to food)
 * - Ants searching leave "home" trail (leads back to nest)
 */
export function createPheromoneDepositSystem(
	ants: Archetype<Entity, ["position", "velocity", "ant"]>,
	pheromoneMap: PheromoneMap,
	config: AntSimulationConfig,
) {
	return () => {
		for (const ant of ants.entities) {
			const type = ant.ant.hasFood ? "food" : "home";
			pheromoneMap.deposit(
				ant.position.x,
				ant.position.y,
				type,
				config.pheromoneDepositRate,
			);
		}
	};
}

/**
 * Pheromone decay system - all pheromones decay over time.
 */
export function createPheromoneDecaySystem(
	pheromoneMap: PheromoneMap,
	config: AntSimulationConfig,
) {
	return () => {
		pheromoneMap.decay(config.pheromoneDecayRate);
	};
}
