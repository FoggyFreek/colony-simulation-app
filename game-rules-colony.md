# Colony Docs – Complete Single Manual

**Source:** https://docs.playcolony.xyz (scraped March 2025)  
**Game:** Colony – a fully onchain financial game on Solana  
**Current Season:** Season 0 (one-week seasons with soft resets)

## Table of Contents

- [Getting Started](#getting-started)
  - [Intro](#intro)
  - [Quick Start](#quick-start)
- [Resources](#resources)
  - [Metals / Gas / Crystal](#metals-gas-crystal)
  - [Buildings](#buildings)
  - [Mining](#mining)
  - [Stardust](#stardust)
- [Seasons](#seasons)
  - [Overview](#seasons-overview)
  - [Leaderboard](#leaderboard)
- [Economy](#economy)
  - [Treasury](#treasury)
  - [Staking](#staking)
- [Planets](#planets)
- [Items](#items)

---

## Getting Started

### Intro

**Colony** is a first-principles reimagination of a fully onchain financial game. In Colony, you are a brave intergalactic pioneer, tasked with managing a new planet. Gather resources, mine, upgrade, and trade with other players to compete on leaderboards for treasury rewards.

- **Manage your Colony:** Prioritize your Colony's needs based on your strategy.
- **Trade resources in a global economy:** Strategically trade to gain an advantage.
- **Earn Stardust:** The ownership token of Colony and your share of all future revenue.

**Seasons**  
Colony runs in **one-week seasons** with soft resets. We are currently in **Season 0**. Between seasons:

- Planets are burned to claim leaderboard rewards and Stardust allocation.
- Utility resources are reset, allowing players to start on equal footing.
- Stardust and Player EXP are unaffected, building player progression.
- Season limited items are rotated in the shop.
- A new planet must be minted to enter the next season.
- A new planet starts with 9 EMPTY building slots.

**Planets** – Your entry point into Colony  
**Metals/Gas/Crystal** – Understanding utility resources  
**Buildings** – Upgrade buildings to increase production  
**Stardust** – Learn about the resource powering the ecosystem  

### Quick Start

Colony is available to play both on the Solana Seeker appstore and as a web application.

#### Step 1: Mint a Planet
Purchase a planet to start the game. Your planet type is randomly determined:

| Planet Type | Chance | Bonus |
|-------------|--------|-------|
| Metallic    | 30%    | +500 Base Metals Production |
| Crystalline | 30%    | +500 Base Crystal Production |
| Gaseous     | 30%    | +500 Base Gas Production |
| Starfield   | 10%    | +0.1 Base Stardust Production |

#### Step 2: Collect Resources
Your planet starts with **100,000 Metals**, **100,000 Crystal**, **100,000 Gas**, and **0 Stardust**. It then automatically produces more over time. You have four resources to manage:

- **Metals** — Utility resource
- **Gas** — Utility resource
- **Crystal** — Utility resource
- **Stardust** — Premium resource

Your planet stores the resources it produces up to a cap of 26 hours. Make sure to collect your resources!

#### Step 3: Upgrade Buildings
Use your utility resources to upgrade buildings and increase production. Higher-level buildings produce significantly more resources. Buildings upgrade sequentially through levels, from 1 to a max level of 7. 

#### Step 4: Mine
Use energy to mine. Your mining rewards are dependent on your current resource production limit.

#### Step 5: Compete on the Leaderboard
Earn leaderboard points through all gameplay actions. At season end, rewards are distributed based on your tier.

---

## Resources

### Metals / Gas / Crystal

Metals, Gas, and Crystal are the three utility resources in Colony. They have no supply cap and are represented in game instead of as SPL tokens. They are the primary currency for building upgrades.

#### Base Production Rates
A standard planet produces:

| Resource | Base Rate |
|----------|-----------|
| Metals   | 4,000/hr  |
| Gas      | 4,000/hr  |
| Crystal  | 4,000/hr  |

Planet type bonuses add +500/hr to your primary resource (or +0.1/hr Stardust for Starfield planets).

#### Production
**Passive Production**  
Buildings on your planet continuously generate resources. Upgrade buildings to increase rates.

**Mining**  
Complete the daily mining activity for a production boost.

#### Utility

**Building Upgrades**

A building upgrade improves output as described under production rates. Each building MUST upgrade to the nearest higher level sequentially and CANNOT skip levels. So in order to reach level 4, you need to upgrade from level 1, to level 2, to level 3, to level 4.

##### Upgrading Metals building
| Level | Metals  | Gas     | Crystal | Total Cost |
|-------|---------|---------|---------|------------|
| 1     | 30,000  | 70,000  | 100,000 | 200,000    |
| 2     | 40,000  | 90,000  | 150,000 | 280,000    |
| 3     | 50,000  | 110,000 | 200,000 | 360,000    |
| 4     | 60,000  | 130,000 | 200,000 | 390,000    |
| 5     | 70,000  | 150,000 | 200,000 | 420,000    |
| 6     | 80,000  | 170,000 | 250,000 | 500,000    |
| 7     | 100,000 | 200,000 | 300,000 | 600,000    |

##### Upgrading Gas building
| Level | Gas     | Crystal | Metals | Total Cost |
|-------|---------|---------|---------|------------|
| 1     | 30,000  | 70,000  | 100,000 | 200,000    |
| 2     | 40,000  | 90,000  | 150,000 | 280,000    |
| 3     | 50,000  | 110,000 | 200,000 | 360,000    |
| 4     | 60,000  | 130,000 | 200,000 | 390,000    |
| 5     | 70,000  | 150,000 | 200,000 | 420,000    |
| 6     | 80,000  | 170,000 | 250,000 | 500,000    |
| 7     | 100,000 | 200,000 | 300,000 | 600,000    |

##### Upgrading Crystal Building
| Level | Crystal | Metals  | Gas     | Total Cost |
|-------|---------|---------|---------|------------|
| 1     | 30,000  | 70,000  | 100,000 | 200,000    |
| 2     | 40,000  | 90,000  | 150,000 | 280,000    |
| 3     | 50,000  | 110,000 | 200,000 | 360,000    |
| 4     | 60,000  | 130,000 | 200,000 | 390,000    |
| 5     | 70,000  | 150,000 | 200,000 | 420,000    |
| 6     | 80,000  | 170,000 | 250,000 | 500,000    |
| 7     | 100,000 | 200,000 | 300,000 | 600,000    |

**Stardust Building Upgrades**  
Unlock passive Stardust generation by spending utility resources.

| Stardust Level | Metals  | Gas     | Crystal | Total   |
|----------------|---------|---------|---------|---------|
| Level 1        | 100,000 | 100,000 | 100,000 | 300,000 |
| Level 2        | 300,000 | 300,000 | 300,000 | 900,000 |
| Level 3        | 500,000 | 500,000 | 500,000 | 1,500,000 |

### Buildings

Buildings are structures on your planet that increase resource production. Each planet has 9 building slots and can have multiple buildings of each type. Your planet starts without any buildings.

#### Building Types
- **Utility Resource Buildings** – Produce Metals, Gas, and Crystal. Can be upgraded to Level 7.
- **Stardust Building** – Produces Stardust. Can be upgraded to Level 3.

#### Production Rates
Each building level increases your hourly production, on top of the planet type specific output:

| Level | Production Bonus | Total Building Output |
|-------|------------------|-----------------------|
| 1     | +2,000/hr        | 2,000/hr              |
| 2     | +3,000/hr        | 5,000/hr              |
| 3     | +4,000/hr        | 9,000/hr              |
| 4     | +5,000/hr        | 14,000/hr             |
| 5     | +8,000/hr        | 22,000/hr             |
| 6     | +10,000/hr       | 32,000/hr             |
| 7     | +15,000/hr       | 47,000/hr             |

**Stardust Building Production**

| Level | Production Bonus | Total Building Output |
|-------|------------------|-----------------------|
| 1     | +1/hr            | 1/hr                  |
| 2     | +1/hr            | 2/hr                  |
| 3     | +1/hr            | 3/hr                  |

#### Upgrade Cooldowns
All building upgrades have no cooldown — you can upgrade again immediately.

### Trading

You can trade resources with any other resource on a global market. You can trade Gas for Metals or Crystals, Metals for Gas or Crystals, and Crystals for Metals or Gas. 
Trade ration depends on current market conditions. 

#### Example
1 Resource A : X Resource B. Trade smart to gain more resources of the resource type you need.
 
### Mining

Mining lets you spend energy to earn bonus resources. Each mine targets a specific resource and rewards you based on your current production of that resource.

#### Energy
You have a maximum of **50 energy**. Energy regenerates passively over time, fully refilling every **14 hours**.

You don't need to wait for a full recharge — you can mine as soon as you have enough energy.

#### Mining Rewards
Each mine costs 1 energy and rewards **0.2% of your daily production** of the targeted resource.

| Your Daily Production          | Reward per Mine |
|--------------------------------|-----------------|
| 96,000/day (4,000/hr base)     | 192             |
| 144,000/day (6,000/hr)         | 288             |
| 480,000/day (20,000/hr late)   | 960             |

#### Variance
Each mine has a **±20% random variance** on the base reward.  
There is also a **2% chance to hit a 10x jackpot**, multiplying your reward (after variance) by 10.

#### Strategy
- Mine what you need (for upgrades).
- Or mine your strongest resource for larger absolute rewards.

### Stardust

$STAR is the premium resource in Colony. It can only be earned by participating in the game economy, distributed to players who upgrade their production buildings. It is an SPL token, and is tradeable on any venue on Solana.

**Token address:** `23JRgLqg9NMkm9rBY5NaaAcnL5SQqYYsv29BPqRrLmBt`

Stardust serves as an ownership token, representing a share of game revenues (stakers receive 20% of treasury pro-rata).

#### Earning Stardust

**Planet Production**  
Basic planets do not produce Stardust. You must upgrade your Stardust building:

| Level | Production Rate | Daily Output |
|-------|-----------------|--------------|
| 1     | +1/hr           | 24/day       |
| 2     | +1/hr (2 total) | 48/day       |
| 3     | +1/hr (3 total) | 72/day       |

**Minting**  
During a season, Stardust accumulates as an in-game balance. At the end of each one-week season, your earned Stardust is minted as an SPL token based on how much you produced throughout the season.

**Staking**  
Stake Stardust for Star Chests (see [Staking](https://docs.playcolony.xyz/economy/staking)).

---

## Seasons

### Seasons Overview

Colony runs in **one-week seasons** with soft resets. Each season is a fresh competitive cycle with its own treasury and rewards.

#### Season Structure

**Duration**  
Each season lasts **7 days**.

**Soft Reset**  
At season end:
- Planets are burned to claim leaderboard rewards and Stardust allocation
- Earned Stardust is minted as an SPL token
- Leaderboard points reset
- Treasury is distributed
- New season begins

To participate in the next season, you must mint a new planet. Planets do not carry over between seasons.

**What Carries Over**
- Player profile and EXP
- Permanent items
- Staked Stardust continues earning across seasons

#### Season-Limited Content
Each season features limited-edition shop items, unique Star Chest rewards, and updated mechanics.

### Leaderboard

The leaderboard tracks player performance throughout the season. At season end, your planet is **burned** to claim your leaderboard rewards and Stardust allocation. Each tier's reward multiplier is applied to the planet mint fee (0.1 SOL).

#### Tiers

| Tier      | Percentile | Reward Multiplier |
|-----------|------------|-------------------|
| Explorer  | Top 1%     | 8×                |
| Diamond   | Top 5%     | 3×                |
| Platinum  | Top 10%    | 1.6×              |
| Gold      | Top 30%    | 1.2×              |
| Silver    | Top 50%    | 0.6×              |
| Bronze    | Top 70%    | 0.3×              |

#### Earning Leaderboard Points
Every meaningful in-game action contributes to your score.

**Resource Production**

| Resource              | Points                  |
|-----------------------|-------------------------|
| Metals / Gas / Crystal| 1 point per resource    |
| Stardust              | 5,000 points per resource |

**Building Upgrades**

**Utility Buildings**

| Level | Points    |
|-------|-----------|
| 1     | 20,000    |
| 2     | 50,000    |
| 3     | 100,000   |
| 4     | 200,000   |
| 5     | 300,000   |
| 6     | 500,000   |
| 7     | 800,000   |

**Stardust Building**

| Level | Points    |
|-------|-----------|
| 1     | 50,000    |
| 2     | 100,000   |
| 3     | 300,000   |

Mining points are earned indirectly through resources produced. Building upgrades grant points immediately.

---

## Economy

### Treasury

Each season, the game treasury is distributed to players based on their participation and performance.

#### Distribution Breakdown

| Recipient  | Share | Description                              |
|------------|-------|------------------------------------------|
| Stakers    | 20%   | Players staking Stardust                 |
| Leaderboard| 70%   | Top leaderboard performers               |
| Team       | 5%    | Funds ongoing development                |
| Next Season| 5%    | Seeds the next season's prize pool       |

#### Staker Rewards
Stardust stakers receive 20% of the treasury, distributed via Star Chests for the season. The Star Chest mechanism uses [verifiable random functions (VRFs)](https://docs.magicblock.gg/pages/verifiable-randomness-functions-vrfs/introduction/why-verifiable-randomness-onchain) to ensure fairness.

#### Leaderboard Rewards
The majority of the treasury (70%) goes to leaderboard performers.

### Staking

Stake your Stardust within the game to earn ongoing rewards throughout the season. Stardust earned on your planet during a season is automatically considered staked. As your balance grows, you passively earn staking EXP without needing to take any extra action.

#### How Planet EXP is Calculated
**Native Staking (constant balance)**  
EXP formula: `60 × staked × t / (3600 × 100)`

**Planet Production (growing balance)**  
EXP formula: `60 × (balance × t + rate × t² / 7200) / (3600 × 100)`

The earlier you earn Stardust, the more EXP it generates.

#### Staking Benefits

**Star Chests**  
`1 Stardust staked = 1 SCE per minute`

**Season 0 Star Chest Rewards**

| Reward       | Weight | Amount     |
|--------------|--------|------------|
| SOL          | 13%    | 0.03 SOL   |
| SOL          | 2%     | 0.10 SOL   |
| Profile EXP  | 35%    | 100 EXP    |
| Profile EXP  | 15%    | 300 EXP    |
| Profile EXP  | 5%     | 1,000 EXP  |
| Stardust     | 20%    | 5 SD       |
| Stardust     | 7%     | 20 SD      |
| Stardust     | 3%     | 50 SD      |

Only players with a planet in the current season can earn staking EXP.

---

## Planets

Planets are NFTs that serve as your primary asset in Colony. Each planet has a type that determines its production bonuses.

**Minting cost (Season 0):** 0.1 SOL

#### Minting a Planet
Planet type is randomly assigned using a [verifiable random function (VRF)](https://docs.magicblock.gg/pages/verifiable-randomness-functions-vrfs/introduction/why-verifiable-randomness-onchain).

| Planet Type | Chance | Bonus                          |
|-------------|--------|--------------------------------|
| Metallic    | 30%    | +500 Base Metals Production    |
| Crystalline | 30%    | +500 Base Crystal Production   |
| Gaseous     | 30%    | +500 Base Gas Production       |
| Starfield   | 10%    | +0.1 Base Stardust Production  |

#### Starting Resources
Every new planet comes with **100,000 Metals**, **100,000 Crystal**, **100,000 Gas**, and **0 Stardust**.

#### Base Production

| Resource | Base Rate |
|----------|-----------|
| Metals   | 4,000/hr  |
| Gas      | 4,000/hr  |
| Crystal  | 4,000/hr  |
| Stardust | 0/hr      |

#### Multiple Planets
Players can own multiple planets. Each produces independently and contributes its own leaderboard rewards.

#### Planet Burning
At season end, planets are burned to claim rewards. You must mint a new planet for the next season.

#### Planet Requirements
Only players with an active planet can earn staking EXP, participate in leaderboards, or receive treasury distributions.

---

## Items

At the end of each season, players can purchase permanent items from the Galactic Armory. Items are tradeable NFTs with effects that persist across seasons.

**Items will only be active from Season 2 onwards.**

#### Item Rules
- **Permanent** — Carry over between seasons
- **Tradeable** — NFTs that can be traded
- **One Planet** — Each planet can equip only one item

#### Season 0 Items

| Name                  | Cost (Stardust) | Effect                              |
|-----------------------|-----------------|-------------------------------------|
| Metal Extractor       | 100             | +100 Metals per hour                |
| Gas Cultivator        | 100             | +100 Gas per hour                   |
| Crystal Harvester     | 100             | +100 Crystal per hour               |
| Quantum Core (S0 Limited) | 300         | +1% all resource production per hour|

Items are purchased at the end of each season. You can also earn them from Star Chests via staking.

---

**End of Manual.**  
All pages have been included. Internal links point to the correct sections above. Enjoy Colony! 🚀

If you need a PDF version, updates, or anything else, just let me know.