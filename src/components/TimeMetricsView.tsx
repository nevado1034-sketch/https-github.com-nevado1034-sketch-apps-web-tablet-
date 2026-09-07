import React, { useState, useMemo } from "react";
import {
  Clock, Timer, Building2, Users, Info, BarChart3,
  Gauge, TrendingUp, Wrench, ClipboardCheck, PencilRuler, Hourglass, CircleDollarSign,
  Target, Save
} from "lucide-react";
import { RepairItem } from "../types";
import {
  BRANCH_LABELS, BRANCHES, fmtDuration, median, PeriodKey, periodRange,
  inReceptionPeriod, stageTimings, esperaDurationMs, STAGE_KEYS, Goals,
  defaultGoals, loadGoals, saveGoals, trafficColor, HOUR
} from "../data/metrics";
import PeriodFilter from "./PeriodFilter";

interface TimeMetricsViewProps {
  repairs: RepairItem[];
  userLocalKey?: string;
  canEdit?: boolean;
  technicians?: string[];
}

const ALL_BRANCHES = "__all__";

const STAGES: Array<{ key: string; label: string; icon: React.ElementType; color: string }> = [
  { key: "receptioned", label: "Recepción", icon: ClipboardCheck, color: "cyan" },
  { key: "espera", label: "En Espera", icon: Hourglass, color: "rose" },
  { key: "diagnosing", label: "Diagnóstico", icon: PencilRuler, color: "purple" },
  { key: "quoted", label: "Presupuesto", icon: CircleDollarSign, color: "amber" },
  { key: "paid", label: "Pagado", icon: CircleDollarSign, color: "emerald" },
  { key: "repairing", label: "Reparación", icon: Wrench, color: "blue" },
  { key: "testing", label: "Control de Calidad", icon: ClipboardCheck, color: "pink" },
  { key: "ready", label: "Listo / Entrega", icon: Hourglass, color: "teal" }
];

