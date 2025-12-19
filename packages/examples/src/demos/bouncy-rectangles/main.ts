import { World } from "objecs";
import "../../style.css";
import { Entity } from "./entity.ts";
import { physicsSystemFactory } from "./systems/physics-system.ts";
import { redneringSystemFactory } from "./systems/rendering-system.ts";
import { obtainCanvas2dContext } from "#/lib/dom.ts";

const canvas = document.querySelector<HTMLCanvasElement>("#canvas");

if (!canvas) {
	throw new Error("Canvas element not found");
}

const ctx = obtainCanvas2dContext(canvas);

let dt = 0;
let last = performance.now();

// create the world
const world = new World<Entity>();

const getRandom = (max: number, min = 0) =>
	Math.floor(Math.random() * max) + min;

// attach components
for (let i = 0; i < 100; ++i) {
	world.createEntity({
		position: {
			x: getRandom(canvas.width),
			y: getRandom(canvas.height),
		},
		velocity: {
			x: getRandom(100, 20),
			y: getRandom(100, 20),
		},
		color: `rgba(${getRandom(255, 0)}, ${getRandom(255, 0)}, ${getRandom(
			255,
			0,
		)}, 1)`,
		rectangle: {
			width: getRandom(20, 10),
			height: getRandom(20, 10),
		},
	});
}

const physicsSystem = physicsSystemFactory(world, {
	width: canvas.width,
	height: canvas.height,
});

const renderingSystem = redneringSystemFactory(world, ctx);

/**
 * The game loop.
 */
function frame(hrt: DOMHighResTimeStamp) {
	// How much time has elapsed since the last frame?
	// Also convert to seconds.
	dt = (hrt - last) / 1000;

	physicsSystem(dt);
	renderingSystem();

	last = hrt;

	// Keep the game loop going forever
	requestAnimationFrame(frame);
}

// we need to start the game
requestAnimationFrame(frame);
