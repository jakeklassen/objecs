import { parseArgs } from "node:util";
import {
	runBoidsGame,
	ALL_LIBRARIES as BOIDS_LIBRARIES,
	type EcsLibrary as BoidsEcsLibrary,
} from "./games/boids/index.ts";
import {
	runAntSimulationGame,
	ALL_LIBRARIES as ANT_LIBRARIES,
	type EcsLibrary as AntEcsLibrary,
} from "./games/ant-simulation/index.ts";
import {
	runMutationGame,
	ALL_LIBRARIES as MUTATION_LIBRARIES,
	type EcsLibrary as MutationEcsLibrary,
} from "./games/mutation/index.ts";

type GameType = "boids" | "ants" | "mutation";

const { values } = parseArgs({
	allowNegative: true,
	options: {
		game: {
			type: "string",
			short: "g",
			default: "boids",
		},
		lib: {
			type: "string",
			short: "l",
			multiple: true,
		},
		duration: {
			type: "string",
			short: "d",
			default: "10",
		},
		count: {
			type: "string",
			short: "c",
			default: "500",
		},
		headless: {
			type: "boolean",
		},
		render: {
			type: "boolean",
		},
		trials: {
			type: "string",
			short: "t",
			default: "1",
		},
		help: {
			type: "boolean",
			default: false,
		},
	},
});

if (values.help) {
	console.log(`
Game Benchmark - ECS Performance Testing

Usage: pnpm start [options]

Options:
  -g, --game <name>      Game to run (default: boids)
  -l, --lib <name>       ECS library to test (can specify multiple, default: all)
  -d, --duration <secs>  Duration in seconds per library (default: 10)
  -c, --count <num>      Entity count (default: 500 boids, 50 ants, 1000 mutation)
  -t, --trials <num>     Number of trials per library (default: 1)
      --headless         Run without window
      --no-headless      Run with window (show each lib sequentially)
      --no-render        Skip all rendering (isolate ECS performance)
      --help             Show this help

Libraries:
  objecs     objecs ECS library (workspace)
  miniplex   miniplex ECS library

Games:
  boids      Flocking simulation with separation, alignment, and cohesion
  ants       Ant colony simulation with pheromone trails
  mutation   Component mutation stress test (add/remove components)

Defaults:
  - Single library: shows window
  - Multiple libraries: headless (use --no-headless to show windows)

Examples:
  pnpm start                                    # Compare all libs (headless)
  pnpm start --no-headless                      # Compare all libs (with windows)
  pnpm start --lib objecs                       # Run only objecs (with window)
  pnpm start --lib objecs --lib miniplex        # Compare specific libs
  pnpm start -c 1000 -d 30                      # 1000 boids, 30s per lib
  pnpm start -g ants                            # Run ant simulation
  pnpm start -g ants -c 100                     # 100 ants
  pnpm start -g mutation                        # Run mutation benchmark
  pnpm start --no-render -g boids -d 5          # Boids without rendering
  pnpm start --no-render -g boids -d 5 -t 10   # 10 trials, no rendering
`);
	process.exit(0);
}

const VALID_GAMES: GameType[] = ["boids", "ants", "mutation"];
const game = values.game as GameType;

if (!VALID_GAMES.includes(game)) {
	console.error(
		`Unknown game: "${game}". Valid options: ${VALID_GAMES.join(", ")}`,
	);
	process.exit(1);
}

const duration = parseInt(values.duration, 10);
const count = parseInt(values.count, 10);
const trials = parseInt(values.trials, 10);
const skipRender = values.render === false;

// Get available libraries for the selected game
function getAvailableLibraries(gameType: GameType): string[] {
	switch (gameType) {
		case "boids":
			return [...BOIDS_LIBRARIES];
		case "ants":
			return [...ANT_LIBRARIES];
		case "mutation":
			return [...MUTATION_LIBRARIES];
		default:
			return [];
	}
}

// Determine which libraries to run
let libraries: string[];
const availableLibraries = getAvailableLibraries(game);
if (values.lib && values.lib.length > 0) {
	const invalid = values.lib.filter((l) => !availableLibraries.includes(l));
	if (invalid.length > 0) {
		console.error(
			`Unknown libraries for "${game}": ${invalid.join(", ")}. Valid: ${availableLibraries.join(", ")}`,
		);
		process.exit(1);
	}
	libraries = values.lib;
} else {
	libraries = availableLibraries;
}

const isComparison = libraries.length > 1;

