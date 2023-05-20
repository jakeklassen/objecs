import { SharedEntity } from "../shared-entity.ts";

export function rectangleFactory(
	width: number,
	height: number,
): NonNullable<SharedEntity["rectangle"]> {
	return {
		width,
		height,
	};
}
