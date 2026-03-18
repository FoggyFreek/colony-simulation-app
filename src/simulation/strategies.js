import {
  BUILDING_COST_MAP, BUILDING_PRODUCTION, SEASON_HOURS,
} from './gameConstants';

// Helper: total cost to upgrade a metal building from L1 to targetLevel
function totalCostToLevel(type, targetLevel) {
  let total = { metals: 0, gas: 0, crystal: 0 };
  for (let l = 1; l <= targetLevel; l++) {
    const c = BUILDING_COST_MAP[type][l];
    total.metals += c.metals || 0;
    total.gas += c.gas || 0;
    total.crystal += c.crystal || 0;
  }
  return total;
}

// ============================================================
// SCENARIO 1: Max Metal Buildings - Level each to 7 before next
// ============================================================
export function strategyMaxMetal(hour, resources, buildings, production, totalBuildings) {
  const actions = [];
  const metalBuildings = buildings.metal;

  // If we have a metal building that's not level 7, try to upgrade it
  if (metalBuildings.length > 0) {
    const lastIdx = metalBuildings.length - 1;
    const currentLevel = metalBuildings[lastIdx];
    if (currentLevel < 7) {
      actions.push({
        type: 'trade_and_upgrade',
        buildingType: 'metal',
        buildingIndex: lastIdx,
        targetLevel: currentLevel + 1,
      });
      return actions;
    }
  }

  // All existing metal buildings are at level 7 (or none exist), build a new one
  if (totalBuildings < 9) {
    actions.push({
      type: 'trade_and_upgrade',
      buildingType: 'metal',
      targetLevel: 1,
    });
  }

  return actions;
}

// ============================================================
// SCENARIO 2: Balanced - Mix resources, buildings, stardust
// ============================================================
export function strategyBalanced(hour, resources, buildings, production, totalBuildings) {
  const actions = [];
  const metalBuildings = buildings.metal;
  const stardustBuildings = buildings.stardust;

  // Phase 1 (hours 0-20): Build first metal building, upgrade to L3
  if (hour <= 20) {
    if (metalBuildings.length === 0) {
      actions.push({ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 });
      return actions;
    }
    if (metalBuildings[0] < 3) {
      actions.push({
        type: 'trade_and_upgrade', buildingType: 'metal',
        buildingIndex: 0, targetLevel: metalBuildings[0] + 1,
      });
      return actions;
    }
  }

  // Phase 2 (hours 20-50): Build stardust L1 if possible
  if (hour > 20 && hour <= 60) {
    if (stardustBuildings.length === 0 && totalBuildings < 9) {
      actions.push({ type: 'trade_and_build_stardust', targetLevel: 1 });
      return actions;
    }
    // Continue upgrading metal
    if (metalBuildings.length > 0 && metalBuildings[0] < 5) {
      actions.push({
        type: 'trade_and_upgrade', buildingType: 'metal',
        buildingIndex: 0, targetLevel: metalBuildings[0] + 1,
      });
      return actions;
    }
  }

  // Phase 3 (hours 50-100): Push metal to L6-7, build second metal
  if (hour > 60 && hour <= 110) {
    if (metalBuildings.length > 0 && metalBuildings[0] < 7) {
      actions.push({
        type: 'trade_and_upgrade', buildingType: 'metal',
        buildingIndex: 0, targetLevel: metalBuildings[0] + 1,
      });
      return actions;
    }
    if (metalBuildings.length < 2 && totalBuildings < 9) {
      actions.push({ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 });
      return actions;
    }
    if (metalBuildings.length >= 2 && metalBuildings[1] < 4) {
      actions.push({
        type: 'trade_and_upgrade', buildingType: 'metal',
        buildingIndex: 1, targetLevel: metalBuildings[1] + 1,
      });
      return actions;
    }
  }

  // Phase 4 (hours 100-140): Upgrade stardust to L2 if possible, keep upgrading metal
  if (hour > 110 && hour <= 145) {
    if (stardustBuildings.length > 0 && stardustBuildings[0] < 2) {
      actions.push({
        type: 'trade_and_build_stardust', targetLevel: 2, buildingIndex: 0,
      });
      return actions;
    }
    // Upgrade second metal building
    if (metalBuildings.length >= 2 && metalBuildings[1] < 7) {
      actions.push({
        type: 'trade_and_upgrade', buildingType: 'metal',
        buildingIndex: 1, targetLevel: metalBuildings[1] + 1,
      });
      return actions;
    }
    // Build third metal
    if (metalBuildings.length < 3 && totalBuildings < 9) {
      actions.push({ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 });
      return actions;
    }
  }

  // Phase 5 (hours 140+): Continue building/upgrading
  if (hour > 145) {
    // Upgrade any metal building that's not maxed
    for (let i = 0; i < metalBuildings.length; i++) {
      if (metalBuildings[i] < 7) {
        actions.push({
          type: 'trade_and_upgrade', buildingType: 'metal',
          buildingIndex: i, targetLevel: metalBuildings[i] + 1,
        });
        return actions;
      }
    }
    // Build more metal buildings
    if (totalBuildings < 9) {
      actions.push({ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 });
    }
  }

  return actions;
}

