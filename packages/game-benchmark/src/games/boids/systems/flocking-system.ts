import { Archetype } from "objecs";
import type { BoidsConfig, Entity } from "../types.ts";

type BoidEntity = Entity &
	Required<Pick<Entity, "position" | "velocity" | "acceleration" | "boid">>;

/**
 * Combined flocking system that applies separation, alignment, and cohesion.
 * Combined for efficiency - we only iterate neighbors once.
 */
export function createFlockingSystem(
	boids: Archetype<
		BoidEntity,
		["position", "velocity", "acceleration", "boid"]
	>,
	config: BoidsConfig,
) {
	return () => {
		const entities = boids.entities.raw;
		const count = entities.length;

		for (let i = 0; i < count; i++) {
			const boid = entities[i];
			const pos = boid.position;
			const vel = boid.velocity;
			const acc = boid.acceleration;
			const props = boid.boid;

			// Reset acceleration
			acc.x = 0;
			acc.y = 0;

			// Accumulators for flocking behaviors
			let separationX = 0;
			let separationY = 0;
			let separationCount = 0;

			let alignmentX = 0;
			let alignmentY = 0;
			let alignmentCount = 0;

			let cohesionX = 0;
			let cohesionY = 0;
			let cohesionCount = 0;

			const perceptionSq = props.perceptionRadius * props.perceptionRadius;

			// Check all other boids
			for (let j = 0; j < count; j++) {
				if (i === j) continue;

				const other = entities[j];
				const otherPos = other.position;

				const dx = otherPos.x - pos.x;
				const dy = otherPos.y - pos.y;
				const distSq = dx * dx + dy * dy;

				if (distSq > 0 && distSq < perceptionSq) {
					const dist = Math.sqrt(distSq);

					// Separation: steer away from nearby boids
					separationX -= dx / dist;
					separationY -= dy / dist;
					separationCount++;

					// Alignment: match velocity of nearby boids
					alignmentX += other.velocity.x;
					alignmentY += other.velocity.y;
					alignmentCount++;

					// Cohesion: steer toward center of nearby boids
					cohesionX += otherPos.x;
					cohesionY += otherPos.y;
					cohesionCount++;
				}
			}

			// Apply separation
			if (separationCount > 0) {
				separationX /= separationCount;
				separationY /= separationCount;

				// Normalize and scale
				const sepMag = Math.sqrt(
					separationX * separationX + separationY * separationY,
				);
				if (sepMag > 0) {
					separationX = (separationX / sepMag) * props.maxSpeed - vel.x;
					separationY = (separationY / sepMag) * props.maxSpeed - vel.y;

					// Limit force
					const sepForceMag = Math.sqrt(
						separationX * separationX + separationY * separationY,
					);
					if (sepForceMag > props.maxForce) {
						separationX = (separationX / sepForceMag) * props.maxForce;
						separationY = (separationY / sepForceMag) * props.maxForce;
					}

					acc.x += separationX * config.separationWeight;
					acc.y += separationY * config.separationWeight;
				}
			}

			// Apply alignment
			if (alignmentCount > 0) {
				alignmentX /= alignmentCount;
				alignmentY /= alignmentCount;

				// Normalize and scale
				const alignMag = Math.sqrt(
					alignmentX * alignmentX + alignmentY * alignmentY,
				);
				if (alignMag > 0) {
					alignmentX = (alignmentX / alignMag) * props.maxSpeed - vel.x;
					alignmentY = (alignmentY / alignMag) * props.maxSpeed - vel.y;

					// Limit force
					const alignForceMag = Math.sqrt(
						alignmentX * alignmentX + alignmentY * alignmentY,
					);
					if (alignForceMag > props.maxForce) {
						alignmentX = (alignmentX / alignForceMag) * props.maxForce;
						alignmentY = (alignmentY / alignForceMag) * props.maxForce;
					}

					acc.x += alignmentX * config.alignmentWeight;
					acc.y += alignmentY * config.alignmentWeight;
				}
			}

			// Apply cohesion
			if (cohesionCount > 0) {
				cohesionX /= cohesionCount;
				cohesionY /= cohesionCount;

				// Steer toward center
				cohesionX -= pos.x;
				cohesionY -= pos.y;

				// Normalize and scale
				const cohMag = Math.sqrt(cohesionX * cohesionX + cohesionY * cohesionY);
				if (cohMag > 0) {
					cohesionX = (cohesionX / cohMag) * props.maxSpeed - vel.x;
					cohesionY = (cohesionY / cohMag) * props.maxSpeed - vel.y;

					// Limit force
					const cohForceMag = Math.sqrt(
						cohesionX * cohesionX + cohesionY * cohesionY,
					);
					if (cohForceMag > props.maxForce) {
						cohesionX = (cohesionX / cohForceMag) * props.maxForce;
						cohesionY = (cohesionY / cohForceMag) * props.maxForce;
					}

					acc.x += cohesionX * config.cohesionWeight;
					acc.y += cohesionY * config.cohesionWeight;
				}
			}
		}
	};
}
