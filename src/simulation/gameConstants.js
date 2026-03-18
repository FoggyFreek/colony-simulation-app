// Colony Game Constants for Metal Planet

export const SEASON_HOURS = 7 * 24; // 168 hours

export const STARTING_RESOURCES = {
  metals: 100000,
  gas: 100000,
  crystal: 100000,
  stardust: 0,
};

// Metal planet: +500 metals base
export const BASE_PRODUCTION = {
  metals: 4500, // 4000 + 500 planet bonus
  gas: 4000,
  crystal: 4000,
  stardust: 0,
};

export const BUILDING_SLOTS = 9;

// Production bonus per building level (cumulative total)
export const BUILDING_PRODUCTION = [0, 2000, 5000, 9000, 14000, 22000, 32000, 47000];

// Stardust building production per level
export const STARDUST_BUILDING_PRODUCTION = [0, 1, 2, 3];

// Upgrade costs for Metal building: [metals, gas, crystal]
export const METAL_BUILDING_COSTS = {
  1: { metals: 30000, gas: 70000, crystal: 100000 },
  2: { metals: 40000, gas: 90000, crystal: 150000 },
  3: { metals: 50000, gas: 110000, crystal: 200000 },
  4: { metals: 60000, gas: 130000, crystal: 200000 },
  5: { metals: 70000, gas: 150000, crystal: 200000 },
  6: { metals: 80000, gas: 170000, crystal: 250000 },
  7: { metals: 100000, gas: 200000, crystal: 300000 },
};

// Gas building costs: [gas, crystal, metals]
export const GAS_BUILDING_COSTS = {
  1: { gas: 30000, crystal: 70000, metals: 100000 },
  2: { gas: 40000, crystal: 90000, metals: 150000 },
  3: { gas: 50000, crystal: 110000, metals: 200000 },
  4: { gas: 60000, crystal: 130000, metals: 200000 },
  5: { gas: 70000, crystal: 150000, metals: 200000 },
  6: { gas: 80000, crystal: 170000, metals: 250000 },
  7: { gas: 100000, crystal: 200000, metals: 300000 },
};

// Crystal building costs: [crystal, metals, gas]
export const CRYSTAL_BUILDING_COSTS = {
  1: { crystal: 30000, metals: 70000, gas: 100000 },
  2: { crystal: 40000, metals: 90000, gas: 150000 },
  3: { crystal: 50000, metals: 110000, gas: 200000 },
  4: { crystal: 60000, metals: 130000, gas: 200000 },
  5: { crystal: 70000, metals: 150000, gas: 200000 },
  6: { crystal: 80000, metals: 170000, gas: 250000 },
  7: { crystal: 100000, metals: 200000, gas: 300000 },
};

// Stardust building costs
export const STARDUST_BUILDING_COSTS = {
  1: { metals: 100000, gas: 100000, crystal: 100000 },
  2: { metals: 300000, gas: 300000, crystal: 300000 },
  3: { metals: 500000, gas: 500000, crystal: 500000 },
};

// Mining
export const MAX_ENERGY = 50;
export const ENERGY_REFILL_HOURS = 14;
// 50 energy / 14 hours = 3.571428..., but the game truncates to 3.571 internally.
// Verified against test case: at hour 7 energy=3.997 (not 4.000), which only
// works with 3.571 exactly. Using 50/14 would give floor(4.0)=4 actions instead of 3.
export const ENERGY_PER_HOUR = 3.571;
export const MINING_REWARD_RATE = 0.002; // 0.2% of daily production
export const MINING_JACKPOT_CHANCE = 0.02;
export const MINING_JACKPOT_MULTIPLIER = 10;
export const MINING_VARIANCE = 0.20; // ±20%

// Trade ratios (Metal → Gas / Crystal)
export const TRADE_RATIO_MIN = 0.65;
export const TRADE_RATIO_MAX = 1.35;
export const TRADE_RATIO_CENTER = 1.0;
export const TRADE_RATIO_AMPLITUDE = 0.35; // half-range from center

// Leaderboard points
export const RESOURCE_POINTS_PER_UNIT = 1;
export const STARDUST_POINTS_PER_UNIT = 3000;

export const BUILDING_UPGRADE_POINTS = [0, 20000, 50000, 100000, 200000, 300000, 500000, 800000];
export const STARDUST_UPGRADE_POINTS = [0, 50000, 100000, 300000];

export const BUILDING_COST_MAP = {
  metal: METAL_BUILDING_COSTS,
  gas: GAS_BUILDING_COSTS,
  crystal: CRYSTAL_BUILDING_COSTS,
  stardust: STARDUST_BUILDING_COSTS,
};

export const TIERS = [
  { min: 26000000, name: 'Explorer',  cls: 'tier-explorer',  pct: 'Top 1%',  sol: 0.8  },
  { min: 24000000, name: 'Diamond',   cls: 'tier-diamond',   pct: 'Top 5%',  sol: 0.3  },
  { min: 18000000, name: 'Platinum',  cls: 'tier-platinum',  pct: 'Top 10%', sol: 0.16 },
  { min: 16000000, name: 'Gold',      cls: 'tier-gold',      pct: 'Top 30%', sol: 0.12 },
  { min: 14000000, name: 'Silver',    cls: 'tier-silver',    pct: 'Top 50%', sol: 0.06 },
  { min: 10000000, name: 'Bronze',    cls: 'tier-bronze',    pct: 'Top 70%', sol: 0.03 },
];

const NO_TIER = { min: 0, name: 'No Tier', cls: 'tier-none', pct: 'Bottom 30%', sol: 0 };

export function getTier(points) {
  return TIERS.find(t => points >= t.min) || NO_TIER;
}
