import { TextBuffer } from "#/lib/pixel-text/text-buffer.ts";
import { World } from "objecs";
import { Entity } from "../entity.ts";
import { GameState } from "../game-state.ts";

/**
 * System to update the cherry text to reflect the current number of cherries.
 */
export function cherryTextSystemFactory({
	gameState,
	textCache,
	world,
}: {
	gameState: GameState;
	textCache: Map<Entity, TextBuffer>;
	world: World<Entity>;
}) {
	const cherryTextEntities = world.archetype("tagTextCherries", "text");
	const previousState = structuredClone(gameState);

	return function cherryTextSystem() {
		if (gameState.cherries === previousState.cherries) {
			return;
		}

		previousState.cherries = gameState.cherries;

		for (const entity of cherryTextEntities.entities) {
			const textBuffer = textCache.get(entity);

			textBuffer?.updateText(`${gameState.cherries}`);
		}
	};
}
