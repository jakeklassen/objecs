import { rndInt } from "#/lib/math.ts";
import { Easing } from "#/lib/tween.ts";
import { World } from "objecs";
import { spriteAnimationFactory } from "../components/sprite-animation.ts";
import { spriteFactory } from "../components/sprite.ts";
import { transformFactory } from "../components/transform.ts";
import { tweenFactory } from "../components/tween.ts";
import { Config } from "../config.ts";
import { LoadedContent } from "../content.ts";
import { Entity } from "../entity.ts";
import { GameState } from "../game-state.ts";
import { animationDetailsFactory } from "../structures/animation-details.ts";
import { TimeSpan, Timer } from "../timer.ts";

export function playerEnemyCollisionEventSystemFactory({
	config,
	content,
	gameState,
	timer,
	world,
}: {
	config: Config;
	content: LoadedContent;
	gameState: GameState;
	timer: Timer;
	world: World<Entity>;
}) {
	const events = world.archetype("eventPlayerEnemyCollision");
	const players = world.archetype("tagPlayer", "transform");
	const playerThrusters = world.archetype("tagPlayerThruster", "transform");
	/**
	 * Width and height are the same
	 */
	const playerExplosionFrameSize = 64;

	return () => {
		const [player] = players.entities;
		const [playerThruster] = playerThrusters.entities;

		for (const entity of events.entities) {
			const { eventPlayerEnemyCollision: event } = entity;

			world.createEntity({
				eventPlaySound: {
					track: "player-death",
					options: {
						loop: false,
					},
				},
			});

			gameState.lives--;

			const explosionIndex = rndInt(
				content.playerExplosions.height / playerExplosionFrameSize,
			);
			const sourceY = explosionIndex * playerExplosionFrameSize;

			world.createEntity({
				sprite: spriteFactory({
					frame: {
						sourceX: 0,
						sourceY,
						width: playerExplosionFrameSize,
						height: playerExplosionFrameSize,
					},
				}),
				spriteAnimation: spriteAnimationFactory(
					animationDetailsFactory(
						`explosion`,
						0,
						sourceY,
						content.playerExplosions.width,
						playerExplosionFrameSize,
						playerExplosionFrameSize,
						playerExplosionFrameSize,
					),
					100,
					false,
				),
				spritesheet: "player-explosions",
				transform: transformFactory({
					position: {
						x:
							(player.transform?.position.x ?? 0) +
							(player.sprite?.frame.width ?? 0) / 2 -
							playerExplosionFrameSize / 2,
						y:
							(player.transform?.position.y ?? 0) +
							(player.sprite?.frame.height ?? 0) / 2 -
							playerExplosionFrameSize / 2,
					},
				}),
			});

			world.createEntity({
				eventTriggerCameraShake: {
					durationMs: 400,
					strength: 6,
				},
			});

			if (gameState.lives <= 0) {
				world.deleteEntity(event.player);

				if (playerThruster != null) {
					world.deleteEntity(playerThruster);
				}

				// Give the player death sprite time to finish
				timer.add(new TimeSpan(1000), () => {
					world.createEntity({
						eventGameOver: true,
					});
				});
			} else {
				// respawn player
				if (player != null) {
					player.transform.position.x = config.entities.player.spawnPosition.x;
					player.transform.position.y = config.entities.player.spawnPosition.y;

					world.addEntityComponents(player, "invulnerable", {
						durationMs: 2000,
						elapsedMs: 0,
					});

					world.addEntityComponents(player, "tweens", [
						...(player.tweens ?? []),
						tweenFactory("sprite.opacity", {
							duration: 100,
							easing: Easing.Linear,
							from: 1,
							to: 0,
							maxIterations: 20,
							yoyo: true,
						}),
					]);
				}

				if (playerThruster != null) {
					playerThruster.transform.position.x =
						config.entities.player.spawnPosition.x;
					playerThruster.transform.position.y =
						config.entities.player.spawnPosition.y;

					world.addEntityComponents(playerThruster, "tweens", [
						...(playerThruster.tweens ?? []),
						tweenFactory("sprite.opacity", {
							duration: 100,
							easing: Easing.Linear,
							from: 1,
							to: 0,
							maxIterations: 20,
							yoyo: true,
						}),
					]);
				}
			}
		}
	};
}
