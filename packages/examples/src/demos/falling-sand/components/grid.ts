import { Entity } from "../entity.ts";

export function gridFactory(
	width: number,
	height: number,
	entityGrid: Entity[],
) {
	return {
		width,
		height,
		entities: entityGrid,
	};
}
