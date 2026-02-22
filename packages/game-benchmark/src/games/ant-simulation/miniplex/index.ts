import Canvas from "canvas";
import sdl from "@kmamal/sdl";
import { World } from "miniplex";
import { Profiler } from "../../../profiler.ts";
import {
	DEFAULT_CONFIG,
	type Entity,
	type AntSimulationConfig,
} from "../types.ts";
import { PheromoneMap } from "../pheromone-map.ts";

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
		`[miniplex] Starting ant simulation with ${config.antCount} ants...`,
	);

	const window = showWindow
		? sdl.video.createWindow({
				title: "Ant Simulation (miniplex)",
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

	// Create queries
	const ants = world.with("position", "velocity", "ant");
	const foods = world.with("position", "food");
	const nests = world.with("position", "nest");

	const profiler = new Profiler();

	// Nest position for steering
	const nestX = config.width / 2;
	const nestY = config.height / 2;
	const nestPos = { x: nestX, y: nestY, radius: config.nestRadius };

	// Steering system
	const steeringSystem = profiler.profileSystem("steering", () => {
		const sensorRadius = config.pheromoneCellSize * 3;

		for (const ant of ants.entities) {
			const pos = ant.position;
			const vel = ant.velocity;
			const antData = ant.ant;

			const heading = Math.atan2(vel.y, vel.x);
			let desiredX = vel.x;
			let desiredY = vel.y;

			if (antData.hasFood) {
				// Head toward nest
				const toNestX = nestPos.x - pos.x;
				const toNestY = nestPos.y - pos.y;
				const distToNest = Math.sqrt(toNestX * toNestX + toNestY * toNestY);

				if (distToNest < antData.sightRange + nestPos.radius) {
					desiredX = toNestX / distToNest;
					desiredY = toNestY / distToNest;
				} else {
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
				// Search for food
				let foundFood = false;
				let closestFoodDist = antData.sightRange;
				let closestFoodX = 0;
				let closestFoodY = 0;

				for (const f of foods.entities) {
					const dx = f.position.x - pos.x;
					const dy = f.position.y - pos.y;
					const dist = Math.sqrt(dx * dx + dy * dy);

					if (dist < closestFoodDist) {
						const angleToFood = Math.atan2(dy, dx);
						let angleDiff = angleToFood - heading;
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

			// Random wander
			const wanderAngle =
				(Math.random() - 0.5) * 2 * Math.PI * config.wanderStrength;
			const cos = Math.cos(wanderAngle);
			const sin = Math.sin(wanderAngle);
			const wanderedX = desiredX * cos - desiredY * sin;
			const wanderedY = desiredX * sin + desiredY * cos;
			desiredX = wanderedX;
			desiredY = wanderedY;

			// Wall avoidance
			const wallMargin = 30;
			if (pos.x < wallMargin)
				desiredX += (wallMargin - pos.x) / wallMargin;
			if (pos.x > config.width - wallMargin)
				desiredX -= (pos.x - (config.width - wallMargin)) / wallMargin;
			if (pos.y < wallMargin)
				desiredY += (wallMargin - pos.y) / wallMargin;
			if (pos.y > config.height - wallMargin)
				desiredY -= (pos.y - (config.height - wallMargin)) / wallMargin;

			// Normalize
			const desiredMag = Math.sqrt(desiredX * desiredX + desiredY * desiredY);
			if (desiredMag > 0) {
				desiredX /= desiredMag;
				desiredY /= desiredMag;
			}

			// Steer
			const steerX = (desiredX - vel.x) * antData.steeringStrength;
			const steerY = (desiredY - vel.y) * antData.steeringStrength;

			vel.x += steerX;
			vel.y += steerY;

			const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
			if (speed > 0) {
				vel.x = (vel.x / speed) * antData.speed;
				vel.y = (vel.y / speed) * antData.speed;
			}
		}
	});

	// Movement system
	const movementSystem = profiler.profileSystem("movement", () => {
		for (const ant of ants.entities) {
			ant.position.x += ant.velocity.x;
			ant.position.y += ant.velocity.y;

			if (ant.position.x < 0) {
				ant.position.x = 0;
				ant.velocity.x *= -1;
			} else if (ant.position.x >= config.width) {
				ant.position.x = config.width - 1;
				ant.velocity.x *= -1;
			}

			if (ant.position.y < 0) {
				ant.position.y = 0;
				ant.velocity.y *= -1;
			} else if (ant.position.y >= config.height) {
				ant.position.y = config.height - 1;
				ant.velocity.y *= -1;
			}
		}
	});

	// Pheromone deposit system
	const pheromoneDepositSystem = profiler.profileSystem(
		"pheromone-deposit",
		() => {
			for (const ant of ants.entities) {
				const type = ant.ant.hasFood ? "food" : "home";
				pheromoneMap.deposit(
					ant.position.x,
					ant.position.y,
					type,
					config.pheromoneDepositRate,
				);
			}
		},
	);

	// Pheromone decay system
	const pheromoneDecaySystem = profiler.profileSystem("pheromone-decay", () => {
		pheromoneMap.decay(config.pheromoneDecayRate);
	});

	// Food pickup system
	const foodPickupSystem = profiler.profileSystem("food-pickup", () => {
		const pickupRadiusSq = config.foodPickupRadius * config.foodPickupRadius;
		const foodToRemove: Entity[] = [];

		for (const ant of ants.entities) {
			if (ant.ant.hasFood) continue;

			for (const f of foods.entities) {
				const dx = f.position.x - ant.position.x;
				const dy = f.position.y - ant.position.y;
				const distSq = dx * dx + dy * dy;

				if (distSq < pickupRadiusSq) {
					ant.ant.hasFood = true;
					ant.velocity.x *= -1;
					ant.velocity.y *= -1;
					foodToRemove.push(f);
					break;
				}
			}
		}

		for (const f of foodToRemove) {
			world.remove(f);
		}
	});

	// Nest delivery system
	let foodCollected = 0;
	const nestDeliverySystem = profiler.profileSystem("nest-delivery", () => {
		for (const nest of nests.entities) {
			const nestRadiusSq = nest.nest.radius * nest.nest.radius;

			for (const ant of ants.entities) {
				if (!ant.ant.hasFood) continue;

				const dx = nest.position.x - ant.position.x;
				const dy = nest.position.y - ant.position.y;
				const distSq = dx * dx + dy * dy;

				if (distSq < nestRadiusSq) {
					ant.ant.hasFood = false;
					nest.nest.foodCollected++;
					ant.velocity.x *= -1;
					ant.velocity.y *= -1;
				}
			}

			foodCollected = nest.nest.foodCollected;
		}
	});

	// Render system
	const renderSystem = ctx
		? profiler.profileSystem("render", () => {
				// Clear background
				ctx.fillStyle = "#1a1a1a";
				ctx.fillRect(0, 0, config.width, config.height);

				// Draw pheromones
				const homeTrail = pheromoneMap.getTrailData("home");
				const foodTrail = pheromoneMap.getTrailData("food");
				const cellSize = config.pheromoneCellSize;

				for (let y = 0; y < pheromoneMap.gridHeight; y++) {
					for (let x = 0; x < pheromoneMap.gridWidth; x++) {
						const idx = y * pheromoneMap.gridWidth + x;
						const homeStrength = homeTrail[idx];
						const foodStrength = foodTrail[idx];

						if (homeStrength > 0.01 || foodStrength > 0.01) {
							const worldX = x * cellSize;
							const worldY = y * cellSize;

							if (homeStrength > 0.01) {
								ctx.fillStyle = `rgba(66, 135, 245, ${homeStrength * 0.5})`;
								ctx.fillRect(worldX, worldY, cellSize, cellSize);
							}
							if (foodStrength > 0.01) {
								ctx.fillStyle = `rgba(253, 33, 8, ${foodStrength * 0.5})`;
								ctx.fillRect(worldX, worldY, cellSize, cellSize);
							}
						}
					}
				}

				// Draw food
				ctx.fillStyle = config.foodColor;
				for (const f of foods.entities) {
					ctx.beginPath();
					ctx.arc(f.position.x, f.position.y, 3, 0, Math.PI * 2);
					ctx.fill();
				}

				// Draw nest
				for (const nest of nests.entities) {
					ctx.fillStyle = config.nestColor;
					ctx.beginPath();
					ctx.arc(
						nest.position.x,
						nest.position.y,
						nest.nest.radius,
						0,
						Math.PI * 2,
					);
					ctx.fill();

					ctx.fillStyle = "white";
					ctx.font = "20px monospace";
					ctx.textAlign = "center";
					ctx.textBaseline = "middle";
					ctx.fillText(
						String(nest.nest.foodCollected),
						nest.position.x,
						nest.position.y,
					);
				}

				// Draw ants
				for (const ant of ants.entities) {
					const { x, y } = ant.position;
					const angle = Math.atan2(ant.velocity.y, ant.velocity.x);

					ctx.save();
					ctx.translate(x, y);
					ctx.rotate(angle);

					ctx.fillStyle = ant.ant.hasFood
						? config.antWithFoodColor
						: config.antColor;
					ctx.beginPath();
					ctx.moveTo(4, 0);
					ctx.lineTo(-3, -2);
					ctx.lineTo(-3, 2);
					ctx.closePath();
					ctx.fill();

					ctx.restore();
				}

				// Draw UI
				ctx.fillStyle = "white";
				ctx.font = "14px monospace";
				ctx.textAlign = "left";
				ctx.textBaseline = "top";
				ctx.fillText(`Food collected: ${foodCollected}`, 10, 10);
				ctx.fillText(`Ants: ${ants.entities.length}`, 10, 28);
				ctx.fillText(`Food remaining: ${foods.entities.length}`, 10, 46);
			})
		: null;

	// Create nest at center
	world.add({
		position: { x: nestX, y: nestY },
		nest: { foodCollected: 0, radius: config.nestRadius },
	});

	// Create ants
	console.log("Spawning ants...");
	for (let i = 0; i < config.antCount; i++) {
		const angle = (i / config.antCount) * Math.PI * 2;
		world.add({
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

	for (
		let c = 0;
		c < Math.min(config.foodClusters, clusterPositions.length);
		c++
	) {
		const cluster = clusterPositions[c];
		const clusterRadius = 40;

		for (let i = 0; i < config.foodPerCluster; i++) {
			const angle = Math.random() * Math.PI * 2;
			const dist = Math.random() * clusterRadius;
			const x = cluster.x + Math.cos(angle) * dist;
			const y = cluster.y + Math.sin(angle) * dist;

			world.add({
				position: { x, y },
				food: { amount: 1 },
			});
		}
	}

	console.log(`Created ${world.entities.length} entities`);
	console.log(
		`Running simulation for ${duration > 0 ? `${duration} seconds` : "indefinitely"}...`,
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

		// Run systems
		steeringSystem();
		movementSystem();
		pheromoneDepositSystem();
		pheromoneDecaySystem();
		foodPickupSystem();
		nestDeliverySystem();

		if (!skipRender) {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			renderSystem!();

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

	const angles = [heading - halfFov, heading, heading + halfFov];
	const strengths: number[] = [];

	for (const angle of angles) {
		const sensorX = x + Math.cos(angle) * sensorDist;
		const sensorY = y + Math.sin(angle) * sensorDist;
		const strength = pheromoneMap.readArea(sensorX, sensorY, sensorRadius, type);
		strengths.push(strength);
	}

	const [left, center, right] = strengths;
	const maxStrength = Math.max(left, center, right);

	if (maxStrength < 0.001) {
		return null;
	}

	let chosenAngle: number;
	if (center >= left && center >= right) {
		chosenAngle = heading;
	} else if (left > right) {
		chosenAngle = heading - halfFov * 0.5;
	} else {
		chosenAngle = heading + halfFov * 0.5;
	}

	return {
		x: Math.cos(chosenAngle),
		y: Math.sin(chosenAngle),
	};
}
