import { Entity } from "../entity.ts";

function assertEnityHas<T extends Entity>(
	entity: T,
	...components: Array<keyof T>
): entity is T & Required<Pick<T, (typeof components)[number]>> {
	return components.every((component) => component in entity);
}

export function assertEnityHasOrThrow<T extends Entity>(
	entity: T,
	...components: Array<keyof T>
): asserts entity is T & Required<Pick<T, (typeof components)[number]>> {
	if (!assertEnityHas(entity, ...components)) {
		throw new Error(`Entity is missing components: ${components.join(", ")}`);
	}
}
