/**
 * for-of-vs-for-index-vs-foreach.ts
 *
 * Compares iteration patterns at realistic ECS scales. Each iteration performs
 * a position += velocity update to simulate real system workloads rather than
 * measuring empty loop overhead.
 */
import { run, bench, summary } from "mitata";

// --- Setup ---

type Entity = {
	position: { x: number; y: number };
	velocity: { x: number; y: number };
};

function makeEntities(n: number): Entity[] {
	return Array.from({ length: n }, (_, i) => ({
		position: { x: i, y: i },
		velocity: { x: 1, y: -1 },
	}));
}

// --- Benchmarks ---

for (const size of [100, 1000, 10_000]) {
	const entities = makeEntities(size);

	summary(() => {
		bench(`for-of — ${size} entities`, () => {
			for (const e of entities) {
				e.position.x += e.velocity.x;
				e.position.y += e.velocity.y;
			}
		});

		bench(`for (indexed) — ${size} entities`, () => {
			// oxlint-disable-next-line @typescript-eslint/prefer-for-of -- benchmarking indexed vs for-of
			for (let i = 0; i < entities.length; i++) {
				const e = entities[i];
				e.position.x += e.velocity.x;
				e.position.y += e.velocity.y;
			}
		});

		bench(`for (cached length) — ${size} entities`, () => {
			const len = entities.length;
			for (let i = 0; i < len; i++) {
				const e = entities[i];
				e.position.x += e.velocity.x;
				e.position.y += e.velocity.y;
			}
		});

		bench(`forEach — ${size} entities`, () => {
			entities.forEach((e) => {
				e.position.x += e.velocity.x;
				e.position.y += e.velocity.y;
			});
		});
	});
}

await run();
