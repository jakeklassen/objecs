import { runAntSimulationGame as runObjecs } from "./objecs/index.ts";
import { runAntSimulationGame as runMiniplex } from "./miniplex/index.ts";
import type { AntSimulationConfig } from "./types.ts";

export type EcsLibrary = "objecs" | "miniplex";

export const ALL_LIBRARIES: EcsLibrary[] = ["objecs", "miniplex"];

export interface AntSimulationGameOptions {
	config?: Partial<AntSimulationConfig>;
	duration?: number;
	showWindow?: boolean;
	skipRender?: boolean;
	library?: EcsLibrary;
}

export async function runAntSimulationGame(
	options: AntSimulationGameOptions = {},
) {
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
export type { AntSimulationConfig } from "./types.ts";
