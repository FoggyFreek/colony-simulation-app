import {
  BUILDING_PRODUCTION, SEASON_HOURS,
} from './gameConstants';

// Helper: upgrade the most recent building of a given type, or build new
function upgradeOrBuild(type, buildings, totalBuildings, maxLevel = 7) {
  const bList = buildings[type];
  // Upgrade most recent non-maxed building
  if (bList.length > 0) {
    const lastIdx = bList.length - 1;
    if (bList[lastIdx] < maxLevel) {
      return {
        type: 'trade_and_upgrade',
        buildingType: type,
        buildingIndex: lastIdx,
        targetLevel: bList[lastIdx] + 1,
      };
    }
  }
  // All existing are maxed (or none exist), build new
  if (totalBuildings < 9) {
    return { type: 'trade_and_upgrade', buildingType: type, targetLevel: 1 };
  }
  return null;
}

// Helper: fill remaining slots with metal L1→L7 and upgrade any non-maxed
function fillMetal(buildings, totalBuildings) {
  for (let i = 0; i < buildings.metal.length; i++) {
    if (buildings.metal[i] < 7) {
      return {
        type: 'trade_and_upgrade', buildingType: 'metal',
        buildingIndex: i, targetLevel: buildings.metal[i] + 1,
      };
    }
  }
  if (totalBuildings < 9) {
    return { type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 };
  }
  return null;
}

// ============================================================
// SCENARIO 1: Max Metal Buildings - Level each to 7 before next
// Pure metal rush: build one metal building, upgrade to L7,
// then build the next. Maximizes metal production and building
// upgrade points without any utility or stardust buildings.
// Avg 25.8M LP across seeds, 36% Explorer rate.
// ============================================================
export function strategyMaxMetal(hour, resources, buildings, production, totalBuildings) {
  const action = upgradeOrBuild('metal', buildings, totalBuildings);
  return action ? [action] : [];
}

// ============================================================
// SCENARIO 2: Stardust Rush - Maximum stardust accumulation.
// Build stardust L1 immediately at hour 0 (starting resources
// exactly cover the 100K×3 cost), then build metal L2 for
// economy, then rush stardust L2→L3 for maximum production
// time. Avg 268 stardust across seeds.
// ============================================================
export function strategyMaxStardust(hour, resources, buildings, production, totalBuildings) {
  const stardustBuildings = buildings.stardust;
  const metalBuildings = buildings.metal;

  // Priority 1: Build stardust L1 immediately (100K each = starting resources)
  if (stardustBuildings.length === 0 && totalBuildings < 9) {
    return [{ type: 'trade_and_build_stardust', targetLevel: 1 }];
  }

  // Priority 2: Build metal L1 for economy
  if (metalBuildings.length === 0) {
    return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  }

  // Priority 3: Upgrade metal to L2 for stronger economy to fund stardust upgrades
  if (metalBuildings[0] < 2) {
    return [{
      type: 'trade_and_upgrade', buildingType: 'metal',
      buildingIndex: 0, targetLevel: 2,
    }];
  }

  // Priority 4: Rush stardust to L2 then L3 for maximum production hours
  if (stardustBuildings.length > 0 && stardustBuildings[0] < 3) {
    return [{
      type: 'trade_and_build_stardust',
      targetLevel: stardustBuildings[0] + 1,
      buildingIndex: 0,
    }];
  }

  // Priority 5: After stardust L3, upgrade metal for economy/LP
  const action = fillMetal(buildings, totalBuildings);
  return action ? [action] : [];
}

// ============================================================
// SCENARIO 3: Optimal (Gas First) - Maximum leaderboard points.
// Rush gas utility to L7 first: on a metal planet, gas is the
// scarcest resource for metal building upgrades (70K–200K gas
// per level). Gas L7 (+47K gas/hr) eliminates gas trade costs,
// enabling faster metal building upgrades with low variance.
// Avg 25.7M LP, 39% Explorer, only 4% Platinum risk.
// ============================================================
export function strategyOptimal(hour, resources, buildings, production, totalBuildings) {
  const gasBuildings = buildings.gas;
  const metalBuildings = buildings.metal;

  // Priority 1: Build gas utility and rush to L7
  if (gasBuildings.length === 0) {
    return [{ type: 'trade_and_upgrade', buildingType: 'gas', targetLevel: 1 }];
  }
  if (gasBuildings[0] < 7) {
    return [{
      type: 'trade_and_upgrade', buildingType: 'gas',
      buildingIndex: 0, targetLevel: gasBuildings[0] + 1,
    }];
  }

  // Priority 2: Gas is L7 — rush metal buildings to L7, one at a time
  const action = upgradeOrBuild('metal', buildings, totalBuildings);
  return action ? [action] : [];
}

