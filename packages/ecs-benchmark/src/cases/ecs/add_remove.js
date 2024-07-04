import { componentManager, createEntity } from "ecs";

/**
 *
 * @param {boolean} value
 * @returns
 */
const aFactory = (value = true) => ({ A: value });

/**
 *
 * @param {boolean} value
 * @returns
 */
const bFactory = (value = true) => ({ B: value });

/**
 * @param {number} count
 */
export default async (count) => {
	const withA = componentManager(aFactory);
	const withB = componentManager(bFactory);

	for (let i = 0; i < count; i++) {
		withA.create(createEntity());
	}

	return () => {
		for (let i = 0; i < withA.count(); ++i) {
			const entity = withA.getEntity(i);
			withB.create(entity);
		}

		for (let i = 0; i < withB.count(); ++i) {
			const entity = withB.getEntity(i);
			withB.remove(entity);
		}
	};
};
