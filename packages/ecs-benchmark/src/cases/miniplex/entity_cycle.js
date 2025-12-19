// @ts-check
import { World } from "miniplex";

/**
 * @param {number} count
 */
export default (count) => {
	const ecs = new World();

	for (let i = 0; i < count; i++) {
		ecs.add({ A: 1 });
	}

	const withA = ecs.with("A");
	const withB = ecs.with("B");

	return () => {
		for (const entity of withA.entities) {
			ecs.add({ B: 1 });
		}

		for (let i = withB.entities.length; i > 0; i--) {
			const entity = withB.entities[i - 1];
			ecs.remove(entity);
		}
	};
};