// ============================================================
// SCENARIO 4: Max USD Value - Maximize dollar value.
// Rush 2 metal buildings to L7 for strong economy and Diamond
// tier floor, then build stardust L1 for STAR token income,
// then continue metal rush. Nearly guarantees Diamond (99.4%)
// while earning ~47 stardust ($4.20 at STAR=$0.09) per season.
// Optimized for STAR=$0.09 / SOL=$94. Avg ~$35 USD.
// ============================================================
export function strategyMaxUSD(hour, resources, buildings, production, totalBuildings) {
  const metalBuildings = buildings.metal;
  const stardustBuildings = buildings.stardust;

  // Priority 1: Rush first metal building to L7
  if (metalBuildings.length === 0) {
    return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  }
  if (metalBuildings[0] < 7) {
    return [{
      type: 'trade_and_upgrade', buildingType: 'metal',
      buildingIndex: 0, targetLevel: metalBuildings[0] + 1,
    }];
  }

  // Priority 2: Rush second metal building to L7
  if (metalBuildings.length < 2 && totalBuildings < 9) {
    return [{ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 }];
  }
  if (metalBuildings.length >= 2 && metalBuildings[1] < 7) {
    return [{
      type: 'trade_and_upgrade', buildingType: 'metal',
      buildingIndex: 1, targetLevel: metalBuildings[1] + 1,
    }];
  }

  // Priority 3: Build stardust L1 for STAR token income
  if (stardustBuildings.length === 0 && totalBuildings < 9) {
    return [{ type: 'trade_and_build_stardust', targetLevel: 1 }];
  }

  // Priority 4: Continue filling with metal L7
  const action = upgradeOrBuild('metal', buildings, totalBuildings);
  if (action) return [action];

  // Priority 5: Upgrade stardust further once all metal is done
  if (stardustBuildings.length > 0 && stardustBuildings[0] < 3) {
    return [{ type: 'trade_and_build_stardust', targetLevel: stardustBuildings[0] + 1, buildingIndex: 0 }];
  }

  return [];
}

// ============================================================
// SCENARIO 5: Crystal First - Build crystal utility to L7, then
// max out metal buildings. Crystal is the most expensive resource
// for metal upgrades (100K–300K crystal per level). An L7 crystal
// building (+47K crystal/hr) funds metal upgrades without trading.
// Avg 25.5M LP, 44% Explorer. Higher variance than gas-first
// because crystal building costs gas (scarce on metal planet).
// ============================================================
export function strategyCrystalFirst(hour, resources, buildings, production, totalBuildings) {
  const crystalBuildings = buildings.crystal;

  // Priority 1: Build crystal utility and rush to L7
  if (crystalBuildings.length === 0) {
    return [{ type: 'trade_and_upgrade', buildingType: 'crystal', targetLevel: 1 }];
  }
  if (crystalBuildings[0] < 7) {
    return [{
      type: 'trade_and_upgrade', buildingType: 'crystal',
      buildingIndex: 0, targetLevel: crystalBuildings[0] + 1,
    }];
  }

  // Priority 2: Crystal is L7 — rush metal buildings to L7
  const action = upgradeOrBuild('metal', buildings, totalBuildings);
  return action ? [action] : [];
}

export const SCENARIOS = [
  {
    id: 'max-metal',
    name: 'Scenario 1: Max Metal Rush',
    description: 'Pure metal rush: build one metal building, level to L7 before building the next. Fill all 9 slots. No utility buildings — tests raw metal-only economy.',
    strategy: strategyMaxMetal,
    color: '#f59e0b',
  },
  {
    id: 'max-stardust',
    name: 'Scenario 2: Stardust Rush',
    description: 'Maximize stardust. Build stardust L1 immediately at hour 0, then metal L2 for economy, then rush stardust to L3 (+3/hr). Only one stardust building allowed per planet.',
    strategy: strategyMaxStardust,
    color: '#8b5cf6',
  },
  {
    id: 'optimal',
    name: 'Scenario 3: Optimal (Gas First)',
    description: 'Rush gas utility to L7 (+47K gas/hr), then fill with metal L7. Gas is scarce on metal planets — gas L7 eliminates trade losses and enables fast metal upgrades. Best LP-to-risk ratio: 39% Explorer, only 4% Platinum.',
    strategy: strategyOptimal,
    color: '#10b981',
  },
  {
    id: 'max-usd',
    name: 'Scenario 4: Max USD Value',
    description: 'Maximize dollar value. Rush 2 metal L7 for Diamond tier floor, build stardust L1 for STAR income (~47 SD/season), then continue metal rush. 99.4% Diamond+, avg ~$35. Optimized for STAR=$0.09 / SOL=$94.',
    strategy: strategyMaxUSD,
    color: '#e11d48',
  },
  {
    id: 'crystal-first',
    name: 'Scenario 5: Crystal First',
    description: 'Rush crystal utility to L7 (+47K crystal/hr), then fill with metal L7. Crystal is the most expensive metal upgrade component (100K–300K/level). Higher variance than gas-first due to gas-heavy crystal building costs.',
    strategy: strategyCrystalFirst,
    color: '#06b6d4',
  },
];
