import Benchmark from "benchmark";
import { World } from "objecs";

const count = 1_000;

type Entity = {
	A?: number;
	B?: number;
	C?: number;
	D?: number;
	E?: number;
};

const ecs = new World<Entity>();

for (let i = 0; i < count; i++) {
	ecs.createEntity({ A: 1, B: 1 });
}

for (let i = 0; i < count; i++) {
	ecs.createEntity({ A: 1, B: 1, C: 1 });
}

for (let i = 0; i < count; i++) {
	ecs.createEntity({ A: 1, B: 1, C: 1, D: 1 });
}

for (let i = 0; i < count; i++) {
	ecs.createEntity({ A: 1, B: 1, C: 1, E: 1 });
}

const withAB = ecs.archetype("A", "B");
const withCD = ecs.archetype("C", "D");
const withCE = ecs.archetype("C", "E");

const suite = new Benchmark.Suite();

suite
	.add("simple_iter", () => {
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
	})
	.on("cycle", (event: Benchmark.Event) => {
		console.log(String(event.target));
	})
	.run({ async: true });
