import { useState, useMemo, useEffect, useCallback } from 'react';
import { simulate } from './simulation/engine';
import { getScenariosForPlanet } from './simulation/strategies';
import { SEASON_HOURS, TRADE_RATIO_AMPLITUDE, TRADE_RATIO_CENTER, PLANET_TYPES } from './simulation/gameConstants';
import { createCustomStrategy } from './simulation/customStrategy';
import { getNextFriday16 } from './simulation/agendaUtils';
import TimelineChart from './components/TimelineChart';
import ActionLog from './components/ActionLog';
import AgendaExport from './components/AgendaExport';
import FinalSummary from './components/FinalSummary';
import ScenarioSelector from './components/ScenarioSelector';
import ScoreCard from './components/ScoreCard';
import CustomStrategyComposer from './components/CustomStrategyComposer';

const CUSTOM_SCENARIO = {
  id: 'custom',
  name: 'Custom Strategy',
  description: 'Your custom build order. Add actions below to compose a strategy.',
  strategy: null,
  color: '#ec4899',
};

// allScenarios is now computed inside the component

const CHART_CARD_CLASS = "bg-[var(--color-surface)] rounded-xl p-5 border border-[var(--color-border)] shadow-[var(--shadow-card)]";

const CHART_PANELS = [
  {
    title: 'Resources Over Time',
    yLabel: 'Resources',
    lines: [
      { key: 'metals', color: '#f59e0b', name: 'Metals' },
      { key: 'gas', color: '#ef4444', name: 'Gas' },
      { key: 'crystal', color: '#6366f1', name: 'Crystal' },
    ],
  },
  {
    title: 'Production Rates (per hour)',
    yLabel: 'Production/hr',
    lines: [
      { key: 'metalProd', color: '#f59e0b', name: 'Metal Prod' },
      { key: 'gasProd', color: '#ef4444', name: 'Gas Prod' },
      { key: 'crystalProd', color: '#6366f1', name: 'Crystal Prod' },
    ],
  },
  {
    title: 'Stardust Accumulation',
    yLabel: 'Stardust',
    lines: [{ key: 'stardust', color: '#8b5cf6', name: 'Stardust' }],
  },
  {
    title: 'Leaderboard Points Breakdown',
    yLabel: 'Points',
    stacked: true,
    lines: [
      { key: 'productionPoints', color: '#f59e0b', name: 'Planet Production' },
      { key: 'miningPoints', color: '#fb923c', name: 'Mining Activity' },
      { key: 'stardustPoints', color: '#8b5cf6', name: 'Stardust Gathered' },
      { key: 'buildingBuiltPoints', color: '#10b981', name: 'Buildings Built' },
      { key: 'buildingUpgradePoints', color: '#3b82f6', name: 'Buildings Upgraded' },
    ],
  },
  {
    title: 'Trade Ratios (Metal →)',
    yLabel: 'Ratio',
    lines: [
      { key: 'metalToGas', color: '#ef4444', name: 'Metal → Gas' },
      { key: 'metalToCrystal', color: '#6366f1', name: 'Metal → Crystal' },
    ],
  },
];

function sampleTimeline(timeline) {
  const sampled = [];
  const seen = new Set();
  for (const point of timeline) {
    const key = point.hour;
    if (point.action || key % 2 === 0 || key === SEASON_HOURS) {
      if (!seen.has(key) || point.action) {
        sampled.push(point);
        seen.add(key);
      }
    }
  }
  return sampled;
}

