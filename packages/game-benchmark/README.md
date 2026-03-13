# game-benchmark

A realistic game benchmark for comparing ECS library performance using game simulations and stress tests.

## Overview

Unlike micro-benchmarks that test isolated operations, this benchmark runs complete game loops with:

- Entity queries and iteration
- Component reads and writes
- Multiple interdependent systems
- Real rendering (SDL2 + Canvas), or pure ECS mode with `--no-render`
- Component mutation stress testing

## Requirements

- Node.js 24+
- SDL2 libraries installed on your system (not needed for `--no-render` or `mutation` game)

## Installation

```bash
pnpm install
```

## Usage

```bash
# Compare all libraries (default, runs headless)
pnpm start

# Compare all libraries with windows (sequentially)
pnpm start --no-headless

# Compare specific libraries
pnpm start --lib objecs --lib miniplex

# Run single library (with window by default)
pnpm start --lib objecs

# Configure simulation
pnpm start -c 1000 -d 30              # 1000 boids, 30s per library
pnpm start --count 2000 --duration 60 # 2000 boids, 60s per library

# Headless single library benchmark
pnpm start --lib objecs --headless -c 2000 -d 5

# Skip rendering to isolate ECS performance
pnpm start --no-render -g boids -d 5

# Run mutation stress test
pnpm start -g mutation -d 5

# Run multiple trials for statistical confidence
pnpm start --no-render -g boids -d 5 -t 10

# Combined: mutation benchmark with 10 trials
pnpm start -g mutation -d 5 -t 10
```

## Options

| Option              | Short | Default | Description                                      |
| ------------------- | ----- | ------- | ------------------------------------------------ |
| `--game <name>`     | `-g`  | `boids` | Game/simulation to run                           |
| `--lib <name>`      | `-l`  | all     | ECS library to test (can specify multiple)       |
| `--duration <secs>` | `-d`  | `10`    | Duration in seconds per library                  |
| `--count <num>`     | `-c`  | `500`   | Entity count (500 boids, 50 ants, 1000 mutation) |
| `--trials <num>`    | `-t`  | `1`     | Number of trials per library                     |
| `--headless`        |       |         | Run without window                               |
| `--no-headless`     |       |         | Run with window (each lib shown sequentially)    |
| `--no-render`       |       |         | Skip all rendering to isolate ECS performance    |
| `--help`            |       |         | Show help                                        |

**Window defaults:**

- Single library → shows window
- Multiple libraries → headless (use `--no-headless` to show windows)
- `--no-render` and `mutation` game → always headless

## Supported Libraries

| Library    | Description                    |
| ---------- | ------------------------------ |
| `objecs`   | objecs ECS library (workspace) |
| `miniplex` | miniplex ECS library           |

## Games

### boids

A flocking simulation implementing Craig Reynolds' boids algorithm:

- **Separation**: Steer to avoid crowding nearby boids
- **Alignment**: Steer towards average heading of nearby boids
- **Cohesion**: Steer towards average position of nearby boids

Systems profiled: `flocking`, `explosion`, `movement`, `bounds`, `render`

### ants

An ant colony simulation with pheromone trails:

- Ants search for food and return it to the nest
- Pheromone trails guide other ants to food sources

Systems profiled: `steering`, `movement`, `pheromone-deposit`, `pheromone-decay`, `food-pickup`, `nest-delivery`, `render`

### mutation

A component mutation stress test that exercises `addEntityComponents`/`removeEntityComponents` across many archetypes. Useful for validating component-index optimizations.

- Creates entities with base components (`position`, `velocity`, `health`)
- Each frame randomly adds/removes optional components (`shield`, `poisoned`, `stunned`, `buff`)
- Iterates 20 archetypes with various `with`/`without` combinations to verify membership correctness
- No canvas or SDL dependency — pure ECS workload

Systems profiled: `mutation`, `iterate`

## Output

### Single-Trial Comparison

When running multiple libraries with a single trial (default), a comparison report is generated:

```text
============================================================
COMPARISON REPORT
============================================================

📊 Overall Performance (sorted by FPS):

Library        Avg FPS   Avg Frame  Diff
------------------------------------------------
objecs          8512.3      0.12ms  👑 BEST
miniplex        4804.0      0.21ms  43.6% slower

📈 System Timings (avg ms per call):

System               objecs    miniplex
---------------------------------------
mutation             0.089*      0.174
iterate              0.027*      0.033

* = fastest for this system
```

### Multi-Trial Comparison

With `--trials N` (N > 1), each library runs N times and results include mean ± stddev:

```text
============================================================
COMPARISON REPORT
============================================================

📊 Overall Performance (sorted by FPS):

Library                Avg FPS         Avg Frame  Diff
------------------------------------------------------------
objecs           1613.9 ± 78.9     0.62 ± 0.03ms  👑 BEST
miniplex        1558.5 ± 101.2     0.64 ± 0.04ms  3.4% slower

📈 System Timings (avg ms per call):

System                       objecs            miniplex
-------------------------------------------------------
flocking             0.613 ± 0.030*      0.629 ± 0.042
movement             0.003 ± 0.000*      0.005 ± 0.001
bounds               0.001 ± 0.000*      0.004 ± 0.000

* = fastest for this system
```

### Single Library Mode

After the simulation completes, a profiler report is printed:

```text
=== Profiler Report ===

Frame Statistics:
  Frames: 600
  Avg Frame Time: 16.234ms
  Min Frame Time: 14.112ms
  Max Frame Time: 22.456ms
  Avg FPS: 61.6

System Timings:
  flocking:
    Calls: 600
    Total: 8234.123ms
    Avg: 13.724ms
  render:
    Calls: 600
    Total: 1123.456ms
    Avg: 1.872ms
  movement:
    Calls: 600
    Total: 45.678ms
    Avg: 0.076ms
  bounds:
    Calls: 600
    Total: 12.345ms
    Avg: 0.021ms

Total frames: 600
```

## Controls

- **ESC** - Exit simulation
- Close window - Exit simulation
