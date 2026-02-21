import { runMutationGame as runObjecs } from "./objecs/index.ts";
import { runMutationGame as runMiniplex } from "./miniplex/index.ts";
import type { MutationConfig } from "./types.ts";

export type EcsLibrary = "objecs" | "miniplex";

export const ALL_LIBRARIES: EcsLibrary[] = ["objecs", "miniplex"];

export interface MutationGameOptions {
	config?: Partial<MutationConfig>;
	duration?: number;
	library?: EcsLibrary;
}

export async function runMutationGame(options: MutationGameOptions = {}) {
	const library = options.library ?? "objecs";

	switch (library) {
		case "objecs":
			return runObjecs(options);
		case "miniplex":
			return runMiniplex(options);
		default:
			throw new Error(`Unknown ECS library: ${library as string}`);
	}
}

export { DEFAULT_CONFIG } from "./types.ts";
export type { MutationConfig } from "./types.ts";
