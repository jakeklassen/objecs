import { componentManager, createEntity } from "ecs";

const aFactory = (value = 0) => ({ A: value });
const bFactory = (value = 0) => ({ B: value });
const cFactory = (value = 0) => ({ C: value });
const dFactory = (value = 0) => ({ D: value });
const eFactory = (value = 0) => ({ E: value });

/**
 * @param {number} count
 */
export default (count) => {
	const withA = componentManager(aFactory);
	const withB = componentManager(bFactory);
	const withC = componentManager(cFactory);
	const withD = componentManager(dFactory);
	const withE = componentManager(eFactory);

	for (let i = 0; i < count; i++) {
		const entity = createEntity();
		withA.create(entity);
		withB.create(entity);
		withC.create(entity);
		withD.create(entity);
		withE.create(entity);
	}

	return () => {
		for (const component of withA) {
			component.A *= 2;
		}

		for (const component of withB) {
			component.B *= 2;
		}

		for (const component of withC) {
			component.C *= 2;
		}

		for (const component of withD) {
			component.D *= 2;
		}

		for (const component of withE) {
			component.E *= 2;
		}
	};
};
