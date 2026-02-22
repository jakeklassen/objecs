export type PheromoneType = "home" | "food";

/**
 * Grid-based pheromone map for efficient spatial queries.
 * Uses Float32Array for memory efficiency.
 */
export class PheromoneMap {
	readonly gridWidth: number;
	readonly gridHeight: number;
	readonly cellSize: number;
	readonly worldWidth: number;
	readonly worldHeight: number;

	private homeTrail: Float32Array;
	private foodTrail: Float32Array;

	constructor(worldWidth: number, worldHeight: number, cellSize: number) {
		this.worldWidth = worldWidth;
		this.worldHeight = worldHeight;
		this.cellSize = cellSize;
		this.gridWidth = Math.ceil(worldWidth / cellSize);
		this.gridHeight = Math.ceil(worldHeight / cellSize);

		const size = this.gridWidth * this.gridHeight;
		this.homeTrail = new Float32Array(size);
		this.foodTrail = new Float32Array(size);
	}

	private toIndex(x: number, y: number): number {
		const gx = Math.floor(x / this.cellSize);
		const gy = Math.floor(y / this.cellSize);

		if (gx < 0 || gx >= this.gridWidth || gy < 0 || gy >= this.gridHeight) {
			return -1;
		}

		return gy * this.gridWidth + gx;
	}

	private getTrail(type: PheromoneType): Float32Array {
		return type === "home" ? this.homeTrail : this.foodTrail;
	}

	/**
	 * Deposit pheromone at a world position.
	 */
	deposit(x: number, y: number, type: PheromoneType, amount: number): void {
		const idx = this.toIndex(x, y);
		if (idx === -1) return;

		const trail = this.getTrail(type);
		trail[idx] = Math.min(trail[idx] + amount, 1.0);
	}

	/**
	 * Read pheromone strength at a world position.
	 */
	read(x: number, y: number, type: PheromoneType): number {
		const idx = this.toIndex(x, y);
		if (idx === -1) return 0;

		return this.getTrail(type)[idx];
	}

	/**
	 * Read average pheromone strength in a circular area.
	 * Used for ant sensors.
	 */
	readArea(
		centerX: number,
		centerY: number,
		radius: number,
		type: PheromoneType,
	): number {
		const trail = this.getTrail(type);
		const cellRadius = Math.ceil(radius / this.cellSize);
		const cellRadiusSq = (radius / this.cellSize) ** 2;
		const gx = Math.floor(centerX / this.cellSize);
		const gy = Math.floor(centerY / this.cellSize);

		let sum = 0;
		let count = 0;

		for (let dy = -cellRadius; dy <= cellRadius; dy++) {
			for (let dx = -cellRadius; dx <= cellRadius; dx++) {
				const nx = gx + dx;
				const ny = gy + dy;

				if (nx < 0 || nx >= this.gridWidth || ny < 0 || ny >= this.gridHeight) {
					continue;
				}

				// Check if within circular radius (squared comparison avoids sqrt)
				if (dx * dx + dy * dy <= cellRadiusSq) {
					sum += trail[ny * this.gridWidth + nx];
					count++;
				}
			}
		}

		return count > 0 ? sum / count : 0;
	}

	/**
	 * Decay all pheromones by a factor (e.g., 0.995).
	 */
	decay(factor: number): void {
		for (let i = 0; i < this.homeTrail.length; i++) {
			this.homeTrail[i] *= factor;
			if (this.homeTrail[i] < 0.001) this.homeTrail[i] = 0;
		}
		for (let i = 0; i < this.foodTrail.length; i++) {
			this.foodTrail[i] *= factor;
			if (this.foodTrail[i] < 0.001) this.foodTrail[i] = 0;
		}
	}

	/**
	 * Get raw trail data for rendering.
	 */
	getTrailData(type: PheromoneType): Float32Array {
		return this.getTrail(type);
	}
}
