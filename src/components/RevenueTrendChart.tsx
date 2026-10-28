import React, { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { MonthBucket } from "../data/metrics";

// Gráfico de líneas de ingresos (Taller + Express) para el panel del admin.
// Se carga de forma diferida: solo lo descarga quien abre el panel.

const SERIES = [
  { key: "revenue", label: "Total", color: "#34d399", width: 3 },
  { key: "tallerRevenue", label: "Taller", color: "#22d3ee", width: 2 },
  { key: "expressRevenue", label: "Express", color: "#fbbf24", width: 2 }
] as const;

type SeriesKey = (typeof SERIES)[number]["key"];

function soles(n: number): string {
  return `S/ ${Math.round(n || 0).toLocaleString("es-PE")}`;
}

function shortSoles(n: number): string {
  if (n >= 1000) return `S/ ${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return `S/ ${Math.round(n)}`;
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as MonthBucket | undefined;
  return (
    <div className="bg-slate-950/95 border border-slate-700 rounded-xl px-3 py-2 shadow-2xl text-[11px] min-w-[160px]">
      <p className="font-black text-slate-100 uppercase tracking-wider mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}
          </span>
          <span className="font-mono font-bold text-slate-100">{soles(p.value)}</span>
        </p>
      ))}
      {row && <p className="text-[10px] text-slate-500 mt-1.5 pt-1.5 border-t border-slate-800">{row.count} OT entregadas</p>}
    </div>
  );
}

export default function RevenueTrendChart({ data }: { data: MonthBucket[] }) {
  const [months, setMonths] = useState<6 | 12>(6);
  const [hidden, setHidden] = useState<Set<SeriesKey>>(new Set());

  const rows = useMemo(
    () =>
      data.slice(-months).map((b) => ({
        ...b,
        label: b.label.replace(".", "").replace(/^\w/, (c) => c.toUpperCase())
      })),
    [data, months]
  );

  const totalPeriod = rows.reduce((s, r) => s + r.revenue, 0);
  const current = rows[rows.length - 1];
  const previous = rows[rows.length - 2];
  const change = previous && previous.revenue > 0 ? ((current.revenue - previous.revenue) / previous.revenue) * 100 : null;
  const best = rows.reduce<(typeof rows)[number] | null>((b, r) => (!b || r.revenue > b.revenue ? r : b), null);

  const toggle = (key: SeriesKey) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Total {months} meses</p>
            <p className="text-xl font-black font-mono text-slate-50">{soles(totalPeriod)}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Mes actual</p>
            <p className="text-xl font-black font-mono text-slate-50">
              {soles(current?.revenue || 0)}
              {change !== null && (
                <span className={`ml-2 text-xs font-black ${change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(0)}%
                </span>
              )}
            </p>
            {change !== null && <p className="text-[9px] text-slate-500">vs {previous.label}</p>}
          </div>
          {best && best.revenue > 0 && (
            <div>
              <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Mejor mes</p>
              <p className="text-xl font-black font-mono text-slate-50">
                {best.label} <span className="text-xs text-slate-400">{soles(best.revenue)}</span>
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1">
          {([6, 12] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMonths(m)}
              className={`px-3 py-1 rounded-lg text-[11px] font-black transition-all ${
                months === m ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {m} meses
            </button>
          ))}
        </div>
      </div>

      <div className="h-64 sm:h-72 -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 10, right: 16, bottom: 0, left: 4 }}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 700 }} axisLine={{ stroke: "#334155" }} tickLine={false} />
            <YAxis tickFormatter={shortSoles} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} width={56} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#475569", strokeDasharray: "4 4" }} />
            <Legend
              itemSorter={(item: any) => SERIES.findIndex((s) => s.key === item.dataKey)}
              onClick={(e: any) => toggle(e.dataKey as SeriesKey)}
              wrapperStyle={{ fontSize: 11, fontWeight: 700, cursor: "pointer", paddingTop: 8 }}
              formatter={(value: string, entry: any) => (
                <span style={{ color: hidden.has(entry.dataKey) ? "#475569" : "#cbd5e1" }}>{value}</span>
              )}
            />
            {SERIES.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={s.width}
                hide={hidden.has(s.key)}
                dot={{ r: 3, strokeWidth: 0, fill: s.color }}
                activeDot={{ r: 6, strokeWidth: 2, stroke: "#0f172a" }}
                animationDuration={700}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-slate-500">
        Taller = órdenes entregadas en el mes · Express = recibos no anulados. Toca la leyenda para ocultar o mostrar una línea.
      </p>
    </div>
  );
}
