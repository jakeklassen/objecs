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

type GameType = "boids" | "ants";

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
  -c, --count <num>      Entity count (default: 500 boids, 50 ants)
      --headless         Run without window
      --no-headless      Run with window (show each lib sequentially)
      --help             Show this help

Libraries:
  objecs     objecs ECS library (workspace)
  miniplex   miniplex ECS library

Games:
  boids    Flocking simulation with separation, alignment, and cohesion
  ants     Ant colony simulation with pheromone trails

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
`);
	process.exit(0);
}

const game = values.game as GameType;
const duration = parseInt(values.duration, 10);
const count = parseInt(values.count, 10);

// Get available libraries for the selected game
function getAvailableLibraries(gameType: GameType): string[] {
	switch (gameType) {
		case "boids":
			return [...BOIDS_LIBRARIES];
		case "ants":
			return [...ANT_LIBRARIES];
		default:
			return [];
	}
}

// Determine which libraries to run
let libraries: string[];
const availableLibraries = getAvailableLibraries(game);
if (values.lib && values.lib.length > 0) {
	libraries = values.lib;
} else {
	libraries = availableLibraries;
}

const isComparison = libraries.length > 1;

// Determine window mode:
// - Explicit --headless: no window
// - Explicit --no-headless: show window
// - Not specified: headless for comparisons, window for single lib
let showWindow: boolean;
if (values.headless === true) {
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
console.log(`Mode: ${isComparison ? "comparison" : "single"}${showWindow ? " (with window)" : " (headless)"}`);
console.log("");

interface BenchmarkResult {
	library: string;
	frameCount: number;
	avgFps: number;
	avgFrameTime: number;
	minFrameTime: number;
	maxFrameTime: number;
	systemTimings: Map<string, { avg: number; total: number }>;
}

const results: BenchmarkResult[] = [];

for (const lib of libraries) {
	console.log(`\n${"=".repeat(50)}`);
	console.log(`Running: ${lib}`);
	console.log("=".repeat(50));

	switch (game) {
		case "boids": {
			const result = await runBoidsGame({
				config: { count },
				duration,
				showWindow,
				library: lib as BoidsEcsLibrary,
			});

			const frameStats = result.profiler.getFrameStats();
			const systemTimings = new Map<string, { avg: number; total: number }>();

			for (const [name, timing] of result.profiler.getAllTimings()) {
				systemTimings.set(name, {
					avg: timing.totalTime / timing.callCount,
					total: timing.totalTime,
				});
			}

			results.push({
				library: lib,
				frameCount: result.frameCount,
				avgFps: frameStats.avgFps,
				avgFrameTime: frameStats.avgMs,
				minFrameTime: frameStats.minMs,
				maxFrameTime: frameStats.maxMs,
				systemTimings,
			});
			break;
		}

		case "ants": {
			const result = await runAntSimulationGame({
				config: { antCount: count },
				duration,
				showWindow,
				library: lib as AntEcsLibrary,
			});

			const frameStats = result.profiler.getFrameStats();
			const systemTimings = new Map<string, { avg: number; total: number }>();

			for (const [name, timing] of result.profiler.getAllTimings()) {
				systemTimings.set(name, {
					avg: timing.totalTime / timing.callCount,
					total: timing.totalTime,
				});
			}

			results.push({
				library: lib,
				frameCount: result.frameCount,
				avgFps: frameStats.avgFps,
				avgFrameTime: frameStats.avgMs,
				minFrameTime: frameStats.minMs,
				maxFrameTime: frameStats.maxMs,
				systemTimings,
			});
			break;
		}

		default:
			console.error(`Unknown game: ${game}`);
			process.exit(1);
	}
}

// Print comparison report if multiple libraries
if (results.length > 1) {
	console.log(`\n${"=".repeat(60)}`);
	console.log("COMPARISON REPORT");
	console.log("=".repeat(60));

	// Sort by FPS (higher is better)
	const sorted = [...results].sort((a, b) => b.avgFps - a.avgFps);
	const best = sorted[0];

	console.log("\n📊 Overall Performance (sorted by FPS):\n");
	console.log(
		"Library".padEnd(12) +
			"Avg FPS".padStart(10) +
			"Avg Frame".padStart(12) +
			"Min Frame".padStart(12) +
			"Max Frame".padStart(12) +
			"  Diff",
	);
	console.log("-".repeat(70));

	for (const result of sorted) {
		const diff =
			result === best
				? "👑 BEST"
				: `${(((best.avgFps - result.avgFps) / best.avgFps) * 100).toFixed(1)}% slower`;

		console.log(
			result.library.padEnd(12) +
				result.avgFps.toFixed(1).padStart(10) +
				`${result.avgFrameTime.toFixed(2)}ms`.padStart(12) +
				`${result.minFrameTime.toFixed(2)}ms`.padStart(12) +
				`${result.maxFrameTime.toFixed(2)}ms`.padStart(12) +
				`  ${diff}`,
		);
	}

	// System timing comparison
	console.log("\n📈 System Timings (avg ms per call):\n");

	const allSystems = new Set<string>();
	for (const result of results) {
		for (const name of result.systemTimings.keys()) {
			allSystems.add(name);
		}
	}

	const systemHeader =
		"System".padEnd(15) +
		results.map((r) => r.library.padStart(12)).join("");
	console.log(systemHeader);
	console.log("-".repeat(15 + results.length * 12));

	for (const system of allSystems) {
		let line = system.padEnd(15);
		let bestTime = Infinity;
		let bestLib = "";

		// Find best time for this system
		for (const result of results) {
			const timing = result.systemTimings.get(system);
			if (timing && timing.avg < bestTime) {
				bestTime = timing.avg;
				bestLib = result.library;
			}
		}

		for (const result of results) {
			const timing = result.systemTimings.get(system);
			if (timing) {
				const marker = result.library === bestLib ? "*" : " ";
				line += `${timing.avg.toFixed(3)}${marker}`.padStart(12);
			} else {
				line += "-".padStart(12);
			}
		}
		console.log(line);
	}

	console.log("\n* = fastest for this system");
	console.log("");
}
