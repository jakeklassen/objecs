import { World } from "objecs";
import { Entity } from "../entity.ts";

/**
 * Used for the player thruster to follow the player
 */
export function trackPlayerSystemFactory({ world }: { world: World<Entity> }) {
	const playerChildren = world.archetype("trackPlayer", "transform");
	const players = world.archetype("tagPlayer", "transform");

	return function trackPlayerSystem() {
		for (const player of players.entities) {
			for (const child of playerChildren.entities) {
				child.transform.position.x =
					player.transform.position.x + (child.trackPlayer.offset?.x ?? 0);
				child.transform.position.y =
					player.transform.position.y + (child.trackPlayer.offset?.y ?? 0);
			}
		}
	};
}
