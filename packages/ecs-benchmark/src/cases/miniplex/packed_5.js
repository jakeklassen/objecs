// @ts-check
import { World } from "miniplex";

export default async (count) => {
	const ecs = new World();

	for (let i = 0; i < count; i++) {
		ecs.add({ A: 1, B: 1, C: 1, D: 1, E: 1 });
	}

	const withA = ecs.with("A");
	const withB = ecs.with("B");
	const withC = ecs.with("C");
	const withD = ecs.with("D");
	const withE = ecs.with("E");

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
