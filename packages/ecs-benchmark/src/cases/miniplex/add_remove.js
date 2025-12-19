// @ts-check
import { World } from "miniplex";

/**
 * @param {number} count
 */
export default async (count) => {
	const ecs = new World();

	for (let i = 0; i < count; i++) {
		ecs.add({ A: true });
	}

	return () => {
		for (const entity of ecs.entities) {
			ecs.addComponent(entity, "B", true);
		}

		for (const entity of ecs.entities) {
			ecs.removeComponent(entity, "B");
		}
	};
};
