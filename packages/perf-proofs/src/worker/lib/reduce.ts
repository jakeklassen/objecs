/**
 * Deterministic greedy reduction of worker candidate output.
 *
 * Each worker emits EVERY mask-passing, intersecting pair (i, j) in its outer
 * range, with i ascending and j ascending. Because workers own contiguous
 * ascending i-ranges, concatenating their outputs by worker index reproduces
 * the exact order the original serial nested loop evaluates pairs — no sort.
 *
 * The greedy reduction then reconstructs the shmup semantics: an entity
 * participates in at most one accepted collision, and the FIRST still-valid
 * candidate wins.
 *
 * Equivalence to the serial loop (verified against ground truth in parity.ts):
 *   - serial skips a handled outer i  ⇔  handled[i] guard skips all (i, *)
 *   - serial breaks on first accepted ⇔  handled[i]=1 blocks later (i, *)
 *   - serial picks first unhandled j  ⇔  candidates are j-ascending, first
 *                                        unhandled wins
 */
import type { CollisionResult } from "./worker-pool.ts";

/**
 * Reduce worker results (in worker-index order) into selected pairs.
 * Writes [i0, j0, i1, j1, ...] into `out`; returns the pair count.
 */
export function reduceCandidates(
	results: ReadonlyArray<CollisionResult>,
	count: number,
	handled: Uint8Array,
	out: Int32Array,
): number {
	handled.fill(0, 0, count);

	let pairCount = 0;

	for (let w = 0; w < results.length; w++) {
		const result = results[w]!;
		const pairs = result.pairs;
		const candidateCount = result.pairCount;

		for (let k = 0; k < candidateCount; k++) {
			const i = pairs[k * 2]!;
			const j = pairs[k * 2 + 1]!;

			if (handled[i] !== 0) {
				continue;
			}

			if (handled[j] !== 0) {
				continue;
			}

			out[pairCount * 2] = i;
			out[pairCount * 2 + 1] = j;
			pairCount++;

			handled[i] = 1;
			handled[j] = 1;
		}
	}

	return pairCount;
}
