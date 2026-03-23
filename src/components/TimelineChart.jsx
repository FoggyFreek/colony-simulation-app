import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';

function formatNumber(val) {
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
  return val.toFixed(1);
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3.5 py-2.5 text-xs"
      style={{
        background: 'var(--color-tooltip-bg)',
        border: '1px solid var(--color-tooltip-border)',
      }}
    >
      <div className="text-[var(--color-muted)] mb-1">Hour {label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {formatNumber(p.value)}
        </div>
      ))}
    </div>
  );
}

const NOW_LINE_PROPS = {
  stroke: '#717171',
  strokeDasharray: '4 3',
  strokeWidth: 1.5,
  label: { value: 'Now', position: 'top', fill: '#22d3ee', fontSize: 10 },
};

export default function TimelineChart({ data, lines, yLabel, stacked, bar, currentHour }) {
  if (bar) {
    return (
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-grid-stroke)" />
          <XAxis
            dataKey="hour"
            stroke="var(--color-axis-stroke)"
            tick={{ fill: 'var(--color-axis-tick)', fontSize: 11 }}
            label={{ value: 'Hours', position: 'insideBottom', offset: -2, fill: 'var(--color-axis-tick)', fontSize: 11 }}
          />
          <YAxis
            stroke="var(--color-axis-stroke)"
            tick={{ fill: 'var(--color-axis-tick)', fontSize: 11 }}
            tickFormatter={formatNumber}
            label={{ value: yLabel, angle: -90, position: 'insideLeft', fill: 'var(--color-axis-tick)', fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
          {currentHour != null && <ReferenceLine x={currentHour} {...NOW_LINE_PROPS} />}
          {lines.map(l => (
            <Bar key={l.key} dataKey={l.key} stackId="1" fill={l.color} name={l.name} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (stacked) {
    return (
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-grid-stroke)" />
          <XAxis
            dataKey="hour"
            type="number"
            domain={[0, 'dataMax']}
            stroke="var(--color-axis-stroke)"
            tick={{ fill: 'var(--color-axis-tick)', fontSize: 11 }}
            label={{ value: 'Hours', position: 'insideBottom', offset: -2, fill: 'var(--color-axis-tick)', fontSize: 11 }}
          />
          <YAxis
            stroke="var(--color-axis-stroke)"
            tick={{ fill: 'var(--color-axis-tick)', fontSize: 11 }}
            tickFormatter={formatNumber}
            label={{ value: yLabel, angle: -90, position: 'insideLeft', fill: 'var(--color-axis-tick)', fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
          {currentHour != null && <ReferenceLine x={currentHour} {...NOW_LINE_PROPS} />}
          {lines.map(l => (
            <Area
              key={l.key}
              type="monotone"
              dataKey={l.key}
              stackId="1"
              stroke={l.color}
              fill={l.color}
              fillOpacity={0.3}
              name={l.name}
              dot={false}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-grid-stroke)" />
        <XAxis
          dataKey="hour"
          type="number"
          domain={[0, 'dataMax']}
          stroke="var(--color-axis-stroke)"
          tick={{ fill: 'var(--color-axis-tick)', fontSize: 11 }}
          label={{ value: 'Hours', position: 'insideBottom', offset: -2, fill: 'var(--color-axis-tick)', fontSize: 11 }}
        />
        <YAxis
          stroke="var(--color-axis-stroke)"
          tick={{ fill: 'var(--color-axis-tick)', fontSize: 11 }}
          tickFormatter={formatNumber}
          label={{ value: yLabel, angle: -90, position: 'insideLeft', fill: 'var(--color-axis-tick)', fontSize: 11 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
        {currentHour != null && <ReferenceLine x={currentHour} {...NOW_LINE_PROPS} />}
        {lines.map(l => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            stroke={l.color}
            name={l.name}
            dot={false}
            strokeWidth={2}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