const COLOR_SETS: Record<string, { chip: string; bar: string }> = {
  cyan: { chip: "bg-cyan-500/10 border-cyan-500/25 text-cyan-400", bar: "bg-cyan-500" },
  purple: { chip: "bg-purple-500/10 border-purple-500/25 text-purple-400", bar: "bg-purple-500" },
  amber: { chip: "bg-amber-500/10 border-amber-500/25 text-amber-400", bar: "bg-amber-500" },
  emerald: { chip: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400", bar: "bg-emerald-500" },
  blue: { chip: "bg-blue-500/10 border-blue-500/25 text-blue-400", bar: "bg-blue-500" },
  pink: { chip: "bg-pink-500/10 border-pink-500/25 text-pink-400", bar: "bg-pink-500" },
  teal: { chip: "bg-teal-500/10 border-teal-500/25 text-teal-400", bar: "bg-teal-500" },
  rose: { chip: "bg-rose-500/10 border-rose-500/25 text-rose-400", bar: "bg-rose-500" }
};

const TRAFFIC_STYLES: Record<string, { chip: string; dot: string; label: string }> = {
  emerald: { chip: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400", dot: "bg-emerald-400", label: "Dentro de meta" },
  amber: { chip: "bg-amber-500/15 border-amber-500/30 text-amber-400", dot: "bg-amber-400", label: "Por encima de meta" },
  rose: { chip: "bg-rose-500/15 border-rose-500/30 text-rose-400", dot: "bg-rose-400", label: "Crítico" }
};

interface StageStats {
  durations: number[];
  worker: string | null;
}

interface TechRow {
  name: string;
  orders: Set<string>;
  byStage: Record<string, number[]>;
}

export default function TimeMetricsView({ repairs, userLocalKey, canEdit = false, technicians = [] }: TimeMetricsViewProps) {
  const isAdmin = !userLocalKey;
  const [selectedBranch, setSelectedBranch] = useState<string>(ALL_BRANCHES);
  const [periodKey, setPeriodKey] = useState<PeriodKey>("todo");
  const [goals, setGoals] = useState<Goals>(() => loadGoals());
  const [editingGoals, setEditingGoals] = useState<boolean>(false);
  const [draftGoals, setDraftGoals] = useState<Goals>(() => loadGoals());

  const filteredRepairs = useMemo(() => {
    const range = periodRange(periodKey);
    return repairs.filter((r) => {
      if (userLocalKey && r.workshopBranch !== userLocalKey) return false;
      if (!userLocalKey && selectedBranch !== ALL_BRANCHES && r.workshopBranch !== selectedBranch) return false;
      return inReceptionPeriod(r, range);
    });
  }, [repairs, userLocalKey, selectedBranch, periodKey]);

  const data = useMemo(() => {
    const byStage: Record<string, StageStats> = {};
    const byTech: Record<string, TechRow> = {};
    let totalTransitions = 0;

    const norm = (n: string) =>
      n.toLowerCase().replace(/^t[eé]c\.\s*/i, "").replace(/\s+/g, " ").trim();
    const techSet = new Set(technicians.map((t) => norm(t)));

    STAGES.forEach((s) => { byStage[s.key] = { durations: [], worker: null }; });

    filteredRepairs.forEach((r) => {
      stageTimings(r).forEach((s) => {
        if (!byStage[s.stage]) byStage[s.stage] = { durations: [], worker: null };
        if (s.worker && s.worker !== "Sistema") byStage[s.stage].worker = s.worker;
        byStage[s.stage].durations.push(s.durationMs);
        totalTransitions++;

        if (s.worker && s.worker !== "Sistema" && techSet.has(norm(s.worker))) {
          const key = norm(s.worker);
          if (!byTech[key]) byTech[key] = { name: s.worker, orders: new Set<string>(), byStage: {} };
          byTech[key].orders.add(r.id);
          if (!byTech[key].byStage[s.stage]) byTech[key].byStage[s.stage] = [];
          byTech[key].byStage[s.stage].push(s.durationMs);
        }
      });

      // Tiempo en espera: desde la recepción hasta la derivación al técnico
      const espera = esperaDurationMs(r);
      if (espera && isFinite(espera.ms) && espera.ms >= 0 && espera.ms < 90 * 24 * 3600 * 1000) {
        if (!byStage["espera"]) byStage["espera"] = { durations: [], worker: null };
        byStage["espera"].durations.push(espera.ms);
        totalTransitions++;
      }
    });

    const techRows = Object.values(byTech)
      .map((t) => ({
        name: technicians.find((tc) => tc.trim().toLowerCase().replace(/^t[eé]c\.\s*/i, "") === t.name.toLowerCase().replace(/^t[eé]c\.\s*/i, "")) || t.name,
        orders: t.orders.size,
        byStage: t.byStage,
        avgTotal: Object.values(t.byStage).reduce(
          (sum, arr) => sum + (arr.reduce((a, b) => a + b, 0) / arr.length),
          0
        )
      }))
      .sort((a, b) => b.orders - a.orders || b.avgTotal - a.avgTotal);

    return { byStage, techRows, totalTransitions };
  }, [filteredRepairs]);

  const maxAvg = useMemo(() => {
    let max = 0;
    STAGES.forEach((s) => {
      const st = data.byStage[s.key];
      if (!st || !st.durations.length) return;
      const avg = st.durations.reduce((a, b) => a + b, 0) / st.durations.length;
      if (avg > max) max = avg;
    });
    return max;
  }, [data]);

  const applyGoals = () => {
    setGoals({ ...draftGoals });
    saveGoals(draftGoals);
    setEditingGoals(false);
  };

  const draftSet = (key: string, hours: string) => {
    const v = parseFloat(hours);
    setDraftGoals((g) => ({ ...g, [key]: isFinite(v) && v >= 0 ? v * HOUR : 0 }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/30 p-6 sm:p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500/5 rounded-full blur-2xl"></div>
        <div className="relative">
          <p className="text-cyan-400 text-[10px] font-mono font-bold tracking-[0.25em] uppercase mb-1">Control de Tiempos</p>
          <h1 className="font-display font-black text-2xl sm:text-3xl tracking-tight">Métricas de Tiempos por Proceso</h1>
          <p className="text-slate-400 text-xs mt-2 max-w-lg leading-relaxed">
            Tiempo promedio de cada etapa del taller comparado contra tu meta, y rendimiento por técnico, medido automáticamente con los registros de cada orden.
          </p>
        </div>
      </div>

      {/* FILTROS: PERÍODO + SEDE */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 shadow-xl">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Período</span>
            <PeriodFilter value={periodKey} onChange={setPeriodKey} showLabel={false} />
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sede</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedBranch(ALL_BRANCHES)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedBranch === ALL_BRANCHES
                      ? "bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                      : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-100"
                  }`}
                >
                  Todas
                </button>
                {BRANCHES.map((b) => (
                  <button
                    key={b}
                    onClick={() => setSelectedBranch(b)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedBranch === b
                        ? "bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                        : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-100"
                    }`}
                  >
                    {BRANCH_LABELS[b] || b}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* METAS POR ETAPA (solo admin) */}
      {canEdit && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-cyan-400" />
              <h2 className="font-display font-black text-sm text-slate-100 uppercase tracking-wider">Metas por Etapa (semáforo)</h2>
            </div>
            {!editingGoals ? (
              <button
                onClick={() => { setDraftGoals({ ...goals }); setEditingGoals(true); }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 transition-all"
              >
                Ajustar metas
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingGoals(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 border border-slate-700 hover:text-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={applyGoals}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  Guardar
                </button>
              </div>
            )}
          </div>
          <div className="p-4 sm:p-5">
            <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
              Define cuánto debería tomar cada etapa (en horas). Cada tarjeta de etapa se ilumina en verde (dentro de meta), ámbar (1.5x) o rojo (2x). Se guarda en este dispositivo; si abres desde otra tablet ajusta aquí los valores.
            </p>
            {!editingGoals ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {STAGE_KEYS.map((k) => (
                  <div key={k} className="bg-slate-950/60 rounded-xl border border-slate-800/80 px-3 py-2.5 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300">{STAGES.find((s) => s.key === k)?.label || k}</span>
                    <span className="text-[11px] font-mono font-bold text-cyan-400">{fmtDuration(goals[k] || 0)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {STAGE_KEYS.map((k) => (
                  <label key={k} className="bg-slate-950/60 rounded-xl border border-slate-800/80 px-3 py-2 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-slate-300">{STAGES.find((s) => s.key === k)?.label || k}</span>
                    <span className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        defaultValue={(draftGoals[k] || 0) / HOUR}
                        onChange={(e) => draftSet(k, e.target.value)}
                        className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-100 focus:outline-none focus:border-cyan-500"
                      />
                      <span className="text-[9px] text-slate-500 font-bold">h</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* NOTA DE RECOPILACIÓN DE DATOS */}
      <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 flex items-start space-x-3">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-200/90 leading-relaxed">
          <strong className="text-amber-300">Criterio de medición:</strong> solo se contabilizan etapas ya completadas (no se mide tiempo "en curso" para no sesgar los promedios);
          la etapa <strong className="text-amber-300">En Espera</strong> sí incluye los vehículos que aún no han sido asignados a un técnico, para que veas cuánto llevan aguardando.
          Si el promedio supera la meta fijada, la tarjeta se marca en <span className="text-amber-300 font-bold">ámbar</span> o <span className="text-rose-300 font-bold">rojo</span>.
        </p>
      </div>

      {/* RESÚMENES POR ETAPA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {STAGES.map((s) => {
          const st = data.byStage[s.key];
          const durations = st?.durations || [];
          const avg = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
          const med = median(durations);
          const min = durations.length ? Math.min(...durations) : 0;
          const max = durations.length ? Math.max(...durations) : 0;
          const pct = maxAvg > 0 ? (avg / maxAvg) * 100 : 0;
          const color = COLOR_SETS[s.color] || COLOR_SETS.cyan;
          const Icon = s.icon;
          const traffic = durations.length ? trafficColor(avg, goals[s.key] || 0) : null;
          const trafficStyle = traffic ? TRAFFIC_STYLES[traffic] : null;
          return (
            <div key={s.key} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-xl border ${color.chip}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`${color.chip?.split(" ")[0] || "bg-slate-800"} ${color.chip?.split(" ")[2] || "text-slate-400"} px-2 py-0.5 rounded-full text-[9px] font-mono font-bold`}>
                  {durations.length} completa{durations.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display font-bold text-sm text-slate-100 uppercase tracking-wider">{s.label}</h3>
                <span className="text-[9px] font-mono text-slate-600">meta {fmtDuration(goals[s.key] || 0)}</span>
              </div>
              <p className="mt-2">
                <span className="text-2xl font-black font-mono text-slate-50">{fmtDuration(avg)}</span>
                <span className="text-[10px] text-slate-500 ml-1.5 uppercase font-bold">promedio</span>
              </p>
              {trafficStyle && (
                <span className={`inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full text-[9px] font-bold border ${trafficStyle.chip}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${trafficStyle.dot}`}></span>
                    {trafficStyle.label}
                  </span>
              )}
              <div className="my-3">
                <div className="w-full bg-slate-950/80 h-1.5 rounded-full overflow-hidden border border-slate-800/50">
                  <div className={`${color.bar} h-full rounded-full transition-all duration-700`} style={{ width: `${pct}%` }}></div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1 text-center">
                <div>
                  <p className="text-[9px] text-slate-500 uppercase font-bold">Mediana</p>
                  <p className="text-[11px] font-mono font-bold text-slate-300">{fmtDuration(med)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-500 uppercase font-bold">Mínimo</p>
                  <p className="text-[11px] font-mono font-bold text-emerald-400">{fmtDuration(min)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-500 uppercase font-bold">Máximo</p>
                  <p className="text-[11px] font-mono font-bold text-rose-400">{fmtDuration(max)}</p>
                </div>
              </div>
            </div>
          );
        })}

        {/* Card resumen de flujo total */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-center">
          <div className="p-2.5 rounded-xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-400 w-fit mb-3">
            <Gauge className="w-4 h-4" />
          </div>
          <h3 className="font-display font-bold text-sm text-slate-100 uppercase tracking-wider">Flujo Completo</h3>
          <p className="text-2xl font-black font-mono text-slate-50 mt-2">
            {data.totalTransitions} transiciones
          </p>
          <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
            Etapas completadas con tiempo medido en el período. Con el filtro de período puedes cerrar el mes y comparar.
          </p>
        </div>
      </div>

      {/* TIEMPOS POR TÉCNICO */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Rendimiento por Técnico</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {data.techRows.length} técnicos con actividad
          </span>
        </div>

        {data.techRows.length === 0 ? (
          <div className="p-10 text-center text-slate-500 space-y-2">
            <Clock className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-xs">Aún no hay tiempos registrados en este período. Se irán acumulando conforme las órdenes avancen.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                  <th className="px-4 py-3 text-left font-bold">Técnico</th>
                  <th className="px-4 py-3 text-center font-bold">Órdenes</th>
                  {STAGES.map((s) => (
                    <th key={s.key} className="px-3 py-3 text-center font-bold">{s.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.techRows.map((t) => (
                  <tr key={t.name} className="border-b border-slate-800/60 hover:bg-slate-950/40 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-200 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 rounded-full bg-purple-500/15 border border-purple-500/25 text-purple-300 flex items-center justify-center text-[10px] font-black uppercase">
                          {t.name.charAt(0)}
                        </span>
                        <span>{t.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-black text-cyan-400">{t.orders}</td>
                    {STAGES.map((s) => {
                      const arr = t.byStage[s.key];
                      const avg = arr && arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
                      const count = arr?.length || 0;
                      return (
                        <td key={s.key} className="px-3 py-3 text-center">
                          <span className={`font-mono font-bold ${count ? "text-slate-200" : "text-slate-700"}`}>
                            {count ? fmtDuration(avg) : "—"}
                          </span>
                          {count > 0 && (
                            <span className="block text-[9px] text-slate-600 font-mono">({count})</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PIE DE EXPLICACIÓN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 flex items-start space-x-3">
          <Timer className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">¿Cómo se calcula?</p>
            <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
              Cada vez que una orden cambia de estado se registra fecha y hora. La duración de una etapa es el tiempo entre ese cambio y el siguiente; el promedio se calcula sobre las etapas ya completadas.
            </p>
          </div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 flex items-start space-x-3">
          <BarChart3 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">Uso sugerido</p>
            <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
              Usa el filtro de período para cerrar mes a mes. El semáforo compara el promedio contra tu meta: ámbar al 1.5x y rojo al 2x.
            </p>
          </div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 flex items-start space-x-3">
          <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">Control de técnicos</p>
            <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
              La tabla por técnico muestra cuánto tarda cada uno en diagnóstico y reparación, y cuántas órdenes atendió, por sede y por período.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}