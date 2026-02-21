import { Archetype } from "objecs";
import type { Entity } from "../types.ts";

type MovingEntity = Entity &
	Required<Pick<Entity, "position" | "velocity" | "acceleration" | "boid">>;

/**
 * Movement system that applies acceleration to velocity and velocity to position.
 */
export function createMovementSystem(
	entities: Archetype<
		MovingEntity,
		["position", "velocity", "acceleration", "boid"]
	>,
) {
	return () => {
		for (const entity of entities.entities) {
			const pos = entity.position;
			const vel = entity.velocity;
			const acc = entity.acceleration;
			const maxSpeed = entity.boid.maxSpeed;

			// Apply acceleration to velocity
			vel.x += acc.x;
			vel.y += acc.y;

			// Limit speed
			const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
			if (speed > maxSpeed) {
				vel.x = (vel.x / speed) * maxSpeed;
				vel.y = (vel.y / speed) * maxSpeed;
			}

			// Apply velocity to position
			pos.x += vel.x;
			pos.y += vel.y;
		}
	};
}
