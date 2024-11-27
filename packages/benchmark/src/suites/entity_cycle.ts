import * as miniplex from "miniplex";
import { bench, run, summary } from "mitata";
import * as objecs from "objecs";

type Entity = {
	A?: number;
	B?: number;
};

const count = 1_000;

summary(() => {
	{
		const world = new objecs.World<Entity>();

		for (let i = 0; i < count; i++) {
			world.createEntity({
				A: 1,
			});
		}

		const withA = world.archetype("A");
		const withB = world.archetype("B");

		bench("entity_cycle [objecs]", () => {
			for (const _entity of withA.entities) {
				world.createEntity({ B: 1 });
			}

			for (const entity of withB.entities) {
				world.deleteEntity(entity);
			}
		});
	}

	{
		const world = new miniplex.World<Entity>();

		for (let i = 0; i < count; i++) {
			world.add({
				A: 1,
			});
		}

		const withA = world.with("A");
		const withB = world.with("B");

		bench("entity_cycle [miniplex]", () => {
			for (const _entity of withA.entities) {
				world.add({ B: 1 });
			}

			for (const entity of withB.entities) {
				world.remove(entity);
			}
		});
	}
});

await run();
