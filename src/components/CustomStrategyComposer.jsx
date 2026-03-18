import { useState, useMemo, useEffect, useRef } from 'react';
import { getValidActions, mapQueueToResults } from '../simulation/customStrategy';
import { getActionIcon } from '../simulation/agendaUtils';
import ActionIcon from './ActionIcon';

export default function CustomStrategyComposer({ actionQueue, setActionQueue, simulationResult }) {
  const [selectedAction, setSelectedAction] = useState('');
  const [overflowWarning, setOverflowWarning] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const prevHasOverflowRef = useRef(false);
  const isFirstRender = useRef(true);
  const dragIndexRef = useRef(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

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
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevHasOverflowRef.current = !!hasOverflow;
      return;
    }
    if (hasOverflow && !prevHasOverflowRef.current) {
      prevHasOverflowRef.current = true;
      const showTimer = setTimeout(() => setOverflowWarning('One or more actions do not fit within the 168-hour season.'), 0);
      const hideTimer = setTimeout(() => setOverflowWarning(null), 4000);
      return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
    }
    if (!hasOverflow && prevHasOverflowRef.current) {
      setTimeout(() => setOverflowWarning(null), 0);
    }
    prevHasOverflowRef.current = !!hasOverflow;
  }, [hasOverflow]);

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

  function handleClear() {
    setActionQueue([]);
  }

  function handleDragStart(index) {
    dragIndexRef.current = index;
  }

  function handleDragOver(e, index) {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const insertPos = e.clientY < rect.top + rect.height / 2 ? index : index + 1;
    setDragOverIndex(insertPos);
  }

  function handleDrop() {
    const from = dragIndexRef.current;
    const to = dragOverIndex;
    dragIndexRef.current = null;
    setDragOverIndex(null);
    if (from === null || to === null) return;
    const insertAt = to > from ? to - 1 : to;
    if (insertAt === from) return;
    const next = [...actionQueue];
    const [removed] = next.splice(from, 1);
    next.splice(insertAt, 0, removed);
    setActionQueue(rebuildQueue(next));
  }

  function handleDragEnd() {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  }

  const projectedPoints = simulationResult?.finalState?.leaderboardPoints;
  const completedCount = statuses.filter(s => s.completed).length;

  const queueBtnBase = "w-[22px] h-[22px] rounded flex items-center justify-center text-[0.7rem] font-mono cursor-pointer transition-all duration-200 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-inset)] hover:text-[var(--color-text)] disabled:opacity-30 disabled:cursor-not-allowed";

  return (
    <div className="bg-[var(--color-surface)] rounded-xl p-5 border border-[var(--color-border)] mb-6 shadow-[var(--shadow-card)]">
      <div className="flex justify-between items-center mb-3">
        <button
          className="flex items-center gap-1.5 text-sm text-pink-500 font-semibold cursor-pointer bg-transparent border-none p-0 hover:opacity-75 transition-opacity"
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <svg
            width="12" height="12" viewBox="0 0 12 12" fill="currentColor"
            className={`transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`}
          >
            <path d="M1 3 L6 9 L11 3Z" />
          </svg>
          Custom Build Order
        </button>
        {!collapsed && actionQueue.length > 0 && (
          <button
            className="bg-transparent border border-[var(--color-border)] text-[var(--color-muted)] px-2.5 py-0.5 rounded-md cursor-pointer text-xs transition-all duration-200 hover:bg-[var(--color-inset)] hover:text-[var(--color-text)]"
            onClick={handleClear}
          >
            Clear All
          </button>
        )}
      </div>

      {!collapsed && <>
        <div className="flex gap-2 mb-3">
          <select
            value={selectedAction}
            onChange={e => setSelectedAction(e.target.value)}
            className="flex-1 bg-[var(--color-inset)] border border-[var(--color-border)] text-[var(--color-text)] px-2.5 py-1.5 rounded-md text-[0.85rem] focus:outline-none focus:border-[var(--color-accent)]"
          >
            <option value="">-- Select action --</option>
            {validActions.map(a => {
              const icon = getActionIcon(a.label);
              return (
                <option key={actionKey(a)} value={actionKey(a)}>
                  {icon ? `${icon} ${a.label}` : a.label}
                </option>
              );
            })}
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

          <div className="flex flex-col mb-3">
            {actionQueue.map((item, i) => {
              const status = statuses[i];
              const isOverflow = simulationResult && status && !status.completed;
              const showCutoff = hasOverflow && i === lastCompletedIdx;
              return (
                <div key={item.id}>
                  {dragOverIndex === i && (
                    <div className="h-0.5 bg-pink-500 rounded mx-1 my-0.5" />
                  )}
                  <div
                    draggable
                    onDragStart={() => handleDragStart(i)}
                    onDragOver={e => handleDragOver(e, i)}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-2 bg-[var(--color-inset)] border rounded-md px-2.5 py-1.5 mt-1 text-xs font-mono ${
                    isOverflow ? 'opacity-45 border-[var(--color-danger-border)]' : 'border-[var(--color-border)]'
                  }`}>
                    <span className="text-[var(--color-faint)] cursor-grab active:cursor-grabbing select-none" title="Drag to reorder">
                      <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
                        <circle cx="2" cy="3" r="1.5"/><circle cx="8" cy="3" r="1.5"/>
                        <circle cx="2" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/>
                        <circle cx="2" cy="13" r="1.5"/><circle cx="8" cy="13" r="1.5"/>
                      </svg>
                    </span>
                    <span className="text-[var(--color-faint)] min-w-[24px]">{i + 1}.</span>
                    <span className="flex items-center gap-1 flex-1 text-[var(--color-text)]">
                      <ActionIcon action={item.label} />
                      {item.label}
                    </span>
                    <span className="min-w-[40px] text-right">
                      {status?.completed ? (
                        <span className="text-emerald-500 font-semibold">H{status.hour}</span>
                      ) : simulationResult ? (
                        <span className="text-red-500">--</span>
                      ) : null}
                    </span>
                    <div className="flex gap-1">
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
            {dragOverIndex === actionQueue.length && (
              <div className="h-0.5 bg-pink-500 rounded mx-1 mt-1" />
            )}
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
      </>}
    </div>
  );
}

function rebuildQueue(queue) {
  const virtualBuildings = { metal: [], gas: [], crystal: [], stardust: [] };
  const result = [];
  const deferred = []; // upgrades waiting for their prerequisite build slot

  function flushDeferred(buildingType) {
    for (let i = 0; i < deferred.length; i++) {
      const { item } = deferred[i];
      if (item.buildingType !== buildingType) continue;
      const maxLevel = buildingType === 'stardust' ? 3 : 7;
      const slots = virtualBuildings[buildingType];
      if (item.slotIndex >= slots.length) continue; // slot still doesn't exist
      const currentLevel = slots[item.slotIndex];
      if (currentLevel >= maxLevel) { deferred.splice(i--, 1); continue; }
      const nextLevel = currentLevel + 1;
      slots[item.slotIndex] = nextLevel;
      result.push({
        ...item,
        slotIndex: item.slotIndex,
        targetLevel: nextLevel,
        label: `Upgrade ${capitalize(buildingType)}[${item.slotIndex}] to L${nextLevel}`,
      });
      deferred.splice(i--, 1);
    }
  }

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
      flushDeferred(buildingType);
    } else if (actionType === 'upgrade') {
      const slots = virtualBuildings[buildingType];
      const slotIdx = item.slotIndex;
      if (slotIdx >= slots.length) {
        // Prerequisite build hasn't happened yet — defer until after it does
        deferred.push({ item });
        continue;
      }
      const currentLevel = slots[slotIdx];
      if (currentLevel >= maxLevel) continue;
      const nextLevel = currentLevel + 1;
      slots[slotIdx] = nextLevel;
      const typeName = capitalize(buildingType);
      result.push({
        ...item,
        slotIndex: slotIdx,
        targetLevel: nextLevel,
        label: `Upgrade ${typeName}[${slotIdx}] to L${nextLevel}`,
      });
    }
  }

  // Any still-deferred upgrades: try redirecting to first available slot of that type
  for (const { item } of deferred) {
    const { buildingType } = item;
    const maxLevel = buildingType === 'stardust' ? 3 : 7;
    const slots = virtualBuildings[buildingType];
    const slotIdx = slots.findIndex(lvl => lvl < maxLevel);
    if (slotIdx === -1) continue;
    const nextLevel = slots[slotIdx] + 1;
    slots[slotIdx] = nextLevel;
    result.push({
      ...item,
      slotIndex: slotIdx,
      targetLevel: nextLevel,
      label: `Upgrade ${capitalize(buildingType)}[${slotIdx}] to L${nextLevel}`,
    });
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
