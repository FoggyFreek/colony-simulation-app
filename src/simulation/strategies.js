import {
  BUILDING_PRODUCTION, SEASON_HOURS, PLANET_TYPES,
} from './gameConstants';

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

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

// Helper: fill remaining slots with primary buildings L1→L7 and upgrade any non-maxed
function fillPrimary(primaryType, buildings, totalBuildings) {
  for (let i = 0; i < buildings[primaryType].length; i++) {
    if (buildings[primaryType][i] < 7) {
      return {
        type: 'trade_and_upgrade', buildingType: primaryType,
        buildingIndex: i, targetLevel: buildings[primaryType][i] + 1,
      };
    }
  }
  if (totalBuildings < 9) {
    return { type: 'trade_and_upgrade', buildingType: primaryType, targetLevel: 1 };
  }
  return null;
}

// ============================================================
// SCENARIO 1: Max Primary Rush - Level each to 7 before next
// ============================================================
function makeStrategyMaxPrimary(config) {
  const { primary } = config;
  return function strategyMaxPrimary(hour, resources, buildings, production, totalBuildings) {
    const action = upgradeOrBuild(primary, buildings, totalBuildings);
    return action ? [action] : [];
  };
}

// ============================================================
// SCENARIO 2: Stardust Rush - Maximum stardust accumulation
// ============================================================
function makeStrategyMaxStardust(config) {
  const { primary } = config;
  return function strategyMaxStardust(hour, resources, buildings, production, totalBuildings) {
    const stardustBuildings = buildings.stardust;
    const primaryBuildings = buildings[primary];

    // Priority 1: Build stardust L1 immediately (100K each = starting resources)
    if (stardustBuildings.length === 0 && totalBuildings < 9) {
      return [{ type: 'trade_and_build_stardust', targetLevel: 1 }];
    }

    // Priority 2: Build primary L1 for economy
    if (primaryBuildings.length === 0) {
      return [{ type: 'trade_and_upgrade', buildingType: primary, targetLevel: 1 }];
    }

    // Priority 3: Upgrade primary to L2 for stronger economy to fund stardust upgrades
    if (primaryBuildings[0] < 2) {
      return [{
        type: 'trade_and_upgrade', buildingType: primary,
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

    // Priority 5: After stardust L3, fill with primary for economy/LP
    const action = fillPrimary(primary, buildings, totalBuildings);
    return action ? [action] : [];
  };
}

// ============================================================
// SCENARIO 3: Optimal (Scarce First) - Maximum leaderboard points
// ============================================================
function makeStrategyOptimal(config) {
  const { primary, scarce } = config;
  return function strategyOptimal(hour, resources, buildings, production, totalBuildings) {
    const scarceBuildings = buildings[scarce];

    // Priority 1: Build scarce utility and rush to L7
    if (scarceBuildings.length === 0) {
      return [{ type: 'trade_and_upgrade', buildingType: scarce, targetLevel: 1 }];
    }
    if (scarceBuildings[0] < 7) {
      return [{
        type: 'trade_and_upgrade', buildingType: scarce,
        buildingIndex: 0, targetLevel: scarceBuildings[0] + 1,
      }];
    }

    // Priority 2: Scarce is L7 — rush primary buildings to L7, one at a time
    const action = upgradeOrBuild(primary, buildings, totalBuildings);
    return action ? [action] : [];
  };
}

// ============================================================
// SCENARIO 4: Max USD Value - Maximize dollar value
// ============================================================
function makeStrategyMaxUSD(config) {
  const { primary } = config;
  return function strategyMaxUSD(hour, resources, buildings, production, totalBuildings) {
    const primaryBuildings = buildings[primary];
    const stardustBuildings = buildings.stardust;

    // Priority 1: Rush first primary building to L7
    if (primaryBuildings.length === 0) {
      return [{ type: 'trade_and_upgrade', buildingType: primary, targetLevel: 1 }];
    }
    if (primaryBuildings[0] < 7) {
      return [{
        type: 'trade_and_upgrade', buildingType: primary,
        buildingIndex: 0, targetLevel: primaryBuildings[0] + 1,
      }];
    }

    // Priority 2: Rush second primary building to L7
    if (primaryBuildings.length < 2 && totalBuildings < 9) {
      return [{ type: 'trade_and_upgrade', buildingType: primary, targetLevel: 1 }];
    }
    if (primaryBuildings.length >= 2 && primaryBuildings[1] < 7) {
      return [{
        type: 'trade_and_upgrade', buildingType: primary,
        buildingIndex: 1, targetLevel: primaryBuildings[1] + 1,
      }];
    }

    // Priority 3: Build stardust L1 for STAR token income
    if (stardustBuildings.length === 0 && totalBuildings < 9) {
      return [{ type: 'trade_and_build_stardust', targetLevel: 1 }];
    }

    // Priority 4: Continue filling with primary L7
    const action = upgradeOrBuild(primary, buildings, totalBuildings);
    if (action) return [action];

    // Priority 5: Upgrade stardust further once all primary is done
    if (stardustBuildings.length > 0 && stardustBuildings[0] < 3) {
      return [{ type: 'trade_and_build_stardust', targetLevel: stardustBuildings[0] + 1, buildingIndex: 0 }];
    }

    return [];
  };
}

// ============================================================
// SCENARIO 5: Expensive First - Build expensive utility to L7
// ============================================================
function makeStrategyExpensiveFirst(config) {
  const { primary, expensive } = config;
  return function strategyExpensiveFirst(hour, resources, buildings, production, totalBuildings) {
    const expensiveBuildings = buildings[expensive];

    // Priority 1: Build expensive utility and rush to L7
    if (expensiveBuildings.length === 0) {
      return [{ type: 'trade_and_upgrade', buildingType: expensive, targetLevel: 1 }];
    }
    if (expensiveBuildings[0] < 7) {
      return [{
        type: 'trade_and_upgrade', buildingType: expensive,
        buildingIndex: 0, targetLevel: expensiveBuildings[0] + 1,
      }];
    }

    // Priority 2: Expensive is L7 — rush primary buildings to L7
    const action = upgradeOrBuild(primary, buildings, totalBuildings);
    return action ? [action] : [];
  };
}

// Generate SCENARIOS array for a given planet config
export function getScenariosForPlanet(planetConfig) {
  const { primary, scarce, expensive, label } = planetConfig;
  const primaryLabel = capitalize(primary);
  const scarceLabel = capitalize(scarce);
  const expensiveLabel = capitalize(expensive);

  return [
    {
      id: 'max-primary',
      name: `Scenario 1: Max ${primaryLabel} Rush`,
      description: `Pure ${primary} rush: build one ${primary} building, level to L7 before building the next. Fill all 9 slots. No utility buildings — tests raw ${primary}-only economy.`,
      strategy: makeStrategyMaxPrimary(planetConfig),
      color: '#f59e0b',
    },
    {
      id: 'max-stardust',
      name: 'Scenario 2: Stardust Rush',
      description: `Maximize stardust. Build stardust L1 immediately at hour 0, then ${primary} L2 for economy, then rush stardust to L3 (+3/hr). Only one stardust building allowed per planet.`,
      strategy: makeStrategyMaxStardust(planetConfig),
      color: '#8b5cf6',
    },
    {
      id: 'optimal',
      name: `Scenario 3: Optimal (${scarceLabel} First)`,
      description: `Rush ${scarce} utility to L7 (+47K ${scarce}/hr), then fill with ${primary} L7. ${scarceLabel} is the scarce resource for ${primary} building upgrades — ${scarce} L7 eliminates trade losses and enables fast ${primary} upgrades.`,
      strategy: makeStrategyOptimal(planetConfig),
      color: '#10b981',
    },
    {
      id: 'max-usd',
      name: 'Scenario 4: Max USD Value',
      description: `Maximize dollar value. Rush 2 ${primary} L7 for Diamond tier floor, build stardust L1 for STAR income, then continue ${primary} rush. Optimized for STAR=$0.09 / SOL=$94.`,
      strategy: makeStrategyMaxUSD(planetConfig),
      color: '#e11d48',
    },
    {
      id: 'expensive-first',
      name: `Scenario 5: ${expensiveLabel} First`,
      description: `Rush ${expensive} utility to L7 (+47K ${expensive}/hr), then fill with ${primary} L7. ${expensiveLabel} is the most expensive ${primary} upgrade component.`,
      strategy: makeStrategyExpensiveFirst(planetConfig),
      color: '#06b6d4',
    },
  ];
}

// Backward-compatible default: metallic planet scenarios
export const SCENARIOS = getScenariosForPlanet(PLANET_TYPES.metallic);

// Re-export individual strategy functions for backward compatibility (tests)
export const strategyMaxMetal = SCENARIOS[0].strategy;
export const strategyMaxStardust = SCENARIOS[1].strategy;
export const strategyOptimal = SCENARIOS[2].strategy;
export const strategyMaxUSD = SCENARIOS[3].strategy;
export const strategyCrystalFirst = SCENARIOS[4].strategy;