// ============================================================
// SCENARIO 3: Max Stardust - Rush the single stardust building
// to L3 ASAP. Only one stardust building is allowed per planet;
// upgrading to L3 is the only way to increase stardust output.
// L3 = +3/hr stardust, giving maximum stardust over the season.
// Remaining slots are filled with metal buildings for economy.
// ============================================================
export function strategyMaxStardust(hour, resources, buildings, production, totalBuildings) {
  const actions = [];
  const metalBuildings = buildings.metal;
  const stardustBuildings = buildings.stardust;

  // Phase 1: Build first metal L1-L3 for early economy
  if (metalBuildings.length === 0) {
    actions.push({ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 });
    return actions;
  }
  if (metalBuildings[0] < 3 && hour <= 25) {
    actions.push({
      type: 'trade_and_upgrade', buildingType: 'metal',
      buildingIndex: 0, targetLevel: metalBuildings[0] + 1,
    });
    return actions;
  }

  // Phase 2: Build the single stardust building ASAP
  if (stardustBuildings.length === 0 && totalBuildings < 9) {
    actions.push({ type: 'trade_and_build_stardust', targetLevel: 1 });
    return actions;
  }

  // Phase 3: Upgrade stardust building to L2, then L3 (max output from the one allowed building)
  if (stardustBuildings.length > 0 && stardustBuildings[0] < 2) {
    actions.push({ type: 'trade_and_build_stardust', targetLevel: 2, buildingIndex: 0 });
    return actions;
  }
  if (stardustBuildings.length > 0 && stardustBuildings[0] < 3) {
    actions.push({ type: 'trade_and_build_stardust', targetLevel: 3, buildingIndex: 0 });
    return actions;
  }

  // Phase 4: Upgrade metal building to fund further growth
  if (metalBuildings[0] < 7) {
    actions.push({
      type: 'trade_and_upgrade', buildingType: 'metal',
      buildingIndex: 0, targetLevel: metalBuildings[0] + 1,
    });
    return actions;
  }

  // Phase 5: Fill remaining slots with metal buildings and upgrade them
  if (totalBuildings < 9) {
    actions.push({ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 });
    return actions;
  }

  for (let i = 0; i < metalBuildings.length; i++) {
    if (metalBuildings[i] < 7) {
      actions.push({
        type: 'trade_and_upgrade', buildingType: 'metal',
        buildingIndex: i, targetLevel: metalBuildings[i] + 1,
      });
      return actions;
    }
  }

  return actions;
}

