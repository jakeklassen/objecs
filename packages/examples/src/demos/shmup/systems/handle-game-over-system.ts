import { World } from "objecs";
import { Entity } from "../entity.ts";
import { GameEvent } from "../game-events.ts";
import { Scene } from "../scene.ts";

export function handleGameOverSystemFactory({
	scene,
	world,
}: {
	scene: Scene;
	world: World<Entity>;
}) {
	const events = world.archetype("eventGameOver");

	return () => {
		if (events.entities.size === 0) {
			return;
		}

		// cleanup
		for (const entity of events.entities) {
			world.deleteEntity(entity);
		}

		scene.emit(GameEvent.GameOver);
	};
}
