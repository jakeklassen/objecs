import { World } from "miniplex";
import { Profiler } from "../../../profiler.ts";
import { DEFAULT_CONFIG, type Entity, type MutationConfig, type MutationGameOptions } from "../types.ts";

export async function runMutationGame(options: MutationGameOptions = {}) {
	const config: MutationConfig = { ...DEFAULT_CONFIG, ...options.config };
	const duration = options.duration ?? 10;

	console.log(
		`[miniplex] Starting mutation benchmark with ${config.entityCount} entities...`,
	);

	const world = new World<Entity>();

	// Create queries for different component combos
	const allEntities = world.with("position", "velocity", "health");
	const shielded = world.with("health", "shield");
	const poisonedEntities = world.with("poisoned");
	const buffed = world.with("health", "buff");
	const stunnedEntities = world.with("stunned");
	const shieldedNotPoisoned = world
		.with("health", "shield")
		.without("poisoned");
	const buffedNotStunned = world.with("health", "buff").without("stunned");
	const poisonedAndStunned = world.with("poisoned", "stunned");
	const damageEntities = world.with("damage");
	const fullyCombat = world.with("health", "damage", "shield");
	const healthOnly = world.with("health").without("shield", "buff");
	const buffedAndShielded = world.with("buff", "shield");
	const positionHealth = world.with("position", "health");
	const velocityDamage = world.with("velocity", "damage");
	const allBuffs = world.with("buff", "shield", "health");
	const poisonedNoShield = world.with("poisoned").without("shield");
	const stunnedNoBuff = world.with("stunned").without("buff");
	const damageAndBuff = world.with("damage", "buff");
	const shieldAndStunned = world.with("shield", "stunned");
	const allDebuffs = world.with("poisoned", "stunned");

	const queries = [
		allEntities,
		shielded,
		poisonedEntities,
		buffed,
		stunnedEntities,
		shieldedNotPoisoned,
		buffedNotStunned,
		poisonedAndStunned,
		damageEntities,
		fullyCombat,
		healthOnly,
		buffedAndShielded,
		positionHealth,
		velocityDamage,
		allBuffs,
		poisonedNoShield,
		stunnedNoBuff,
		damageAndBuff,
		shieldAndStunned,
		allDebuffs,
	];

	const profiler = new Profiler();

	// Spawn entities with base components
	console.log("Spawning entities...");
	for (let i = 0; i < config.entityCount; i++) {
		world.add({
			position: { x: Math.random() * 800, y: Math.random() * 600 },
			velocity: {
				x: (Math.random() - 0.5) * 4,
				y: (Math.random() - 0.5) * 4,
			},
			health: 100,
		} as Entity);
	}

	console.log(`Created ${world.entities.length} entities`);
	console.log(
		`Running mutation benchmark for ${duration > 0 ? `${duration} seconds` : "indefinitely"}...`,
	);

	const entityArray = [...world.entities];
	const mutationCount = Math.floor(config.entityCount * config.mutationRate);

	// Optional component definitions for random mutation
	const optionalComponents = [
		"shield",
		"poisoned",
		"stunned",
		"buff",
	] as const;

	type OptionalComponent = (typeof optionalComponents)[number];

	const componentFactories: Record<
		OptionalComponent,
		() => Entity[OptionalComponent]
	> = {
		shield: () => ({ strength: 10 + Math.random() * 90 }),
		poisoned: () => ({ tickDamage: 1 + Math.random() * 5 }),
		stunned: () => ({ duration: 0.5 + Math.random() * 2 }),
		buff: () => ({ multiplier: 1.1 + Math.random() * 0.9 }),
	};

	// Mutation system: randomly add/remove optional components
	const mutationSystem = profiler.profileSystem("mutation", () => {
		for (let i = 0; i < mutationCount; i++) {
			const idx = Math.floor(Math.random() * entityArray.length);
			const entity = entityArray[idx];
			const comp =
				optionalComponents[
					Math.floor(Math.random() * optionalComponents.length)
				];

			if (entity[comp] != null) {
				world.removeComponent(entity, comp);
			} else {
				world.addComponent(entity, comp, componentFactories[comp]());
			}
		}
	});

	// Iterate system: iterate all queries, touch each entity
	const iterateSystem = profiler.profileSystem("iterate", () => {
		let sum = 0;
		for (const query of queries) {
			for (const entity of query.entities) {
				// Touch entity to verify membership — read position.x
				sum += (entity as Entity & { position: { x: number } }).position
					.x;
			}
		}
		return sum;
	});

	const startTime = performance.now();
	let running = true;
	let frameCount = 0;

	while (running) {
		profiler.frameStart();

		mutationSystem();
		iterateSystem();

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

	console.log("\n" + profiler.getReport());
	console.log(`\nTotal frames: ${frameCount}`);

	return {
		profiler,
		frameCount,
		config,
	};
}
