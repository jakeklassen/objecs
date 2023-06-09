type Wave = {
	attackFrequency: number;
	fireFrequency: number;
	enemies: number[][];
};

export const config = {
	debug: false,

	entities: {
		enemies: {
			greenAlien: {
				id: 1,
				score: 100,
				startingHealth: 3,
			},
			redFlameGuy: {
				id: 2,
				score: 200,
				startingHealth: 2,
			},
			spinningShip: {
				id: 3,
				score: 300,
				startingHealth: 4,
			},
			yellowShip: {
				id: 4,
				score: 500,
				startingHealth: 20,
			},
			boss: {
				id: 5,
				score: 10_000,
				startingHealth: 130,
			},
		},
		player: {
			projectiles: {
				bullet: {
					damage: 1,
				},
				bigBullet: {
					damage: 3,
				},
				bomb: {
					damage: 1000,
				},
			},
			spawnPosition: {
				x: 60,
				y: 110,
			},
		},
	},

	waves: {
		// space invaders
		1: {
			// 60: Originally based on 30 FPS - so 2 seconds
			attackFrequency: 60 / 30,
			// 20: Originally based on 30 FPS - so 2 / 3 second
			fireFrequency: 20 / 30,
			enemies: [
				[0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
				[0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
				[0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
				[0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
				// [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
				// [0, 0, 0, 0, 0, 4, 0, 0, 0, 0],
				// [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
				// [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
			],
		},

		// red tutorial
		2: {
			// 60: Originally based on 30 FPS - so 2 seconds
			attackFrequency: 60 / 30,
			// 20: Originally based on 30 FPS - so 2 / 3 second
			fireFrequency: 20 / 30,
			enemies: [
				[1, 1, 2, 2, 1, 1, 2, 2, 1, 1],
				[1, 1, 2, 2, 1, 1, 2, 2, 1, 1],
				[1, 1, 2, 2, 2, 2, 2, 2, 1, 1],
				[1, 1, 2, 2, 2, 2, 2, 2, 1, 1],
			],
		},

		// wall of red
		3: {
			// 60: Originally based on 30 FPS - so ~1.66 seconds
			attackFrequency: 50 / 30,
			// 20: Originally based on 30 FPS - so 2 / 3 second
			fireFrequency: 20 / 30,
			enemies: [
				[1, 1, 2, 2, 1, 1, 2, 2, 1, 1],
				[1, 1, 2, 2, 2, 2, 2, 2, 1, 1],
				[2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
				[2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
			],
		},

		// spin tutorial
		4: {
			// 50: Originally based on 30 FPS - so ~1.66 seconds
			attackFrequency: 50 / 30,
			// 15: Originally based on 30 FPS - so 1 / 2 second
			fireFrequency: 15 / 30,
			enemies: [
				[3, 3, 0, 1, 1, 1, 1, 0, 3, 3],
				[3, 3, 0, 1, 1, 1, 1, 0, 3, 3],
				[3, 3, 0, 1, 1, 1, 1, 0, 3, 3],
				[3, 3, 0, 1, 1, 1, 1, 0, 3, 3],
			],
		},

		// chess
		5: {
			// 50: Originally based on 30 FPS - so ~1.66 seconds
			attackFrequency: 50 / 30,
			// 15: Originally based on 30 FPS - so 1 / 2 second
			fireFrequency: 15 / 30,
			enemies: [
				[3, 1, 3, 1, 2, 2, 1, 3, 1, 3],
				[1, 3, 1, 2, 1, 1, 2, 1, 3, 1],
				[3, 1, 3, 1, 2, 2, 1, 3, 1, 3],
				[1, 3, 1, 2, 1, 1, 2, 1, 3, 1],
			],
		},

		// yellow tutorial
		6: {
			// 40: Originally based on 30 FPS - so ~1.33 seconds
			attackFrequency: 40 / 30,
			// 10: Originally based on 30 FPS - so 1 / 3 second
			fireFrequency: 10 / 30,
			enemies: [
				[2, 2, 2, 0, 4, 0, 0, 2, 2, 2],
				[2, 2, 0, 0, 0, 0, 0, 0, 2, 2],
				[1, 1, 0, 1, 1, 1, 1, 0, 1, 1],
				[1, 1, 0, 1, 1, 1, 1, 0, 1, 1],
			],
		},

		// double yellow
		7: {
			// 40: Originally based on 30 FPS - so ~1.33 seconds
			attackFrequency: 40 / 30,
			// 10: Originally based on 30 FPS - so 1 / 3 second
			fireFrequency: 10 / 30,
			enemies: [
				[3, 3, 0, 1, 1, 1, 1, 0, 3, 3],
				[4, 0, 0, 2, 2, 2, 2, 0, 4, 0],
				[0, 0, 0, 2, 1, 1, 2, 0, 0, 0],
				[1, 1, 0, 1, 1, 1, 1, 0, 1, 1],
			],
		},

		// hell
		8: {
			// 30: Originally based on 30 FPS - so 1 second
			attackFrequency: 30 / 30,
			// 10: Originally based on 30 FPS - so 1 / 3 second
			fireFrequency: 10 / 30,
			enemies: [
				[0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
				[3, 3, 1, 1, 1, 1, 1, 1, 3, 3],
				[3, 3, 2, 2, 2, 2, 2, 2, 3, 3],
				[3, 3, 2, 2, 2, 2, 2, 2, 3, 3],
			],
		},

		// boss
		9: {
			// 60: Originally based on 30 FPS - so 2 seconds
			attackFrequency: 60 / 30,
			// 20: Originally based on 30 FPS - so 2 / 3 second
			fireFrequency: 20 / 30,
			enemies: [
				[0, 0, 0, 0, 5, 0, 0, 0, 0, 0],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
				[0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
			],
		},
	} as Record<string, Wave | undefined>,

	/**
	 * In pixels
	 */
	gameWidth: 128,

	/**
	 * In pixels
	 */
	gameHeight: 128,
};

export type Config = typeof config;
