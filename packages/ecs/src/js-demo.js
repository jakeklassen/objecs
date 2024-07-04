import { componentManager } from "./component-manager.js";
import { createEntity } from "./entity.js";

export * from "./entity.js";
export * from "./component-manager.js";

const entity = createEntity();

/**
 * @typedef {Object} Position
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {Object} Mass
 * @property {number} value
 */

const positionFactory = (x = 0, y = 0) => /** @type {Position} */ ({ x, y });
const massFactory = (value = 0) => /** @type {Mass} */ ({ value });

const positions = componentManager(positionFactory);
const position = positions.create(entity);

const masses = componentManager(massFactory);
const mass = masses.create(entity, 12);

console.log({
	entity,
	position,
	mass,
});

for (let i = 0; i < positions.count(); ++i) {
	const position = positions.get(i);
	const entity = positions.getEntity(i);

	const mass = masses.getComponent(entity);
	if (mass != null) {
		console.log({
			entity,
			position,
			mass,
		});
	} else {
		console.log({ entity, position });
	}
}

masses.remove(entity);

for (let i = 0; i < positions.count(); ++i) {
	const position = positions.get(i);
	const entity = positions.getEntity(i);

	const mass = masses.getComponent(entity);
	if (mass != null) {
		console.log({
			entity,
			position,
			mass,
		});
	} else {
		console.log({ entity, position });
	}
}

for (const position of positions) {
	position;
	// ^?
}
