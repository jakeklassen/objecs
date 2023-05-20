import { colorFactory } from "#/shared/components/color.ts";
import { transformFactory } from "#/shared/components/transform.ts";
import { World } from "objecs";
import "../../style.css";
import { ballTagFactory } from "./components/ball-tag.ts";
import { Entity } from "./entity.ts";
import { ballMovementSystemFactory } from "./systems/ball-movement-system.ts";
import { redneringSystemFactory } from "./systems/rendering-system.ts";
import { obtainCanvas2dContext } from "#/lib/dom.ts";

const canvas = document.querySelector("#canvas") as HTMLCanvasElement;
const ctx = obtainCanvas2dContext(canvas);

const world = new World<Entity>();

world.createEntity({
	ballTag: ballTagFactory(),
	color: colorFactory("red"),
	rectangle: { width: 12, height: 12 },
	transform: transformFactory({ x: 10, y: 10 }),
	velocity: { x: 100, y: 200 },
});

const ballMovementSystem = ballMovementSystemFactory(world, {
	width: canvas.width,
	height: canvas.height,
});

const renderingSystem = redneringSystemFactory(world, ctx);

let last = performance.now();

/**
 * The game loop.
 */
const frame = (hrt: DOMHighResTimeStamp) => {
	const dt = Math.min(1000, hrt - last) / 1000;

	ballMovementSystem(dt);
	renderingSystem();

	last = hrt;

	requestAnimationFrame(frame);
};

// Start the game loop.
requestAnimationFrame(frame);
