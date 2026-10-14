/**
 * null-proto-vs-plain.ts
 *
 * Tests whether null-prototype entities are faster. They are NOT.
 *
 * Objects created with `{ __proto__: null }` or `Object.create(null)` start in
 * V8 **dictionary mode**: properties live in a hash table with no hidden class,
 * so every access is a dictionary lookup instead of an inline-cache hit, and
 * property reads never restore fast mode. The only escape is
 * `Object.setPrototypeOf(obj, null)` — the literal keeps its fast map and only
 * the prototype is swapped out afterwards.
 *
 * Relevance to objecs: entities are plain user objects iterated on the hot path
 * (`entity.transform.position.x += ...`) and matched via `entity[c] !==
 * undefined`. This is the same dictionary-mode lesson as
 * `delete-vs-set-undefined` and ADR 0001, from the other direction — a user who
 * reaches for null-prototype entities (to dodge prototype pollution or
 * proto-chain lookups) silently pays a multiple-x iteration penalty.
 *
 * Verified with `%HasFastProperties` (`node --allow-natives-syntax`) on
 * Node 26 / V8:
 *   plain literal                -> fast properties
 *   { __proto__: null }          -> dictionary mode
 *   Object.create(null)          -> dictionary mode
 *   Object.setPrototypeOf(l,null) -> fast properties
 *
 * Measured (Node 26.11.1, Ryzen 9 7950X3D, plain = baseline), slowdown factor:
 *                            create   iterate(1000)  presence(1000)
 *   { __proto__: null }       11x        6.6x           15x
 *   Object.create(null)       19x        6.2x           15x
 *   setPrototypeOf(l, null)   74x        4.0x            9.6x
 *
 * Two takeaways:
 *   - Dictionary mode, not megamorphism, is the dominant cost: giving each kind
 *     its own monomorphic access site (below) barely narrowed the gap
 *     (iteration 8.5x -> 6.6x), so mixing shapes adds only ~30% on top.
 *   - `setPrototypeOf(obj, null)` keeps fast properties so it reads fastest of
 *     the three null-proto forms, but the setPrototypeOf *call* makes it the
 *     slowest to create (74x) — only worth it for long-lived, read-many objects,
 *     never per-frame churn.
 *
 * Source: https://adventures.nodeland.dev/archive/optimizing-objects-with-null-prototypes/
 */
import { bench, do_not_optimize, run, summary } from "mitata";

const COUNT = 1000;
const dt = 1 / 60;

type Entity = {
	transform: {
		position: { x: number; y: number };
		scale: { x: number; y: number };
		rotation: number;
	};
	velocity: { x: number; y: number };
	direction: { x: number; y: number };
};

function fields(i: number): Entity {
	return {
		transform: {
			position: { x: i, y: i },
			scale: { x: 1, y: 1 },
			rotation: 0,
		},
		velocity: { x: 1, y: -1 },
		direction: { x: 1, y: 1 },
	};
}

type Kind = "plain" | "nullLiteral" | "objectCreate" | "setPrototypeOf";

function makeEntity(kind: Kind, i: number): Entity {
	switch (kind) {
		case "plain":
			return fields(i);
		case "nullLiteral":
			return { __proto__: null, ...fields(i) } as Entity;
		case "objectCreate":
			return Object.assign(Object.create(null), fields(i)) as Entity;
		case "setPrototypeOf":
			return Object.setPrototypeOf(fields(i), null) as Entity;
	}
}

function makeEntities(kind: Kind): Entity[] {
	const entities = new Array<Entity>(COUNT);

	for (let i = 0; i < COUNT; i++) {
		entities[i] = makeEntity(kind, i);
	}

	return entities;
}

// Pre-built arrays for the iteration/read groups — construction is excluded
// from those measurements on purpose.
const plain = makeEntities("plain");
const nullLiteral = makeEntities("nullLiteral");
const objectCreate = makeEntities("objectCreate");
const setProto = makeEntities("setPrototypeOf");

// --- 1. Flat-object creation cost (isolates the null-proto creation penalty) ---

summary(() => {
	bench("create: plain literal", () => {
		return do_not_optimize({ a: 1, b: 2, c: 3 });
	});

	bench("create: { __proto__: null }", () => {
		return do_not_optimize({ __proto__: null, a: 1, b: 2, c: 3 });
	});

	bench("create: Object.create(null)", () => {
		const o: Record<string, number> = Object.create(null);
		o.a = 1;
		o.b = 2;
		o.c = 3;
		return do_not_optimize(o);
	});

	bench("create: setPrototypeOf(literal, null)", () => {
		return do_not_optimize(Object.setPrototypeOf({ a: 1, b: 2, c: 3 }, null));
	});
});

// Each kind gets its OWN integrator/matcher so the access sites stay
// monomorphic — this isolates the dictionary-mode cost from megamorphic
// inline-cache pollution. A single shared function iterating all four shapes
// would go megamorphic and conflate the two effects. Factories produce
// distinct function objects with independent inline caches.

function makeIntegrator() {
	return (entities: Entity[]): number => {
		for (const e of entities) {
			e.transform.position.x += e.velocity.x * e.direction.x * dt;
			e.transform.position.y += e.velocity.y * e.direction.y * dt;
		}

		return entities.length;
	};
}

function makeMatcher() {
	return (entities: Entity[]): number => {
		let matches = 0;

		for (const e of entities) {
			if (
				e.transform !== undefined &&
				e.velocity !== undefined &&
				e.direction !== undefined
			) {
				matches++;
			}
		}

		return matches;
	};
}

// --- 2. Iteration hot path (objecs movement pattern over COUNT entities) ---

const integratePlain = makeIntegrator();
const integrateNull = makeIntegrator();
const integrateCreate = makeIntegrator();
const integrateSetProto = makeIntegrator();

summary(() => {
	bench(`iterate: plain — ${COUNT}`, () =>
		do_not_optimize(integratePlain(plain)));

	bench(`iterate: { __proto__: null } — ${COUNT}`, () =>
		do_not_optimize(integrateNull(nullLiteral)));

	bench(`iterate: Object.create(null) — ${COUNT}`, () =>
		do_not_optimize(integrateCreate(objectCreate)));

	bench(`iterate: setPrototypeOf — ${COUNT}`, () =>
		do_not_optimize(integrateSetProto(setProto)));
});

// --- 3. Presence check (archetype-matching pattern: entity[c] !== undefined) ---

const matchPlain = makeMatcher();
const matchNull = makeMatcher();
const matchCreate = makeMatcher();
const matchSetProto = makeMatcher();

summary(() => {
	bench(`presence: plain — ${COUNT}`, () => do_not_optimize(matchPlain(plain)));

	bench(`presence: { __proto__: null } — ${COUNT}`, () =>
		do_not_optimize(matchNull(nullLiteral)));

	bench(`presence: Object.create(null) — ${COUNT}`, () =>
		do_not_optimize(matchCreate(objectCreate)));

	bench(`presence: setPrototypeOf — ${COUNT}`, () =>
		do_not_optimize(matchSetProto(setProto)));
});

await run();
