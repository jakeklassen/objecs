export const gameState = {
	bombLocked: true,
	cherries: 0,
	score: 0,
	lives: 1,
	maxLives: 4,
	paused: false,
	gameOver: false,
	wave: 0,
	waveReady: false,
	maxWaves: 9,
};

export const resetGameState = (gameState: GameState) => {
	gameState.bombLocked = true;
	gameState.cherries = 0;
	gameState.score = 0;
	gameState.lives = gameState.maxLives;
	gameState.paused = false;
	gameState.gameOver = false;
	gameState.wave = 0;
	gameState.waveReady = false;
};

export type GameState = typeof gameState;
