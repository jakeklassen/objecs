import { AudioManager } from "#/lib/audio-manager.ts";
import { World } from "objecs";
import { Entity } from "../entity.ts";

export function soundSystemFactory({
	audioManager,
	world,
}: {
	audioManager: AudioManager;
	world: World<Entity>;
}) {
	const soundEvents = world.archetype("eventPlaySound");

	return function soundSystem() {
		for (const soundEvent of soundEvents.entities) {
			audioManager.play(
				soundEvent.eventPlaySound.track,
				soundEvent.eventPlaySound.options,
			);

			world.deleteEntity(soundEvent);
		}
	};
}
