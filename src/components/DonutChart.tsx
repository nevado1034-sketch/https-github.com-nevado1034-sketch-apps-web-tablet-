import React, { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

// Gráfico de dona (pastel) con leyenda y porcentajes. Carga diferida.

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  color: string;
}

function DonutTooltip({ active, payload, total, format }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const pct = total > 0 ? (p.value / total) * 100 : 0;
  return (
    <div className="bg-slate-950/95 border border-slate-700 rounded-xl px-3 py-2 shadow-2xl text-[11px]">
      <p className="flex items-center gap-1.5 font-black text-slate-100">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.payload.color }} />
        {p.name}
      </p>
      <p className="font-mono text-slate-300 mt-0.5">
        {format(p.value)} · {pct.toFixed(1)}%
      </p>
    </div>
  );
}

export default function DonutChart({
  data,
  centerLabel,
  format = (n: number) => String(n)
}: {
  data: DonutSlice[];
  centerLabel: string;
  format?: (n: number) => string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const slices = data.filter((d) => d.value > 0);
  const total = slices.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return <p className="text-xs text-slate-500 text-center py-10">Sin datos en el período.</p>;
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <div className="relative w-48 h-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="label"
              innerRadius="62%"
              outerRadius="95%"
              paddingAngle={slices.length > 1 ? 2 : 0}
              stroke="none"
              animationDuration={700}
              onMouseEnter={(_: any, i: number) => setActive(slices[i]?.key || null)}
              onMouseLeave={() => setActive(null)}
            >
              {slices.map((s) => (
                <Cell key={s.key} fill={s.color} opacity={active && active !== s.key ? 0.35 : 1} />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip total={total} format={format} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-black font-mono text-slate-50">{format(total)}</span>
          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">{centerLabel}</span>
        </div>
      </div>
      <div className="flex-1 w-full space-y-2">
        {slices
          .slice()
          .sort((a, b) => b.value - a.value)
          .map((s) => {
            const pct = (s.value / total) * 100;
            return (
              <div
                key={s.key}
                onMouseEnter={() => setActive(s.key)}
                onMouseLeave={() => setActive(null)}
                className={`flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors ${active === s.key ? "bg-slate-800/60" : ""}`}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className="flex-1 text-xs font-bold text-slate-300 truncate">{s.label}</span>
                <span className="text-xs font-mono font-black text-slate-100">{format(s.value)}</span>
                <span className="w-12 text-right text-[11px] font-mono text-slate-500">{pct.toFixed(0)}%</span>
              </div>
            );
          })}
      </div>
    </div>
  );
}
