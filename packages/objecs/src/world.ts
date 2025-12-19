import { JsonObject } from "type-fest";
import { Archetype } from "./archetype.js";

export type SafeEntity<
	Entity extends JsonObject,
	Components extends keyof Entity,
> = Entity & Required<Pick<Entity, Components>>;

/**
 * An iterable collection of entities optimized for fast iteration.
 * Provides Set-like methods but backed by an array for performance.
 */
export interface ReadonlyEntityCollection<T> extends Iterable<T> {
	readonly size: number;
	/**
	 * Check if an entity is in the collection.
	 * Accepts any object to allow checking membership without type narrowing.
	 */
	has(value: unknown): boolean;
	forEach(
		callbackfn: (value: T, value2: T, set: ReadonlyEntityCollection<T>) => void,
		thisArg?: unknown,
	): void;
	entries(): IterableIterator<[T, T]>;
	keys(): IterableIterator<T>;
	values(): IterableIterator<T>;
}

/**
 * A collection backed by an array for fast iteration.
 * Uses a Map for O(1) has() lookups.
 */
export class EntityCollection<T> implements ReadonlyEntityCollection<T> {
	readonly #entities: T[] = [];
	readonly #indices = new Map<T, number>();

	get size(): number {
		return this.#entities.length;
	}

	has(entity: unknown): boolean {
		return this.#indices.has(entity as T);
	}

	/**
	 * Add an entity. Returns true if added, false if already present.
	 * @remarks Used internally by World and Archetype.
	 */
	add(entity: T): boolean {
		if (this.#indices.has(entity)) {
			return false;
		}
		this.#indices.set(entity, this.#entities.length);
		this.#entities.push(entity);
		return true;
	}

	/**
	 * Remove an entity using swap-and-pop for O(1) removal.
	 * Returns true if removed, false if not present.
	 * @remarks Used internally by World and Archetype.
	 */
	remove(entity: T): boolean {
		const index = this.#indices.get(entity);
		if (index === undefined) {
			return false;
		}

		this.#indices.delete(entity);
		const lastIndex = this.#entities.length - 1;

		if (index !== lastIndex) {
			// Swap with last element
			const lastEntity = this.#entities[lastIndex];
			this.#entities[index] = lastEntity;
			this.#indices.set(lastEntity, index);
		}

		this.#entities.pop();
		return true;
	}

	/**
	 * Clear all entities.
	 * @remarks Used internally by World and Archetype.
	 */
	clear(): void {
		this.#entities.length = 0;
		this.#indices.clear();
	}

	// Use native array iteration for best performance
	[Symbol.iterator](): IterableIterator<T> {
		return this.#entities[Symbol.iterator]();
	}

	entries(): IterableIterator<[T, T]> {
		const entities = this.#entities;
		let index = 0;
		const length = entities.length;

		return {
			next(): IteratorResult<[T, T]> {
				if (index < length) {
					const entity = entities[index++];
					return { value: [entity, entity], done: false };
				}
				return { value: undefined, done: true } as IteratorResult<[T, T]>;
			},
			[Symbol.iterator]() {
				return this;
			},
		};
	}

	keys(): IterableIterator<T> {
		return this.#entities[Symbol.iterator]();
	}

	values(): IterableIterator<T> {
		return this.#entities[Symbol.iterator]();
	}

	forEach(
		callbackfn: (
			value: T,
			value2: T,
			set: ReadonlyEntityCollection<T>,
		) => void,
		thisArg?: unknown,
	): void {
		for (const entity of this.#entities) {
			callbackfn.call(thisArg, entity, entity, this);
		}
	}
}

/**
 * Container for Entities
 */
export class World<Entity extends JsonObject> {
	#archetypes = new Set<Archetype<Entity, Array<keyof Entity>>>();
	#entities = new EntityCollection<Entity>();

	public get archetypes(): Set<Archetype<Entity, Array<keyof Entity>>> {
		return this.#archetypes;
	}

	public get entities(): ReadonlyEntityCollection<Entity> {
		return this.#entities;
	}

	public clearEntities() {
		this.#entities.clear();

		for (const archetype of this.#archetypes) {
			archetype.clearEntities();
		}
	}

	public archetype<Components extends Array<keyof Entity>>(
		...components: Components
	): Archetype<
		SafeEntity<Entity, (typeof components)[number]>,
		typeof components
	> {
		const entities = new EntityCollection<Entity>();

		for (const entity of this.#entities) {
			const matchesArchetype = components.every((component) => {
				return component in entity;
			});

			if (matchesArchetype) {
				entities.add(entity);
			}
		}

		const archetype = new Archetype({
			entities,
			world: this,
			components,
		});

		return archetype as Archetype<
			SafeEntity<Entity, (typeof components)[number]>,
			typeof components
		>;
	}

	public createEntity(): Entity;
	/**
	 * Create an entity with the given components. This is a type-safe version
	 * __but__ it is of a point in time. When the entity is created. So don't
	 * rely on it to be type-safe in the future when used within systems.
	 */
	public createEntity<T extends Entity>(
		entity: T,
	): keyof typeof entity extends never
		? never
		: Pick<Entity & T, keyof typeof entity>;
	public createEntity<T extends Entity>(entity?: T) {
		const _entity = entity ?? ({} as T);

		this.#entities.add(_entity);

		for (const archetype of this.#archetypes) {
			archetype.addEntity(_entity);
		}

		return _entity as SafeEntity<Entity, keyof typeof entity>;
	}

	public deleteEntity(entity: Entity): boolean {
		for (const archetype of this.#archetypes) {
			archetype.removeEntity(entity);
		}

		return this.#entities.remove(entity);
	}

	/**
	 * Add a single component to an entity.
	 */
	public addEntityComponents<T extends Entity, Component extends keyof Entity>(
		entity: T,
		component: Component,
		value: NonNullable<Entity[Component]>,
	): T & Record<typeof component, typeof value>;
	/**
	 * Add multiple components to an entity in a single operation.
	 * More efficient than multiple single-component calls as it only
	 * updates archetype membership once.
	 */
	public addEntityComponents<
		T extends Entity,
		Components extends { [K in keyof Entity]?: NonNullable<Entity[K]> },
	>(
		entity: T,
		components: Components,
	): T & { [K in keyof Components]: NonNullable<Components[K]> };
	public addEntityComponents<T extends Entity>(
		entity: T,
		componentOrComponents: keyof Entity | Record<string, unknown>,
		value?: unknown,
	): T {
		if (!this.#entities.has(entity)) {
			throw new Error(`Entity does not exist`);
		}

		// Single component: addEntityComponents(entity, "key", value)
		if (typeof componentOrComponents === "string" && value !== undefined) {
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			entity[componentOrComponents] = value;
		} else {
			// Multiple components: addEntityComponents(entity, { key: value, ... })
			const components = componentOrComponents as Record<string, unknown>;
			for (const key in components) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				(entity as any)[key] = components[key];
			}
		}

		for (const archetype of this.#archetypes) {
			if (archetype.matches(entity)) {
				archetype.addEntity(entity);
			} else {
				archetype.removeEntity(entity);
			}
		}

		return entity;
	}

	public removeEntityComponents(
		entity: Entity,
		...components: Array<keyof Entity>
	): void {
		if (this.#entities.has(entity)) {
			for (const component of components) {
				// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
				delete entity[component];
			}

			for (const archetype of this.#archetypes) {
				if (archetype.matches(entity)) {
					archetype.addEntity(entity);
				} else {
					archetype.removeEntity(entity);
				}
			}
		}
	}

}
