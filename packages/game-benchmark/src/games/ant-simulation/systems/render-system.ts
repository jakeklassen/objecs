import type { CanvasRenderingContext2D } from "canvas";
import type { Archetype } from "objecs";
import type { Entity, AntSimulationConfig } from "../types.ts";
import type { PheromoneMap } from "../pheromone-map.ts";

/**
 * Render system - draws everything.
 */
export function createRenderSystem(
	ants: Archetype<Entity, ["position", "velocity", "ant"]>,
	food: Archetype<Entity, ["position", "food"]>,
	nests: Archetype<Entity, ["position", "nest"]>,
	pheromoneMap: PheromoneMap,
	ctx: CanvasRenderingContext2D,
	config: AntSimulationConfig,
) {
	return (foodCollected: number) => {
		// Clear background
		ctx.fillStyle = "#1a1a1a";
		ctx.fillRect(0, 0, config.width, config.height);

		// Draw pheromone trails
		drawPheromones(ctx, pheromoneMap, config);

		// Draw food
		ctx.fillStyle = config.foodColor;
		for (const f of food.entities) {
			ctx.beginPath();
			ctx.arc(f.position.x, f.position.y, 3, 0, Math.PI * 2);
			ctx.fill();
		}

		// Draw nest
		for (const nest of nests.entities) {
			ctx.fillStyle = config.nestColor;
			ctx.beginPath();
			ctx.arc(nest.position.x, nest.position.y, nest.nest.radius, 0, Math.PI * 2);
			ctx.fill();

			// Draw food count
			ctx.fillStyle = "white";
			ctx.font = "20px monospace";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(
				String(nest.nest.foodCollected),
				nest.position.x,
				nest.position.y,
			);
		}

		// Draw ants
		for (const ant of ants.entities) {
			drawAnt(ctx, ant, config);
		}

		// Draw UI
		ctx.fillStyle = "white";
		ctx.font = "14px monospace";
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		ctx.fillText(`Food collected: ${foodCollected}`, 10, 10);
		ctx.fillText(`Ants: ${ants.entities.size}`, 10, 28);
		ctx.fillText(`Food remaining: ${food.entities.size}`, 10, 46);
	};
}

function drawAnt(
	ctx: CanvasRenderingContext2D,
	ant: {
		position: { x: number; y: number };
		velocity: { x: number; y: number };
		ant: { hasFood: boolean };
	},
	config: AntSimulationConfig,
) {
	const { x, y } = ant.position;
	const angle = Math.atan2(ant.velocity.y, ant.velocity.x);

	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(angle);

	// Draw ant body as a small triangle
	ctx.fillStyle = ant.ant.hasFood ? config.antWithFoodColor : config.antColor;
	ctx.beginPath();
	ctx.moveTo(4, 0); // Front point
	ctx.lineTo(-3, -2); // Back left
	ctx.lineTo(-3, 2); // Back right
	ctx.closePath();
	ctx.fill();

	ctx.restore();
}

function drawPheromones(
	ctx: CanvasRenderingContext2D,
	pheromoneMap: PheromoneMap,
	config: AntSimulationConfig,
) {
	const homeTrail = pheromoneMap.getTrailData("home");
	const foodTrail = pheromoneMap.getTrailData("food");
	const cellSize = config.pheromoneCellSize;

	for (let y = 0; y < pheromoneMap.gridHeight; y++) {
		for (let x = 0; x < pheromoneMap.gridWidth; x++) {
			const idx = y * pheromoneMap.gridWidth + x;
			const homeStrength = homeTrail[idx];
			const foodStrength = foodTrail[idx];

			if (homeStrength > 0.01 || foodStrength > 0.01) {
				const worldX = x * cellSize;
				const worldY = y * cellSize;

				// Blend home (blue) and food (red) trails
				if (homeStrength > 0.01) {
					ctx.fillStyle = `rgba(66, 135, 245, ${homeStrength * 0.5})`;
					ctx.fillRect(worldX, worldY, cellSize, cellSize);
				}
				if (foodStrength > 0.01) {
					ctx.fillStyle = `rgba(253, 33, 8, ${foodStrength * 0.5})`;
					ctx.fillRect(worldX, worldY, cellSize, cellSize);
				}
			}
		}
	}
}
