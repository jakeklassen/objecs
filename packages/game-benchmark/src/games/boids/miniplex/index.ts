import Canvas from "canvas";
import sdl from "@kmamal/sdl";
import { World } from "miniplex";
import { Profiler } from "../../../profiler.ts";
import { type BoidsConfig, DEFAULT_CONFIG, type Entity } from "../types.ts";

// Miniplex requires all components to be required in the entity type
type MiniplexEntity = Required<Entity>;

export interface BoidsGameOptions {
	config?: Partial<BoidsConfig>;
	duration?: number;
	showWindow?: boolean;
}

export async function runBoidsGame(options: BoidsGameOptions = {}) {
	const config: BoidsConfig = { ...DEFAULT_CONFIG, ...options.config };
	const duration = options.duration ?? 10;
	const showWindow = options.showWindow ?? true;

	console.log(
		`[miniplex] Starting boids simulation with ${config.count} boids...`,
	);

	const window = showWindow
		? sdl.video.createWindow({
				title: "Boids Benchmark (miniplex)",
				width: config.width,
				height: config.height,
				accelerated: true,
				vsync: false,
		  })
		: null;

	const canvas = Canvas.createCanvas(config.width, config.height);
	const ctx = canvas.getContext("2d");

	const world = new World<MiniplexEntity>();

	// Create queries
	const boids = world.with("position", "velocity", "acceleration", "boid");
	const positions = world.with("position");
	const renderables = world.with("position", "velocity", "sprite");

	const profiler = new Profiler();

	// Flocking system
	const flockingSystem = profiler.profileSystem("flocking", () => {
		const entities = [...boids.entities];
		const count = entities.length;

		for (let i = 0; i < count; i++) {
			const boid = entities[i];
			const pos = boid.position;
			const vel = boid.velocity;
			const acc = boid.acceleration;
			const props = boid.boid;

			acc.x = 0;
			acc.y = 0;

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

			for (let j = 0; j < count; j++) {
				if (i === j) continue;

				const other = entities[j];
				const otherPos = other.position;

				const dx = otherPos.x - pos.x;
				const dy = otherPos.y - pos.y;
				const distSq = dx * dx + dy * dy;

				if (distSq > 0 && distSq < perceptionSq) {
					const dist = Math.sqrt(distSq);

					separationX -= dx / dist;
					separationY -= dy / dist;
					separationCount++;

					alignmentX += other.velocity.x;
					alignmentY += other.velocity.y;
					alignmentCount++;

					cohesionX += otherPos.x;
					cohesionY += otherPos.y;
					cohesionCount++;
				}
			}

			if (separationCount > 0) {
				separationX /= separationCount;
				separationY /= separationCount;

				const sepMag = Math.sqrt(
					separationX * separationX + separationY * separationY,
				);
				if (sepMag > 0) {
					separationX = (separationX / sepMag) * props.maxSpeed - vel.x;
					separationY = (separationY / sepMag) * props.maxSpeed - vel.y;

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

			if (alignmentCount > 0) {
				alignmentX /= alignmentCount;
				alignmentY /= alignmentCount;

				const alignMag = Math.sqrt(
					alignmentX * alignmentX + alignmentY * alignmentY,
				);
				if (alignMag > 0) {
					alignmentX = (alignmentX / alignMag) * props.maxSpeed - vel.x;
					alignmentY = (alignmentY / alignMag) * props.maxSpeed - vel.y;

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

			if (cohesionCount > 0) {
				cohesionX /= cohesionCount;
				cohesionY /= cohesionCount;

				cohesionX -= pos.x;
				cohesionY -= pos.y;

				const cohMag = Math.sqrt(cohesionX * cohesionX + cohesionY * cohesionY);
				if (cohMag > 0) {
					cohesionX = (cohesionX / cohMag) * props.maxSpeed - vel.x;
					cohesionY = (cohesionY / cohMag) * props.maxSpeed - vel.y;

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
	});

	// Movement system
	const movementSystem = profiler.profileSystem("movement", () => {
		for (const entity of boids.entities) {
			const pos = entity.position;
			const vel = entity.velocity;
			const acc = entity.acceleration;
			const maxSpeed = entity.boid.maxSpeed;

			vel.x += acc.x;
			vel.y += acc.y;

			const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
			if (speed > maxSpeed) {
				vel.x = (vel.x / speed) * maxSpeed;
				vel.y = (vel.y / speed) * maxSpeed;
			}

			pos.x += vel.x;
			pos.y += vel.y;
		}
	});

	// Bounds system
	const boundsSystem = profiler.profileSystem("bounds", () => {
		const { width, height } = config;

		for (const entity of positions.entities) {
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
	});

	// Explosion system
	let lastExplosionTime = 0;
	let explosion: { x: number; y: number; radius: number } | null = null;

	const minRadius = 80;
	const maxRadius = 200;

	const explosionSystem = profiler.profileSystem(
		"explosion",
		(currentTime: number) => {
			const timeSinceLastExplosion = currentTime - lastExplosionTime;

			if (timeSinceLastExplosion >= config.explosionInterval * 1000) {
				lastExplosionTime = currentTime;
				explosion = {
					x: Math.random() * config.width,
					y: Math.random() * config.height,
					radius: minRadius + Math.random() * (maxRadius - minRadius),
				};
			}

			if (explosion) {
				const radiusSq = explosion.radius * explosion.radius;
				const avoidanceRadius = explosion.radius * 1.3;
				const avoidanceRadiusSq = avoidanceRadius * avoidanceRadius;

				for (const boid of boids.entities) {
					const dx = boid.position.x - explosion.x;
					const dy = boid.position.y - explosion.y;
					const distSq = dx * dx + dy * dy;

					if (distSq < avoidanceRadiusSq && distSq > 0) {
						const dist = Math.sqrt(distSq);

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

						const forceX = (dx / dist) * forceMagnitude;
						const forceY = (dy / dist) * forceMagnitude;

						boid.acceleration.x += forceX;
						boid.acceleration.y += forceY;
					}
				}
			}

			return explosion;
		},
	);

	// Render system
	const renderSystem = profiler.profileSystem("render", () => {
		ctx.fillStyle = "#000000";
		ctx.fillRect(0, 0, config.width, config.height);

		for (const entity of renderables.entities) {
			const pos = entity.position;
			const vel = entity.velocity;
			const sprite = entity.sprite;

			const angle = Math.atan2(vel.y, vel.x);

			ctx.save();
			ctx.translate(pos.x, pos.y);
			ctx.rotate(angle);

			ctx.fillStyle = sprite.color;
			ctx.beginPath();
			ctx.moveTo(sprite.size, 0);
			ctx.lineTo(-sprite.size, -sprite.size / 2);
			ctx.lineTo(-sprite.size, sprite.size / 2);
			ctx.closePath();
			ctx.fill();

			ctx.restore();
		}
	});

	console.log("Spawning boids...");
	for (let i = 0; i < config.count; i++) {
		const angle = Math.random() * Math.PI * 2;
		const speed = Math.random() * config.maxSpeed;

		world.add({
			position: {
				x: Math.random() * config.width,
				y: Math.random() * config.height,
			},
			velocity: {
				x: Math.cos(angle) * speed,
				y: Math.sin(angle) * speed,
			},
			acceleration: { x: 0, y: 0 },
			boid: {
				maxSpeed: config.maxSpeed,
				maxForce: config.maxForce,
				perceptionRadius: config.perceptionRadius,
			},
			sprite: {
				color: config.boidColor,
				size: config.boidSize,
			},
		});
	}

	console.log(`Created ${world.entities.length} entities`);
	console.log(
		`Running simulation for ${
			duration > 0 ? `${duration} seconds` : "indefinitely"
		}...`,
	);

	const startTime = performance.now();
	let running = true;
	let frameCount = 0;

	while (running) {
		profiler.frameStart();

		if (window) {
			if (window.destroyed) {
				running = false;
				break;
			}

			const keyboardState = sdl.keyboard.getState();
			if (keyboardState[sdl.keyboard.SCANCODE.ESCAPE]) {
				running = false;
				break;
			}
		}

		const currentTime = performance.now();

		flockingSystem();
		const currentExplosion = explosionSystem(currentTime);
		movementSystem();
		boundsSystem();
		renderSystem();

		// Render explosion effect
		if (currentExplosion) {
			ctx.beginPath();
			ctx.arc(
				currentExplosion.x,
				currentExplosion.y,
				currentExplosion.radius,
				0,
				Math.PI * 2,
			);
			ctx.strokeStyle = "rgba(255, 100, 50, 0.5)";
			ctx.lineWidth = 2;
			ctx.stroke();

			// Inner glow
			ctx.beginPath();
			ctx.arc(
				currentExplosion.x,
				currentExplosion.y,
				currentExplosion.radius * 0.3,
				0,
				Math.PI * 2,
			);
			ctx.fillStyle = "rgba(255, 200, 100, 0.3)";
			ctx.fill();
		}

		if (window && !window.destroyed) {
			const buffer = canvas.toBuffer("raw");
			window.render(
				config.width,
				config.height,
				config.width * 4,
				"bgra32",
				buffer,
			);
		}

		profiler.frameEnd();
		frameCount++;

		if (duration > 0) {
			const elapsed = (performance.now() - startTime) / 1000;
			if (elapsed >= duration) {
				running = false;
			}
		}

		await new Promise((resolve) => setTimeout(resolve, 0));
	}

	if (window && !window.destroyed) {
		window.destroy();
	}

	console.log("\n" + profiler.getReport());
	console.log(`\nTotal frames: ${frameCount}`);

	return {
		profiler,
		frameCount,
		config,
	};
}
