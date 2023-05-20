import { rndFromList } from "#/lib/array.ts";
import { rndInt } from "#/lib/math.ts";
import { World } from "objecs";
import { Pico8Colors } from "../constants.ts";
import { Entity } from "../entity.ts";

interface StarFactoryOptions {
	position: NonNullable<Entity["transform"]>["position"];
	world: World<Entity>;
}

export function starFactory({ position, world }: StarFactoryOptions) {
	const entity = world.createEntity({
		direction: {
			x: 0,
			y: 1,
		},
		star: {
			color: "white",
		},
		transform: {
			position,
			rotation: 0,
			scale: {
				x: 1,
				y: 1,
			},
		},
		velocity: {
			x: 0,
			y: rndFromList([60, 30, 20]),
		},
	});

	// Adjust star color based on velocity
	if (entity.velocity.y < 30) {
		entity.star.color = Pico8Colors.Color1;
	} else if (entity.velocity.y < 60) {
		entity.star.color = Pico8Colors.Color13;
	}
}

interface StarfieldFactoryOptions {
	areaHeight: number;
	areaWidth: number;
	count: number;
	world: World<Entity>;
}

export function starfieldFactory({
	areaHeight,
	areaWidth,
	count,
	world,
}: StarfieldFactoryOptions) {
	for (let i = 0; i < count; i++) {
		starFactory({
			position: {
				x: rndInt(areaWidth, 1),
				y: rndInt(areaHeight, 1),
			},
			world,
		});
	}
}