// Determine window mode:
// - Explicit --headless: no window
// - Explicit --no-headless: show window
// - Not specified: headless for comparisons, window for single lib
// - mutation game is always headless
let showWindow: boolean;
if (game === "mutation" || skipRender) {
	showWindow = false;
} else if (values.headless === true) {
	showWindow = false;
} else if (values.headless === false) {
	showWindow = true;
} else {
	// Not specified - default based on mode
	showWindow = !isComparison;
}

console.log("Game Benchmark - ECS Performance Testing");
console.log("========================================");
console.log(`Game: ${game}`);
console.log(`Libraries: ${libraries.join(", ")}`);
console.log(`Duration: ${duration}s per library`);
console.log(`Entity Count: ${count}`);
console.log(
	`Mode: ${isComparison ? "comparison" : "single"}${showWindow ? " (with window)" : " (headless)"}${skipRender ? " (no-render)" : ""}`,
);
if (trials > 1) {
	console.log(`Trials: ${trials}`);
}
console.log("");

function calcStats(values: number[]): { mean: number; stddev: number } {
	const n = values.length;
	if (n === 0) return { mean: 0, stddev: 0 };
	const mean = values.reduce((a, b) => a + b, 0) / n;
	if (n === 1) return { mean, stddev: 0 };
	const variance =
		values.reduce((sum, v) => sum + (v - mean) * (v - mean), 0) / (n - 1);
	return { mean, stddev: Math.sqrt(variance) };
}

interface TrialResult {
	avgFps: number;
	avgFrameTime: number;
	frameCount: number;
	systemTimings: Map<string, number>; // system name -> avg ms per call
}

interface BenchmarkResult {
	library: string;
	trialCount: number;
	fps: { mean: number; stddev: number };
	frameTime: { mean: number; stddev: number };
	systemTimings: Map<string, { mean: number; stddev: number }>;
}

async function runSingleTrial(lib: string): Promise<TrialResult> {
	switch (game) {
		case "boids": {
			const result = await runBoidsGame({
				config: { count },
				duration,
				showWindow,
				skipRender,
				library: lib as BoidsEcsLibrary,
			});

			const frameStats = result.profiler.getFrameStats();
			const systemTimings = new Map<string, number>();

			for (const [name, timing] of result.profiler.getAllTimings()) {
				systemTimings.set(name, timing.totalTime / timing.callCount);
			}

			return {
				avgFps: frameStats.avgFps,
				avgFrameTime: frameStats.avgMs,
				frameCount: result.frameCount,
				systemTimings,
			};
		}

		case "ants": {
			const result = await runAntSimulationGame({
				config: { antCount: count },
				duration,
				showWindow,
				skipRender,
				library: lib as AntEcsLibrary,
			});

			const frameStats = result.profiler.getFrameStats();
			const systemTimings = new Map<string, number>();

			for (const [name, timing] of result.profiler.getAllTimings()) {
				systemTimings.set(name, timing.totalTime / timing.callCount);
			}

			return {
				avgFps: frameStats.avgFps,
				avgFrameTime: frameStats.avgMs,
				frameCount: result.frameCount,
				systemTimings,
			};
		}

		case "mutation": {
			const result = await runMutationGame({
				config: { entityCount: count },
				duration,
				library: lib as MutationEcsLibrary,
			});

			const frameStats = result.profiler.getFrameStats();
			const systemTimings = new Map<string, number>();

			for (const [name, timing] of result.profiler.getAllTimings()) {
				systemTimings.set(name, timing.totalTime / timing.callCount);
			}

			return {
				avgFps: frameStats.avgFps,
				avgFrameTime: frameStats.avgMs,
				frameCount: result.frameCount,
				systemTimings,
			};
		}

		default:
			throw new Error(`Unknown game: ${game as string}`);
	}
}

const results: BenchmarkResult[] = [];

for (const lib of libraries) {
	console.log(`\n${"=".repeat(50)}`);
	console.log(`Running: ${lib}`);
	console.log("=".repeat(50));

	const trialResults: TrialResult[] = [];

	for (let trial = 0; trial < trials; trial++) {
		if (trials > 1) {
			console.log(`\n  Trial ${trial + 1}/${trials}:`);
		}

		const result = await runSingleTrial(lib);
		trialResults.push(result);

		if (trials > 1) {
			console.log(
				`  => ${result.avgFps.toFixed(1)} FPS (${result.frameCount} frames)`,
			);
		}
	}

	// Aggregate trial results
	const fpsValues = trialResults.map((t) => t.avgFps);
	const frameTimeValues = trialResults.map((t) => t.avgFrameTime);

	// Collect all system names across trials
	const allSystemNames = new Set<string>();
	for (const trial of trialResults) {
		for (const name of trial.systemTimings.keys()) {
			allSystemNames.add(name);
		}
	}

	const systemTimings = new Map<string, { mean: number; stddev: number }>();
	for (const name of allSystemNames) {
		const timingValues = trialResults
			.map((t) => t.systemTimings.get(name))
			.filter((v): v is number => v != null);
		systemTimings.set(name, calcStats(timingValues));
	}

	results.push({
		library: lib,
		trialCount: trials,
		fps: calcStats(fpsValues),
		frameTime: calcStats(frameTimeValues),
		systemTimings,
	});
}