function App() {
  const [planetType, setPlanetType] = useState(() => {
    try {
      return localStorage.getItem('colony-planet') || 'metallic';
    } catch { return 'metallic'; }
  });
  const [activeScenario, setActiveScenario] = useState('optimal');
  const [seed, setSeed] = useState(42);
  const [saveEnergy, setSaveEnergy] = useState(false);
  const [saveEnergyThreshold, setSaveEnergyThreshold] = useState(2);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('colony-theme') || 'dark';
    } catch { return 'dark'; }
  });
  const [starPrice, setStarPrice] = useState('0.09');
  const [solPrice, setSolPrice] = useState('94');
  const [tradeRatioAmplitude, setTradeRatioAmplitude] = useState(TRADE_RATIO_AMPLITUDE);
  const [seasonStart, setSeasonStart] = useState(() => getNextFriday16());
  const [restrictToAwakeHours, setRestrictToAwakeHours] = useState(false);
  const [awakeStart, setAwakeStart] = useState(7);
  const [awakeEnd, setAwakeEnd] = useState(0);
  const [customActionQueue, setCustomActionQueue] = useState(() => {
    try {
      const saved = localStorage.getItem('colony-custom-queue');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('colony-custom-queue', JSON.stringify(customActionQueue));
  }, [customActionQueue]);

  useEffect(() => {
    localStorage.setItem('colony-planet', planetType);
  }, [planetType]);

  const [currentHour, setCurrentHour] = useState(null);

  useEffect(() => {
    const update = () => {
      const elapsed = (Date.now() - seasonStart.getTime()) / (1000 * 60 * 60);
      if (elapsed >= 0 && elapsed <= SEASON_HOURS) {
        setCurrentHour(Math.floor(elapsed));
      } else {
        setCurrentHour(null);
      }
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [seasonStart]);

  const planetConfig = PLANET_TYPES[planetType];
  const scenarios = useMemo(() => getScenariosForPlanet(planetConfig), [planetConfig]);

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('colony-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const allScenarios = useMemo(() => [...scenarios, CUSTOM_SCENARIO], [scenarios]);

  const seasonStartHour = seasonStart.getHours();

  const results = useMemo(() => {
    const opts = {
      saveEnergyBeforeUpgrade: saveEnergy, tradeRatioAmplitude, saveEnergyThreshold,
      baseProduction: planetConfig.baseProduction,
      restrictToAwakeHours, awakeStart, awakeEnd, seasonStartHour,
    };
    const r = {};
    for (const scenario of scenarios) {
      r[scenario.id] = simulate(scenario.strategy, seed, opts);
    }
    if (customActionQueue.length > 0) {
      r['custom'] = simulate(createCustomStrategy(customActionQueue), seed, opts);
    }
    return r;
  }, [seed, saveEnergy, saveEnergyThreshold, customActionQueue, tradeRatioAmplitude, scenarios, planetConfig, restrictToAwakeHours, awakeStart, awakeEnd, seasonStartHour]);

  // Unrestricted baseline for showing sleep penalty
  const unrestrictedResults = useMemo(() => {
    if (!restrictToAwakeHours) return null;
    const opts = {
      saveEnergyBeforeUpgrade: saveEnergy, tradeRatioAmplitude, saveEnergyThreshold,
      baseProduction: planetConfig.baseProduction,
    };
    const r = {};
    for (const scenario of scenarios) {
      r[scenario.id] = simulate(scenario.strategy, seed, opts);
    }
    if (customActionQueue.length > 0) {
      r['custom'] = simulate(createCustomStrategy(customActionQueue), seed, opts);
    }
    return r;
  }, [restrictToAwakeHours, seed, saveEnergy, saveEnergyThreshold, customActionQueue, tradeRatioAmplitude, scenarios, planetConfig]);

  const active = allScenarios.find(s => s.id === activeScenario) || allScenarios[0];
  const activeResult = results[activeScenario];

  const chartData = useMemo(() => {
    if (!activeResult) return [];
    return sampleTimeline(activeResult.timeline);
  }, [activeResult]);

  const miningChartData = useMemo(() => {
    if (!activeResult) return [];
    return activeResult.miningByHour;
  }, [activeResult]);

  return (
    <div className="max-w-[1200px] mx-auto p-6">
      <header className="text-center mb-8 relative">
        <button
          className="absolute top-0 right-0 w-[38px] h-[38px] rounded-[10px] flex items-center justify-center text-lg cursor-pointer transition-all duration-200 border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] shadow-[var(--shadow-card)] hover:border-[var(--color-border-hover)] hover:text-[var(--color-text)] hover:bg-[var(--color-inset)]"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
        <h1 className="text-3xl font-bold bg-gradient-to-br from-[var(--color-accent)] to-violet-500 bg-clip-text text-transparent mb-1">
          Colony Simulator — {planetConfig.label} Planet
        </h1>
        <p className="text-[var(--color-muted)] text-sm">
          Season 0 — 7-day timeline — 5 strategies compared
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-3">
          {Object.values(PLANET_TYPES).map(pt => (
            <button
              key={pt.id}
              onClick={() => setPlanetType(pt.id)}
              className={`px-3 py-1 rounded-md text-[0.85rem] cursor-pointer transition-all duration-200 border ${
                planetType === pt.id
                  ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white font-medium'
                  : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-inset)] hover:border-[var(--color-border-hover)]'
              }`}
            >
              {pt.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 mt-3">
          <div className="flex items-center gap-2">
            <label className="text-[var(--color-muted)] text-[0.85rem]">RNG Seed:</label>
            <input
              type="number"
              value={seed}
              onChange={e => setSeed(Number(e.target.value))}
              className="bg-[var(--color-inset)] border border-[var(--color-border)] text-[var(--color-text)] px-2 py-1 rounded-md w-20 text-[0.85rem] focus:outline-none focus:border-[var(--color-accent)]"
            />
            <button
              onClick={() => setSeed(Math.floor(Math.random() * 10000))}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] px-3 py-1 rounded-md cursor-pointer text-[0.85rem] transition-all duration-200 hover:bg-[var(--color-inset)] hover:border-[var(--color-border-hover)]"
            >
              Randomize
            </button>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[var(--color-muted)] text-[0.85rem]">STAR price (USD):</label>
            <div className="relative flex items-center">
              <span className="absolute left-2 text-[var(--color-muted)] text-[0.85rem]">$</span>
              <input
                type="number"
                min="0"
                step="0.0001"
                value={starPrice}
                onChange={e => setStarPrice(e.target.value)}
                placeholder="0.00"
                className="bg-[var(--color-inset)] border border-[var(--color-border)] text-[var(--color-text)] pl-5 pr-2 py-1 rounded-md w-24 text-[0.85rem] focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[var(--color-muted)] text-[0.85rem]">SOL price (USD):</label>
            <div className="relative flex items-center">
              <span className="absolute left-2 text-[var(--color-muted)] text-[0.85rem]">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={solPrice}
                onChange={e => setSolPrice(e.target.value)}
                placeholder="0.00"
                className="bg-[var(--color-inset)] border border-[var(--color-border)] text-[var(--color-text)] pl-5 pr-2 py-1 rounded-md w-24 text-[0.85rem] focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1 mt-3">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2.5 cursor-pointer text-sm text-[var(--color-text)] select-none">
              <input
                type="checkbox"
                checked={saveEnergy}
                onChange={e => setSaveEnergy(e.target.checked)}
                className="hidden"
              />
              <span className="toggle-switch" />
              Save up energy before upgrade
            </label>
            {saveEnergy && (
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-[var(--color-muted)]">within</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={saveEnergyThreshold}
                  onChange={e => setSaveEnergyThreshold(Math.max(1, Math.min(50, Number(e.target.value))))}
                  className="bg-[var(--color-inset)] border border-[var(--color-border)] text-[var(--color-text)] px-1.5 py-0.5 rounded w-14 text-xs focus:outline-none focus:border-[var(--color-accent)]"
                />
                <label className="text-xs text-[var(--color-muted)]">hrs</label>
              </div>
            )}
          </div>
          <span className="text-xs text-[var(--color-faint)]">
            Skip mining before metal upgrades, then mine at higher production rate
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 mt-2">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2.5 cursor-pointer text-sm text-[var(--color-text)] select-none">
              <input
                type="checkbox"
                checked={restrictToAwakeHours}
                onChange={e => setRestrictToAwakeHours(e.target.checked)}
                className="hidden"
              />
              <span className="toggle-switch" />
              Restrict actions to awake hours
            </label>
            {restrictToAwakeHours && (
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs text-[var(--color-muted)]">
                  Wake
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={awakeStart}
                    onChange={e => setAwakeStart(Number(e.target.value))}
                    className="bg-[var(--color-inset)] border border-[var(--color-border)] text-[var(--color-text)] px-1.5 py-0.5 rounded w-[50px] text-xs focus:outline-none focus:border-[var(--color-accent)]"
                  />
                  :00
                </label>
                <label className="flex items-center gap-1 text-xs text-[var(--color-muted)]">
                  Sleep
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={awakeEnd}
                    onChange={e => setAwakeEnd(Number(e.target.value))}
                    className="bg-[var(--color-inset)] border border-[var(--color-border)] text-[var(--color-text)] px-1.5 py-0.5 rounded w-[50px] text-xs focus:outline-none focus:border-[var(--color-accent)]"
                  />
                  :00
                </label>
              </div>
            )}
          </div>
          <span className="text-xs text-[var(--color-faint)]">
            No mining or upgrades during sleep — actions delayed until wake-up
          </span>
        </div>
      </header>

      <ScoreCard />

      <ScenarioSelector
        scenarios={allScenarios}
        active={activeScenario}
        onSelect={setActiveScenario}
        results={results}
        starPrice={starPrice}
        solPrice={solPrice}
        unrestrictedResults={unrestrictedResults}
      />

<section className="mb-10">
        <h2 className="text-xl font-semibold mb-4" style={{ color: active.color }}>{active.name}</h2>
        <p className="text-[var(--color-muted)] mb-5 text-sm">{active.description}</p>

        {activeScenario === 'custom' && (
          <CustomStrategyComposer
            actionQueue={customActionQueue}
            setActionQueue={setCustomActionQueue}
            simulationResult={results['custom'] || null}
          />
        )}

        {activeResult ? (
          <FinalSummary
            result={activeResult}
            scenario={active}
            starPrice={starPrice}
            solPrice={solPrice}
            sleepPenalty={unrestrictedResults && unrestrictedResults[activeScenario]
              ? activeResult.finalState.leaderboardPoints - unrestrictedResults[activeScenario].finalState.leaderboardPoints
              : null}
          />
        ) : (
          <div className="text-[var(--color-faint)] text-[0.85rem] text-center py-4 mb-6">
            Add actions to your custom strategy to see results.
          </div>
        )}

        {activeResult && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {CHART_PANELS.map(panel => {
                const isTradeRatios = panel.title === 'Trade Ratios (Metal →)';
                const tradeMin = TRADE_RATIO_CENTER - tradeRatioAmplitude;
                const tradeMax = TRADE_RATIO_CENTER + tradeRatioAmplitude;
                const MAX_AMP = TRADE_RATIO_CENTER - 0.3; // min floor 0.3 → max amplitude 0.7
                return (
                  <div key={panel.title} className={CHART_CARD_CLASS}>
                    <h3 className="text-sm text-[var(--color-muted)] mb-3">{panel.title}</h3>
                    <TimelineChart data={chartData} lines={panel.lines} yLabel={panel.yLabel} stacked={panel.stacked} currentHour={currentHour} />
                    {isTradeRatios && (
                      <div className="flex flex-wrap items-center gap-3 mt-3">
                        <label className="text-xs text-[var(--color-muted)]">Amplitude:</label>
                        <input
                          type="range"
                          min={0}
                          max={MAX_AMP}
                          step={0.01}
                          value={tradeRatioAmplitude}
                          onChange={e => setTradeRatioAmplitude(Number(e.target.value))}
                          className="w-28 accent-[var(--color-accent)]"
                        />
                        <span className="text-xs text-[var(--color-text)] w-8">{tradeRatioAmplitude.toFixed(2)}</span>
                        <div className="flex items-center gap-1">
                          <label className="text-xs text-[var(--color-muted)]">MIN:</label>
                          <input
                            type="number"
                            min={0.3}
                            max={TRADE_RATIO_CENTER}
                            step={0.01}
                            value={tradeMin.toFixed(2)}
                            onChange={e => {
                              const min = Math.max(0.3, Math.min(TRADE_RATIO_CENTER, Number(e.target.value)));
                              setTradeRatioAmplitude(parseFloat((TRADE_RATIO_CENTER - min).toFixed(2)));
                            }}
                            className="bg-[var(--color-inset)] border border-[var(--color-border)] text-[var(--color-text)] px-1.5 py-0.5 rounded w-16 text-xs focus:outline-none focus:border-[var(--color-accent)]"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <label className="text-xs text-[var(--color-muted)]">MAX:</label>
                          <input
                            type="number"
                            min={TRADE_RATIO_CENTER}
                            max={1.7}
                            step={0.01}
                            value={tradeMax.toFixed(2)}
                            onChange={e => {
                              const max = Math.min(1.7, Math.max(TRADE_RATIO_CENTER, Number(e.target.value)));
                              setTradeRatioAmplitude(parseFloat((max - TRADE_RATIO_CENTER).toFixed(2)));
                            }}
                            className="bg-[var(--color-inset)] border border-[var(--color-border)] text-[var(--color-text)] px-1.5 py-0.5 rounded w-16 text-xs focus:outline-none focus:border-[var(--color-accent)]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div className={CHART_CARD_CLASS}>
                <h3 className="text-sm text-[var(--color-muted)] mb-3">Mining Gains per Hour</h3>
                <TimelineChart
                  data={miningChartData}
                  lines={[
                    { key: 'metals', color: '#f59e0b', name: 'Metals' },
                    { key: 'gas', color: '#ef4444', name: 'Gas' },
                    { key: 'crystal', color: '#6366f1', name: 'Crystal' },
                  ]}
                  yLabel="Resources"
                  bar
                  currentHour={currentHour}
                />
              </div>
            </div>

            <ActionLog log={activeResult.actionLog} />

            <AgendaExport
              actionLog={activeResult.actionLog}
              timeline={activeResult.timeline}
              miningByHour={activeResult.miningByHour}
              scenario={active}
              saveEnergy={saveEnergy}
              seasonStart={seasonStart}
              setSeasonStart={setSeasonStart}
              awakeEnabled={restrictToAwakeHours}
              awakeStart={awakeStart}
              awakeEnd={awakeEnd}
              setAwakeEnabled={setRestrictToAwakeHours}
              setAwakeStart={setAwakeStart}
              setAwakeEnd={setAwakeEnd}
            />
          </>
        )}
      </section>
    </div>
  );
}

export default App;
