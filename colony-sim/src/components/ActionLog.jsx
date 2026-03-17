export default function ActionLog({ log }) {
  return (
    <div className="bg-[var(--color-surface)] rounded-xl p-5 border border-[var(--color-border)] shadow-[var(--shadow-card)]">
      <h3 className="text-sm text-[var(--color-muted)] mb-3">Action Timeline ({log.length} actions)</h3>
      <div className="flex flex-wrap gap-1.5">
        {log.map((entry, i) => (
          <div key={i} className="bg-[var(--color-inset)] border border-[var(--color-border)] rounded-md px-2.5 py-1 text-xs font-mono">
            <span className="text-emerald-500 font-semibold mr-1.5">H{entry.hour}</span>
            {entry.action}
          </div>
        ))}
      </div>
    </div>
  );
}
