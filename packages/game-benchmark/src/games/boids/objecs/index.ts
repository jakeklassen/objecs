import Canvas from "canvas";
import sdl from "@kmamal/sdl";
import { World } from "objecs";
import { Profiler } from "../../../profiler.ts";
import { type BoidsConfig, DEFAULT_CONFIG, type Entity } from "../types.ts";
import { createBoundsSystem } from "../systems/bounds-system.ts";
import { createExplosionSystem } from "../systems/explosion-system.ts";
import { createFlockingSystem } from "../systems/flocking-system.ts";
import { createMovementSystem } from "../systems/movement-system.ts";
import { createRenderSystem } from "../systems/render-system.ts";

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
		`[objecs] Starting boids simulation with ${config.count} boids...`,
	);

	const window = showWindow
		? sdl.video.createWindow({
				title: "Boids Benchmark (objecs)",
				width: config.width,
				height: config.height,
				accelerated: true,
				vsync: false,
		  })
		: null;

	const canvas = Canvas.createCanvas(config.width, config.height);
	const ctx = canvas.getContext("2d");

	const world = new World<Entity>();

	const boidArchetype = world.archetype(
		"position",
		"velocity",
		"acceleration",
		"boid",
	);
	const movingArchetype = world.archetype(
		"position",
		"velocity",
		"acceleration",
	);
	const positionArchetype = world.archetype("position");
	const renderableArchetype = world.archetype("position", "velocity", "sprite");

	const profiler = new Profiler();

	const flockingSystem = profiler.profileSystem(
		"flocking",
		createFlockingSystem(boidArchetype, config),
	);

	const baseExplosionSystem = createExplosionSystem(movingArchetype, config);
	const explosionSystem = profiler.profileSystem(
		"explosion",
		baseExplosionSystem,
	);

	const movementSystem = profiler.profileSystem(
		"movement",
		createMovementSystem(boidArchetype),
	);

	const boundsSystem = profiler.profileSystem(
		"bounds",
		createBoundsSystem(positionArchetype, config),
	);

	const renderSystem = profiler.profileSystem(
		"render",
		createRenderSystem(renderableArchetype, ctx, config),
	);

	console.log("Spawning boids...");
	for (let i = 0; i < config.count; i++) {
		const angle = Math.random() * Math.PI * 2;
		const speed = Math.random() * config.maxSpeed;

		world.createEntity({
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

	console.log(`Created ${world.entities.size} entities`);
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
		const explosion = explosionSystem(currentTime);
		movementSystem();
		boundsSystem();
		renderSystem();

		// Render explosion effect
		if (explosion) {
			ctx.beginPath();
			ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
			ctx.strokeStyle = "rgba(255, 100, 50, 0.5)";
			ctx.lineWidth = 2;
			ctx.stroke();

			// Inner glow
			ctx.beginPath();
			ctx.arc(explosion.x, explosion.y, explosion.radius * 0.3, 0, Math.PI * 2);
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
