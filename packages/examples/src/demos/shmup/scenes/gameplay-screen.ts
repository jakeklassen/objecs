import { CollisionMasks } from "../bitmasks.ts";
import { spriteAnimationFactory } from "../components/sprite-animation.ts";
import { spriteFactory } from "../components/sprite.ts";
import { transformFactory } from "../components/transform.ts";
import { Pico8Colors } from "../constants.ts";
import { starfieldFactory } from "../entity-factories/star.ts";
import { resetGameState } from "../game-state.ts";
import { Scene, SceneConstructorProps } from "../scene.ts";
import { SpriteSheet } from "../spritesheet.ts";
import { animationDetailsFactory } from "../structures/animation-details.ts";
import { bombSystemFactory } from "../systems/bomb-system.ts";
import { bossSystemFactory } from "../systems/boss-system.ts";
import { boundToViewportSystemFactory } from "../systems/bound-to-viewport-system.ts";
import { cameraShakeSystemFactory } from "../systems/camera-shake-system.ts";
import { cherryTextSystemFactory } from "../systems/cherry-text-system.ts";
import { collisionSystemFactory } from "../systems/collision-system.ts";
import { debugRenderingSystemFactory } from "../systems/debug-rendering-system.ts";
import { destroyBossEventSystemFactory } from "../systems/destroy-boss-event-system.ts";
import { destroyOnViewportExitSystemFactory } from "../systems/destroy-on-viewport-exit-system.ts";
import { enemyPickSystemFactory } from "../systems/enemy-pick-system.ts";
import { flashRenderingSystemFactory } from "../systems/flash-rendering-system.ts";
import { handleGameOverSystemFactory } from "../systems/handle-game-over-system.ts";
import { invulnerableSystemFactory } from "../systems/invulnerable-system.ts";
import { lateralHunterSystemFactory } from "../systems/lateral-hunter-system.ts";
import { livesRenderingSystemFactory } from "../systems/lives-rendering-system.ts";
import { movementSystemFactory } from "../systems/movement-system.ts";
import { muzzleFlashRenderingSystemFactory } from "../systems/muzzle-flash-rendering-system.ts";
import { muzzleFlashSystemFactory } from "../systems/muzzle-flash-system.ts";
import { nextWaveEventSystemFactory } from "../systems/next-wave-event-system.ts";
import { particleRenderingSystemFactory } from "../systems/particle-rendering-system.ts";
import { particleSystemFactory } from "../systems/particle-system.ts";
import { playerEnemyCollisionEventCleanupSystemFactory } from "../systems/player-enemy-collision-event-cleanup-system.ts";
import { playerEnemyCollisionEventSystemFactory } from "../systems/player-enemy-collision-event-system.ts";
import { playerPickupCollisionEventSystemFactory } from "../systems/player-pickup-collision-event-system.ts";
import { playerProjectileBossCollisionEventCleanupSystemFactory } from "../systems/player-projectile-boss-collision-event-cleanup-system.ts";
import { playerProjectileBossCollisionEventSystemFactory } from "../systems/player-projectile-boss-collision-event-system.ts";
import { playerProjectileEnemyCollisionEventCleanupSystemFactory } from "../systems/player-projectile-enemy-collision-event-cleanup-system.ts";
import { playerProjectileEnemyCollisionEventSystemFactory } from "../systems/player-projectile-enemy-collision-event-system.ts";
import { playerSystemFactory } from "../systems/player-system.ts";
import { renderingSystemFactory } from "../systems/rendering-system.ts";
import { scoreSystemFactory } from "../systems/score-system.ts";
import { shockwaveRenderingSystemFactory } from "../systems/shockwave-rendering-system.ts";
import { shockwaveSystemFactory } from "../systems/shockwave-system.ts";
import { soundSystemFactory } from "../systems/sound-system.ts";
import { spriteAnimationSystemFactory } from "../systems/sprite-animation-system.ts";
import { spriteOutlineAnimationSystemFactory } from "../systems/sprite-outline-animation-system.ts";
import { spriteOutlineRenderingSystemFactory } from "../systems/sprite-outline-rendering-system.ts";
import { spriteRenderingSystemFactory } from "../systems/sprite-rendering-system.ts";
import { starfieldRenderingSystemFactory } from "../systems/starfield-rendering-system.ts";
import { starfieldSystemFactory } from "../systems/starfield-system.ts";
import { textBlinkAnimationSystemFactory } from "../systems/text-blink-animation-system.ts";
import { textRenderingSystemFactory } from "../systems/text-rendering-system.ts";
import { textSystemFactory } from "../systems/text-system.ts";
import { timeToLiveSystemFactory } from "../systems/time-to-live-system.ts";
import { timerSystemFactory } from "../systems/timer-system.ts";
import { localTransformSystemFactory } from "../systems/local-transform-system.ts";
import { triggerEnemyAttackEventSystemFactory } from "../systems/trigger-enemy-attack-event-system.ts";
import { triggerEnemyFireEventSystemFactory } from "../systems/trigger-enemy-fire-event-system.ts";
import { triggerGameOverSystemFactory } from "../systems/trigger-game-over-system.ts";
import { triggerGameWonSystemFactory } from "../systems/trigger-game-won-system.ts";
import { tweenSystemFactory } from "../systems/tweens-system.ts";
import { waveReadyCheckSystemFactory } from "../systems/wave-ready-check-system.ts";
import { yellowShipSystemFactory } from "../systems/yellow-ship-system.ts";

