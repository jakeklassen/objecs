# objECS

Object ECS.

Checkout the demos [site] and [folder].

The featured demo is the [shmup demo] (Cherry Bomb), a port of the [Lazy Devs](https://www.youtube.com/@LazyDevs) pico-8 game.

[shmup-demo.webm](https://github.com/jakeklassen/objecs/assets/1383068/994302b7-7b98-4b46-b785-fd0fd183ffdc)

## Benchmarks

You can run some benchmarks by running `pnpm --filter ecs-benchmark start`.

## Tools

- [changelogithub]
  - This generates a changelog for a github release using [Conventional Commits].
- [bumpp]
  - Interactive version prompt.

## How to Work

- Develop like normal using [Conventional Commits].
- When you're ready to push a tag, run `bumpp`.
  - This will walk you through releasing a `tag`.
- When you're ready to publish, create a github release and the workflow will take over.
  - This will use [changelogithub] to generate a changelog and publish to NPM.

## Kudos

- [miniplex]

[bumpp]: https://www.npmjs.com/package/bumpp
[changelogithub]: https://github.com/antfu/changelogithub
[conventional commits]: https://www.conventionalcommits.org/en/v1.0.0/
[folder]: https://github.com/jakeklassen/objecs/tree/main/packages/examples/src/demos
[miniplex]: https://www.npmjs.com/package/miniplex
[shmup demo]: https://objecs.netlify.app/src/demos/shmup/
[site]: https://objecs.netlify.app/
