// Cálculos de producción del técnico (solo lectura).
//
// Este módulo es la fuente única para:
//  - comparar nombres de técnicos sin falsos positivos ("Ana" ≠ "Susana")
//  - calcular el tiempo neto del cronómetro, incluyendo el cierre automático
//    cuando la orden deja de estar en la mesa del técnico
//  - resolver quién envió (derivó) cada trabajo y cuándo
//  - construir la tabla y el resumen del panel "Mis trabajos"
//
// No escribe nada en Firestore ni modifica la orden: solo lee sus datos.

import type { HistoryLog, RepairItem, RepairStatus, WorkLogEntry } from "../types";
import { periodRange, type PeriodKey } from "./metrics";

// Estados en los que el trabajo ya salió de la mesa del técnico. En todos
// ellos el cronómetro debe cerrarse automáticamente para no inflar el tiempo.
export const CLOSED_STATUSES: RepairStatus[] = ["testing", "ready", "delivered", "cancelled"];

// Estados en los que el vehículo ya no está siendo trabajado por el técnico,
// aunque la orden siga abierta (esperando presupuesto, pago o calidad).
// El cronómetro debe pausarse también aquí: si el técnico olvida pausar,
// el tiempo de espera del cliente no debe contarse como producción.
export const TIMER_STOP_STATUSES: RepairStatus[] = [
  "quoted",
  "paid",
  ...CLOSED_STATUSES
];

// Estados que cuentan como "trabajo terminado" para el resumen de producción.
// "cancelled" se conserva en la tabla (y sus horas), pero no como trabajo logrado.
export const FINISHED_STATUSES: RepairStatus[] = ["testing", "ready", "delivered"];

const ASSIGNMENT_LOG_RE = /derivad[oa]\s+al\s+t[eé]cnico/i;

function ts(value: string | undefined | null): number {
  if (!value) return NaN;
  const t = new Date(value).getTime();
  return isFinite(t) ? t : NaN;
}

function validTs(value: string | undefined | null): number | null {
  const t = ts(value);
  return isFinite(t) ? t : null;
}

/**
 * Normaliza un nombre de técnico para compararlo de forma EXACTA:
 *  - quita tildes y mayúsculas
 *  - quita el prefijo "Téc." / "Tec."
 *  - colapsa espacios
 *
 * No hace coincidencias por subcadena: "Ana" y "Susana" quedan distintas.
 */
