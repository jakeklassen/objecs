import * as miniplex from "miniplex";
import { bench, run, summary } from "mitata";
import * as objecs from "objecs";

const count = 1_000;

type Entity = {
	A?: number;
	B?: number;
	C?: number;
	D?: number;
	E?: number;
};

summary(() => {
	{
		const world = new objecs.World<Entity>();

		for (let i = 0; i < count; i++) {
			world.createEntity({
				A: 1,
				B: 1,
				C: 1,
				D: 1,
				E: 1,
			});
		}

		const withA = world.archetype("A");
		const withB = world.archetype("B");
		const withC = world.archetype("C");
		const withD = world.archetype("D");
		const withE = world.archetype("E");

		bench("packed_5 [objecs]", () => {
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
		});
	}

	{
		const world = new miniplex.World<Entity>();

		for (let i = 0; i < count; i++) {
			world.add({
				A: 1,
				B: 1,
				C: 1,
				D: 1,
				E: 1,
			});
		}

		const withA = world.with("A");
		const withB = world.with("B");
		const withC = world.with("C");
		const withD = world.with("D");
		const withE = world.with("E");

		bench("packed_5 [miniplex]", () => {
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
		});
	}
});

await run();
