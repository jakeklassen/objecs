import { World } from "objecs";
import { EnemyType } from "../constants.ts";
import { determinePickableEnemies } from "../enemy/determine-pickable-enemies.ts";
import { pickRandomEnemy } from "../enemy/pick-random-enemy.ts";
import { switchEnemyToAttackMode } from "../enemy/switch-enemy-to-attach-mode.ts";
import { Entity } from "../entity.ts";
import { Timer } from "../timer.ts";

/**
 * Attack in this case means signal, then fly at the player.
 */
export function triggerEnemyAttackEventSystemFactory({
	timer,
	world,
}: {
	timer: Timer;
	world: World<Entity>;
}) {
	const enemies = world.archetype(
		"enemyState",
		"enemyType",
		"spriteAnimation",
		"tagEnemy",
		"transform",
	);
	const events = world.archetype("eventTriggerEnemyAttack");

	return function triggerEnemyAttackEventSystem() {
		for (const event of events.entities) {
			world.deleteEntity(event);

			// Only trigger 50% of the time
			if (Math.random() < 0.5) {
				continue;
			}

			// Sort by position using x and y, from left to right, top to bottom
			// All _rows_ should be grouped together
			const enemiesArray = determinePickableEnemies(enemies.entities);

			const enemy = pickRandomEnemy(enemiesArray, 10);

			// It's possible that there are no enemies eligible to attack.
			if (enemy == null) {
				continue;
			}

			if (enemy.enemyType === EnemyType.Boss) {
				continue;
			}

			switchEnemyToAttackMode({
				enemy,
				timer,
				world,
			});
		}
	};
}
