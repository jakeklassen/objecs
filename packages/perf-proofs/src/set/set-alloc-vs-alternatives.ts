/**
 * set-alloc-vs-alternatives.ts
 *
 * Benchmarks deduplication strategies for collecting affected archetypes.
 * Maps to World.#getAffectedArchetypes() (world.ts) which allocates
 * a new Set on every addEntityComponents/removeEntityComponents call.
 *
 * Explores whether avoiding Set allocation improves hot-path performance.
 */
import { run, bench, summary } from "mitata";

// --- Setup ---

// Simulate #componentIndex: Map<component, Set<Archetype>>
// Typical: 5-20 component keys, 2-8 archetypes per key, significant overlap
type FakeArchetype = { id: number };

const archetypes: FakeArchetype[] = Array.from({ length: 10 }, (_, i) => ({
	id: i,
}));

// componentIndex maps component name -> set of archetypes that use it
const componentIndex = new Map<string, Set<FakeArchetype>>();
const componentIndexArr = new Map<string, FakeArchetype[]>();

// 10 components, each used by 2-5 overlapping archetypes
for (let i = 0; i < 10; i++) {
	const key = `component_${i}`;
	const start = i % 6;
	const count = 2 + (i % 4); // 2 to 5 archetypes
	const set = new Set(archetypes.slice(start, start + count));
	componentIndex.set(key, set);
	componentIndexArr.set(key, [...set]);
}

// Typical mutation touches 1-3 components
const changedKeys1 = ["component_0"];
const changedKeys2 = ["component_0", "component_3"];
const changedKeys3 = ["component_0", "component_3", "component_7"];

// --- Strategies ---

function withNewSet(
	keys: string[],
	index: Map<string, Set<FakeArchetype>>,
): Set<FakeArchetype> {
	const result = new Set<FakeArchetype>();
	for (const key of keys) {
		const set = index.get(key);
		if (set !== undefined) {
			for (const arch of set) {
				result.add(arch);
			}
		}
	}
	return result;
}

function withArrayDedup(
	keys: string[],
	index: Map<string, Set<FakeArchetype>>,
): FakeArchetype[] {
	const result: FakeArchetype[] = [];
	const seen = new Set<FakeArchetype>();
	for (const key of keys) {
		const set = index.get(key);
		if (set !== undefined) {
			for (const arch of set) {
				if (!seen.has(arch)) {
					seen.add(arch);
					result.push(arch);
				}
			}
		}
	}
	return result;
}

function withArrayIncludes(
	keys: string[],
	index: Map<string, Set<FakeArchetype>>,
): FakeArchetype[] {
	const result: FakeArchetype[] = [];
	for (const key of keys) {
		const set = index.get(key);
		if (set !== undefined) {
			for (const arch of set) {
				if (!result.includes(arch)) {
					result.push(arch);
				}
			}
		}
	}
	return result;
}

// Skip dedup entirely — just iterate with duplicates and let the
// consumer (addEntity/removeEntity) handle idempotency
function withDuplicates(
	keys: string[],
	index: Map<string, Set<FakeArchetype>>,
	callback: (arch: FakeArchetype) => void,
): void {
	for (const key of keys) {
		const set = index.get(key);
		if (set !== undefined) {
			for (const arch of set) {
				callback(arch);
			}
		}
	}
}

// Same as withDuplicates but using array-backed index
function withDuplicatesArr(
	keys: string[],
	index: Map<string, FakeArchetype[]>,
	callback: (arch: FakeArchetype) => void,
): void {
	for (const key of keys) {
		const arr = index.get(key);
		if (arr !== undefined) {
			// oxlint-disable-next-line @typescript-eslint/prefer-for-of -- benchmarking indexed loop
			for (let i = 0; i < arr.length; i++) {
				callback(arr[i]);
			}
		}
	}
}

// --- Benchmarks ---

for (const keys of [changedKeys1, changedKeys2, changedKeys3]) {
	const label = `${keys.length} changed key${keys.length > 1 ? "s" : ""}`;

	summary(() => {
		bench(`new Set() — ${label}`, () => {
			const result = withNewSet(keys, componentIndex);
			return result.size;
		});

		bench(`Array + Set seen — ${label}`, () => {
			const result = withArrayDedup(keys, componentIndex);
			return result.length;
		});

		bench(`Array + includes — ${label}`, () => {
			const result = withArrayIncludes(keys, componentIndex);
			return result.length;
		});

		bench(`skip dedup (no dedup) (Set index) — ${label}`, () => {
			let count = 0;
			withDuplicates(keys, componentIndex, () => {
				count++;
			});
			return count;
		});

		bench(`skip dedup (no dedup) (Array index) — ${label}`, () => {
			let count = 0;
			withDuplicatesArr(keys, componentIndexArr, () => {
				count++;
			});
			return count;
		});
	});
}

await run();
