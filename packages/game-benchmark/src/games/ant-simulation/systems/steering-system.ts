import type { Archetype } from "objecs";
import type { Entity, AntSimulationConfig } from "../types.ts";
import type { PheromoneMap } from "../pheromone-map.ts";

/**
 * Steering system - handles ant decision making:
 * 1. If carrying food: head toward nest, follow home pheromones
 * 2. If searching: look for food, follow food pheromones
 * 3. Add random wander for exploration
 * 4. Avoid walls
 */
export function createSteeringSystem(
	ants: Archetype<Entity, ["position", "velocity", "ant"]>,
	food: Archetype<Entity, ["position", "food"]>,
	nest: { x: number; y: number; radius: number },
	pheromoneMap: PheromoneMap,
	config: AntSimulationConfig,
) {
	const sensorRadius = config.pheromoneCellSize * 3;

	return () => {
		for (const ant of ants.entities) {
			const pos = ant.position;
			const vel = ant.velocity;
			const antData = ant.ant;

			// Current heading
			const heading = Math.atan2(vel.y, vel.x);

			// Desired direction starts as current heading
			let desiredX = vel.x;
			let desiredY = vel.y;

			if (antData.hasFood) {
				// Carrying food - head toward nest
				const toNestX = nest.x - pos.x;
				const toNestY = nest.y - pos.y;
				const distToNest = Math.sqrt(toNestX * toNestX + toNestY * toNestY);

				if (distToNest < antData.sightRange + nest.radius) {
					// Nest is visible - go directly to it
					desiredX = toNestX / distToNest;
					desiredY = toNestY / distToNest;
				} else {
					// Follow home pheromone trail
					const pheromoneDir = samplePheromones(
						pos.x,
						pos.y,
						heading,
						config.antFoV,
						antData.sightRange,
						"home",
						pheromoneMap,
						sensorRadius,
					);
					if (pheromoneDir) {
						desiredX = pheromoneDir.x;
						desiredY = pheromoneDir.y;
					}
				}
			} else {
				// Searching for food - check for nearby food first
				let foundFood = false;
				let closestFoodDist = antData.sightRange;
				let closestFoodX = 0;
				let closestFoodY = 0;

				for (const f of food.entities) {
					const dx = f.position.x - pos.x;
					const dy = f.position.y - pos.y;
					const dist = Math.sqrt(dx * dx + dy * dy);

					if (dist < closestFoodDist) {
						// Check if food is in front of ant (within FoV)
						const angleToFood = Math.atan2(dy, dx);
						let angleDiff = angleToFood - heading;
						// Normalize to [-PI, PI]
						while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
						while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

						if (Math.abs(angleDiff) < config.antFoV / 2) {
							closestFoodDist = dist;
							closestFoodX = dx / dist;
							closestFoodY = dy / dist;
							foundFood = true;
						}
					}
				}

				if (foundFood) {
					desiredX = closestFoodX;
					desiredY = closestFoodY;
				} else {
					// Follow food pheromone trail
					const pheromoneDir = samplePheromones(
						pos.x,
						pos.y,
						heading,
						config.antFoV,
						antData.sightRange,
						"food",
						pheromoneMap,
						sensorRadius,
					);
					if (pheromoneDir) {
						desiredX = pheromoneDir.x;
						desiredY = pheromoneDir.y;
					}
				}
			}

			// Add random wander
			const wanderAngle =
				(Math.random() - 0.5) * 2 * Math.PI * config.wanderStrength;
			const cos = Math.cos(wanderAngle);
			const sin = Math.sin(wanderAngle);
			const wanderedX = desiredX * cos - desiredY * sin;
			const wanderedY = desiredX * sin + desiredY * cos;
			desiredX = wanderedX;
			desiredY = wanderedY;

			// Wall avoidance - steer away from edges
			const wallMargin = 30;
			if (pos.x < wallMargin) desiredX += (wallMargin - pos.x) / wallMargin;
			if (pos.x > config.width - wallMargin)
				desiredX -= (pos.x - (config.width - wallMargin)) / wallMargin;
			if (pos.y < wallMargin) desiredY += (wallMargin - pos.y) / wallMargin;
			if (pos.y > config.height - wallMargin)
				desiredY -= (pos.y - (config.height - wallMargin)) / wallMargin;

			// Normalize desired direction
			const desiredMag = Math.sqrt(desiredX * desiredX + desiredY * desiredY);
			if (desiredMag > 0) {
				desiredX /= desiredMag;
				desiredY /= desiredMag;
			}

			// Steer toward desired direction
			const steerX = (desiredX - vel.x) * antData.steeringStrength;
			const steerY = (desiredY - vel.y) * antData.steeringStrength;

			vel.x += steerX;
			vel.y += steerY;

			// Normalize velocity to maintain speed
			const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
			if (speed > 0) {
				vel.x = (vel.x / speed) * antData.speed;
				vel.y = (vel.y / speed) * antData.speed;
			}
		}
	};
}

/**
 * Sample pheromones using 3 sensors (left, center, right).
 * Returns the direction with the strongest pheromone signal.
 */
function samplePheromones(
	x: number,
	y: number,
	heading: number,
	fov: number,
	sightRange: number,
	type: "home" | "food",
	pheromoneMap: PheromoneMap,
	sensorRadius: number,
): { x: number; y: number } | null {
	const sensorDist = sightRange * 0.6;
	const halfFov = fov / 2;

	// Three sensor directions: left, center, right
	const angles = [heading - halfFov, heading, heading + halfFov];
	const strengths: number[] = [];

	for (const angle of angles) {
		const sensorX = x + Math.cos(angle) * sensorDist;
		const sensorY = y + Math.sin(angle) * sensorDist;
		const strength = pheromoneMap.readArea(
			sensorX,
			sensorY,
			sensorRadius,
			type,
		);
		strengths.push(strength);
	}

	const [left, center, right] = strengths;
	const maxStrength = Math.max(left, center, right);

	// If no pheromones detected, return null (will use random wander)
	if (maxStrength < 0.001) {
		return null;
	}

	// Determine which direction to go
	let chosenAngle: number;
	if (center >= left && center >= right) {
		// Center is strongest or equal - go straight
		chosenAngle = heading;
	} else if (left > right) {
		// Left is strongest - turn left
		chosenAngle = heading - halfFov * 0.5;
	} else {
		// Right is strongest - turn right
		chosenAngle = heading + halfFov * 0.5;
	}

	return {
		x: Math.cos(chosenAngle),
		y: Math.sin(chosenAngle),
	};
}
