import { GameEvent } from "../game-events.ts";
import { Input } from "../input.ts";
import { Scene } from "../scene.ts";

export function triggerGameWonSystemFactory({
	input,
	scene,
}: {
	input: Input;
	scene: Scene;
}) {
	return function triggerGameWonSystem() {
		if (input.win.query()) {
			scene.emit(GameEvent.GameWon);
		}
	};
}
