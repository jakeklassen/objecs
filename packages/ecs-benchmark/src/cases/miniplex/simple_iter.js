// @ts-check
import { World } from "miniplex";

export default async (count) => {
	const ecs = new World();

	for (let i = 0; i < count; i++) {
		ecs.add({ A: 1, B: 1 });
	}

	for (let i = 0; i < count; i++) {
		ecs.add({ A: 1, B: 1, C: 1 });
	}

	for (let i = 0; i < count; i++) {
		ecs.add({ A: 1, B: 1, C: 1, D: 1 });
	}

	for (let i = 0; i < count; i++) {
		ecs.add({ A: 1, B: 1, C: 1, E: 1 });
	}

	const withAB = ecs.with("A", "B");
	const withCD = ecs.with("C", "D");
	const withCE = ecs.with("C", "E");

	return () => {
		for (const entity of withAB.entities) {
			const temp = entity.A;
			entity.A = entity.B;
			entity.B = temp;
		}

		for (const entity of withCD.entities) {
			const temp = entity.C;
			entity.C = entity.D;
			entity.D = temp;
		}

		for (const entity of withCE.entities) {
			const temp = entity.C;
			entity.C = entity.E;
			entity.E = temp;
		}
	};
};
