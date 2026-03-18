---
name: benchmark
description: Run strategy benchmarks and test build-order variants for the colony simulation. Use when the user wants to compare strategies, test new build orders, optimize scenarios, or evaluate performance across seeds.
allowed-tools: Read, Write, Bash, Grep, Glob, Edit
user-invocable: true
disable-model-invocation: true
argument-hint: "[scenario|all] [seeds=200] [STAR=0.09] [SOL=94]"
---

# Strategy Benchmark & Variant Testing

Run simulation benchmarks across multiple seeds to evaluate and compare strategy performance.

## Cleanup check

Before starting, check if `src/simulation/_benchmark.test.js` exists. If it does, delete it — it is a leftover from a previous benchmark run.

## Arguments

`$ARGUMENTS` is a raw string. Split on whitespace and match `key=value` pairs for optional parameters:
- **scenario**: which scenario to focus on (`max-metal`, `max-stardust`, `optimal`, `max-usd`, `crystal-first`, or `all`). Default: `all`.
- **seeds**: number of seeds to test (e.g. `seeds=500`). Default: `200`.
- **STAR**: STAR token price for USD calculations (e.g. `STAR=0.12`). Default: `0.09`.
- **SOL**: SOL price for USD calculations (e.g. `SOL=94`). Default: `94`.

Examples:
- `/benchmark` — benchmark all 5 scenarios with defaults
- `/benchmark max-usd STAR=0.15 SOL=100` — test Max USD at different prices
- `/benchmark optimal seeds=500` — deep test Optimal with 500 seeds
- `/benchmark variants max-usd` — test build-order variants for Max USD

## How to benchmark

1. Write a temporary test file at `src/simulation/_benchmark.test.js`
2. Import from the simulation modules (engine, strategies, gameConstants)
3. Run with `npx vitest run src/simulation/_benchmark.test.js`
4. Delete the temp file when done

### Benchmark test template

Replace the `{{...}}` placeholders below with the actual parsed argument values before writing the file.

```javascript
import { describe, it } from 'vitest';
import { simulate } from './engine';
import { SCENARIOS } from './strategies';
import { getTier } from './gameConstants';

const STAR = {{STAR_PRICE}};
const SOL = {{SOL_PRICE}};
const NUM_SEEDS = {{NUM_SEEDS}};

function calcUSD(fs) {
  const tier = getTier(fs.leaderboardPoints);
  return {
    total: fs.totalStardust * STAR + tier.sol * SOL,
    tier: tier.name,
    sol: tier.sol * SOL,
    sd: fs.totalStardust * STAR,
  };
}

function bench(name, strategyFn) {
  let totalLP = 0, totalSD = 0, totalUSD = 0;
  let minLP = Infinity, maxLP = -Infinity;
  const tierCounts = {};
  for (let seed = 1; seed <= NUM_SEEDS; seed++) {
    const result = simulate(strategyFn, seed);
    const fs = result.finalState;
    totalLP += fs.leaderboardPoints;
    totalSD += fs.totalStardust;
    const usd = calcUSD(fs);
    totalUSD += usd.total;
    minLP = Math.min(minLP, fs.leaderboardPoints);
    maxLP = Math.max(maxLP, fs.leaderboardPoints);
    tierCounts[usd.tier] = (tierCounts[usd.tier] || 0) + 1;
  }
  const avgSD = totalSD / NUM_SEEDS;
  return {
    name,
    avgLP: Math.round(totalLP / NUM_SEEDS),
    minLP, maxLP,
    avgSD: +avgSD.toFixed(1),
    sdUSD: +(avgSD * STAR).toFixed(2),
    avgUSD: +(totalUSD / NUM_SEEDS).toFixed(2),
    tiers: tierCounts,
    explorerPct: +((tierCounts['Explorer'] || 0) / NUM_SEEDS * 100).toFixed(1),
    diamondPct: +(((tierCounts['Explorer'] || 0) + (tierCounts['Diamond'] || 0)) / NUM_SEEDS * 100).toFixed(1),
  };
}
```

### Strategy variant builder

When testing build-order variants, use this sequential strategy builder:

```javascript
function makeSeq(steps) {
  return function(hour, resources, buildings, production, totalBuildings) {
    let idx = { metal: 0, gas: 0, crystal: 0, stardust: 0 };
    for (const step of steps) {
      const bList = buildings[step.type];
      if (step.type === 'stardust') {
        if (step.level === 1 && bList.length === 0 && totalBuildings < 9) {
          return [{ type: 'trade_and_build_stardust', targetLevel: 1 }];
        }
        if (bList.length > 0 && bList[0] < step.level) {
          return [{ type: 'trade_and_build_stardust', targetLevel: bList[0] + 1, buildingIndex: 0 }];
        }
        idx.stardust++;
        continue;
      }
      const ti = idx[step.type];
      if (ti < bList.length && bList[ti] >= step.level) { idx[step.type]++; continue; }
      if (ti >= bList.length) {
        if (totalBuildings < 9) return [{ type: 'trade_and_upgrade', buildingType: step.type, targetLevel: 1 }];
        continue;
      }
      return [{ type: 'trade_and_upgrade', buildingType: step.type, buildingIndex: ti, targetLevel: bList[ti] + 1 }];
    }
    // Fallback: fill remaining with metal
    for (let i = 0; i < buildings.metal.length; i++) {
      if (buildings.metal[i] < 7) return [{ type: 'trade_and_upgrade', buildingType: 'metal', buildingIndex: i, targetLevel: buildings.metal[i] + 1 }];
    }
    if (totalBuildings < 9) return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
    if (buildings.stardust.length > 0 && buildings.stardust[0] < 3) {
      return [{ type: 'trade_and_build_stardust', targetLevel: buildings.stardust[0] + 1, buildingIndex: 0 }];
    }
    return [];
  };
}

// Shorthand helpers
const M = (l) => ({ type: 'metal', level: l });
const C = (l) => ({ type: 'crystal', level: l });
const G = (l) => ({ type: 'gas', level: l });
const SD = (l) => ({ type: 'stardust', level: l });

// Example: Crystal L7 → Stardust L1 → Metal rush
const variant = makeSeq([C(7), SD(1), M(7), M(7), M(7), M(7), M(7), M(7), M(7)]);
```

## Output format

Present results in a table sorted by the scenario's primary metric:
- **Max Metal**: sort by LP
- **Stardust Rush**: sort by avg SD
- **Optimal**: sort by LP
- **Max USD**: sort by avg USD
- **Crystal First**: sort by LP

Include these columns: Strategy name, avg LP, min-max LP range, avg SD, avg USD, Explorer%, Diamond+%, tier distribution.

For the "all scenarios" benchmark, also show a detailed breakdown for seed 42.

## Key game constants

Refer to `gameConstants.js` for authoritative values. Quick reference for benchmark interpretation:
- Season: 168 hours (7 days), 9 building slots
- Tier thresholds: Explorer ≥26M, Diamond ≥24M, Platinum ≥18M, Gold ≥16M, Silver ≥14M, Bronze ≥10M
- Tier SOL rewards: Explorer=0.8, Diamond=0.3, Platinum=0.16, Gold=0.12, Silver=0.06, Bronze=0.03

## After benchmarking

- Present clear findings with the data
- If the user asked for variants, recommend the best one and explain why
- If a variant clearly outperforms the current strategy, offer to update `strategies.js`
- Always clean up: delete `src/simulation/_benchmark.test.js` after running
