import { useState, useMemo, useEffect } from 'react';
import { simulate } from './simulation/engine';
import { SCENARIOS } from './simulation/strategies';
import { SEASON_HOURS } from './simulation/gameConstants';
import { createCustomStrategy } from './simulation/customStrategy';
import TimelineChart from './components/TimelineChart';
import ComparisonChart from './components/ComparisonChart';
import ActionLog from './components/ActionLog';
import AgendaExport from './components/AgendaExport';
import FinalSummary from './components/FinalSummary';
import ScenarioSelector from './components/ScenarioSelector';
import CustomStrategyComposer from './components/CustomStrategyComposer';

function App() {
  const [activeScenario, setActiveScenario] = useState('optimal');
  const [seed, setSeed] = useState(42);
  const [saveEnergy, setSaveEnergy] = useState(false);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('colony-theme') || 'dark';
    } catch { return 'dark'; }
  });
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
    document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : '');
    if (theme === 'dark') document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('colony-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const results = useMemo(() => {
    const r = {};
    for (const scenario of SCENARIOS) {
      r[scenario.id] = simulate(scenario.strategy, seed, {
        saveEnergyBeforeUpgrade: saveEnergy,
      });
    }
    if (customActionQueue.length > 0) {
      const customStrategyFn = createCustomStrategy(customActionQueue);
      r['custom'] = simulate(customStrategyFn, seed, {
        saveEnergyBeforeUpgrade: saveEnergy,
      });
    }
    return r;
  }, [seed, saveEnergy, customActionQueue]);

  const CUSTOM_SCENARIO = {
    id: 'custom',
    name: 'Custom Strategy',
    description: 'Your custom build order. Add actions below to compose a strategy.',
    strategy: null,
    color: '#ec4899',
  };
  const allScenarios = [...SCENARIOS, CUSTOM_SCENARIO];

  const active = allScenarios.find(s => s.id === activeScenario) || allScenarios[0];
  const activeResult = results[activeScenario];

  const chartData = useMemo(() => {
    if (!activeResult) return [];
    const tl = activeResult.timeline;
    const sampled = [];
    const seen = new Set();
    for (const point of tl) {
      const key = point.hour;
      if (point.action || key % 2 === 0 || key === SEASON_HOURS) {
        if (!seen.has(key) || point.action) {
          sampled.push(point);
          seen.add(key);
        }
      }
    }
    return sampled;
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
          Colony Simulator — Metal Planet
        </h1>
        <p className="text-[var(--color-muted)] text-sm">
          Season 0 — 7-day timeline — 4 strategies compared
        </p>
        <div className="flex items-center justify-center gap-2 mt-3">
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
        <div className="flex flex-col items-center gap-1 mt-3">
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
          <span className="text-xs text-[var(--color-faint)]">
            Skip mining before metal upgrades, then mine at higher production rate
          </span>
        </div>
      </header>

      <ScenarioSelector
        scenarios={allScenarios}
        active={activeScenario}
        onSelect={setActiveScenario}
        results={results}
      />

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Leaderboard Points Comparison</h2>
        <ComparisonChart results={results} scenarios={allScenarios.filter(s => results[s.id])} />
      </section>

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
          <FinalSummary result={activeResult} scenario={active} />
        ) : (
          <div className="text-[var(--color-faint)] text-[0.85rem] text-center py-4 mb-6">
            Add actions to your custom strategy to see results.
          </div>
        )}

        {activeResult && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-[var(--color-surface)] rounded-xl p-5 border border-[var(--color-border)] shadow-[var(--shadow-card)]">
                <h3 className="text-sm text-[var(--color-muted)] mb-3">Resources Over Time</h3>
                <TimelineChart
                  data={chartData}
                  lines={[
                    { key: 'metals', color: '#f59e0b', name: 'Metals' },
                    { key: 'gas', color: '#ef4444', name: 'Gas' },
                    { key: 'crystal', color: '#6366f1', name: 'Crystal' },
                  ]}
                  yLabel="Resources"
                />
              </div>
              <div className="bg-[var(--color-surface)] rounded-xl p-5 border border-[var(--color-border)] shadow-[var(--shadow-card)]">
                <h3 className="text-sm text-[var(--color-muted)] mb-3">Production Rates (per hour)</h3>
                <TimelineChart
                  data={chartData}
                  lines={[
                    { key: 'metalProd', color: '#f59e0b', name: 'Metal Prod' },
                    { key: 'gasProd', color: '#ef4444', name: 'Gas Prod' },
                    { key: 'crystalProd', color: '#6366f1', name: 'Crystal Prod' },
                  ]}
                  yLabel="Production/hr"
                />
              </div>
              <div className="bg-[var(--color-surface)] rounded-xl p-5 border border-[var(--color-border)] shadow-[var(--shadow-card)]">
                <h3 className="text-sm text-[var(--color-muted)] mb-3">Stardust Accumulation</h3>
                <TimelineChart
                  data={chartData}
                  lines={[
                    { key: 'stardust', color: '#8b5cf6', name: 'Stardust' },
                  ]}
                  yLabel="Stardust"
                />
              </div>
              <div className="bg-[var(--color-surface)] rounded-xl p-5 border border-[var(--color-border)] shadow-[var(--shadow-card)]">
                <h3 className="text-sm text-[var(--color-muted)] mb-3">Leaderboard Points</h3>
                <TimelineChart
                  data={chartData}
                  lines={[
                    { key: 'leaderboardPoints', color: '#10b981', name: 'Points' },
                  ]}
                  yLabel="Points"
                />
              </div>
              <div className="bg-[var(--color-surface)] rounded-xl p-5 border border-[var(--color-border)] shadow-[var(--shadow-card)]">
                <h3 className="text-sm text-[var(--color-muted)] mb-3">Trade Ratios (Metal →)</h3>
                <TimelineChart
                  data={chartData}
                  lines={[
                    { key: 'metalToGas', color: '#ef4444', name: 'Metal → Gas' },
                    { key: 'metalToCrystal', color: '#6366f1', name: 'Metal → Crystal' },
                  ]}
                  yLabel="Ratio"
                />
              </div>
            </div>

            <ActionLog log={activeResult.actionLog} />

            <AgendaExport
              actionLog={activeResult.actionLog}
              timeline={activeResult.timeline}
              scenario={active}
              saveEnergy={saveEnergy}
            />
          </>
        )}
      </section>
    </div>
  );
}

export default App;
