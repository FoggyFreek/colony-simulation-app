import { useState, useMemo, useCallback } from 'react';
import { buildAgenda, formatAgendaAsText, formatDayHeader, getNextFriday16 } from '../simulation/agendaUtils';

export default function AgendaExport({ actionLog, timeline, scenario, saveEnergy }) {
  const [seasonStart, setSeasonStart] = useState(() => getNextFriday16());
  const [awakeEnabled, setAwakeEnabled] = useState(true);
  const [awakeStart, setAwakeStart] = useState(7);
  const [awakeEnd, setAwakeEnd] = useState(23);
  const [copied, setCopied] = useState(false);

  const awakeConfig = useMemo(() => ({
    enabled: awakeEnabled,
    awakeStart,
    awakeEnd,
  }), [awakeEnabled, awakeStart, awakeEnd]);

  const entries = useMemo(
    () => buildAgenda(actionLog, timeline, seasonStart, awakeConfig, { saveEnergy }),
    [actionLog, timeline, seasonStart, awakeConfig, saveEnergy],
  );

  const textExport = useMemo(
    () => formatAgendaAsText(entries, scenario.name, seasonStart, awakeConfig, { saveEnergy }),
    [entries, scenario.name, seasonStart, awakeConfig, saveEnergy],
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(textExport);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = textExport;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [textExport]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([textExport], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `colony-agenda-${scenario.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [textExport, scenario.id]);

  const groupedEntries = useMemo(() => {
    const groups = [];
    let currentDay = null;
    let currentGroup = null;
    for (const entry of entries) {
      const dayKey = formatDayHeader(entry.realTime);
      if (dayKey !== currentDay) {
        currentDay = dayKey;
        currentGroup = { day: dayKey, entries: [] };
        groups.push(currentGroup);
      }
      currentGroup.entries.push(entry);
    }
    return groups;
  }, [entries]);

  const dateValue = seasonStart.toISOString().slice(0, 10);
  const timeValue = `${String(seasonStart.getHours()).padStart(2, '0')}:${String(seasonStart.getMinutes()).padStart(2, '0')}`;

  const inputClass = "bg-[var(--color-inset)] border border-[var(--color-border)] text-[var(--color-text)] px-2 py-1 rounded-md text-[0.85rem] focus:outline-none focus:border-[var(--color-accent)]";
  const btnClass = "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] px-3.5 py-1.5 rounded-md cursor-pointer text-xs transition-all duration-200 hover:bg-[var(--color-inset)] hover:border-[var(--color-border-hover)]";

  return (
    <div className="bg-[var(--color-surface)] rounded-xl p-5 border border-[var(--color-border)] mt-4 shadow-[var(--shadow-card)]">
      <h3 className="text-sm text-[var(--color-muted)] mb-4">Export Agenda</h3>

      <div className="flex flex-wrap gap-4 items-start mb-4 pb-4 border-b border-[var(--color-border)]">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-[var(--color-muted)] uppercase tracking-wide">Season Start</label>
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={dateValue}
              onChange={e => {
                const [y, m, d] = e.target.value.split('-').map(Number);
                const next = new Date(seasonStart);
                next.setFullYear(y, m - 1, d);
                setSeasonStart(next);
              }}
              className={inputClass}
            />
            <input
              type="time"
              value={timeValue}
              onChange={e => {
                const [h, m] = e.target.value.split(':').map(Number);
                const next = new Date(seasonStart);
                next.setHours(h, m, 0, 0);
                setSeasonStart(next);
              }}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-2.5 cursor-pointer text-sm text-[var(--color-text)] select-none">
            <input
              type="checkbox"
              checked={awakeEnabled}
              onChange={e => setAwakeEnabled(e.target.checked)}
              className="hidden"
            />
            <span className="toggle-switch" />
            Restrict to awake hours
          </label>
          {awakeEnabled && (
            <div className="flex gap-2 items-center">
              <label className="flex items-center gap-1 text-xs text-[var(--color-muted)]">
                Wake
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={awakeStart}
                  onChange={e => setAwakeStart(Number(e.target.value))}
                  className={`${inputClass} w-[50px]`}
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
                  className={`${inputClass} w-[50px]`}
                />
                :00
              </label>
            </div>
          )}
        </div>

        <div className="flex gap-2 items-end ml-auto max-md:ml-0">
          <button className={btnClass} onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
          <button className={btnClass} onClick={handleDownload}>
            Download .txt
          </button>
        </div>
      </div>

      <div className="max-h-[500px] overflow-y-auto font-mono text-xs leading-relaxed">
        {groupedEntries.map(group => (
          <div key={group.day} className="mb-3">
            <div className="font-bold text-amber-500 py-1 border-b border-[var(--color-border)] mb-1 text-xs">
              {group.day}
            </div>
            {group.entries.map((entry, i) => (
              <div
                key={i}
                className={`flex gap-2.5 px-2 py-0.5 rounded ${
                  entry.isWakeUp
                    ? 'bg-[var(--color-wakeup-bg)] border-l-3 border-l-emerald-500 pl-[5px]'
                    : 'hover:bg-[var(--color-inset)]'
                }`}
              >
                <span className="text-emerald-500 font-semibold whitespace-nowrap min-w-[40px]">
                  {entry.displayTime}
                </span>
                <span className={`whitespace-nowrap min-w-[80px] ${
                  entry.isWakeUp ? 'text-emerald-500 font-semibold' : 'text-[var(--color-faint)]'
                }`}>
                  {entry.isWakeUp ? `WAKE UP — H${entry.simHour}` : `H${entry.simHour}`}
                </span>
                <div className="flex flex-col gap-px">
                  {entry.actions.map((action, j) => (
                    <div key={j} className="text-[var(--color-text)]">{action}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
