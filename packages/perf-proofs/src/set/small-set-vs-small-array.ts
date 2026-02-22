/**
 * small-set-vs-small-array.ts
 *
 * Compares Set vs Array for small collections (2-10 items) typical of ECS.
 * Maps to World.#componentIndex values (world.ts:153) which are
 * Set<Archetype> — typically holding 2-8 archetypes per component key.
 *
 * Tests has/includes, add/push, iteration, and delete/splice at small sizes
 * where Set's hash overhead may exceed Array's linear scan.
 */
import { run, bench, summary } from "mitata";

// --- Setup ---

type Item = { id: number };

function makeItems(n: number): Item[] {
	return Array.from({ length: n }, (_, i) => ({ id: i }));
}

// --- Benchmarks ---

for (const size of [2, 5, 8, 15]) {
	const items = makeItems(size);
	const set = new Set(items);
	const arr = [...items];
	const target = items[Math.floor(size / 2)]; // middle item
	const missing = { id: 999 };

	// --- has / includes ---

	summary(() => {
		bench(`Set.has (hit) — ${size} items`, () => {
			return set.has(target);
		});

		bench(`Array.includes (hit) — ${size} items`, () => {
			return arr.includes(target);
		});
	});

	summary(() => {
		bench(`Set.has (miss) — ${size} items`, () => {
			return set.has(missing);
		});

		bench(`Array.includes (miss) — ${size} items`, () => {
			return arr.includes(missing);
		});
	});

	// --- iteration ---

	summary(() => {
		bench(`for-of Set — ${size} items`, () => {
			let sum = 0;
			for (const item of set) {
				sum += item.id;
			}
			return sum;
		});

		bench(`for-of Array — ${size} items`, () => {
			let sum = 0;
			for (const item of arr) {
				sum += item.id;
			}
			return sum;
		});

		bench(`for (indexed) Array — ${size} items`, () => {
			let sum = 0;
			for (let i = 0; i < arr.length; i++) {
				sum += arr[i].id;
			}
			return sum;
		});
	});

	// --- add + delete cycle ---

	const fixedSet = new Set(items);
	const fixedArr = [...items];
	const sentinel = { id: 100 };

	summary(() => {
		bench(`Set add+delete — ${size} items`, () => {
			fixedSet.add(sentinel);
			fixedSet.delete(sentinel);
			return fixedSet.size;
		});

		bench(`Array push+pop — ${size} items`, () => {
			fixedArr.push(sentinel);
			fixedArr.pop();
			return fixedArr.length;
		});
	});
}

await run();