export function normalizeTechName(value?: string | null): string {
  const base = (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  return base.replace(/^tec\.?(?:\s+|$)/, "").trim();
}

/** ¿Los dos nombres corresponden al mismo técnico? (comparación exacta) */
export function sameTechnician(a?: string | null, b?: string | null): boolean {
  const left = normalizeTechName(a);
  const right = normalizeTechName(b);
  return !!left && left === right;
}

/**
 * Regla de visibilidad de la mesa de trabajo:
 *  - técnico: solo las órdenes derivadas exactamente a él
 *  - jefa/admin/otros: todas (la sede ya viene filtrada desde App)
 */
export function matchesAssignedTechnician(
  assignedTech: string | undefined,
  userName: string | undefined,
  userRole: string | undefined
): boolean {
  if (userRole !== "tecnico") return true;
  return sameTechnician(assignedTech, userName);
}

/** ¿El estado ya cerró el trabajo en la mesa del técnico? */
export function isClosedStatus(status: RepairStatus | string | undefined): boolean {
  return !!status && (CLOSED_STATUSES as string[]).includes(status);
}

/**
 * ¿El cronómetro debe estar detenido en este estado?
 * Incluye presupuesto y pago: el vehículo ya no está en manos del técnico
 * mientras el cliente decide o paga. No incluye los estados "en curso".
 */
export function shouldStopTimer(status: RepairStatus | string | undefined): boolean {
  return !!status && (TIMER_STOP_STATUSES as string[]).includes(status);
}

/** ¿Cuenta como trabajo terminado para el resumen? */
export function isFinishedStatus(status: RepairStatus | string | undefined): boolean {
  return !!status && (FINISHED_STATUSES as string[]).includes(status);
}

function assignmentLogs(r: RepairItem): HistoryLog[] {
  return (r.historyLog || [])
    .filter((log) => ASSIGNMENT_LOG_RE.test(log.description || ""))
    .filter((log) => validTs(log.date) !== null)
    .sort((a, b) => (validTs(a.date) || 0) - (validTs(b.date) || 0));
}

/**
 * Quién envió el trabajo al técnico y cuándo.
 * Prioriza el campo `assignedByName`; si no existe (órdenes antiguas), usa
 * el operador del último evento "Derivado al técnico ...".
 */
export function assignmentInfo(r: RepairItem): { at: number | null; by: string } {
  const logs = assignmentLogs(r);
  const last = logs.length ? logs[logs.length - 1] : null;
  const explicitBy = (r.assignedByName || "").trim();
  const by = explicitBy || (last?.user || "").trim() || "—";
  const at =
    validTs(last?.date) ??
    validTs(r.serviceStartedAt) ??
    validTs(r.receptionDate) ??
    null;
  return { at, by };
}

/**
 * Momento en que la orden dejó la mesa del técnico (para topear el tiempo).
 * Usa la marca MÁS RECIENTE del estado actual: si la orden pasó dos veces por
 * Control de Calidad, el cierre válido es el último ingreso, no el primero.
 * Si no hay historial confiable, cae a la última acción del cronómetro.
 */
export function workClosedAt(r: RepairItem): number | null {
  if (!shouldStopTimer(r.status)) return null;
  const candidates: number[] = [];

  const delivered = validTs(r.deliveredAt);
  if (delivered !== null) candidates.push(delivered);

  const statusTimes = (r.historyLog || [])
    .filter((log) => log.status === r.status)
    .map((log) => validTs(log.date))
    .filter((t): t is number => t !== null);
  if (statusTimes.length) candidates.push(Math.max(...statusTimes));

  if (!candidates.length) {
    const workTimes = (r.workLog || [])
      .map((entry) => validTs(entry.at))
      .filter((t): t is number => t !== null);
    if (workTimes.length) candidates.push(Math.max(...workTimes));
  }

  return candidates.length ? Math.min(...candidates) : null;
}

/**
 * Tiempo neto de trabajo (pausas excluidas).
 * - Ignora "inicio"/"reanudar" repetidos mientras el cronómetro ya corre,
 *   para no perder el tramo anterior si se pulsa dos veces.
 * - Si la orden está cerrada, el tramo abierto se corta en `closedAt`
 *   (nunca se cuenta tiempo después de enviarla a Control de Calidad).
 */
export function computeNetWorkMs(
  workLog: WorkLogEntry[] | undefined,
  now: number,
  closedAt?: number | null
): number {
  const entries = (workLog || [])
    .map((entry) => ({ action: entry.action, t: ts(entry.at) }))
    .filter((entry) => isFinite(entry.t))
    .sort((a, b) => a.t - b.t);

  let runningFrom: number | null = null;
  let total = 0;

  for (const entry of entries) {
    if (entry.action === "inicio" || entry.action === "reanudar") {
      if (runningFrom === null) runningFrom = entry.t;
    } else if (entry.action === "pausa" && runningFrom !== null) {
      total += Math.max(0, entry.t - runningFrom);
      runningFrom = null;
    }
  }

  if (runningFrom !== null) {
    const end =
      closedAt !== null && closedAt !== undefined && isFinite(closedAt)
        ? Math.min(now, Math.max(closedAt, runningFrom))
        : now;
    total += Math.max(0, end - runningFrom);
  }

  return Math.max(0, total);
}

/** ¿El cronómetro está actualmente corriendo? */
export function isWorkLogRunning(workLog: WorkLogEntry[] | undefined): boolean {
  const entries = (workLog || []).filter((entry) => isFinite(ts(entry.at)));
  const last = entries.length ? entries[entries.length - 1] : null;
  return !!last && (last.action === "inicio" || last.action === "reanudar");
}

/** ¿Se usó el cronómetro al menos una vez? (inicio o reanudación) */
export function hasRegisteredWorkTime(workLog: WorkLogEntry[] | undefined): boolean {
  return (workLog || []).some(
    (entry) => entry.action === "inicio" || entry.action === "reanudar"
  );
}

/**
 * Añade una pausa de cierre si el cronómetro quedó corriendo.
 * Devuelve `null` cuando no hay nada que cerrar (no se usó el cronómetro o
 * ya estaba en pausa), para no escribir datos innecesarios.
 */
export function closeRunningWorkLog(
  workLog: WorkLogEntry[] | undefined,
  at: string,
  user?: string,
  reason?: string
): WorkLogEntry[] | null {
  if (!isWorkLogRunning(workLog)) return null;
  const entry: WorkLogEntry = {
    action: "pausa",
    at,
    ...(user ? { user } : {}),
    ...(reason ? { reason } : {})
  };
  return [...(workLog || []), entry];
}

/** Última actividad registrada de la orden (historial o cronómetro). */
export function lastActivityTs(r: RepairItem): number | null {
  const times: number[] = [];
  for (const log of r.historyLog || []) {
    const t = validTs(log.date);
    if (t !== null) times.push(t);
  }
  for (const entry of r.workLog || []) {
    const t = validTs(entry.at);
    if (t !== null) times.push(t);
  }
  const delivered = validTs(r.deliveredAt);
  if (delivered !== null) times.push(delivered);
  const reception = validTs(r.receptionDate);
  if (reception !== null) times.push(reception);
  return times.length ? Math.max(...times) : null;
}

export interface ProductionJob {
  id: string;
  clientName: string;
  vehicleLabel: string;
  branch: string;
  status: RepairStatus;
  technician: string;
  assignedAt: number | null;
  assignedBy: string;
  netMs: number;
  hasTime: boolean;
  finished: boolean;
  closed: boolean;
  lastActivity: number | null;
  history: HistoryLog[];
  workLog: WorkLogEntry[];
}

export interface ProductionJobOptions {
  userName?: string;
  userRole?: string;
  period: PeriodKey;
  now?: number;
}

export function buildProductionJob(r: RepairItem, now = Date.now()): ProductionJob {
  const assignment = assignmentInfo(r);
  const closedAt = workClosedAt(r);
  return {
    id: r.id,
    clientName: r.client?.name || "—",
    vehicleLabel: `${r.vehicle?.brand || ""} ${r.vehicle?.model || ""}`.trim() || "—",
    branch: r.workshopBranch || "",
    status: r.status,
    technician: (r.assignedTech || "").trim() || "—",
    assignedAt: assignment.at,
    assignedBy: assignment.by,
    netMs: computeNetWorkMs(r.workLog, now, closedAt),
    hasTime: hasRegisteredWorkTime(r.workLog),
    finished: isFinishedStatus(r.status),
    closed: isClosedStatus(r.status),
    lastActivity: lastActivityTs(r),
    history: [...(r.historyLog || [])].sort(
      (a, b) => (validTs(b.date) || 0) - (validTs(a.date) || 0)
    ),
    workLog: [...(r.workLog || [])].sort(
      (a, b) => (validTs(a.at) || 0) - (validTs(b.at) || 0)
    )
  };
}

/**
 * Trabajos que la asesora envió al técnico dentro del periodo elegido.
 * Para jefas/admin se incluyen los de toda la sede (ya filtrada en App).
 * Se ordenan del envío más reciente al más antiguo.
 */
export function buildProductionJobs(
  repairs: RepairItem[],
  { userName, userRole, period, now = Date.now() }: ProductionJobOptions
): ProductionJob[] {
  const range = periodRange(period, now);
  const isTech = userRole === "tecnico";

  return repairs
    .filter((r) => !!normalizeTechName(r.assignedTech))
    .filter((r) => !isTech || sameTechnician(r.assignedTech, userName))
    .map((r) => buildProductionJob(r, now))
    .filter((job) => {
      if (period === "todo") return true;
      if (job.assignedAt === null) return false;
      return job.assignedAt >= range.from && job.assignedAt <= range.to;
    })
    .sort((a, b) => {
      const left = a.assignedAt ?? a.lastActivity ?? 0;
      const right = b.assignedAt ?? b.lastActivity ?? 0;
      return right - left;
    });
}

export interface ProductionSummary {
  totalJobs: number;
  finishedJobs: number;
  closedJobs: number;
  inProgressJobs: number;
  jobsWithTime: number;
  jobsWithoutTime: number;
  totalNetMs: number;
  averageNetMs: number;
}

/**
 * Resumen del periodo:
 *  - trabajos terminados: enviados a Control de Calidad, listos o entregados
 *  - horas trabajadas: suma del tiempo neto de todos los trabajos del periodo
 *  - promedio: horas / trabajos que sí usaron el cronómetro
 */
export function summarizeProduction(jobs: ProductionJob[]): ProductionSummary {
  const totalNetMs = jobs.reduce((sum, job) => sum + job.netMs, 0);
  const jobsWithTime = jobs.filter((job) => job.hasTime).length;
  const finishedJobs = jobs.filter((job) => job.finished).length;
  const closedJobs = jobs.filter((job) => job.closed).length;
  return {
    totalJobs: jobs.length,
    finishedJobs,
    closedJobs,
    inProgressJobs: jobs.length - closedJobs,
    jobsWithTime,
    jobsWithoutTime: jobs.length - jobsWithTime,
    totalNetMs,
    averageNetMs: jobsWithTime ? Math.round(totalNetMs / jobsWithTime) : 0
  };
}

/** Formato HH:MM:SS para el cronómetro en vivo. */
export function formatWorkClock(ms: number): string {
  const totalSec = Math.floor(Math.max(0, ms) / 1000);
  const hh = String(Math.floor(totalSec / 3600)).padStart(2, "0");
  const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

/** Formato humano compacto (ej. "2h 15m") para tablas y tarjetas. */
export function formatWorkDuration(ms: number): string {
  if (!isFinite(ms) || ms <= 0) return "0m";
  const minutes = Math.floor(ms / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m`;
  return `${Math.max(1, Math.floor(ms / 1000))}s`;
}
