import { JsonObject } from "type-fest";
import { EntityCollection, ReadonlyEntityCollection, World } from "./world.js";

type SafeEntity<
	Entity extends JsonObject,
	Components extends keyof Entity,
> = Entity & Required<Pick<Entity, Components>>;

/**
 * An archetype is a collection of entities that share the same components.
 * Archetypes should not be constructed directly, but rather through the
 * `World` class using the `archetype` method.
 */
export class Archetype<
	Entity extends JsonObject,
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

		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		world.archetypes.add(this as any);
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
		const matchesArchetype = this.#components.every((component) => {
			return component in entity;
		});

		const matchesExcluding =
			this.#excluding?.some((component) => {
				return component in entity;
			}) ?? false;

		return matchesArchetype && !matchesExcluding;
	}

	public addEntity(entity: Entity): this {
		if (this.#entities.has(entity)) {
			return this;
		}

		if (this.matches(entity)) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			this.#entities._add(entity as any);
		}

		return this;
	}

	public removeEntity(entity: Entity): this {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		this.#entities._remove(entity as any);

		return this;
	}

	clearEntities() {
		this.#entities._clear();
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
			const matchesWithout = components.every((component) => {
				return component in entity;
			});

			if (matchesWithout) {
				continue;
			}

			entities._add(entity);
		}

		const archetype = new Archetype<
			SafeEntity<
				Omit<Entity, (typeof components)[number]>,
				Exclude<Components[number], (typeof components)[number]>
			>,
			Array<Exclude<Components[number], (typeof components)[number]>>
		>({
			entities,
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			world: this.#world as any,
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			components: this.#components as any,
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			without: components as any,
		});

		return archetype;
	}
}
