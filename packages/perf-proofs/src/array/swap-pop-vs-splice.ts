/**
 * swap-pop-vs-splice.ts
 *
 * Proves O(1) swap-and-pop removal is faster than O(n) splice for unordered
 * collections. Maps to EntityCollection.remove() in world.ts which uses
 * swap-and-pop to maintain a dense array for fast iteration.
 */
import { run, bench, summary } from "mitata";

function swapPop(arr: number[], index: number): void {
	const lastIndex = arr.length - 1;
	if (index !== lastIndex) {
		arr[index] = arr[lastIndex];
	}
	arr.pop();
}

// --- Benchmarks ---

for (const size of [100, 1000, 10_000]) {
	summary(() => {
		bench(`swap-pop — remove middle from ${size}`, () => {
			const arr = Array.from({ length: size }, (_, i) => i);
			swapPop(arr, Math.floor(size / 2));
			return arr;
		});

		bench(`splice — remove middle from ${size}`, () => {
			const arr = Array.from({ length: size }, (_, i) => i);
			arr.splice(Math.floor(size / 2), 1);
			return arr;
		});
	});
}

summary(() => {
	bench("swap-pop — 10 removals from 10000", () => {
		const arr = Array.from({ length: 10_000 }, (_, i) => i);
		for (let i = 0; i < 10; i++) {
			swapPop(arr, Math.floor(arr.length / 2));
		}
		return arr;
	});

	bench("splice — 10 removals from 10000", () => {
		const arr = Array.from({ length: 10_000 }, (_, i) => i);
		for (let i = 0; i < 10; i++) {
			arr.splice(Math.floor(arr.length / 2), 1);
		}
		return arr;
	});
});

await run();
