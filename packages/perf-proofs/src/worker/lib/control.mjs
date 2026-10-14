/**
 * Shared control-block layout for the collision worker pool.
 *
 * A tiny `Int32Array` over a SharedArrayBuffer, used only for
 * synchronisation/publication — never for bulk collider data (those are
 * ordinary TypedArray reads over the snapshot SABs).
 *
 * `erasableSyntaxOnly` is on in this package's tsconfig, so `const enum` is
 * banned. Plain frozen object of indices instead. This file is `.mjs` so the
 * worker entry does not depend on TypeScript execution support, and it is
 * imported by the `.ts` side too (allowJs is on).
 */

/** Int32 slots in the control block. */
export const Control = Object.freeze({
	/** Bumped by main thread each dispatch; workers echo it to prove freshness. */
	Generation: 0,
	/** Number of colliders in the current snapshot. */
	Count: 1,
	/** Slots per worker start here: [readyGen_w0, readyGen_w1, ...]. */
	WorkerReadyBase: 2,
});

/**
 * Size (in Int32 slots) of a control block for `workerCount` workers.
 */
export function controlSize(workerCount) {
	return Control.WorkerReadyBase + workerCount;
}
