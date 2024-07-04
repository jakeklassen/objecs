import { componentManager, createEntity } from "ecs";

const aFactory = (value = 0) => ({ A: value });
const bFactory = (value = 0) => ({ B: value });

/**
 * @param {number} count
 */
export default (count) => {
	const withA = componentManager(aFactory);
	const withB = componentManager(bFactory);

	for (let i = 0; i < count; i++) {
		const entity = createEntity();

		withA.create(entity, 1);
	}

	return () => {
		for (const entity of withA.entities) {
			withB.create(entity, 1);
		}

		for (const entity of withB.entities) {
			withB.remove(entity);
		}
	};
};
