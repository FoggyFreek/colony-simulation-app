# Colony Simulator — Metal Planet

A React app that simulates and compares 4 build strategies for a Metal planet in Colony, a strategy game. Models a full 7-day season (168 hours) including resource production, building upgrades, mining, trading, and leaderboard point accumulation.

## Features

- **4 built-in strategies** compared side-by-side with a bar chart
- **Custom strategy composer** — build your own action queue, see projected points and overflow warnings
- **Timeline charts** — resources, production rates, stardust, leaderboard points, trade ratios
- **Agenda export** — convert the action timeline to a real-world schedule (copy/download `.txt`)
- **Seeded RNG** — reproducible mining variance; randomize or pin a seed
- **Dark / light mode** — toggle persisted to `localStorage`

## Getting Started

```bash
npm install
npm run dev       # http://localhost:5173
```

## Commands

```bash
npm run dev       # Vite dev server with HMR
npm run build     # Production build → dist/
npm test          # Run all tests (vitest, 138 cases)
npm run lint      # ESLint
```

## Tech Stack

| Layer | Library |
|-------|---------|
| UI framework | React 19 + Vite 8 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Charts | Recharts 3 |
| Tests | Vitest |

## Project Structure

```
colony-sim/src/
├── simulation/           # Pure JS — no React dependency
│   ├── gameConstants.js  # Costs, rates, energy, point formulas
│   ├── engine.js         # simulate(strategy, seed) → { timeline, actionLog, finalState }
│   ├── strategies.js     # 4 strategy functions + SCENARIOS array
│   ├── customStrategy.js # Custom queue executor + action validator
│   ├── agendaUtils.js    # Real-time agenda builder + text formatter
│   └── engine.test.js    # 138 tests validating against colony-testcase.md
├── components/
│   ├── ScenarioSelector.jsx
│   ├── ComparisonChart.jsx
│   ├── FinalSummary.jsx
│   ├── TimelineChart.jsx
│   ├── ActionLog.jsx
│   ├── CustomStrategyComposer.jsx
│   └── AgendaExport.jsx
├── App.jsx               # Root state: scenario, seed, theme, custom queue
└── index.css             # Tailwind import + CSS custom properties (dark/light tokens)
```

## Game Rules

See [`game-rules-colony.md`](game-rules-colony.md) for full mechanics. Key points for Metal planet:

- **Mining:** `hourly_production × 0.02` per action; ±20% variance, 2% jackpot chance (10×)
- **Energy regen:** 3.571/hr (50 ÷ 14, truncated by game)
- **Trade ratios:** Metal → Gas and Metal → Crystal, randomized 0.75–1.25× per seed, varying smoothly over the season
- **Building efficiency:** L1 new build (300K metal, +1/hr) is 3× more efficient than L1→L2 upgrade (900K, +1/hr) — fill all 9 slots before upgrading

## Reference Test Case

docs/colony-testcase.md contains 43 hourly snapshots from a real game session. The test suite validates the engine's formulas against these expected values.
