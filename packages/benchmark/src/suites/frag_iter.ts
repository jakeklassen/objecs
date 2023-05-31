import Benchmark from "benchmark";
import { World } from "objecs";
import { Split } from "type-fest";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ" as const;

type Alphabet = Split<typeof ALPHABET, "">[number];

type Entity = {
	[K in Alphabet]?: number;
} & {
	Data?: number;
};

const count = 100;

const ecs = new World<Entity>();

Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ").forEach((component: keyof Entity) => {
	for (let i = 0; i < count; i++) {
		// @ts-ignore
		ecs.createEntity({ [component]: 1, Data: 1 });
	}
});

const withZ = ecs.archetype("Z");
const withData = ecs.archetype("Data");

const suite = new Benchmark.Suite();

suite
	.add("frag_iter", () => {
		for (const entity of withZ.entities) {
			entity.Z *= 2;
		}

		for (const entity of withData.entities) {
			entity.Data *= 2;
		}
	})
	.on("cycle", (event: Benchmark.Event) => {
		console.log(String(event.target));
	})
	.run({ async: true });
