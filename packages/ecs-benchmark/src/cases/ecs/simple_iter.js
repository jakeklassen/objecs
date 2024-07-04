// @ts-check

import { createEntity, componentManager } from "ecs";

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
		withA.create(entity, 1);
		withB.create(entity, 1);
	}

	for (let i = 0; i < count; i++) {
		const entity = createEntity();
		withA.create(entity, 1);
		withB.create(entity, 1);
		withC.create(entity, 1);
	}

	for (let i = 0; i < count; i++) {
		const entity = createEntity();
		withA.create(entity, 1);
		withB.create(entity, 1);
		withC.create(entity, 1);
		withD.create(entity, 1);
	}

	for (let i = 0; i < count; i++) {
		const entity = createEntity();
		withA.create(entity, 1);
		withB.create(entity, 1);
		withC.create(entity, 1);
		withE.create(entity, 1);
	}

	return () => {
		for (const entity of withA.entities) {
			const componentA = withA.getComponent(entity);
			const componentB = withB.getComponent(entity);

			if (componentA && componentB) {
				[componentA.A, componentB.B] = [componentB.B, componentA.A];
			}
		}

		for (const entity of withC.entities) {
			const componentC = withC.getComponent(entity);
			const componentD = withD.getComponent(entity);

			if (componentC && componentD) {
				[componentC.C, componentD.D] = [componentD.D, componentC.C];
			}
		}

		for (const entity of withC.entities) {
			const componentC = withC.getComponent(entity);
			const componentE = withE.getComponent(entity);

			if (componentC && componentE) {
				[componentC.C, componentE.E] = [componentE.E, componentC.C];
			}
		}
	};
};
