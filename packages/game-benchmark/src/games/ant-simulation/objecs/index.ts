import Canvas from "canvas";
import sdl from "@kmamal/sdl";
import { World } from "objecs";
import { Profiler } from "../../../profiler.ts";
import { DEFAULT_CONFIG, type Entity, type AntSimulationConfig } from "../types.ts";
import { PheromoneMap } from "../pheromone-map.ts";
import { createSteeringSystem } from "../systems/steering-system.ts";
import { createMovementSystem } from "../systems/movement-system.ts";
import {
	createPheromoneDepositSystem,
	createPheromoneDecaySystem,
} from "../systems/pheromone-system.ts";
import {
	createFoodPickupSystem,
	createNestDeliverySystem,
} from "../systems/food-system.ts";
import { createRenderSystem } from "../systems/render-system.ts";

export interface AntSimulationGameOptions {
	config?: Partial<AntSimulationConfig>;
	duration?: number;
	showWindow?: boolean;
	skipRender?: boolean;
}

export async function runAntSimulationGame(
	options: AntSimulationGameOptions = {},
) {
	const config: AntSimulationConfig = { ...DEFAULT_CONFIG, ...options.config };
	const duration = options.duration ?? 10;
	const showWindow = options.showWindow ?? true;
	const skipRender = options.skipRender ?? false;

	console.log(
		`[objecs] Starting ant simulation with ${config.antCount} ants...`,
	);

	const window = showWindow
		? sdl.video.createWindow({
				title: "Ant Simulation (objecs)",
				width: config.width,
				height: config.height,
				accelerated: true,
				vsync: false,
			})
		: null;

	const canvas = skipRender
		? null
		: Canvas.createCanvas(config.width, config.height);
	const ctx = canvas?.getContext("2d") ?? null;

	const world = new World<Entity>();

	// Create pheromone map
	const pheromoneMap = new PheromoneMap(
		config.width,
		config.height,
		config.pheromoneCellSize,
	);

	// Create archetypes
	const antArchetype = world.archetype("position", "velocity", "ant");
	const foodArchetype = world.archetype("position", "food");
	const nestArchetype = world.archetype("position", "nest");

	const profiler = new Profiler();

	// Create nest at center
	const nestX = config.width / 2;
	const nestY = config.height / 2;
	world.createEntity({
		position: { x: nestX, y: nestY },
		nest: { foodCollected: 0, radius: config.nestRadius },
	});

	// Create ants
	console.log("Spawning ants...");
	for (let i = 0; i < config.antCount; i++) {
		const angle = (i / config.antCount) * Math.PI * 2;
		world.createEntity({
			position: { x: nestX, y: nestY },
			velocity: {
				x: Math.cos(angle) * config.antSpeed,
				y: Math.sin(angle) * config.antSpeed,
			},
			ant: {
				hasFood: false,
				speed: config.antSpeed,
				sightRange: config.antSightRange,
				steeringStrength: config.antSteeringStrength,
			},
		});
	}

	// Create food clusters
	console.log("Spawning food clusters...");
	const clusterPositions = [
		{ x: config.width * 0.2, y: config.height * 0.2 },
		{ x: config.width * 0.8, y: config.height * 0.2 },
		{ x: config.width * 0.2, y: config.height * 0.8 },
		{ x: config.width * 0.8, y: config.height * 0.8 },
	];

	for (let c = 0; c < Math.min(config.foodClusters, clusterPositions.length); c++) {
		const cluster = clusterPositions[c];
		const clusterRadius = 40;

		for (let i = 0; i < config.foodPerCluster; i++) {
			// Random position within cluster radius
			const angle = Math.random() * Math.PI * 2;
			const dist = Math.random() * clusterRadius;
			const x = cluster.x + Math.cos(angle) * dist;
			const y = cluster.y + Math.sin(angle) * dist;

			world.createEntity({
				position: { x, y },
				food: { amount: 1 },
			});
		}
	}

	// Get nest position for steering system
	const nestPos = { x: nestX, y: nestY, radius: config.nestRadius };

	// Create systems
	const steeringSystem = profiler.profileSystem(
		"steering",
		createSteeringSystem(antArchetype, foodArchetype, nestPos, pheromoneMap, config),
	);

	const movementSystem = profiler.profileSystem(
		"movement",
		createMovementSystem(antArchetype, config),
	);

	const pheromoneDepositSystem = profiler.profileSystem(
		"pheromone-deposit",
		createPheromoneDepositSystem(antArchetype, pheromoneMap, config),
	);

	const pheromoneDecaySystem = profiler.profileSystem(
		"pheromone-decay",
		createPheromoneDecaySystem(pheromoneMap, config),
	);

	const foodPickupSystem = profiler.profileSystem(
		"food-pickup",
		createFoodPickupSystem(antArchetype, foodArchetype, world, config),
	);

	const nestDeliverySystem = profiler.profileSystem(
		"nest-delivery",
		createNestDeliverySystem(antArchetype, nestArchetype, config),
	);

	const renderSystem = ctx
		? profiler.profileSystem(
				"render",
				createRenderSystem(
					antArchetype,
					foodArchetype,
					nestArchetype,
					pheromoneMap,
					ctx,
					config,
				),
			)
		: null;

	console.log(`Created ${world.entities.size} entities`);
	console.log(
		`Running simulation for ${duration > 0 ? `${duration} seconds` : "indefinitely"}...`,
	);

	const startTime = performance.now();
	let running = true;
	let frameCount = 0;
	let foodCollected = 0;

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

		// Run systems
		steeringSystem();
		movementSystem();
		pheromoneDepositSystem();
		pheromoneDecaySystem();
		foodPickupSystem();
		foodCollected = nestDeliverySystem();

		if (!skipRender) {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			renderSystem!(foodCollected);

			if (window && !window.destroyed) {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				const buffer = canvas!.toBuffer("raw");
				window.render(
					config.width,
					config.height,
					config.width * 4,
					"bgra32",
					buffer,
				);
			}
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
	console.log(`Food collected: ${foodCollected}`);

	return {
		profiler,
		frameCount,
		config,
		foodCollected,
	};
}
