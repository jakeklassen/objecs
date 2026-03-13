/**
 * map-vs-object-lookup.ts
 *
 * Compares Map.get/has vs plain object property access for key-value lookups.
 * Maps to World.#componentIndex (Map<key, Set>) and EntityCollection.#indices
 * (Map<entity, number>) in world.ts.
 */
import { run, bench, summary } from "mitata";

// --- Setup ---

const keys = Array.from({ length: 20 }, (_, i) => `component_${i}`);
const missingKey = "nonexistent";

const map = new Map<string, number>();
const obj: Record<string, number | undefined> = {};

for (let i = 0; i < keys.length; i++) {
	map.set(keys[i], i);
	obj[keys[i]] = i;
}

// --- Benchmarks ---

summary(() => {
	bench("Map.get — hit", () => {
		return map.get("component_10");
	});

	bench("obj[key] — hit", () => {
		return obj["component_10"];
	});
});

summary(() => {
	bench("Map.has — miss", () => {
		return map.has(missingKey);
	});

	bench("obj[key] !== undefined — miss", () => {
		return obj[missingKey] !== undefined;
	});
});

summary(() => {
	bench("Map.get — all 20 keys", () => {
		let sum = 0;
		for (const k of keys) {
			// oxlint-disable-next-line @typescript-eslint/no-non-null-assertion -- keys are known present
			sum += map.get(k)!;
		}
		return sum;
	});

	bench("obj[key] — all 20 keys", () => {
		let sum = 0;
		for (const k of keys) {
			sum += obj[k] ?? 0;
		}
		return sum;
	});
});

summary(() => {
	bench("Map — set + get cycle", () => {
		const m = new Map<string, number>();
		for (let i = 0; i < 20; i++) {
			m.set(keys[i], i);
		}
		let sum = 0;
		for (const k of keys) {
			// oxlint-disable-next-line @typescript-eslint/no-non-null-assertion -- keys are known present
			sum += m.get(k)!;
		}
		return sum;
	});

	bench("Object — set + get cycle", () => {
		const o: Record<string, number> = {};
		for (let i = 0; i < 20; i++) {
			o[keys[i]] = i;
		}
		let sum = 0;
		for (const k of keys) {
			sum += o[k];
		}
		return sum;
	});
});

await run();
