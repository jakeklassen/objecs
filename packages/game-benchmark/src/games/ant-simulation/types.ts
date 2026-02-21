export type Entity = {
	position?: { x: number; y: number };
	velocity?: { x: number; y: number };
	ant?: {
		hasFood: boolean;
		speed: number;
		sightRange: number;
		steeringStrength: number;
	};
	food?: {
		amount: number;
	};
	nest?: {
		foodCollected: number;
		radius: number;
	};
	sprite?: {
		color: string;
		size: number;
	};
};

export type AntSimulationConfig = {
	width: number;
	height: number;
	antCount: number;
	foodClusters: number;
	foodPerCluster: number;
	antSpeed: number;
	antSightRange: number;
	antSteeringStrength: number;
	antFoV: number;
	pheromoneDepositRate: number;
	pheromoneDecayRate: number;
	pheromoneMaxStrength: number;
	pheromoneCellSize: number;
	nestRadius: number;
	foodPickupRadius: number;
	wanderStrength: number;
	antColor: string;
	antWithFoodColor: string;
	foodColor: string;
	nestColor: string;
	homeTrailColor: string;
	foodTrailColor: string;
};

export const DEFAULT_CONFIG: AntSimulationConfig = {
	width: 800,
	height: 600,
	antCount: 50,
	foodClusters: 4,
	foodPerCluster: 30,
	antSpeed: 2,
	antSightRange: 60,
	antSteeringStrength: 0.1,
	antFoV: (3 * Math.PI) / 4, // 135 degrees
	pheromoneDepositRate: 0.5,
	pheromoneDecayRate: 0.995,
	pheromoneMaxStrength: 1.0,
	pheromoneCellSize: 4,
	nestRadius: 30,
	foodPickupRadius: 8,
	wanderStrength: 0.15,
	antColor: "#ffffff",
	antWithFoodColor: "#00ff00",
	foodColor: "#44ff44",
	nestColor: "#ce5114",
	homeTrailColor: "#4287f5",
	foodTrailColor: "#fd2108",
};
