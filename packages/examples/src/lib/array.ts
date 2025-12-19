// Non-empty tuple - guaranteed to have at least one element, returns T
export function rndFromList<T>(list: readonly [T, ...T[]]): T;
// Possibly empty array - returns T | undefined
export function rndFromList<T>(list: readonly T[]): T | undefined;
// Implementation
export function rndFromList<T>(list: readonly T[]): T | undefined {
	return list[Math.floor(Math.random() * list.length)];
}
