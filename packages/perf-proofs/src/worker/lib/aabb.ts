/**
 * Verbatim copy of packages/examples/src/lib/collision/aabb.ts
 *
 * Copied rather than imported so the `serial/current-object` baseline pays the
 * exact same helper-call overhead the shmup demo pays today. Do not "optimize"
 * this file — that is what `serial/precomputed` is for.
 */

type Vector2d = {
	x: number;
	y: number;
};

type AABB = {
	position: Vector2d;
	width: number;
	height: number;
};

export const aabbLeft = (aabb: AABB) => aabb.position.x;

export const aabbRight = (aabb: AABB) => aabb.position.x + aabb.width;

export const aabbTop = (aabb: AABB) => aabb.position.y;

export const aabbBottom = (aabb: AABB) => aabb.position.y + aabb.height;

export const intersects = (aabb1: AABB, aabb2: AABB) =>
	aabbLeft(aabb1) < aabbRight(aabb2) &&
	aabbRight(aabb1) > aabbLeft(aabb2) &&
	aabbTop(aabb1) < aabbBottom(aabb2) &&
	aabbBottom(aabb1) > aabbTop(aabb2);
