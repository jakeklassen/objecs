// @ts-check
import { World } from "miniplex";

/**
 * @param {number} count
 */ export default async (count) => {
	const ecs = new World();

	Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ").forEach((component) => {
		for (let i = 0; i < count; i++) {
			ecs.add({ [component]: 1, Data: 1 });
		}
	});

	const withZ = ecs.with("Z");
	const withData = ecs.with("Data");

	return () => {
		for (const entity of withZ.entities) {
			entity.Z *= 2;
		}

		for (const entity of withData.entities) {
			entity.Data *= 2;
		}
	};
};
