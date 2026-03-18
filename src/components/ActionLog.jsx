import { useState } from 'react';
import ActionIcon from './ActionIcon';

const ACTION_TYPES = [
  { key: 'mine',    label: 'Mine',    test: a => /^(Mine |Skip mining)/i.test(a) },
  { key: 'build',   label: 'Build',   test: a => /^Build /i.test(a) },
  { key: 'upgrade', label: 'Upgrade', test: a => /^(Upgrade |Trade \+ )/i.test(a) },
  { key: 'trade',   label: 'Trade',   test: a => /^Trade[: ]/i.test(a) },
  { key: 'other',   label: 'Other',   test: a => !/^(Mine |Skip mining|Build |Upgrade |Trade)/i.test(a) },
];

function getType(action) {
  for (const t of ACTION_TYPES) {
    if (t.test(action)) return t.key;
  }
  return 'other';
}

export default function ActionLog({ log }) {
  const [hidden, setHidden] = useState(new Set(['trade']));

  function toggle(key) {
    setHidden(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const visible = log.filter(e => !hidden.has(getType(e.action)));
  const hiddenCount = log.length - visible.length;

  return (
    <div className="bg-[var(--color-surface)] rounded-xl p-5 border border-[var(--color-border)] shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h3 className="text-sm text-[var(--color-muted)] mr-1">
          Action Timeline ({visible.length} / {log.length})
        </h3>
        {ACTION_TYPES.map(t => {
          const count = log.filter(e => t.test(e.action)).length;
          if (count === 0) return null;
          const active = !hidden.has(t.key);
          return (
            <button
              key={t.key}
              onClick={() => toggle(t.key)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border transition-opacity ${
                active
                  ? 'bg-[var(--color-inset)] border-[var(--color-border)] text-[var(--color-text)] opacity-100'
                  : 'bg-transparent border-[var(--color-border)] text-[var(--color-muted)] opacity-40'
              }`}
            >
              <ActionIcon action={t.key === 'mine' ? 'Mine' : t.key === 'build' ? 'Build ' : t.key === 'upgrade' ? 'Upgrade ' : t.key === 'trade' ? 'Trade: ' : ''} />
              {t.label} {count}
            </button>
          );
        })}
        {hiddenCount > 0 && (
          <span className="text-xs text-[var(--color-muted)] italic ml-1">{hiddenCount} hidden</span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((entry, i) => (
          <div key={i} className="flex items-center gap-1 bg-[var(--color-inset)] border border-[var(--color-border)] rounded-md px-2.5 py-1 text-xs font-mono">
            <span className="text-emerald-500 font-semibold mr-0.5">H{entry.hour}</span>
            <ActionIcon action={entry.action} />
            {entry.action}
          </div>
        ))}
      </div>
    </div>
  );
}
