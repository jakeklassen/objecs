import { Archetype } from "objecs";
import type { BoidsConfig, Entity } from "../types.ts";

type BoidEntity = Entity &
	Required<Pick<Entity, "position" | "velocity" | "acceleration">>;

/**
 * Creates periodic explosions that act as persistent avoidance zones.
 * Boids continuously steer away from the explosion radius.
 */
export interface Explosion {
	x: number;
	y: number;
	radius: number;
}

export function createExplosionSystem(
	boids: Archetype<BoidEntity, ["position", "velocity", "acceleration"]>,
	config: BoidsConfig,
) {
	let lastExplosionTime = 0;
	let explosion: Explosion | null = null;

	const minRadius = 80;
	const maxRadius = 200;

	return (currentTime: number) => {
		const timeSinceLastExplosion = currentTime - lastExplosionTime;

		// Trigger new explosion every interval
		if (timeSinceLastExplosion >= config.explosionInterval * 1000) {
			lastExplosionTime = currentTime;
			explosion = {
				x: Math.random() * config.width,
				y: Math.random() * config.height,
				radius: minRadius + Math.random() * (maxRadius - minRadius),
			};
		}

		// Apply continuous avoidance force while explosion is active
		if (explosion) {
			const radiusSq = explosion.radius * explosion.radius;
			// Slightly larger detection radius so boids start avoiding before entering
			const avoidanceRadius = explosion.radius * 1.3;
			const avoidanceRadiusSq = avoidanceRadius * avoidanceRadius;

			for (const boid of boids.entities) {
				const dx = boid.position.x - explosion.x;
				const dy = boid.position.y - explosion.y;
				const distSq = dx * dx + dy * dy;

				if (distSq < avoidanceRadiusSq && distSq > 0) {
					const dist = Math.sqrt(distSq);

					// Stronger force when closer to center, very strong inside the radius
					let forceMagnitude: number;
					if (distSq < radiusSq) {
						// Inside the explosion - strong repulsion
						forceMagnitude =
							config.explosionForce * (1.5 - dist / explosion.radius);
					} else {
						// Approaching - gentler steering force
						forceMagnitude =
							config.explosionForce *
							0.5 *
							(1 -
								(dist - explosion.radius) /
									(avoidanceRadius - explosion.radius));
					}

					// Normalize direction and apply force to acceleration
					const forceX = (dx / dist) * forceMagnitude;
					const forceY = (dy / dist) * forceMagnitude;

					boid.acceleration.x += forceX;
					boid.acceleration.y += forceY;
				}
			}
		}

		return explosion;
	};
}
