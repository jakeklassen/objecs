/**
 * delete-vs-set-undefined.ts
 *
 * Compares `delete obj.prop` vs `obj.prop = undefined` for property removal.
 * objecs uses `delete` in world.ts:removeEntityComponents() because the library
 * relies on `!== undefined` for archetype matching — setting to `undefined`
 * would break component presence detection.
 *
 * This benchmark quantifies the performance trade-off of using `delete`.
 */
import { run, bench, summary } from "mitata";

// --- Benchmarks ---

summary(() => {
	bench("delete obj.prop", () => {
		const obj: Record<string, unknown> = {
			position: { x: 10, y: 20 },
			velocity: { x: 1, y: -1 },
			health: 100,
		};
		delete obj.health;
		return obj;
	});

	bench("obj.prop = undefined", () => {
		const obj: Record<string, unknown> = {
			position: { x: 10, y: 20 },
			velocity: { x: 1, y: -1 },
			health: 100,
		};
		obj.health = undefined;
		return obj;
	});
});

summary(() => {
	bench("delete + re-add cycle", () => {
		const obj: Record<string, unknown> = {
			position: { x: 10, y: 20 },
			velocity: { x: 1, y: -1 },
			health: 100,
		};
		delete obj.health;
		obj.health = 50;
		return obj;
	});

	bench("set undefined + re-add cycle", () => {
		const obj: Record<string, unknown> = {
			position: { x: 10, y: 20 },
			velocity: { x: 1, y: -1 },
			health: 100,
		};
		obj.health = undefined;
		obj.health = 50;
		return obj;
	});
});

summary(() => {
	bench("delete — 1000 entities", () => {
		const entities = Array.from({ length: 1000 }, () => ({
			position: { x: 0, y: 0 },
			velocity: { x: 1, y: 1 },
			health: 100,
		}));
		for (const e of entities) {
			delete (e as Record<string, unknown>).health;
		}
		return entities;
	});

	bench("set undefined — 1000 entities", () => {
		const entities = Array.from({ length: 1000 }, () => ({
			position: { x: 0, y: 0 },
			velocity: { x: 1, y: 1 },
			health: 100 as number | undefined,
		}));
		for (const e of entities) {
			e.health = undefined;
		}
		return entities;
	});
});

await run();
