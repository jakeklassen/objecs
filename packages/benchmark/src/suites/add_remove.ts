import { World } from "objecs";
import Benchmark from "benchmark";

type Entity = {
	A?: boolean;
	B?: boolean;
};

const count = 1_000;

const ecs = new World<Entity>();

for (let i = 0; i < count; i++) {
	ecs.createEntity({
		A: true,
	});
}

const suite = new Benchmark.Suite();

suite
	.add("add_remove", () => {
		for (const entity of ecs.entities) {
			ecs.addEntityComponents(entity, "B", true);
		}

		for (const entity of ecs.entities) {
			ecs.removeEntityComponents(entity, "B");
		}
	})
	.on("cycle", (event: Benchmark.Event) => {
		console.log(String(event.target));
	})
	.run({ async: true });
