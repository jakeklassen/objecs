import { World } from "objecs";
import Benchmark from "benchmark";

type Entity = {
	A?: number;
	B?: number;
};

const count = 1_000;

const ecs = new World<Entity>();

for (let i = 0; i < count; i++) {
	ecs.createEntity({ A: 1 });
}

const withA = ecs.archetype("A");
const withB = ecs.archetype("B");

const suite = new Benchmark.Suite();

suite
	.add("entity_cycle", () => {
		for (const _entity of withA.entities) {
			ecs.createEntity({ B: 1 });
		}

		for (const entity of withB.entities) {
			ecs.deleteEntity(entity);
		}
	})
	.on("cycle", (event: Benchmark.Event) => {
		console.log(String(event.target));
	})
	.run({ async: true });
