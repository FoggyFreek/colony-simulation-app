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
// SCENARIO 3: Max Stardust - Rush stardust production ASAP
// Build new stardust L1 buildings to fill all 9 slots before
// upgrading any. L1 costs 300K for +1/hr vs L2 upgrade 900K
// for same +1/hr — 3x more efficient to build new first.
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

  // Phase 2: Fill all remaining slots with stardust L1 buildings
  // Each L1 = 300K total for +1/hr. With 8 remaining slots = 8/hr stardust
  if (totalBuildings < 9) {
    actions.push({ type: 'trade_and_build_stardust', targetLevel: 1 });
    return actions;
  }

  // Phase 3: Upgrade metal building to fund stardust upgrades
  if (metalBuildings[0] < 7) {
    actions.push({
      type: 'trade_and_upgrade', buildingType: 'metal',
      buildingIndex: 0, targetLevel: metalBuildings[0] + 1,
    });
    return actions;
  }

  // Phase 4: Now upgrade stardust buildings (all slots filled, upgrades are the only option)
  // Upgrade each stardust building to L2 first (cheaper), then L3
  for (let i = 0; i < stardustBuildings.length; i++) {
    if (stardustBuildings[i] < 2) {
      actions.push({ type: 'trade_and_build_stardust', targetLevel: 2, buildingIndex: i });
      return actions;
    }
  }
  for (let i = 0; i < stardustBuildings.length; i++) {
    if (stardustBuildings[i] < 3) {
      actions.push({ type: 'trade_and_build_stardust', targetLevel: 3, buildingIndex: i });
      return actions;
    }
  }

  // Phase 5: If everything is maxed, upgrade metal building further (shouldn't reach here often)
  for (let i = 0; i < metalBuildings.length; i++) {
    if (metalBuildings[i] < 7) {
      actions.push({
        type: 'trade_and_upgrade', buildingType: 'metal',
        buildingIndex: i, targetLevel: metalBuildings[i] + 1,
      });
      return actions;
    }
  }

  // Build even more buildings if slots available
  if (totalBuildings < 9) {
    actions.push({ type: 'trade_and_upgrade', buildingType: 'metal', targetLevel: 1 });
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

export const SCENARIOS = [
  {
    id: 'max-metal',
    name: 'Scenario 1: Max Metal Rush',
    description: 'Build one metal building, level it to 7 before building the next. Fill all 9 slots with maxed metal buildings.',
    strategy: strategyMaxMetal,
    color: '#f59e0b',
  },
  {
    id: 'balanced',
    name: 'Scenario 2: Balanced Growth',
    description: 'Balance resource production with stardust generation. Build metal buildings and stardust for steady accumulation.',
    strategy: strategyBalanced,
    color: '#3b82f6',
  },
  {
    id: 'max-stardust',
    name: 'Scenario 3: Stardust Rush',
    description: 'Accumulate maximum stardust. Build one metal L3 for economy, then fill all 8 remaining slots with stardust L1 before upgrading. New L1 (300K) gives +1/hr — 3x cheaper than L2 upgrade (900K).',
    strategy: strategyMaxStardust,
    color: '#8b5cf6',
  },
  {
    id: 'optimal',
    name: 'Scenario 4: Optimal (Recommended)',
    description: 'Aggressive early economy + early stardust + maximum building points. Designed to reach top 3% leaderboard.',
    strategy: strategyOptimal,
    color: '#10b981',
  },
];
