import { World } from "objecs";

/**
 * @typedef {Object} Entity
 * @property {number} [A]
 * @property {number} [B]
 * @property {number} [C]
 * @property {number} [D]
 * @property {number} [E]
 */

/**
 * @param {number} count
 */
export default (count) => {
	/**
	 * @type {World<Entity>}
	 *
	 */
	let ecs = new World();

	for (let i = 0; i < count; i++) {
		ecs.createEntity({ A: 1, B: 1, C: 1, D: 1, E: 1 });
	}

	const withA = ecs.archetype("A");
	const withB = ecs.archetype("B");
	const withC = ecs.archetype("C");
	const withD = ecs.archetype("D");
	const withE = ecs.archetype("E");

	return () => {
		for (const entity of withA.entities) {
			entity.A *= 2;
		}

		for (const entity of withB.entities) {
			entity.B *= 2;
		}

		for (const entity of withC.entities) {
			entity.C *= 2;
		}

		for (const entity of withD.entities) {
			entity.D *= 2;
		}

		for (const entity of withE.entities) {
			entity.E *= 2;
		}
	};
};
