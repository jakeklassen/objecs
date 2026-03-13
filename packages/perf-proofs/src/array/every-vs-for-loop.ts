/**
 * every-vs-for-loop.ts
 *
 * Compares Array.every() vs manual for loops for small predicate arrays.
 * Maps to archetype.ts:matches() which uses `.every()` to check if an entity
 * has all required components. Component lists are typically 2–5 items.
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

// --- Benchmarks ---

for (const count of [2, 3, 5]) {
	const components = Object.keys(entity).slice(0, count);

	summary(() => {
		bench(`Array.every — ${count} components`, () => {
			return components.every((c) => entity[c] !== undefined);
		});

		bench(`for (indexed) — ${count} components`, () => {
			let result = true;
			// oxlint-disable-next-line @typescript-eslint/prefer-for-of -- benchmarking indexed loop vs .every()
			for (let i = 0; i < components.length; i++) {
				if (entity[components[i]] === undefined) {
					result = false;
					break;
				}
			}
			return result;
		});

		bench(`for-of — ${count} components`, () => {
			let result = true;
			for (const c of components) {
				if (entity[c] === undefined) {
					result = false;
					break;
				}
			}
			return result;
		});
	});
}

await run();
