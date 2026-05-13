import type { QueryResult } from '@/lib/backend';

export function NumberChart({ result }: { result: QueryResult }) {
  const value = result.rows[0]?.[0] ?? '—';
  return (
    <div className="flex h-full items-center justify-center">
      <p className="font-mono text-[2.4rem] font-black text-dp-text-primary">{value}</p>
    </div>
  );
}

export function BarChart({ result }: { result: QueryResult }) {
  if (result.columns.length < 2) {
    return <Empty msg="需要至少 2 列（label, value）" />;
  }
  const data = result.rows
    .map((r) => ({ label: r[0] ?? '', value: Number(r[1] ?? 0) }))
    .filter((d) => !Number.isNaN(d.value));
  if (data.length === 0) return <Empty msg="没有数据" />;
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex h-full flex-col gap-1 overflow-auto p-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2 text-[0.74rem]">
          <span className="w-24 shrink-0 truncate font-mono text-dp-text-dimmed" title={d.label}>{d.label}</span>
          <div className="relative h-3 flex-1 rounded-sm bg-dp-surface-raised">
            <div
              className="h-full rounded-sm bg-dp-accent/60"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <span className="w-16 shrink-0 text-right font-mono text-dp-text-secondary">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

export function LineChart({ result }: { result: QueryResult }) {
  if (result.columns.length < 2) {
    return <Empty msg="需要至少 2 列（x, y）" />;
  }
  const data = result.rows
    .map((r) => ({ x: r[0] ?? '', y: Number(r[1] ?? 0) }))
    .filter((d) => !Number.isNaN(d.y));
  if (data.length === 0) return <Empty msg="没有数据" />;

  const W = 320;
  const H = 140;
  const PADDING = 24;
  const max = Math.max(...data.map((d) => d.y));
  const min = Math.min(...data.map((d) => d.y));
  const range = max - min || 1;
  const stepX = (W - PADDING * 2) / Math.max(data.length - 1, 1);

  const points = data.map((d, i) => {
    const x = PADDING + i * stepX;
    const y = H - PADDING - ((d.y - min) / range) * (H - PADDING * 2);
    return { x, y, d };
  });
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  return (
    <div className="flex h-full items-center justify-center overflow-auto p-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full max-w-[480px]" preserveAspectRatio="xMidYMid meet">
        <line x1={PADDING} y1={H - PADDING} x2={W - PADDING} y2={H - PADDING} stroke="currentColor" className="text-dp-border" strokeWidth="0.5" />
        <line x1={PADDING} y1={PADDING} x2={PADDING} y2={H - PADDING} stroke="currentColor" className="text-dp-border" strokeWidth="0.5" />
        <path d={path} fill="none" stroke="currentColor" className="text-dp-accent" strokeWidth="1.5" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2" fill="currentColor" className="text-dp-accent" />
        ))}
      </svg>
    </div>
  );
}

export function TableChart({ result }: { result: QueryResult }) {
  if (result.rows.length === 0) return <Empty msg="没有数据" />;
  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-[0.74rem] font-mono">
        <thead className="sticky top-0 bg-dp-surface-overlay">
          <tr>
            {result.columns.map((c) => (
              <th key={c} className="border-b border-dp-border px-2 py-1.5 text-left font-bold text-dp-text-dimmed">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.slice(0, 100).map((row, ri) => (
            <tr key={ri} className="border-b border-dp-border/40 hover:bg-dp-surface-raised/50">
              {row.map((v, ci) => (
                <td key={ci} className="px-2 py-1 text-dp-text-secondary">{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-[0.78rem] text-dp-text-dimmed">{msg}</p>
    </div>
  );
}
