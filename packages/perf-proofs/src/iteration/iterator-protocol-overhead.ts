/**
 * iterator-protocol-overhead.ts
 *
 * Measures the cost of the Symbol.iterator protocol vs direct array access.
 * Maps to EntityCollection (world.ts:101-104) which delegates its iterator
 * to the backing array. Users iterate via `for...of archetype.entities` but
 * could use `archetype.entities.raw` for direct array access.
 *
 * Tests whether the iterator indirection adds measurable overhead.
 */
import { run, bench, summary } from "mitata";

// --- Setup ---

type Entity = {
	position: { x: number; y: number };
	velocity: { x: number; y: number };
};

// Simulate EntityCollection — wraps an array, delegates iterator
class FakeCollection<T> {
	readonly #items: T[];

	constructor(items: T[]) {
		this.#items = items;
	}

	get raw(): ReadonlyArray<T> {
		return this.#items;
	}

	[Symbol.iterator](): IterableIterator<T> {
		return this.#items[Symbol.iterator]();
	}
}

function makeEntities(n: number): Entity[] {
	return Array.from({ length: n }, (_, i) => ({
		position: { x: i, y: i },
		velocity: { x: 1, y: -1 },
	}));
}

// --- Benchmarks ---

for (const size of [100, 1000, 10_000]) {
	const entities = makeEntities(size);
	const collection = new FakeCollection(entities);

	summary(() => {
		bench(`for-of collection — ${size}`, () => {
			for (const e of collection) {
				e.position.x += e.velocity.x;
				e.position.y += e.velocity.y;
			}
		});

		bench(`for-of collection.raw — ${size}`, () => {
			for (const e of collection.raw) {
				e.position.x += e.velocity.x;
				e.position.y += e.velocity.y;
			}
		});

		bench(`for (indexed) collection.raw — ${size}`, () => {
			const raw = collection.raw;
			// oxlint-disable-next-line @typescript-eslint/prefer-for-of -- benchmarking indexed vs iterator protocol
			for (let i = 0; i < raw.length; i++) {
				const e = raw[i];
				e.position.x += e.velocity.x;
				e.position.y += e.velocity.y;
			}
		});

		bench(`for-of bare array — ${size}`, () => {
			for (const e of entities) {
				e.position.x += e.velocity.x;
				e.position.y += e.velocity.y;
			}
		});
	});
}

await run();
