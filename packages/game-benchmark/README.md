# game-benchmark

A realistic game benchmark for comparing ECS library performance using a boids flocking simulation.

## Overview

Unlike micro-benchmarks that test isolated operations, this benchmark runs a complete game loop with:

- Entity queries and iteration
- Component reads and writes
- Multiple interdependent systems
- Real rendering (SDL2 + Canvas)

## Requirements

- Node.js 24+
- SDL2 libraries installed on your system

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

# Run indefinitely (single lib only)
pnpm start --lib objecs -d 0
```

## Options

| Option | Short | Default | Description |
|--------|-------|---------|-------------|
| `--game <name>` | `-g` | `boids` | Game/simulation to run |
| `--lib <name>` | `-l` | all | ECS library to test (can specify multiple) |
| `--duration <secs>` | `-d` | `10` | Duration in seconds per library |
| `--count <num>` | `-c` | `500` | Entity count |
| `--headless` | | | Run without window |
| `--no-headless` | | | Run with window (each lib shown sequentially) |
| `--help` | | | Show help |

**Window defaults:**
- Single library → shows window
- Multiple libraries → headless (use `--no-headless` to show windows)

## Supported Libraries

| Library | Description |
|---------|-------------|
| `objecs` | objecs ECS library (workspace) |
| `miniplex` | miniplex ECS library |

## Games

### boids

A flocking simulation implementing Craig Reynolds' boids algorithm:

- **Separation**: Steer to avoid crowding nearby boids
- **Alignment**: Steer towards average heading of nearby boids
- **Cohesion**: Steer towards average position of nearby boids

Systems profiled:
- `flocking` - Calculates separation, alignment, and cohesion forces
- `movement` - Applies acceleration to velocity and velocity to position
- `bounds` - Wraps entities around screen edges (toroidal)
- `render` - Draws boids as directional triangles

## Output

### Comparison Mode

When running multiple libraries, a comparison report is generated:

```
============================================================
COMPARISON REPORT
============================================================

📊 Overall Performance (sorted by FPS):

Library       Avg FPS   Avg Frame   Min Frame   Max Frame  Diff
----------------------------------------------------------------------
objecs          62.3      16.05ms     14.12ms     22.45ms  👑 BEST
miniplex        58.1      17.22ms     15.34ms     24.67ms  6.7% slower

📈 System Timings (avg ms per call):

System              objecs    miniplex
---------------------------------------
flocking           13.724*      14.102
explosion           0.045*       0.048
movement            0.076*       0.082
bounds              0.021*       0.023
render              1.872        1.845*

* = fastest for this system
```

### Single Library Mode

After the simulation completes, a profiler report is printed:

```
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
