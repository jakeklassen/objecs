import { componentManager, createEntity } from "ecs";

const zFactory = (value = 0) => ({ Z: value });
const dataFactory = (value = 0) => ({ Data: value });

/**
 * @param {number} count
 */
export default (count) => {
	const withZ = componentManager(zFactory);
	const withData = componentManager(dataFactory);

	Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ").forEach((component) => {
		const componentFactory = (value = 0) => ({ [component]: value });
		const _componentManager = componentManager(componentFactory);

		for (let i = 0; i < count; i++) {
			const entity = createEntity();
			_componentManager.create(entity, 1);
			withData.create(entity, 1);
		}
	});

	return () => {
		for (const component of withZ) {
			component.Z *= 2;
		}

		for (const component of withData) {
			component.Data *= 2;
		}
	};
};
