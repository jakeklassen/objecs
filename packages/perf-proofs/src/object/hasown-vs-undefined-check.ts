/**
 * hasown-vs-undefined-check.ts
 *
 * Proves that `obj[key] !== undefined` is faster than `Object.hasOwn(obj, key)`
 * for property presence checks — the core optimization used in objecs archetype
 * matching (archetype.ts:matches, world.ts:archetype).
 *
 * Safe because objecs uses `delete` to remove components, never sets them to
 * `undefined`, so `!== undefined` is semantically equivalent to `hasOwn`.
 */
import { run, bench, summary } from "mitata";

// --- Setup ---

const entity = {
	position: { x: 10, y: 20 },
	velocity: { x: 1, y: -1 },
	health: 100,
	sprite: "player.png",
};

const components: string[] = ["position", "velocity", "health"];
const missingKey = "shield";

// 1000 entities, ~80% have all 3 components
const entities = Array.from({ length: 1000 }, (_, i) => {
	const e: Record<string, unknown> = {
		position: { x: i, y: i },
		velocity: { x: 1, y: 0 },
	};
	if (i % 5 !== 0) e.health = 100;
	return e;
});

// --- Benchmarks ---

summary(() => {
	bench("Object.hasOwn — key present", () => {
		return Object.hasOwn(entity, "position");
	});

	bench("!== undefined — key present", () => {
		return (entity as Record<string, unknown>)["position"] !== undefined;
	});

	bench("'in' operator — key present", () => {
		return "position" in entity;
	});
});

summary(() => {
	bench("Object.hasOwn — key absent", () => {
		return Object.hasOwn(entity, missingKey);
	});

	bench("!== undefined — key absent", () => {
		return (entity as Record<string, unknown>)[missingKey] !== undefined;
	});

	bench("'in' operator — key absent", () => {
		return missingKey in entity;
	});
});

summary(() => {
	bench("Object.hasOwn — .every() 3 components", () => {
		return components.every((c) => Object.hasOwn(entity, c));
	});

	bench("!== undefined — .every() 3 components", () => {
		return components.every(
			(c) => (entity as Record<string, unknown>)[c] !== undefined,
		);
	});

	bench("'in' operator — .every() 3 components", () => {
		return components.every((c) => c in entity);
	});
});

summary(() => {
	bench("Object.hasOwn — 1000 entities × 3 components", () => {
		let count = 0;
		for (const e of entities) {
			if (components.every((c) => Object.hasOwn(e, c))) {
				count++;
			}
		}
		return count;
	});

	bench("!== undefined — 1000 entities × 3 components", () => {
		let count = 0;
		for (const e of entities) {
			if (components.every((c) => e[c] !== undefined)) {
				count++;
			}
		}
		return count;
	});

	bench("'in' operator — 1000 entities × 3 components", () => {
		let count = 0;
		for (const e of entities) {
			if (components.every((c) => c in e)) {
				count++;
			}
		}
		return count;
	});
});

await run();
