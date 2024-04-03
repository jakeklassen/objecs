import { World } from "objecs";
import { Entity } from "../entity.ts";

export function muzzleFlashSystemFactory({ world }: { world: World<Entity> }) {
	const muzzleFlashes = world.archetype(
		"muzzleFlash",
		"trackPlayer",
		"transform",
	);
	const players = world.archetype("tagPlayer", "transform");

	return function muzzleFlashSystem(dt: number) {
		const [player] = players.entities;

		for (const entity of muzzleFlashes.entities) {
			const { muzzleFlash, trackPlayer, transform } = entity;
			muzzleFlash.elapsed += dt;
			muzzleFlash.size -= 0.5;

			transform.position.x = player.transform.position.x + trackPlayer.offset.x;
			transform.position.y = player.transform.position.y + trackPlayer.offset.y;

			if (
				muzzleFlash.size < 0 ||
				muzzleFlash.elapsed >= muzzleFlash.durationMs
			) {
				world.deleteEntity(entity);
			}
		}
	};
}
