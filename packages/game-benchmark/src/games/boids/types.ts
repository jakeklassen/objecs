/**
 * Entity type for the boids simulation.
 */
export type Entity = {
	// Core components
	position?: { x: number; y: number };
	velocity?: { x: number; y: number };
	acceleration?: { x: number; y: number };

	// Boid-specific
	boid?: {
		maxSpeed: number;
		maxForce: number;
		perceptionRadius: number;
	};

	// Rendering
	sprite?: {
		color: string;
		size: number;
	};
};

/**
 * Boids simulation configuration.
 */
export interface BoidsConfig {
	// World bounds
	width: number;
	height: number;

	// Boid count
	count: number;

	// Flocking behavior weights
	separationWeight: number;
	alignmentWeight: number;
	cohesionWeight: number;

	// Boid properties
	maxSpeed: number;
	maxForce: number;
	perceptionRadius: number;

	// Visual
	boidSize: number;
	boidColor: string;

	// Explosion settings
	explosionInterval: number; // seconds between explosions
	explosionRadius: number; // radius of effect
	explosionForce: number; // max force applied
}

export const DEFAULT_CONFIG: BoidsConfig = {
	width: 800,
	height: 600,
	count: 500,
	separationWeight: 1.5,
	alignmentWeight: 1.0,
	cohesionWeight: 1.0,
	maxSpeed: 4,
	maxForce: 0.1,
	perceptionRadius: 50,
	boidSize: 4,
	boidColor: "#00ff00",
	explosionInterval: 3,
	explosionRadius: 150,
	explosionForce: 8,
};
