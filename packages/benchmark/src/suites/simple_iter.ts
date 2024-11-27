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
			});
		}

		for (let i = 0; i < count; i++) {
			world.createEntity({
				A: 1,
				B: 1,
				C: 1,
			});
		}

		for (let i = 0; i < count; i++) {
			world.createEntity({
				A: 1,
				B: 1,
				C: 1,
				D: 1,
			});
		}

		for (let i = 0; i < count; i++) {
			world.createEntity({
				A: 1,
				B: 1,
				C: 1,
				E: 1,
			});
		}

		const withAB = world.archetype("A", "B");
		const withCD = world.archetype("C", "D");
		const withCE = world.archetype("C", "E");

		bench("simple_iter [objecs]", () => {
			for (const entity of withAB.entities) {
				[entity.A, entity.B] = [entity.B, entity.A];
			}

			for (const entity of withCD.entities) {
				[entity.C, entity.D] = [entity.D, entity.C];
			}

			for (const entity of withCE.entities) {
				[entity.C, entity.E] = [entity.E, entity.C];
			}
		});
	}

	{
		const world = new miniplex.World<Entity>();

		for (let i = 0; i < count; i++) {
			world.add({
				A: 1,
				B: 1,
			});
		}

		for (let i = 0; i < count; i++) {
			world.add({
				A: 1,
				B: 1,
				C: 1,
			});
		}

		for (let i = 0; i < count; i++) {
			world.add({
				A: 1,
				B: 1,
				C: 1,
				D: 1,
			});
		}

		for (let i = 0; i < count; i++) {
			world.add({
				A: 1,
				B: 1,
				C: 1,
				E: 1,
			});
		}

		const withAB = world.with("A", "B");
		const withCD = world.with("C", "D");
		const withCE = world.with("C", "E");

		bench("simple_iter [miniplex]", () => {
			for (const entity of withAB.entities) {
				[entity.A, entity.B] = [entity.B, entity.A];
			}

			for (const entity of withCD.entities) {
				[entity.C, entity.D] = [entity.D, entity.C];
			}

			for (const entity of withCE.entities) {
				[entity.C, entity.E] = [entity.E, entity.C];
			}
		});
	}
});

await run();
