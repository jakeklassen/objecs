import { textBlinkAnimationFactory } from "../components/text-blink-animation.ts";
import { transformFactory } from "../components/transform.ts";
import { Pico8Colors } from "../constants.ts";
import { Scene } from "../scene.ts";
import { gameOverRenderingSystemFactory } from "../systems/game-over-rendering-system.ts";
import { spriteAnimationSystemFactory } from "../systems/sprite-animation-system.ts";
import { spriteRenderingSystemFactory } from "../systems/sprite-rendering-system.ts";
import { startGameSystemFactory } from "../systems/start-game-system.ts";
import { textBlinkAnimationSystemFactory } from "../systems/text-blink-animation-system.ts";
import { textRenderingSystemFactory } from "../systems/text-rendering-system.ts";
import { textSystemFactory } from "../systems/text-system.ts";

export class GameOverScreen extends Scene {
	public override initialize(): void {
		this.clearSystems();
		this.world.clearEntities();
		this.timer.clear();

		this.audioManager.play("game-over", { loop: false });

		// Before the canvas gets cleared, copy the gameplay scene for a nice
		// background.
		const gameplayBuffer = this.context.getImageData(
			0,
			0,
			this.canvas.width,
			this.canvas.height,
		);

		this.systems.push(
			startGameSystemFactory({ input: this.input, scene: this }),
			textSystemFactory({
				fontCache: this.fontCache,
				textCache: this.textCache,
				world: this.world,
			}),
			textBlinkAnimationSystemFactory({
				textCache: this.textCache,
				world: this.world,
			}),
			spriteAnimationSystemFactory({ world: this.world }),
			gameOverRenderingSystemFactory({
				context: this.context,
				imageData: gameplayBuffer,
			}),
			spriteRenderingSystemFactory({
				content: this.content,
				context: this.context,
				world: this.world,
			}),
			textRenderingSystemFactory({
				context: this.context,
				textCache: this.textCache,
				world: this.world,
			}),
		);

		// game over text
		this.world.createEntity({
			text: {
				color: Pico8Colors.Color8,
				font: "PICO-8",
				message: "Game Over",
			},
			transform: {
				position: {
					x:
						this.canvas.width / 2 -
						this.spriteSheet.text.gameOver.frame.width / 2,
					y: 40,
				},
				rotation: 0,
				scale: {
					x: 1,
					y: 1,
				},
			},
		});

		// Press any key to continue text
		this.world.createEntity({
			text: {
				align: "center",
				color: Pico8Colors.Color6,
				font: "PICO-8",
				message: "Press Any Key To Continue",
			},
			textBlinkAnimation: textBlinkAnimationFactory({
				colors: [Pico8Colors.Color5, Pico8Colors.Color6, Pico8Colors.Color7],
				colorSequence: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 1, 1, 0],
				durationMs: 500,
			}),
			transform: transformFactory({
				position: {
					x: this.canvas.width / 2,
					y: 90,
				},
			}),
		});

		// High score text
		const highscoreString = localStorage.getItem("highscore");
		let highscore = parseInt(highscoreString ?? "0");

		if (this.gameState.score > highscore) {
			localStorage.setItem("highscore", `${this.gameState.score}`);
			highscore = this.gameState.score;

			// Show new high score text
			this.world.createEntity({
				text: {
					align: "center",
					color: Pico8Colors.Color12,
					font: "PICO-8",
					message: `new highscore!: ${highscore}`,
				},
				textBlinkAnimation: textBlinkAnimationFactory({
					colors: [Pico8Colors.Color7, Pico8Colors.Color10],
					colorSequence: [0, 1],
					durationMs: 100,
				}),
				transform: transformFactory({
					position: {
						x: this.canvas.width / 2,
						y: 66,
					},
				}),
			});
		}

		// Show high score text
		this.world.createEntity({
			text: {
				align: "center",
				color: Pico8Colors.Color12,
				font: "PICO-8",
				message: `score: ${highscore}`,
			},
			transform: transformFactory({
				position: {
					x: this.canvas.width / 2,
					y: 60,
				},
			}),
		});
	}

	public override enter(): void {
		this.initialize();
	}

	public override update(delta: number): void {
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

		super.update(delta);
	}
}
