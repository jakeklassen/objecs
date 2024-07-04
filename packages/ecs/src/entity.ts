export type Entity = number;

export const INVALID_ENTITY = 0;

let next = 0;

export const createEntity = () => {
	return ++next;
};
