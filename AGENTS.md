# AGENTS.md

objECS is a TypeScript Entity Component System (ECS) library in a pnpm monorepo.
See `CLAUDE.md` for full architecture, conventions, and performance guidelines.

## Toolchain

Tools are invoked directly via pnpm — there is no wrapper CLI.

- **Lint/format:** oxc — `pnpm lint` (oxlint, type-aware), `pnpm fmt` (oxfmt), `pnpm check` (both)
- **Test:** vitest — `pnpm --filter objecs test`
- **Build (library):** tsdown — `pnpm --filter objecs build`
- **Examples app:** vite — `pnpm --filter examples dev`
- **Runtime:** versions pinned in `mise.toml`

## Review Checklist

- [ ] Run `pnpm install` after pulling remote changes.
- [ ] Run `pnpm check` to format-check and lint.
- [ ] Run `pnpm --filter objecs test` for library tests.
- [ ] Run `pnpm --filter objecs build && pnpm --filter objecs check-exports` before a release.
