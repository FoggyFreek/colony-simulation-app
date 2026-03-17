# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Colony Simulator — a React app that simulates 4 strategy scenarios for a Metal planet in Colony (a Solana-based onchain game). It models a full 7-day season (168 hours) with resource production, building upgrades, mining, trading, and leaderboard point accumulation.

Game rules are documented in `game-rules-colony.md`. A reference test case with expected hourly values is in `colony-testcase.md`.

## Commands

All commands run from `colony-sim/`:

```bash
npm run dev        # Start Vite dev server with HMR
npm run build      # Production build to dist/
npm test           # Run all tests (vitest run)
npx vitest run src/simulation/engine.test.js  # Run a single test file
npm run lint       # ESLint
```

## Architecture

```
colony-sim/src/
├── simulation/           # Pure logic, no React dependency
│   ├── gameConstants.js  # All game rules: costs, production rates, energy, points
│   ├── engine.js         # simulate(strategy, seed) → {timeline, actionLog, finalState}
│   ├── strategies.js     # 4 strategy functions + SCENARIOS array
│   └── engine.test.js    # Validates formulas against colony-testcase.md
├── components/           # Presentational React components (charts, cards, logs)
├── App.jsx               # State management: activeScenario, seed → useMemo(simulate)
└── index.css             # Tailwind v4 import + CSS custom properties for dark/light theme
```

**Data flow:** `App.jsx` calls `simulate()` for each of the 4 strategies on seed change. Each strategy is a function `(hour, resources, buildings, production, totalBuildings) → actions[]` called every simulated hour. The engine executes actions (build, upgrade, trade+upgrade) and records timeline snapshots.

**Seeded RNG:** The engine uses a linear congruential generator so mining variance is reproducible per seed. The UI exposes a seed control to randomize.

## Styling

The UI uses **Tailwind CSS v4** via `@tailwindcss/vite`. There is no `App.css` — all component styles are Tailwind utility classes inline in JSX.

**Theme system:** Dark/light mode is driven by CSS custom properties in `index.css`. Toggle state is persisted to `localStorage` and applied as `data-theme="light"` on `<html>`. Components reference theme colors via `var(--color-*)` tokens inside Tailwind arbitrary-value syntax (e.g. `bg-[var(--color-surface)]`).

Three things are kept as plain CSS in `index.css` (Tailwind cannot express them):
- Toggle switch pseudo-element (`:after`)
- Tier badge color combos (`.tier-explorer`, `.tier-diamond`, etc.)
- `@keyframes warningFadeIn`

## Key Game Mechanics (Metal Planet)

- **Mining formula:** `hourly_production * 0.02` per mine action (not 0.2% of daily). Verified against test case.
- **Energy regen:** Exactly `3.571` per hour (game truncates 50/14). At hour 7 this gives energy=3.997 (floor=3), not 4.0.
- **Trade ratios:** Randomized per seed, varying between 1:0.75 and 1:1.25 for Metal→Gas and Metal→Crystal. Ratios change gradually over the season using layered sine waves (no sudden spikes). The engine converts surplus/deficit to metal-equivalent using the current hour's ratios. Trade RNG is offset from mining RNG (`seed ^ 0xbeef`).
- **Stardust efficiency:** New L1 building (300K, +1/hr) is 3x more efficient than upgrading L1→L2 (900K, +1/hr). Fill slots before upgrading.

## Test Case Validation

Tests in `engine.test.js` validate the simulation against 43 hourly snapshots from `colony-testcase.md`:
- Energy, mining actions, and gas/crystal are checked deterministically
- Metal accumulation verified via `metals[h] = metals[h-1] + production + mining_returns[h-1]`
- Mining returns checked against stochastic bounds (±20% variance, 2% jackpot at 10x)
- Building upgrade costs verified against L2/L3 transitions in test case