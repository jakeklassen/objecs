import { GameEvent } from "../game-events.ts";
import { Input } from "../input.ts";
import { Scene } from "../scene.ts";

export function triggerGameOverSystemFactory({
	input,
	scene,
}: {
	input: Input;
	scene: Scene;
}) {
	return function triggerGameOverSystem() {
		if (input.quit.query()) {
			scene.emit(GameEvent.GameOver);
		}
	};
}