export class GameplayScreen extends Scene {
	#areaWidth: number;
	#areaHeight: number;
	#bufferCanvas = document.createElement("canvas");
	#bufferContext = this.#bufferCanvas.getContext("2d")!;
	#camera = { x: 0, y: 0 };

	constructor(props: SceneConstructorProps) {
		super(props);

		this.#areaWidth = this.config.gameWidth - 1;
		this.#areaHeight = this.config.gameHeight - 1;

		this.#bufferCanvas.width = this.canvas.width;
		this.#bufferCanvas.height = this.canvas.height;
		this.#bufferContext.imageSmoothingEnabled = false;
	}

	public override initialize(): void {
		resetGameState(this.gameState);
		this.clearSystems();
		this.world.clearEntities();
		this.timer.clear();

		this.systems.push(
			timerSystemFactory({ timer: this.timer }),
			waveReadyCheckSystemFactory({
				config: this.config,
				gameState: this.gameState,
				world: this.world,
			}),
			nextWaveEventSystemFactory({
				canvas: this.canvas,
				config: this.config,
				gameState: this.gameState,
				timer: this.timer,
				world: this.world,
			}),
			bossSystemFactory({
				timer: this.timer,
				world: this.world,
			}),
			destroyBossEventSystemFactory({
				config: this.config,
				content: this.content,
				gameState: this.gameState,
				scene: this,
				timer: this.timer,
				world: this.world,
			}),
			bombSystemFactory({
				gameState: this.gameState,
				timer: this.timer,
				world: this.world,
			}),
			enemyPickSystemFactory({
				config: this.config,
				gameState: this.gameState,
				world: this.world,
			}),
			triggerEnemyAttackEventSystemFactory({
				timer: this.timer,
				world: this.world,
			}),
			triggerEnemyFireEventSystemFactory({
				world: this.world,
			}),
			timeToLiveSystemFactory({
				world: this.world,
			}),
			textBlinkAnimationSystemFactory({
				textCache: this.textCache,
				world: this.world,
			}),
			playerSystemFactory({
				input: this.input,
				gameState: this.gameState,
				spritesheet: SpriteSheet,
				world: this.world,
			}),
			lateralHunterSystemFactory({
				timer: this.timer,
				world: this.world,
			}),
			yellowShipSystemFactory({
				world: this.world,
			}),
			movementSystemFactory({ world: this.world }),
			particleSystemFactory({ world: this.world }),
			shockwaveSystemFactory({ world: this.world }),
			localTransformSystemFactory({ world: this.world }),
			boundToViewportSystemFactory({
				world: this.world,
				viewport: {
					width: this.config.gameWidth,
					height: this.config.gameHeight,
				},
			}),
			destroyOnViewportExitSystemFactory({
				world: this.world,
				viewport: {
					width: this.config.gameWidth,
					height: this.config.gameHeight,
				},
			}),
			collisionSystemFactory({ config: this.config, world: this.world }),
			playerEnemyCollisionEventSystemFactory({
				config: this.config,
				content: this.content,
				gameState: this.gameState,
				timer: this.timer,
				world: this.world,
			}),
			playerProjectileEnemyCollisionEventSystemFactory({
				config: this.config,
				content: this.content,
				gameState: this.gameState,
				world: this.world,
			}),
			playerProjectileBossCollisionEventSystemFactory({
				world: this.world,
			}),
			tweenSystemFactory({ world: this.world }),
			invulnerableSystemFactory({ world: this.world }),
			starfieldSystemFactory({ world: this.world }),
			muzzleFlashSystemFactory({ world: this.world }),
			spriteAnimationSystemFactory({ world: this.world }),
			starfieldRenderingSystemFactory({
				world: this.world,
				context: this.#bufferContext,
			}),
			flashRenderingSystemFactory({
				world: this.world,
				context: this.#bufferContext,
				spriteSheet: this.content.spritesheet,
			}),
			cherryTextSystemFactory({
				gameState: this.gameState,
				textCache: this.textCache,
				world: this.world,
			}),
			scoreSystemFactory({
				gameState: this.gameState,
				textCache: this.textCache,
				world: this.world,
			}),
			soundSystemFactory({
				audioManager: this.audioManager,
				world: this.world,
			}),
			textSystemFactory({
				fontCache: this.fontCache,
				textCache: this.textCache,
				world: this.world,
			}),
			spriteOutlineAnimationSystemFactory({
				world: this.world,
			}),
			spriteOutlineRenderingSystemFactory({
				context: this.#bufferContext,
				spriteSheet: this.content.spritesheet,
				world: this.world,
			}),
			spriteRenderingSystemFactory({
				content: this.content,
				context: this.#bufferContext,
				world: this.world,
			}),
			shockwaveRenderingSystemFactory({
				context: this.#bufferContext,
				world: this.world,
			}),
			particleRenderingSystemFactory({
				world: this.world,
				context: this.#bufferContext,
			}),
			muzzleFlashRenderingSystemFactory({
				world: this.world,
				context: this.#bufferContext,
			}),
			livesRenderingSystemFactory({
				gameState: this.gameState,
				content: this.content,
				context: this.#bufferContext,
			}),
			textRenderingSystemFactory({
				context: this.#bufferContext,
				textCache: this.textCache,
				world: this.world,
			}),
			debugRenderingSystemFactory({
				world: this.world,
				context: this.#bufferContext,
				config: this.config,
			}),
			triggerGameOverSystemFactory({ input: this.input, scene: this }),
			triggerGameWonSystemFactory({ input: this.input, scene: this }),
			playerProjectileEnemyCollisionEventCleanupSystemFactory({
				world: this.world,
			}),
			playerProjectileBossCollisionEventCleanupSystemFactory({
				world: this.world,
			}),
			playerEnemyCollisionEventCleanupSystemFactory({ world: this.world }),
			playerPickupCollisionEventSystemFactory({
				gameState: this.gameState,
				world: this.world,
			}),
			handleGameOverSystemFactory({
				scene: this,
				world: this.world,
			}),
			cameraShakeSystemFactory({
				camera: this.#camera,
				world: this.world,
			}),
			renderingSystemFactory({
				buffer: this.#bufferCanvas,
				camera: this.#camera,
				context: this.context,
			}),
		);

		starfieldFactory({
			areaHeight: this.#areaHeight,
			areaWidth: this.#areaWidth,
			count: 100,
			world: this.world,
		});

		const player = this.world.createEntity({
			boundToViewport: true,
			boxCollider: SpriteSheet.player.boxCollider,
			collisionLayer: CollisionMasks.Player,
			collisionMask:
				CollisionMasks.Enemy |
				CollisionMasks.EnemyProjectile |
				CollisionMasks.Pickup,
			direction: {
				x: 0,
				y: 0,
			},
			tagPlayer: true,
			transform: {
				position: {
					x: this.config.entities.player.spawnPosition.x,
					y: this.config.entities.player.spawnPosition.y,
				},
				rotation: 0,
				scale: {
					x: 1,
					y: 1,
				},
			},
			sprite: spriteFactory({
				frame: {
					sourceX: SpriteSheet.player.idle.sourceX,
					sourceY: SpriteSheet.player.idle.sourceY,
					width: SpriteSheet.player.idle.width,
					height: SpriteSheet.player.idle.height,
				},
			}),
			velocity: {
				x: 60,
				y: 60,
			},
		});

		// Player thruster
		this.world.createEntity({
			localTransform: transformFactory({
				position: {
					x: 0,
					y: SpriteSheet.player.idle.height,
				},
			}),
			parent: player,
			transform: {
				position: {
					x: player.transform.position.x,
					y: player.transform.position.y,
				},
				rotation: 0,
				scale: {
					x: 1,
					y: 1,
				},
			},
			sprite: spriteFactory({
				frame: {
					sourceX: SpriteSheet.player.thruster.sourceX,
					sourceY: SpriteSheet.player.thruster.sourceY,
					width: SpriteSheet.player.thruster.width,
					height: SpriteSheet.player.thruster.height,
				},
			}),
			spriteAnimation: spriteAnimationFactory(
				animationDetailsFactory(
					"player-thruster",
					SpriteSheet.player.thruster.animations.thrust.sourceX,
					SpriteSheet.player.thruster.animations.thrust.sourceY,
					SpriteSheet.player.thruster.animations.thrust.width,
					SpriteSheet.player.thruster.animations.thrust.height,
					SpriteSheet.player.thruster.animations.thrust.frameWidth,
					SpriteSheet.player.thruster.animations.thrust.frameHeight,
				),
				100,
			),
			tagPlayerThruster: true,
		});

		this.world.createEntity({
			transform: transformFactory({
				position: {
					x: 108,
					y: 1,
				},
			}),
			sprite: spriteFactory({
				frame: {
					sourceX: SpriteSheet.cherry.frame.sourceX,
					sourceY: SpriteSheet.cherry.frame.sourceY,
					width: SpriteSheet.cherry.frame.width,
					height: SpriteSheet.cherry.frame.height,
				},
			}),
		});

		// Score text
		this.world.createEntity({
			tagTextScore: true,
			text: {
				color: Pico8Colors.Color12,
				font: "PICO-8",
				message: `Score:${this.gameState.score}`,
			},
			transform: transformFactory({
				position: {
					x: 40,
					y: 2,
				},
			}),
		});

		// Cherries text
		this.world.createEntity({
			tagTextCherries: true,
			text: {
				color: Pico8Colors.Color14,
				font: "PICO-8",
				message: `${this.gameState.cherries}`,
			},
			transform: transformFactory({
				position: {
					x: 118,
					y: 2,
				},
			}),
		});

		this.world.createEntity({
			eventNextWave: true,
		});

		this.audioManager.play("game-start", { loop: false });
	}

	public override enter(): void {
		super.enter();

		this.initialize();
	}

	public override exit(): void {
		super.exit();

		this.audioManager.stopAll();
	}

	public override update(delta: number): void {
		this.#bufferContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.#bufferContext.fillStyle = "black";
		this.#bufferContext.fillRect(0, 0, this.canvas.width, this.canvas.height);

		super.update(delta);
	}
}
