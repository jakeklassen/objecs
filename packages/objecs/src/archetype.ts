import {
	type EntityBase,
	EntityCollection,
	type ReadonlyEntityCollection,
	type SafeEntity,
	World,
} from "./world.js";

/**
 * An archetype is a collection of entities that share the same components.
 * Archetypes should not be constructed directly, but rather through the
 * `World` class using the `archetype` method.
 */
export class Archetype<
	Entity extends EntityBase,
	Components extends Array<keyof Entity>,
> {
	#entities: EntityCollection<SafeEntity<Entity, Components[number]>>;
	#components: Components;
	#excluding?: Array<Exclude<keyof Entity, Components[number]>>;
	#world: World<Entity>;

	constructor({
		entities,
		world,
		components,
		without,
	}: {
		world: World<Entity>;
		entities: EntityCollection<Entity>;
		components: Components;
		without?: Array<Exclude<keyof Entity, Components[number]>>;
	}) {
		this.#world = world;
		this.#entities = entities as EntityCollection<
			SafeEntity<Entity, Components[number]>
		>;
		this.#components = components;
		this.#excluding = without;

		// oxlint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
		world.registerArchetype(this as any);
	}

	public get entities(): ReadonlyEntityCollection<
		SafeEntity<Entity, Components[number]>
	> {
		return this.#entities;
	}

	public get components(): Readonly<Components> {
		return this.#components;
	}

	public get excluding(): Readonly<
		Array<Exclude<keyof Entity, Components[number]>>
	> {
		return this.#excluding ?? [];
	}

	public matches(entity: Entity): boolean {
		// perf: fused manual loop is 18-35% faster than .every() + .some()
		for (const component of this.#components) {
			if (entity[component as string] === undefined) return false;
		}

		if (this.#excluding !== undefined) {
			for (const component of this.#excluding) {
				if (entity[component as string] !== undefined) return false;
			}
		}

		return true;
	}

	public addEntity(entity: Entity): this {
		if (this.#entities.has(entity)) {
			return this;
		}

		if (this.matches(entity)) {
			// oxlint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
			this.#entities.add(entity as any);
		}

		return this;
	}

	public removeEntity(entity: Entity): this {
		// oxlint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
		this.#entities.remove(entity as any);

		return this;
	}

	clearEntities() {
		this.#entities.clear();
	}

	/**
	 * Returns a new archetype based on the current archetype, but excludes the
	 * specified components.
	 * @param components Components that should **not** be present on the entity
	 * @returns
	 */
	without<Component extends keyof Entity>(
		...components: Array<Component>
	): Archetype<
		SafeEntity<
			Omit<Entity, (typeof components)[number]>,
			Exclude<Components[number], (typeof components)[number]>
		>,
		Array<Exclude<Components[number], (typeof components)[number]>>
	> {
		const entities = new EntityCollection<
			SafeEntity<
				Omit<Entity, (typeof components)[number]>,
				Exclude<Components[number], (typeof components)[number]>
			>
		>();

		for (const entity of this.#entities) {
			// perf: manual loop avoids .every() callback overhead
			let matchesWithout = true;
			for (const component of components) {
				if (entity[component as string] === undefined) {
					matchesWithout = false;
					break;
				}
			}

			if (matchesWithout) {
				continue;
			}

			entities.add(entity);
		}

		const archetype = new Archetype<
			SafeEntity<
				Omit<Entity, (typeof components)[number]>,
				Exclude<Components[number], (typeof components)[number]>
			>,
			Array<Exclude<Components[number], (typeof components)[number]>>
		>({
			entities,
			// oxlint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
			world: this.#world as any,
			// oxlint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
			components: this.#components as any,
			// oxlint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
			without: components as any,
		});

		return archetype;
	}
}
