import { useState, useMemo, useEffect, useRef } from 'react';
import { getValidActions, mapQueueToResults } from '../simulation/customStrategy';

export default function CustomStrategyComposer({ actionQueue, setActionQueue, simulationResult }) {
  const [selectedAction, setSelectedAction] = useState('');
  const [overflowWarning, setOverflowWarning] = useState(null);
  const prevQueueLenRef = useRef(actionQueue.length);

  const validActions = useMemo(() => getValidActions(actionQueue), [actionQueue]);

  const statuses = useMemo(() => {
    if (!simulationResult) return [];
    return mapQueueToResults(actionQueue, simulationResult.actionLog);
  }, [actionQueue, simulationResult]);

  const lastCompletedIdx = useMemo(() => {
    let last = -1;
    for (let i = 0; i < statuses.length; i++) {
      if (statuses[i]?.completed) last = i;
    }
    return last;
  }, [statuses]);

  const hasOverflow = simulationResult && statuses.length > 0 && lastCompletedIdx < statuses.length - 1;

  useEffect(() => {
    if (actionQueue.length > prevQueueLenRef.current && simulationResult) {
      const lastStatus = statuses[statuses.length - 1];
      if (lastStatus && !lastStatus.completed) {
        setOverflowWarning('This action does not fit within the 168-hour season.');
        const timer = setTimeout(() => setOverflowWarning(null), 4000);
        return () => clearTimeout(timer);
      }
    }
    prevQueueLenRef.current = actionQueue.length;
  }, [actionQueue.length, statuses, simulationResult]);

  function handleAdd() {
    const action = validActions.find(a => actionKey(a) === selectedAction);
    if (!action) return;
    setActionQueue([...actionQueue, { ...action, id: crypto.randomUUID() }]);
    setSelectedAction('');
  }

  function handleRemove(index) {
    const next = actionQueue.filter((_, i) => i !== index);
    setActionQueue(rebuildQueue(next));
  }

  function handleMove(index, direction) {
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= actionQueue.length) return;
    const next = [...actionQueue];
    [next[index], next[newIdx]] = [next[newIdx], next[index]];
    setActionQueue(rebuildQueue(next));
  }

  function handleClear() {
    setActionQueue([]);
  }

  const projectedPoints = simulationResult?.finalState?.leaderboardPoints;
  const completedCount = statuses.filter(s => s.completed).length;

  const queueBtnBase = "w-[22px] h-[22px] rounded flex items-center justify-center text-[0.7rem] font-mono cursor-pointer transition-all duration-200 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-inset)] hover:text-[var(--color-text)] disabled:opacity-30 disabled:cursor-not-allowed";

  return (
    <div className="bg-[var(--color-surface)] rounded-xl p-5 border border-[var(--color-border)] mb-6 shadow-[var(--shadow-card)]">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm text-pink-500 font-semibold">Custom Build Order</h3>
        {actionQueue.length > 0 && (
          <button
            className="bg-transparent border border-[var(--color-border)] text-[var(--color-muted)] px-2.5 py-0.5 rounded-md cursor-pointer text-xs transition-all duration-200 hover:bg-[var(--color-inset)] hover:text-[var(--color-text)]"
            onClick={handleClear}
          >
            Clear All
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-3">
        <select
          value={selectedAction}
          onChange={e => setSelectedAction(e.target.value)}
          className="flex-1 bg-[var(--color-inset)] border border-[var(--color-border)] text-[var(--color-text)] px-2.5 py-1.5 rounded-md text-[0.85rem] focus:outline-none focus:border-[var(--color-accent)]"
        >
          <option value="">-- Select action --</option>
          {validActions.map(a => (
            <option key={actionKey(a)} value={actionKey(a)}>{a.label}</option>
          ))}
        </select>
        <button
          className="bg-pink-500 border-none text-white px-4 py-1.5 rounded-md cursor-pointer text-[0.85rem] font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:not-disabled:bg-pink-600"
          onClick={handleAdd}
          disabled={!selectedAction}
        >
          Add
        </button>
      </div>

      {actionQueue.length > 0 && (
        <>
          {overflowWarning && (
            <div className="bg-[var(--color-danger-bg)] border border-[var(--color-danger-border)] text-[var(--color-danger-text)] px-3 py-2 rounded-md text-xs mb-2 animate-[warningFadeIn_0.2s_ease-out]">
              {overflowWarning}
            </div>
          )}

          <div className="flex flex-col gap-1 mb-3">
            {actionQueue.map((item, i) => {
              const status = statuses[i];
              const isOverflow = simulationResult && status && !status.completed;
              const showCutoff = hasOverflow && i === lastCompletedIdx;
              return (
                <div key={item.id}>
                  <div className={`flex items-center gap-2 bg-[var(--color-inset)] border rounded-md px-2.5 py-1.5 text-xs font-mono ${
                    isOverflow ? 'opacity-45 border-[var(--color-danger-border)]' : 'border-[var(--color-border)]'
                  }`}>
                    <span className="text-[var(--color-faint)] min-w-[24px]">{i + 1}.</span>
                    <span className="flex-1 text-[var(--color-text)]">{item.label}</span>
                    <span className="min-w-[40px] text-right">
                      {status?.completed ? (
                        <span className="text-emerald-500 font-semibold">H{status.hour}</span>
                      ) : simulationResult ? (
                        <span className="text-red-500">--</span>
                      ) : null}
                    </span>
                    <div className="flex gap-1">
                      <button
                        className={queueBtnBase}
                        onClick={() => handleMove(i, -1)}
                        disabled={i === 0}
                        title="Move up"
                      >^</button>
                      <button
                        className={queueBtnBase}
                        onClick={() => handleMove(i, 1)}
                        disabled={i === actionQueue.length - 1}
                        title="Move down"
                      >v</button>
                      <button
                        className={`${queueBtnBase} hover:!bg-red-950 hover:!text-red-300`}
                        onClick={() => handleRemove(i)}
                        title="Remove"
                      >x</button>
                    </div>
                  </div>
                  {showCutoff && (
                    <div className="flex items-center gap-2 my-1.5">
                      <span className="flex-1 h-px bg-red-500" />
                      <span className="text-[0.7rem] text-red-500 font-semibold whitespace-nowrap uppercase tracking-wide">Season ends (168h)</span>
                      <span className="flex-1 h-px bg-red-500" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {simulationResult && (
            <div className="flex justify-between items-center px-3 py-2 bg-[var(--color-inset)] rounded-md text-xs text-[var(--color-muted)]">
              <span>{completedCount}/{actionQueue.length} actions fit in season</span>
              {projectedPoints != null && (
                <span className="text-pink-500 font-semibold">
                  {formatNumber(projectedPoints)} projected pts
                </span>
              )}
            </div>
          )}
        </>
      )}

      {actionQueue.length === 0 && (
        <div className="text-[var(--color-faint)] text-[0.85rem] text-center py-4">
          Add build/upgrade actions above to create your custom strategy.
        </div>
      )}
    </div>
  );
}

function rebuildQueue(queue) {
  const virtualBuildings = { metal: [], gas: [], crystal: [], stardust: [] };
  const result = [];

  for (const item of queue) {
    const { buildingType, actionType } = item;
    const maxLevel = buildingType === 'stardust' ? 3 : 7;
    const totalSlots = Object.values(virtualBuildings).reduce((s, arr) => s + arr.length, 0);

    if (actionType === 'build') {
      if (totalSlots >= 9) continue;
      const newIndex = virtualBuildings[buildingType].length;
      virtualBuildings[buildingType].push(1);
      const typeName = capitalize(buildingType);
      result.push({
        ...item,
        slotIndex: newIndex,
        targetLevel: 1,
        label: `Build ${typeName} L1`,
      });
    } else if (actionType === 'upgrade') {
      let slotIdx = item.slotIndex;
      if (slotIdx >= virtualBuildings[buildingType].length) {
        slotIdx = virtualBuildings[buildingType].findIndex(lvl => lvl < maxLevel);
        if (slotIdx === -1) continue;
      }
      const currentLevel = virtualBuildings[buildingType][slotIdx];
      if (currentLevel >= maxLevel) continue;
      const nextLevel = currentLevel + 1;
      virtualBuildings[buildingType][slotIdx] = nextLevel;
      const typeName = capitalize(buildingType);
      result.push({
        ...item,
        slotIndex: slotIdx,
        targetLevel: nextLevel,
        label: `Upgrade ${typeName}[${slotIdx}] to L${nextLevel}`,
      });
    }
  }

  return result;
}

function actionKey(a) {
  return `${a.buildingType}-${a.actionType}-${a.slotIndex}-${a.targetLevel}`;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatNumber(val) {
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
  return val.toString();
}
