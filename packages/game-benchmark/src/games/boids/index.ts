import { runBoidsGame as runObjecs } from "./objecs/index.ts";
import { runBoidsGame as runMiniplex } from "./miniplex/index.ts";
import type { BoidsConfig } from "./types.ts";

export type EcsLibrary = "objecs" | "miniplex";

export const ALL_LIBRARIES: EcsLibrary[] = ["objecs", "miniplex"];

export interface BoidsGameOptions {
	config?: Partial<BoidsConfig>;
	duration?: number;
	showWindow?: boolean;
	library?: EcsLibrary;
}

export async function runBoidsGame(options: BoidsGameOptions = {}) {
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
export type { BoidsConfig } from "./types.ts";
