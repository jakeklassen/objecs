import * as miniplex from "miniplex";
import { bench, run, summary } from "mitata";
import * as objecs from "objecs";
import type { Split } from "type-fest";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ" as const;

type Alphabet = Split<typeof ALPHABET, "">[number];

type Entity = {
	[K in Alphabet]?: number;
} & {
	Data?: number;
};

const count = 100;

summary(() => {
	{
		const world = new objecs.World<Entity>();

		Array.from(ALPHABET).forEach((component) => {
			for (let i = 0; i < count; i++) {
				world.createEntity({ [component]: 1, Data: 1 });
			}
		});

		const withZ = world.archetype("Z");
		const withData = world.archetype("Data");

		bench("frag_iter [objecs]", () => {
			for (const entity of withZ.entities) {
				entity.Z *= 2;
			}

			for (const entity of withData.entities) {
				entity.Data *= 2;
			}
		});
	}

	{
		const world = new miniplex.World<Entity>();

		Array.from(ALPHABET).forEach((component) => {
			for (let i = 0; i < count; i++) {
				// @ts-ignore
				world.add({ [component]: 1, Data: 1 });
			}
		});

		const withZ = world.with("Z");
		const withData = world.with("Data");

		bench("frag_iter [miniplex]", () => {
			for (const entity of withZ.entities) {
				entity.Z *= 2;
			}

			for (const entity of withData.entities) {
				entity.Data *= 2;
			}
		});
	}
});

await run();
