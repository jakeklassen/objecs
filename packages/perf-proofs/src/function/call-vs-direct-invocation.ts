/**
 * call-vs-direct-invocation.ts
 *
 * Measures overhead of Function.prototype.call() vs direct invocation.
 * Maps to EntityCollection.forEach() (world.ts:133-144) which uses
 * `callbackfn.call(thisArg, entity, entity, this)` on every entity.
 *
 * Tests whether .call() adds measurable overhead compared to direct
 * function invocation in tight loops.
 */
import { run, bench, summary } from "mitata";

// --- Setup ---

type Entity = { x: number; y: number };

function makeEntities(n: number): Entity[] {
	return Array.from({ length: n }, (_, i) => ({ x: i, y: i }));
}

const callback = (e: Entity) => {
	e.x += 1;
	e.y += 1;
};

const callbackWithArgs = (value: Entity, _value2: Entity, _set: unknown) => {
	value.x += 1;
	value.y += 1;
};

// --- Benchmarks ---

for (const size of [100, 1000, 10_000]) {
	const entities = makeEntities(size);

	summary(() => {
		bench(`direct call — ${size}`, () => {
			for (const e of entities) {
				callback(e);
			}
		});

		bench(`.call(undefined, ...) (1 arg) — ${size}`, () => {
			for (const e of entities) {
				callback.call(undefined, e);
			}
		});

		bench(`.call(undefined, ...) — ${size}`, () => {
			for (const e of entities) {
				callbackWithArgs.call(undefined, e, e, null);
			}
		});

		const thisArg = {};
		bench(`.call(thisArg, ...) — ${size}`, () => {
			for (const e of entities) {
				callbackWithArgs.call(thisArg, e, e, null);
			}
		});

		bench(`direct call (3 args) — ${size}`, () => {
			for (const e of entities) {
				callbackWithArgs(e, e, null);
			}
		});
	});
}

await run();