// ============================================================
// SCENARIO 4: Optimal - Aggressive early metal, early stardust, max points
// Strategy: Rush metal L1→L3 fast, build stardust L1,
// push metal to L7, stardust L2, build 2nd metal, push both,
// stardust L3, fill remaining slots
// ============================================================
export function strategyOptimal(hour, resources, buildings, production, totalBuildings) {
  const actions = [];
  const metalBuildings = buildings.metal;
  const stardustBuildings = buildings.stardust;

  // Priority 1: Always have at least one metal building
  if (metalBuildings.length === 0) {
    actions.push({ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 });
    return actions;
  }

  // Priority 2: Rush first metal to L3 for strong early economy
  if (metalBuildings[0] < 3) {
    actions.push({
      type: 'trade_and_upgrade', buildingType: 'metal',
      buildingIndex: 0, targetLevel: metalBuildings[0] + 1,
    });
    return actions;
  }

  // Priority 3: Build stardust L1 early (hour ~20-35) for max stardust time
  if (stardustBuildings.length === 0 && totalBuildings < 9) {
    actions.push({ type: 'trade_and_build_stardust', targetLevel: 1 });
    return actions;
  }

  // Priority 4: Push first metal to L5 for big production jump (+8k at L5)
  if (metalBuildings[0] < 5) {
    actions.push({
      type: 'trade_and_upgrade', buildingType: 'metal',
      buildingIndex: 0, targetLevel: metalBuildings[0] + 1,
    });
    return actions;
  }

  // Priority 5: Build second metal building
  if (metalBuildings.length < 2 && totalBuildings < 9) {
    actions.push({ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 });
    return actions;
  }

  // Priority 6: Push first metal to L7
  if (metalBuildings[0] < 7) {
    actions.push({
      type: 'trade_and_upgrade', buildingType: 'metal',
      buildingIndex: 0, targetLevel: metalBuildings[0] + 1,
    });
    return actions;
  }

  // Priority 7: Upgrade second metal aggressively
  if (metalBuildings.length >= 2 && metalBuildings[1] < 5) {
    actions.push({
      type: 'trade_and_upgrade', buildingType: 'metal',
      buildingIndex: 1, targetLevel: metalBuildings[1] + 1,
    });
    return actions;
  }

  // Priority 8: Stardust L2
  if (stardustBuildings.length > 0 && stardustBuildings[0] < 2) {
    actions.push({ type: 'trade_and_build_stardust', targetLevel: 2, buildingIndex: 0 });
    return actions;
  }

  // Priority 9: Push second metal to L7
  if (metalBuildings.length >= 2 && metalBuildings[1] < 7) {
    actions.push({
      type: 'trade_and_upgrade', buildingType: 'metal',
      buildingIndex: 1, targetLevel: metalBuildings[1] + 1,
    });
    return actions;
  }

  // Priority 10: Build third metal
  if (metalBuildings.length < 3 && totalBuildings < 9) {
    actions.push({ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 });
    return actions;
  }

  // Priority 11: Stardust L3
  if (stardustBuildings.length > 0 && stardustBuildings[0] < 3) {
    actions.push({ type: 'trade_and_build_stardust', targetLevel: 3, buildingIndex: 0 });
    return actions;
  }

  // Priority 12: Upgrade third metal
  if (metalBuildings.length >= 3 && metalBuildings[2] < 7) {
    actions.push({
      type: 'trade_and_upgrade', buildingType: 'metal',
      buildingIndex: 2, targetLevel: metalBuildings[2] + 1,
    });
    return actions;
  }

  // Priority 13: Fill remaining slots with metal buildings and upgrade
  if (totalBuildings < 9) {
    actions.push({ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 });
    return actions;
  }

  // Upgrade any non-maxed metal building
  for (let i = 0; i < metalBuildings.length; i++) {
    if (metalBuildings[i] < 7) {
      actions.push({
        type: 'trade_and_upgrade', buildingType: 'metal',
        buildingIndex: i, targetLevel: metalBuildings[i] + 1,
      });
      return actions;
    }
  }

  return actions;
}

// ============================================================
// SCENARIO 5: Max USD - Explorer tier + stardust bonus
// Strategy: Rush first metal to L7, build stardust L1 (cheap at
// 100K each, +50K LP, +1 SD/hr for remaining ~70 hours), then
// continue metal rush: 2nd metal L7, 3rd metal L7, fill slots.
// SD L1 after first M7 is the sweet spot — SD L2 (900K cost)
// delays metal too much and risks dropping below Explorer.
// Optimized for STAR=$0.092, SOL=$95. Avg ~$82.43 USD across seeds.
// ============================================================
export function strategyMaxUSD(hour, resources, buildings, production, totalBuildings) {
  const actions = [];
  const metalBuildings = buildings.metal;
  const stardustBuildings = buildings.stardust;

  // Priority 1: Build first metal building
  if (metalBuildings.length === 0) {
    actions.push({ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 });
    return actions;
  }

  // Priority 2: Rush first metal to L7 for maximum early economy
  if (metalBuildings[0] < 7) {
    actions.push({
      type: 'trade_and_upgrade', buildingType: 'metal',
      buildingIndex: 0, targetLevel: metalBuildings[0] + 1,
    });
    return actions;
  }

  // Priority 3: Build stardust L1 — cheap (300K total) and earns ~70 SD over remaining hours
  if (stardustBuildings.length === 0 && totalBuildings < 9) {
    actions.push({ type: 'trade_and_build_stardust', targetLevel: 1 });
    return actions;
  }

  // Priority 4: Build second metal and rush to L7
  if (metalBuildings.length < 2 && totalBuildings < 9) {
    actions.push({ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 });
    return actions;
  }
  if (metalBuildings.length >= 2 && metalBuildings[1] < 7) {
    actions.push({
      type: 'trade_and_upgrade', buildingType: 'metal',
      buildingIndex: 1, targetLevel: metalBuildings[1] + 1,
    });
    return actions;
  }

  // Priority 5: Build third metal and rush to L7
  if (metalBuildings.length < 3 && totalBuildings < 9) {
    actions.push({ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 });
    return actions;
  }
  if (metalBuildings.length >= 3 && metalBuildings[2] < 7) {
    actions.push({
      type: 'trade_and_upgrade', buildingType: 'metal',
      buildingIndex: 2, targetLevel: metalBuildings[2] + 1,
    });
    return actions;
  }

  // Priority 6: Fill remaining slots with metal buildings and upgrade
  if (totalBuildings < 9) {
    actions.push({ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 });
    return actions;
  }
  for (let i = 0; i < metalBuildings.length; i++) {
    if (metalBuildings[i] < 7) {
      actions.push({
        type: 'trade_and_upgrade', buildingType: 'metal',
        buildingIndex: i, targetLevel: metalBuildings[i] + 1,
      });
      return actions;
    }
  }

  // Priority 7: Upgrade stardust further once all metal is maxed
  if (stardustBuildings.length > 0 && stardustBuildings[0] < 3) {
    actions.push({ type: 'trade_and_build_stardust', targetLevel: stardustBuildings[0] + 1, buildingIndex: 0 });
    return actions;
  }

  return actions;
}

