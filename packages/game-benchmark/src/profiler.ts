/**
 * Simple profiler for measuring system execution times.
 */

export interface SystemTiming {
	name: string;
	times: number[];
	totalTime: number;
	callCount: number;
}

export class Profiler {
	#timings = new Map<string, SystemTiming>();
	#frameStart = 0;
	#frameTimes: number[] = [];

	/**
	 * Wrap a system function to measure its execution time.
	 */
	profileSystem<T extends (...args: never[]) => unknown>(
		name: string,
		system: T,
	): T {
		return ((...args: Parameters<T>) => {
			const start = performance.now();
			const result = system(...args);
			const elapsed = performance.now() - start;

			let timing = this.#timings.get(name);
			if (!timing) {
				timing = { name, times: [], totalTime: 0, callCount: 0 };
				this.#timings.set(name, timing);
			}

			timing.times.push(elapsed);
			timing.totalTime += elapsed;
			timing.callCount++;

			return result;
		}) as T;
	}

	/**
	 * Mark the start of a frame for frame time tracking.
	 */
	frameStart(): void {
		this.#frameStart = performance.now();
	}

	/**
	 * Mark the end of a frame and record frame time.
	 */
	frameEnd(): void {
		const frameTime = performance.now() - this.#frameStart;
		this.#frameTimes.push(frameTime);
	}

	/**
	 * Get timing data for a specific system.
	 */
	getSystemTiming(name: string): SystemTiming | undefined {
		return this.#timings.get(name);
	}

	/**
	 * Get all system timings.
	 */
	getAllTimings(): Map<string, SystemTiming> {
		return this.#timings;
	}

	/**
	 * Get frame time statistics.
	 */
	getFrameStats(): {
		count: number;
		avgMs: number;
		minMs: number;
		maxMs: number;
		avgFps: number;
	} {
		if (this.#frameTimes.length === 0) {
			return { count: 0, avgMs: 0, minMs: 0, maxMs: 0, avgFps: 0 };
		}

		const sum = this.#frameTimes.reduce((a, b) => a + b, 0);
		const avg = sum / this.#frameTimes.length;

		return {
			count: this.#frameTimes.length,
			avgMs: avg,
			minMs: Math.min(...this.#frameTimes),
			maxMs: Math.max(...this.#frameTimes),
			avgFps: 1000 / avg,
		};
	}

	/**
	 * Get a summary report of all timings.
	 */
	getReport(): string {
		const lines: string[] = ["=== Profiler Report ===", ""];

		// Frame stats
		const frameStats = this.getFrameStats();
		lines.push("Frame Statistics:");
		lines.push(`  Frames: ${frameStats.count}`);
		lines.push(`  Avg Frame Time: ${frameStats.avgMs.toFixed(3)}ms`);
		lines.push(`  Min Frame Time: ${frameStats.minMs.toFixed(3)}ms`);
		lines.push(`  Max Frame Time: ${frameStats.maxMs.toFixed(3)}ms`);
		lines.push(`  Avg FPS: ${frameStats.avgFps.toFixed(1)}`);
		lines.push("");

		// System timings
		lines.push("System Timings:");
		const sortedTimings = [...this.#timings.values()].sort(
			(a, b) => b.totalTime - a.totalTime,
		);

		for (const timing of sortedTimings) {
			const avgTime = timing.totalTime / timing.callCount;
			lines.push(`  ${timing.name}:`);
			lines.push(`    Calls: ${timing.callCount}`);
			lines.push(`    Total: ${timing.totalTime.toFixed(3)}ms`);
			lines.push(`    Avg: ${avgTime.toFixed(3)}ms`);
		}

		return lines.join("\n");
	}

	/**
	 * Reset all timing data.
	 */
	reset(): void {
		this.#timings.clear();
		this.#frameTimes = [];
	}
}
