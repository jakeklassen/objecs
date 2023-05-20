import { AudioManager, AudioMangerEvent } from "#/lib/audio-manager.ts";
import { obtainCanvasAndContext2d } from "#/lib/dom";
import { loadFont } from "#/lib/pixel-text/load-font.ts";
import { TextBuffer, TextBufferFont } from "#/lib/pixel-text/text-buffer.ts";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import "../../style.css";
import pico8FontImageUrl from "./assets/font/pico-8_regular_5.png";
import pico8FontXmlUrl from "./assets/font/pico-8_regular_5.xml?url";
import explosionsSheetImageUrl from "./assets/image/explosions.png";
import playerExplosionsSheetImageUrl from "./assets/image/player-explosions.png";
import spriteSheetImageUrl from "./assets/image/shmup.png";
import { config } from "./config.ts";
import { Content } from "./content.ts";
import { Entity } from "./entity.ts";
import { GameEvent } from "./game-events.ts";
import { gameState } from "./game-state.ts";
import { gameTime } from "./game-time.ts";
import { input } from "./input.ts";
import { Scene } from "./scene.ts";
import { GameOverScreen } from "./scenes/game-over-screen.ts";
import { GameWonScreen } from "./scenes/game-won-screen.ts";
import { GameplayScreen } from "./scenes/gameplay-screen.ts";
import { LoadingScreen } from "./scenes/loading-screen.ts";
import { TitleScreen } from "./scenes/title-screen.ts";
import { SpriteSheet } from "./spritesheet.ts";
import { Timer } from "./timer.ts";

const zip = new JSZip();

const recorder = {
	frames: zip.folder("frames"),
	recording: false,
};

const audioManager = new AudioManager();

audioManager.on(AudioMangerEvent.Ready, () => {
	console.log("🎵 audio ready");

	activeScene?.emit(GameEvent.StartGame);
});

const picoFont = await loadFont(pico8FontImageUrl, pico8FontXmlUrl);

const fontCache = new Map<string, TextBufferFont>();
fontCache.set(picoFont.family, picoFont);

const textCache = new Map<Entity, TextBuffer>();

const content = await Content.load({
	explosionsSheetImageUrl,
	playerExplosionsSheetImageUrl,
	spriteSheetImageUrl,
});

const timer = new Timer();

const { canvas, context } = obtainCanvasAndContext2d("#canvas");

context.imageSmoothingEnabled = false;

const loadingScreenScene = new LoadingScreen({
	audioManager,
	canvas,
	config,
	context,
	content,
	fontCache,
	input,
	gameState,
	gameTime,
	spriteSheet: SpriteSheet,
	timer,
	textCache,
});
loadingScreenScene.on(GameEvent.StartGame, () => {
	activeScene = activeScene.switchTo(titleScreenScene);
});

const titleScreenScene = new TitleScreen({
	audioManager,
	canvas,
	config,
	context,
	content,
	fontCache,
	input,
	gameState,
	gameTime,
	spriteSheet: SpriteSheet,
	timer,
	textCache,
});
titleScreenScene.on(GameEvent.StartGame, () => {
	activeScene = activeScene.switchTo(gameplayScene);
});

const gameplayScene = new GameplayScreen({
	audioManager,
	canvas,
	config,
	context,
	content,
	fontCache,
	input,
	gameState,
	gameTime,
	spriteSheet: SpriteSheet,
	timer,
	textCache,
});
gameplayScene.on(GameEvent.GameOver, () => {
	activeScene = activeScene.switchTo(gameoverScene);
});
gameplayScene.on(GameEvent.GameWon, () => {
	activeScene = activeScene.switchTo(gameWonScene);
});

const gameoverScene = new GameOverScreen({
	audioManager,
	canvas,
	config,
	context,
	content,
	fontCache,
	input,
	gameState,
	gameTime,
	spriteSheet: SpriteSheet,
	timer,
	textCache,
});
gameoverScene.on(GameEvent.StartGame, () => {
	activeScene = activeScene.switchTo(titleScreenScene);
});

const gameWonScene = new GameWonScreen({
	audioManager,
	canvas,
	config,
	context,
	content,
	fontCache,
	input,
	gameState,
	gameTime,
	spriteSheet: SpriteSheet,
	timer,
	textCache,
});
gameWonScene.on(GameEvent.StartGame, () => {
	activeScene = activeScene.switchTo(titleScreenScene);
});

let activeScene: Scene = loadingScreenScene;
activeScene.enter();

window.addEventListener("keypress", async (e: KeyboardEvent) => {
	if (e.key === "r") {
		if (recorder.recording) {
			recorder.frames?.generateAsync({ type: "blob" }).then((content) => {
				saveAs(content, `shmup-${Date.now()}.zip`);

				frameCount = 0;
			});
		}

		recorder.recording = !recorder.recording;

		document
			.querySelector<HTMLSpanElement>("#recording-on")
			?.classList.toggle("hidden");

		document
			.querySelector<HTMLSpanElement>("#recording-off")
			?.classList.toggle("hidden");
	} else if (e.key === "m") {
		if (audioManager.muted) {
			audioManager.unmute();
		} else {
			audioManager.mute();
		}

		document
			.querySelector<HTMLSpanElement>("#sound-on")
			?.classList.toggle("hidden");

		document
			.querySelector<HTMLSpanElement>("#sound-off")
			?.classList.toggle("hidden");
	}
});

const TARGET_FPS = 60;
const STEP = 1000 / TARGET_FPS;
const dt = STEP / 1000;
// @ts-ignore
let variableDt = 0;
let last = performance.now();
let deltaTimeAccumulator = 0;

let frameCount = 0;

/**
 * The game loop.
 */
const frame = (hrt: DOMHighResTimeStamp) => {
	deltaTimeAccumulator += Math.min(1000, hrt - last);
	variableDt = (hrt - last) / 1000;
	gameTime.update(hrt);

	while (deltaTimeAccumulator >= STEP) {
		if (input.debug.query()) {
			config.debug = !config.debug;
		}

		activeScene.update(dt);

		if (recorder.recording) {
			recorder.frames?.file(
				`frame-${frameCount++}.png`,
				canvas.toDataURL("image/png").split(",")[1],
				{ base64: true },
			);
		}

		deltaTimeAccumulator -= STEP;
	}

	last = hrt;

	requestAnimationFrame(frame);
};

// Start the game loop.
requestAnimationFrame(frame);
