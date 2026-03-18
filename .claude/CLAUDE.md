# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Colony Simulator — a React app that simulates 5 strategy scenarios for a Metal planet in Colony (a Solana-based onchain game). It models a full 7-day season (168 hours) with resource production, building upgrades, mining, trading, and leaderboard point accumulation.

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
│   ├── engine.js         # simulate(strategy, seed, options) → {timeline, actionLog, miningByHour, finalState}
│   ├── strategies.js     # 5 strategy functions + SCENARIOS array
│   ├── customStrategy.js # User-configurable custom strategy
│   ├── agendaUtils.js    # buildAgenda(), formatAgendaAsText(), formatAgendaAsICS(), time helpers
│   ├── engine.test.js    # Validates formulas against colony-testcase.md
│   ├── agendaUtils.test.js
│   ├── agendaExport.test.js
│   └── customStrategy.test.js
├── components/           # Presentational React components (charts, cards, logs)
├── App.jsx               # State management: activeScenario, seed → useMemo(simulate)
└── index.css             # Tailwind v4 import + CSS custom properties for dark/light theme
```

**Data flow:** `App.jsx` calls `simulate()` for each of the 5 strategies on seed change. Each strategy is a function `(hour, resources, buildings, production, totalBuildings) → actions[]` called every simulated hour. The engine executes actions (build, upgrade, trade+upgrade) and records timeline snapshots.

**`simulate()` options:**
- `saveEnergyBeforeUpgrade` (bool) — when true, strategy runs before mining each hour so upgrades happen first; the engine also skips mining in hours where a utility upgrade is imminent (within 10h), then mines at the higher post-upgrade production rate.
- `tradeRatioAmplitude` — overrides the trade ratio variance amplitude.

**`simulate()` return value:**
- `timeline` — hourly snapshots of all state
- `actionLog` — flat `[{hour, action: string}]` of every build/upgrade/trade event
- `miningByHour` — `[{hour, resource, actions, metals, gas, crystal}]` per hour
- `finalState` — end-of-season resources, production, buildings, points

**Agenda / export layer** (`agendaUtils.js`): post-processing step separate from the engine. `buildAgenda(actionLog, timeline, seasonStart, awakeConfig, options)` maps sim hours to real wall-clock times and produces agenda entries. Handles sleep/wake scheduling — sleep hours accumulate energy and shift actions to a batched wake-up entry. `formatAgendaAsText()` and `formatAgendaAsICS()` convert entries to plain text or iCalendar format (ICS filtered to build/upgrade events only).

**Seeded RNG:** The engine uses a linear congruential generator so mining variance is reproducible per seed. The UI exposes a seed control to randomize.

## Styling

The UI uses **Tailwind CSS v4** via `@tailwindcss/vite`. There is no `App.css` — all component styles are Tailwind utility classes inline in JSX.

**Theme system:** Dark/light mode is driven by CSS custom properties in `index.css`. Toggle state is persisted to `localStorage` and applied as `data-theme="light"` on `<html>`. Components reference theme colors via `var(--color-*)` tokens inside Tailwind arbitrary-value syntax (e.g. `bg-[var(--color-surface)]`).

Three things are kept as plain CSS in `index.css` (Tailwind cannot express them):
- Toggle switch pseudo-element (`:after`)
- Tier badge color combos (`.tier-explorer`, `.tier-diamond`, etc.)
- `@keyframes warningFadeIn`

## Key Game Mechanics (Metal Planet)

- **Mining formula:** `daily production * 0.002` 0.2% of daily per mine action.
- **Energy regen:** Exactly `3.571` per hour (game truncates 50/14). At hour 7 this gives energy=3.997 (floor=3), not 4.0.
- **Trade ratios:** Randomized per seed, varying between 1:0.75 and 1:1.25 for Metal→Gas and Metal→Crystal. Ratios change gradually over the season using layered sine waves (no sudden spikes). The engine converts surplus/deficit to metal-equivalent using the current hour's ratios. Trade RNG is offset from mining RNG (`seed ^ 0xbeef`).
- **USD value model:** Total USD = (stardust × STAR price) + (tier SOL reward × SOL price). Tier thresholds: Explorer ≥26M LP (0.8 SOL), Diamond ≥24M (0.3), Platinum ≥18M (0.16), Gold ≥16M (0.12), Silver ≥14M (0.06), Bronze ≥10M (0.03). The Explorer tier jump is worth ~$47 at SOL=$94, so maximizing LP is critical for USD optimization.

## Test Case Validation

Tests in `engine.test.js` validate the simulation against 43 hourly snapshots from `colony-testcase.md`:
- Energy, mining actions, and gas/crystal are checked deterministically
- Metal accumulation verified via `metals[h] = metals[h-1] + production + mining_returns[h-1]`
- Mining returns checked against stochastic bounds (±20% variance, 2% jackpot at 10x)
- Building upgrade costs verified against L2/L3 transitions in test case