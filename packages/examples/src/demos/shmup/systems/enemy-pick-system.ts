import { rnd } from "#/lib/math.ts";
import { World } from "objecs";
import { Config } from "../config.ts";
import { Entity } from "../entity.ts";
import { GameState } from "../game-state.ts";

/**
 * This system is responsible for picking when enemies should attack and fire.
 */
export function enemyPickSystemFactory({
	config,
	gameState,
	world,
}: {
	config: Config;
	gameState: GameState;
	world: World<Entity>;
}) {
	let attackFrequencyTimer = 0;
	let fireFrequencyTimer = 0;
	let nextFireTime = 0;

	return function enemyPickSystem(dt: number) {
		if (!gameState.waveReady) {
			return;
		}

		const wave = config.waves[gameState.wave];

		if (wave == null) {
			return;
		}

		attackFrequencyTimer += dt;
		fireFrequencyTimer += dt;

		if (attackFrequencyTimer >= wave.attackFrequency) {
			attackFrequencyTimer = 0;

			world.createEntity({
				eventTriggerEnemyAttack: true,
			});
		}

		if (fireFrequencyTimer > nextFireTime) {
			fireFrequencyTimer = 0;
			nextFireTime = wave.fireFrequency + rnd(wave.fireFrequency);

			world.createEntity({
				eventTriggerEnemyFire: true,
			});
		}
	};
}
