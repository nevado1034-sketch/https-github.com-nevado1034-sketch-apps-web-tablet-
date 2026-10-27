import React, { useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  Hourglass,
  Inbox,
  Timer,
  TrendingUp,
  User,
  Wrench
} from "lucide-react";
import type { RepairItem, RepairStatus } from "../types";
import { BRANCH_LABELS, PERIOD_PRESETS, type PeriodKey } from "../data/metrics";
import {
  buildProductionJobs,
  formatWorkClock,
  formatWorkDuration,
  summarizeProduction,
  type ProductionJob
} from "../data/technicianProduction";

interface TechnicianProductionViewProps {
  repairs: RepairItem[];
  userName?: string;
  userRole?: string;
  userLocalKey?: string;
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  receptioned: { label: "Recibido", className: "bg-slate-800 text-slate-300 border-slate-700" },
  diagnosing: { label: "En diagnóstico", className: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30" },
  quoted: { label: "Presupuesto", className: "bg-amber-500/10 text-amber-300 border-amber-500/30" },
  paid: { label: "Pagado", className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
  repairing: { label: "En mesa", className: "bg-blue-500/10 text-blue-300 border-blue-500/30" },
  testing: { label: "En control de calidad", className: "bg-purple-500/10 text-purple-300 border-purple-500/30" },
  ready: { label: "Listo para entrega", className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
  delivered: { label: "Entregado", className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40" },
  cancelled: { label: "Cancelado", className: "bg-rose-500/10 text-rose-300 border-rose-500/30" }
};

const WORK_ACTION_LABEL: Record<string, string> = {
  inicio: "Inicio",
  pausa: "Pausa",
  reanudar: "Reanudación"
};

const WORK_ACTION_STYLE: Record<string, string> = {
  inicio: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  pausa: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  reanudar: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
};

function statusMeta(status: RepairStatus | string) {
  return STATUS_META[status] || { label: status, className: "bg-slate-800 text-slate-300 border-slate-700" };
}

function fmtDateTime(ms: number | null): string {
  if (ms === null) return "—";
  const d = new Date(ms);
  return `${d.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "2-digit" })} · ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function jobStatus(job: ProductionJob): { label: string; className: string } {
  return statusMeta(job.status);
}

function SummaryCard({
  icon,
  label,
  value,
  hint,
  accent
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  accent: string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-start gap-3">
      <div className={`p-2.5 rounded-xl border ${accent}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{label}</p>
        <p className="font-display font-black text-xl text-slate-100 leading-tight mt-0.5">{value}</p>
        <p className="text-[10px] text-slate-500 mt-0.5 truncate">{hint}</p>
      </div>
    </div>
  );
}

function JobDetail({ job, colSpan }: { job: ProductionJob; colSpan: number }) {
  return (
    <tr key={`${job.id}-detail`} className="bg-slate-950/60">
      <td colSpan={colSpan} className="px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Resumen del trabajo (solo lectura) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" />
              Detalle del trabajo
            </h4>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
              <dt className="text-slate-500">Orden</dt>
              <dd className="font-mono font-bold text-cyan-400 text-right">{job.id}</dd>
              <dt className="text-slate-500">Sede</dt>
              <dd className="text-slate-300 text-right">{BRANCH_LABELS[job.branch] || job.branch || "—"}</dd>
              <dt className="text-slate-500">Técnico</dt>
              <dd className="text-slate-300 text-right">{job.technician}</dd>
              <dt className="text-slate-500">Enviado</dt>
              <dd className="text-slate-300 text-right">{fmtDateTime(job.assignedAt)}</dd>
              <dt className="text-slate-500">Asignado por</dt>
              <dd className="text-slate-200 font-semibold text-right">{job.assignedBy}</dd>
              <dt className="text-slate-500">Tiempo neto</dt>
              <dd className="text-right font-mono font-bold text-slate-100">
                {job.hasTime ? formatWorkClock(job.netMs) : "Sin tiempo registrado"}
              </dd>
              <dt className="text-slate-500">Estado final</dt>
              <dd className="text-right">
                <span className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-bold ${jobStatus(job).className}`}>
                  {jobStatus(job).label}
                </span>
              </dd>
            </dl>
            <p className="text-[10px] text-slate-600 border-t border-slate-800 pt-2">
              Registro de solo lectura. El técnico no puede editar estos datos desde este panel.
            </p>
          </div>

          {/* Cronómetro: inicio, pausas con motivo y reanudaciones */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5" />
              Cronómetro del técnico
            </h4>
            {job.workLog.length === 0 ? (
              <p className="text-[11px] text-amber-400/90 flex items-center gap-1.5">
                <Hourglass className="w-3.5 h-3.5" />
                Sin tiempo registrado (no se usó el cronómetro).
              </p>
            ) : (
              <ul className="max-h-44 overflow-y-auto space-y-1 pr-1">
                {job.workLog.map((entry, index) => (
                  <li
                    key={`${job.id}-wl-${index}-${entry.at}`}
                    className="flex items-center justify-between gap-2 text-[10px] bg-slate-950/70 border border-slate-800 rounded-lg px-2 py-1.5"
                  >
                    <span className={`px-1.5 py-0.5 rounded border font-black uppercase tracking-wide ${WORK_ACTION_STYLE[entry.action] || "bg-slate-800 text-slate-300 border-slate-700"}`}>
                      {WORK_ACTION_LABEL[entry.action] || entry.action}
                    </span>
                    <span className="text-slate-400 flex-1 min-w-0 truncate">
                      {entry.reason || entry.user || ""}
                    </span>
                    <span className="font-mono text-slate-400 shrink-0">
                      {new Date(entry.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Historial completo de la orden */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2 lg:col-span-2">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Historial de la orden
            </h4>
            {job.history.length === 0 ? (
              <p className="text-[11px] text-slate-500">Sin eventos registrados.</p>
            ) : (
              <ol className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                {job.history.map((log) => (
                  <li key={`${job.id}-h-${log.id}`} className="flex items-start gap-2 text-[10px]">
                    <span className="w-1 h-1 rounded-full bg-cyan-400 shrink-0 mt-1.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="text-slate-300">{log.description}</span>
                        <span className="font-mono text-slate-500 shrink-0">{fmtDateTime(new Date(log.date).getTime())}</span>
                      </div>
                      <span className="text-slate-500">Operador: <strong className="text-slate-400">{log.user}</strong></span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function TechnicianProductionView({
  repairs,
  userName,
  userRole,
  userLocalKey
}: TechnicianProductionViewProps) {
  const [period, setPeriod] = useState<PeriodKey>("7d");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Refresca el tiempo de los trabajos que siguen en curso.
  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const isTech = userRole === "tecnico";
  const jobs = useMemo(
    () => buildProductionJobs(repairs, { userName, userRole, period, now }),
    [repairs, userName, userRole, period, now]
  );
  const summary = useMemo(() => summarizeProduction(jobs), [jobs]);
  const columnCount = isTech ? 8 : 9;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Cabecera del panel */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 border border-slate-800 rounded-2xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-black text-lg text-slate-100 tracking-tight">
                {isTech ? "Mis trabajos" : "Producción del taller"}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
                {isTech
                  ? "Solo lectura: revisa los trabajos que te enviaron, quién te los asignó y cuánto tiempo te tomaron."
                  : `Solo lectura: trabajos derivados a los técnicos${userLocalKey ? ` de ${BRANCH_LABELS[userLocalKey] || "la sede"}` : ""}, con su tiempo neto.`}
              </p>
            </div>
          </div>
          {userLocalKey && (
            <span className="self-start md:self-center text-[10px] font-black uppercase tracking-wider bg-slate-950 border border-slate-800 text-slate-400 px-3 py-1.5 rounded-full">
              {BRANCH_LABELS[userLocalKey] || userLocalKey}
            </span>
          )}
        </div>

        {/* Filtro de periodo */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="text-[9px] uppercase tracking-widest text-slate-500 mr-1 flex items-center gap-1">
            <CalendarDays className="w-3 h-3" /> Periodo
          </span>
          {PERIOD_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => setPeriod(preset.key)}
              className={
                "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition-all " +
                (period === preset.key
                  ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/40"
                  : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700")
              }
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Resumen del periodo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="Trabajos terminados"
          value={String(summary.finishedJobs)}
          hint={`${summary.totalJobs} trabajos en el periodo · ${summary.inProgressJobs} en curso`}
          accent="bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
        />
        <SummaryCard
          icon={<Timer className="w-5 h-5" />}
          label="Horas trabajadas"
          value={formatWorkDuration(summary.totalNetMs)}
          hint={
            summary.jobsWithTime > 0
              ? `${summary.jobsWithTime} trabajos con tiempo registrado`
              : "Aún no hay tiempos registrados"
          }
          accent="bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
        />
        <SummaryCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Promedio por trabajo"
          value={summary.jobsWithTime > 0 ? formatWorkDuration(summary.averageNetMs) : "—"}
          hint={
            summary.jobsWithoutTime > 0
              ? `${summary.jobsWithoutTime} sin tiempo registrado`
              : "Sobre trabajos con cronómetro"
          }
          accent="bg-violet-500/10 border-violet-500/30 text-violet-400"
        />
      </div>

      {/* Tabla de trabajos */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-300">Trabajos enviados</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-full">
            {jobs.length} registros
          </span>
        </div>

        {jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
            <Inbox className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-300">Sin trabajos en este periodo</p>
            <p className="text-xs text-slate-500 mt-1">
              {isTech
                ? "Cuando la asesora te derive un vehículo, aparecerá aquí con su fecha y su tiempo."
                : "No hay órdenes derivadas a técnicos en el periodo seleccionado."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-500 uppercase text-[9px] tracking-wider">
                <tr>
                  <th className="px-3 py-2.5 font-black">OT</th>
                  <th className="px-3 py-2.5 font-black">Cliente</th>
                  <th className="px-3 py-2.5 font-black">Vehículo</th>
                  <th className="px-3 py-2.5 font-black">Enviado</th>
                  <th className="px-3 py-2.5 font-black">Asignado por</th>
                  {!isTech && <th className="px-3 py-2.5 font-black">Técnico</th>}
                  <th className="px-3 py-2.5 font-black text-right">Tiempo neto</th>
                  <th className="px-3 py-2.5 font-black">Estado final</th>
                  <th className="px-2 py-2.5" aria-label="Detalle" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {jobs.map((job) => {
                  const meta = jobStatus(job);
                  const isOpen = expandedId === job.id;
                  return (
                    <React.Fragment key={job.id}>
                      <tr
                        onClick={() => setExpandedId(isOpen ? null : job.id)}
                        className={
                          "cursor-pointer transition-colors " +
                          (isOpen ? "bg-slate-800/50" : "hover:bg-slate-850/40")
                        }
                      >
                        <td className="px-3 py-2.5">
                          <span className="font-mono font-bold text-[11px] text-cyan-400">{job.id}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-semibold text-slate-200">{job.clientName}</span>
                          <span className="block text-[9px] text-slate-500">{BRANCH_LABELS[job.branch] || job.branch}</span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-300">{job.vehicleLabel}</td>
                        <td className="px-3 py-2.5 text-[10px] text-slate-400 font-mono whitespace-nowrap">
                          {fmtDateTime(job.assignedAt)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-300">
                            <User className="w-3 h-3 text-slate-500" />
                            {job.assignedBy}
                          </span>
                        </td>
                        {!isTech && (
                          <td className="px-3 py-2.5 text-[10px] font-semibold text-slate-300">{job.technician}</td>
                        )}
                        <td className="px-3 py-2.5 text-right">
                          {job.hasTime ? (
                            <span className="font-mono font-black text-[11px] text-slate-100">
                              {formatWorkClock(job.netMs)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400">
                              <Hourglass className="w-3 h-3" />
                              Sin tiempo registrado
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wide ${meta.className}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-slate-500">
                          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </td>
                      </tr>
                      {isOpen && <JobDetail job={job} colSpan={columnCount} />}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-4 py-2.5 border-t border-slate-800 bg-slate-950/40 text-[10px] text-slate-500">
          Vista de solo lectura. Toca una fila para ver el cronómetro y el historial completo del trabajo.
        </div>
      </div>
    </div>
  );
}