// ============================================================
// SCENARIO 5: Crystal First - Build crystal utility to L7, then
// max out metal buildings. Crystal is required for metal upgrades
// (100K–300K crystal per level), so an L7 crystal building
// (+47K crystal/hr) may fund metal upgrades faster than trading.
// ============================================================
export function strategyCrystalFirst(hour, resources, buildings, production, totalBuildings) {
  const actions = [];
  const crystalBuildings = buildings.crystal;
  const metalBuildings = buildings.metal;

  // Phase 1: Build crystal building and upgrade to L7
  if (crystalBuildings.length === 0) {
    actions.push({ type: 'trade_and_upgrade', buildingType: 'crystal', targetLevel: 1 });
    return actions;
  }

  if (crystalBuildings[0] < 7) {
    actions.push({
      type: 'trade_and_upgrade',
      buildingType: 'crystal',
      buildingIndex: 0,
      targetLevel: crystalBuildings[0] + 1,
    });
    return actions;
  }

  // Phase 2: Crystal is L7 — build metal buildings, level each to 7 before next
  if (metalBuildings.length > 0) {
    const lastIdx = metalBuildings.length - 1;
    const currentLevel = metalBuildings[lastIdx];
    if (currentLevel < 7) {
      actions.push({
        type: 'trade_and_upgrade',
        buildingType: 'metal',
        buildingIndex: lastIdx,
        targetLevel: currentLevel + 1,
      });
      return actions;
    }
  }

  if (totalBuildings < 9) {
    actions.push({ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 });
  }

  return actions;
}

export const SCENARIOS = [
  {
    id: 'max-metal',
    name: 'Scenario 1: Max Metal Rush',
    description: 'Build one metal building, level it to 7 before building the next. Fill all 9 slots with maxed metal buildings.',
    strategy: strategyMaxMetal,
    color: '#f59e0b',
  },
  {
    id: 'max-stardust',
    name: 'Scenario 2: Stardust Rush',
    description: 'Accumulate maximum stardust. Only one stardust building is allowed per planet. Build metal L3 for economy, build the single stardust building, then upgrade it to L3 (+3/hr). Fill remaining slots with metal buildings.',
    strategy: strategyMaxStardust,
    color: '#8b5cf6',
  },
  {
    id: 'optimal',
    name: 'Scenario 3: Optimal (Recommended)',
    description: 'Aggressive early economy + early stardust + maximum building points. Designed to reach top 3% leaderboard.',
    strategy: strategyOptimal,
    color: '#10b981',
  },
  {
    id: 'max-usd',
    name: 'Scenario 4: Max USD Value',
    description: 'Maximize total dollar value (STAR + SOL rewards). Rush metal L7, build stardust L1 for bonus income, then continue metal rush to secure Explorer tier. Optimized for STAR=$0.092 / SOL=$95.',
    strategy: strategyMaxUSD,
    color: '#e11d48',
  },
  {
    id: 'crystal-first',
    name: 'Scenario 5: Crystal First',
    description: 'Build and upgrade a single crystal utility building to L7 first (+47K crystal/hr), then build and fully upgrade metal buildings. Tests whether abundant crystal income makes metal upgrades cheaper/faster than pure metal rush.',
    strategy: strategyCrystalFirst,
    color: '#06b6d4',
  },
];
