export type Entity = {
	position?: { x: number; y: number };
	velocity?: { x: number; y: number };
	health?: number;
	damage?: number;
	shield?: { strength: number };
	poisoned?: { tickDamage: number };
	stunned?: { duration: number };
	buff?: { multiplier: number };
};

export type MutationConfig = {
	entityCount: number;
	mutationRate: number;
};

export const DEFAULT_CONFIG: MutationConfig = {
	entityCount: 1000,
	mutationRate: 0.1,
};

export interface MutationGameOptions {
	config?: Partial<MutationConfig>;
	duration?: number;
}
