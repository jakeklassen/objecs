import { JsonObject } from "type-fest";
import { Entity, INVALID_ENTITY } from "./entity.js";

export class ComponentManager<Component extends JsonObject> {
	#components: Component[] = [];
	#entities: Entity[] = [];
	#lookup: Record<Entity, number | undefined> = {};
	#factory: (...args: any[]) => Component;

	constructor(factory: (...args: any[]) => Component) {
		this.#factory = factory;
	}

	public create(entity: Entity): Component {
		console.assert(entity !== INVALID_ENTITY, "Invalid entity used");
		console.assert(this.#lookup[entity] == null, "Entity already exists");
		console.assert(
			this.#entities.length === this.#components.length,
			"Entities and components sizes do not match",
		);
		console.assert(
			Object.keys(this.#lookup).length === this.#components.length,
			"Lookup and components sizes do not match",
		);

		this.#lookup[entity] = this.#components.length;
		this.#components.push(this.#factory());
		this.#entities.push(entity);

		return this.#components.at(-1)!;
	}

	public count(): number {
		return this.#components.length;
	}

	public contains(entity: Entity) {
		return this.#lookup[entity] != null;
	}

	public getEntity(index: number): Entity {
		return this.#entities[index];
	}
}

export const componentManager = <
	Component extends JsonObject,
	Args extends Array<any>,
>(
	factory: (...args: Args) => Component,
) => {
	const components: Component[] = [];
	const entities: Entity[] = [];
	const lookup = new Map<Entity, number>();

	const manager = {
		create(entity: Entity, ...args: Args): Component {
			// console.assert(entity !== INVALID_ENTITY, "Invalid entity used");
			// console.assert(lookup[entity] == null, "Entity already exists");
			// console.assert(
			// 	entities.length === components.length,
			// 	"Entities and components sizes do not match",
			// );
			// console.assert(
			// 	Object.keys(lookup).length === components.length,
			// 	"Lookup and components sizes do not match",
			// );

			const index = lookup.get(entity);

			if (index != null) {
				components[index] = factory(...args);

				return components[index];
			}

			lookup.set(entity, components.length);
			components.push(factory(...args));
			entities.push(entity);

			return components.at(-1)!;
		},

		remove(entity: Entity) {
			const index = lookup.get(entity);

			if (index != null) {
				const entity = entities[index];

				if (index < components.length - 1) {
					// Swap out the dead element with the last one:
					components[index] = components.at(-1)!;
					entities[index] = entities.at(-1)!;

					// Update the lookup table:
					lookup.set(entities[index], index);
				}

				components.pop();
				entities.pop();
				lookup.delete(entity);
			}
		},

		get(index: number) {
			return components.at(index);
		},

		count(): number {
			return components.length;
		},

		contains(entity: Entity) {
			return lookup.has(entity);
		},

		getEntity(index: number): Entity {
			return entities[index];
		},

		getComponent(entity: Entity): Component | undefined {
			return components[lookup.get(entity) ?? -1];
		},

		// Iterator to iterate over components
		[Symbol.iterator]() {
			return components[Symbol.iterator]();
		},

		get entities() {
			return entities[Symbol.iterator]();
		},
	};

	return manager;
};
