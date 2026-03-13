/**
 * fused-every-some.ts
 *
 * Compares the current .every() + .some() pattern in archetype matching
 * against a single fused manual loop that checks both inclusion and
 * exclusion in one pass.
 *
 * Maps to Archetype.matches() (archetype.ts:61-74):
 *   const matchesArchetype = this.#components.every(c => entity[c] !== undefined);
 *   const matchesExcluding = this.#excluding?.some(c => entity[c] !== undefined) ?? false;
 *   return matchesArchetype && !matchesExcluding;
 */
import { run, bench, summary } from "mitata";

// --- Setup ---

const entity: Record<string, unknown> = {
	position: { x: 10, y: 20 },
	velocity: { x: 1, y: -1 },
	health: 100,
	sprite: "player.png",
	damage: 25,
};

// Simulate different archetype configurations
const configs = [
	{
		label: "3 include, 0 exclude",
		include: ["position", "velocity", "health"],
		exclude: [] as string[],
	},
	{
		label: "3 include, 2 exclude",
		include: ["position", "velocity", "health"],
		exclude: ["shield", "invincible"],
	},
	{
		label: "2 include, 1 exclude (present)",
		include: ["position", "velocity"],
		exclude: ["health"], // entity HAS health, so this should reject
	},
];

// Current pattern: .every() + .some()
function matchesEverySome(
	e: Record<string, unknown>,
	include: string[],
	exclude: string[],
): boolean {
	const matchesArchetype = include.every((c) => e[c] !== undefined);
	const matchesExcluding =
		exclude.length > 0 ? exclude.some((c) => e[c] !== undefined) : false;
	return matchesArchetype && !matchesExcluding;
}

// Fused manual loop: sequential loops with early exit
function matchesFused(
	e: Record<string, unknown>,
	include: string[],
	exclude: string[],
): boolean {
	// oxlint-disable-next-line @typescript-eslint/prefer-for-of -- benchmarking indexed vs for-of
	for (let i = 0; i < include.length; i++) {
		if (e[include[i]] === undefined) return false;
	}
	// oxlint-disable-next-line @typescript-eslint/prefer-for-of -- benchmarking indexed vs for-of
	for (let i = 0; i < exclude.length; i++) {
		if (e[exclude[i]] !== undefined) return false;
	}
	return true;
}

// Fused for-of loop
function matchesFusedForOf(
	e: Record<string, unknown>,
	include: string[],
	exclude: string[],
): boolean {
	for (const c of include) {
		if (e[c] === undefined) return false;
	}
	for (const c of exclude) {
		if (e[c] !== undefined) return false;
	}
	return true;
}

// --- Verify correctness ---
for (const { include, exclude } of configs) {
	const a = matchesEverySome(entity, include, exclude);
	const b = matchesFused(entity, include, exclude);
	const c = matchesFusedForOf(entity, include, exclude);
	if (a !== b || a !== c) {
		// oxlint-disable-next-line @typescript-eslint/restrict-template-expressions -- debug output
		throw new Error(`Mismatch: every/some=${a} fused=${b} fusedForOf=${c}`);
	}
}

// --- Single entity benchmarks ---

for (const { label, include, exclude } of configs) {
	summary(() => {
		bench(`.every() + .some() — ${label}`, () => {
			return matchesEverySome(entity, include, exclude);
		});

		bench(`fused for (indexed) — ${label}`, () => {
			return matchesFused(entity, include, exclude);
		});

		bench(`fused for-of — ${label}`, () => {
			return matchesFusedForOf(entity, include, exclude);
		});
	});
}

// --- 1000 entities × archetype matching ---

const entities = Array.from({ length: 1000 }, (_, i) => {
	const e: Record<string, unknown> = {
		position: { x: i, y: i },
		velocity: { x: 1, y: 0 },
	};
	if (i % 5 !== 0) e.health = 100;
	if (i % 10 === 0) e.shield = 50;
	return e;
});

const include = ["position", "velocity", "health"];
const exclude = ["shield"];

summary(() => {
	bench(".every() + .some() — 1000 entities", () => {
		let count = 0;
		for (const e of entities) {
			if (matchesEverySome(e, include, exclude)) count++;
		}
		return count;
	});

	bench("fused for (indexed) — 1000 entities", () => {
		let count = 0;
		for (const e of entities) {
			if (matchesFused(e, include, exclude)) count++;
		}
		return count;
	});

	bench("fused for-of — 1000 entities", () => {
		let count = 0;
		for (const e of entities) {
			if (matchesFusedForOf(e, include, exclude)) count++;
		}
		return count;
	});
});

await run();
