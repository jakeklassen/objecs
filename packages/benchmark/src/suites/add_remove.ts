import * as miniplex from "miniplex";
import { bench, run, summary } from "mitata";
import * as objecs from "objecs";

type Entity = {
	A?: boolean;
	B?: boolean;
};

const count = 1_000;

summary(() => {
	{
		const world = new objecs.World<Entity>();

		for (let i = 0; i < count; i++) {
			world.createEntity({
				A: true,
			});
		}

		bench("add_remove [objecs]", () => {
			for (const entity of world.entities) {
				world.addEntityComponents(entity, "B", true);
			}

			for (const entity of world.entities) {
				world.removeEntityComponents(entity, "B");
			}
		});
	}

	{
		const world = new miniplex.World<Entity>();

		for (let i = 0; i < count; i++) {
			world.add({
				A: true,
			});
		}

		bench("add_remove [miniplex]", () => {
			for (const entity of world.entities) {
				world.addComponent(entity, "B", true);
			}

			for (const entity of world.entities) {
				world.removeComponent(entity, "B");
			}
		});
	}
});

await run();
