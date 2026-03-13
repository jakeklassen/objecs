/**
 * set-vs-array-iteration.ts
 *
 * Compares for-of iteration over Set vs Array at sizes typical of ECS usage.
 * Maps to World.#archetypes (Set<Archetype>) iterated in createEntity() and
 * deleteEntity() (world.ts:245, 253). If Array iteration is meaningfully
 * faster, #archetypes could be stored as an Array instead of a Set.
 */
import { run, bench, summary } from "mitata";

// --- Setup ---

type FakeArchetype = { id: number; components: number[] };

function makeData(n: number): {
	set: Set<FakeArchetype>;
	arr: FakeArchetype[];
} {
	const arr = Array.from({ length: n }, (_, i) => ({
		id: i,
		components: [i, i + 1, i + 2],
	}));
	return { set: new Set(arr), arr };
}

// --- Benchmarks ---

for (const size of [5, 10, 50, 100]) {
	const { set, arr } = makeData(size);

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
			// oxlint-disable-next-line @typescript-eslint/prefer-for-of -- benchmarking indexed vs for-of
			for (let i = 0; i < arr.length; i++) {
				sum += arr[i].id;
			}
			return sum;
		});

		bench(`Set.forEach — ${size} items`, () => {
			let sum = 0;
			set.forEach((item) => {
				sum += item.id;
			});
			return sum;
		});
	});
}

await run();
