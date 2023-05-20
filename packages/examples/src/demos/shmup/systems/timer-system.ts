import { Timer } from "../timer.ts";

export function timerSystemFactory({ timer }: { timer: Timer }) {
	return function timerSystem(dt: number) {
		timer.update(dt);
	};
}