// Print comparison report if multiple libraries
if (results.length > 1) {
	console.log(`\n${"=".repeat(60)}`);
	console.log("COMPARISON REPORT");
	console.log("=".repeat(60));

	const isMultiTrial = trials > 1;

	// Sort by FPS (higher is better)
	const sorted = [...results].sort((a, b) => b.fps.mean - a.fps.mean);
	const best = sorted[0];

	console.log("\n📊 Overall Performance (sorted by FPS):\n");

	if (isMultiTrial) {
		console.log(
			"Library".padEnd(12) +
				"Avg FPS".padStart(18) +
				"Avg Frame".padStart(18) +
				"  Diff",
		);
		console.log("-".repeat(60));

		for (const result of sorted) {
			const diff =
				result === best
					? "👑 BEST"
					: `${(((best.fps.mean - result.fps.mean) / best.fps.mean) * 100).toFixed(1)}% slower`;

			const fpsStr = `${result.fps.mean.toFixed(1)} ± ${result.fps.stddev.toFixed(1)}`;
			const frameStr = `${result.frameTime.mean.toFixed(2)} ± ${result.frameTime.stddev.toFixed(2)}ms`;

			console.log(
				result.library.padEnd(12) +
					fpsStr.padStart(18) +
					frameStr.padStart(18) +
					`  ${diff}`,
			);
		}
	} else {
		console.log(
			"Library".padEnd(12) +
				"Avg FPS".padStart(10) +
				"Avg Frame".padStart(12) +
				"  Diff",
		);
		console.log("-".repeat(48));

		for (const result of sorted) {
			const diff =
				result === best
					? "👑 BEST"
					: `${(((best.fps.mean - result.fps.mean) / best.fps.mean) * 100).toFixed(1)}% slower`;

			console.log(
				result.library.padEnd(12) +
					result.fps.mean.toFixed(1).padStart(10) +
					`${result.frameTime.mean.toFixed(2)}ms`.padStart(12) +
					`  ${diff}`,
			);
		}
	}

	// System timing comparison
	console.log("\n📈 System Timings (avg ms per call):\n");

	const allSystems = new Set<string>();
	for (const result of results) {
		for (const name of result.systemTimings.keys()) {
			allSystems.add(name);
		}
	}

	if (isMultiTrial) {
		const colWidth = 20;
		const systemHeader =
			"System".padEnd(15) +
			results.map((r) => r.library.padStart(colWidth)).join("");
		console.log(systemHeader);
		console.log("-".repeat(15 + results.length * colWidth));

		for (const system of allSystems) {
			let line = system.padEnd(15);
			let bestTime = Infinity;
			let bestLib = "";

			for (const result of results) {
				const timing = result.systemTimings.get(system);
				if (timing && timing.mean < bestTime) {
					bestTime = timing.mean;
					bestLib = result.library;
				}
			}

			for (const result of results) {
				const timing = result.systemTimings.get(system);
				if (timing) {
					const marker = result.library === bestLib ? "*" : " ";
					const str = `${timing.mean.toFixed(3)} ± ${timing.stddev.toFixed(3)}${marker}`;
					line += str.padStart(colWidth);
				} else {
					line += "-".padStart(colWidth);
				}
			}
			console.log(line);
		}
	} else {
		const systemHeader =
			"System".padEnd(15) + results.map((r) => r.library.padStart(12)).join("");
		console.log(systemHeader);
		console.log("-".repeat(15 + results.length * 12));

		for (const system of allSystems) {
			let line = system.padEnd(15);
			let bestTime = Infinity;
			let bestLib = "";

			for (const result of results) {
				const timing = result.systemTimings.get(system);
				if (timing && timing.mean < bestTime) {
					bestTime = timing.mean;
					bestLib = result.library;
				}
			}

			for (const result of results) {
				const timing = result.systemTimings.get(system);
				if (timing) {
					const marker = result.library === bestLib ? "*" : " ";
					line += `${timing.mean.toFixed(3)}${marker}`.padStart(12);
				} else {
					line += "-".padStart(12);
				}
			}
			console.log(line);
		}
	}

	console.log("\n* = fastest for this system");
	console.log("");
}
