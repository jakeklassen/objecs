import { World } from "objecs";

/**
 * @typedef {Object} Entity
 * @property {boolean} [A]
 * @property {boolean} [B]
 */

/**
 * @param {number} count
 */
export default async (count) => {
	/**
	 * @type {World<Entity>}
	 */
	const ecs = new World();

	for (let i = 0; i < count; i++) {
		ecs.createEntity({
			A: true,
		});
	}

	return () => {
		for (const entity of ecs.entities) {
			ecs.addEntityComponents(entity, "B", true);
		}

		for (const entity of ecs.entities) {
			ecs.removeEntityComponents(entity, "B");
		}
	};
};
