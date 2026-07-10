# Architecture Decision Records

Durable records of non-obvious design/performance decisions in the objecs core.
Each ADR captures the context, the decision, the mechanism (why), the measured
evidence, and the consequences — so the reasoning survives even when the code looks
like a one-liner.

Micro-benchmark proofs live in `packages/perf-proofs`; whole-system validation lives
in `ecs-benchmark` and `game-benchmark`. ADRs tie those to the actual code decision.

| ADR                                                  | Decision                                                                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [0001](./0001-assign-undefined-instead-of-delete.md) | Assign `undefined` instead of `delete`; single-key fast path; avoid per-call allocations in the add/remove hot path |
