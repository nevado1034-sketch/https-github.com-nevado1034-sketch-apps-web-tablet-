// Fuente única de cálculo para métricas del negocio y tiempos del taller.
// Todas las pantallas (Panel Admin, Tiempos por Proceso) deben usar estas
// funciones para que los números coincidan en toda la app.

import { RepairItem, HistoryLog } from "../types";

export const HOUR = 3600 * 1000;
export const DAY = 24 * HOUR;

export const BRANCH_LABELS: Record<string, string> = {
  lince_arenales: "San Isidro",
  surco: "Surco",
  san_borja: "San Borja",
  lince_leal: "Lince"
};

export const BRANCHES = ["lince_arenales", "surco", "san_borja", "lince_leal"] as const;

export const BRANCH_HEX: Record<string, string> = {
  lince_arenales: "#06b6d4",
  surco: "#a855f7",
  san_borja: "#f59e0b",
  lince_leal: "#14b8a6"
};

export function fmtMoney(n: number): string {
  return `S/ ${Math.round(n || 0).toLocaleString()}`;
}

export function fmtDuration(ms: number): string {
  if (!isFinite(ms) || ms <= 0) return "—";
  const min = Math.floor(ms / 60000);
  const days = Math.floor(min / 1440);
  const hours = Math.floor((min % 1440) / 60);
  const mins = Math.round(min % 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m`;
  return `${Math.max(1, Math.floor(ms / 1000))}s`;
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const half = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[half] : (sorted[half - 1] + sorted[half]) / 2;
}

// ── PERÍODOS ────────────────────────────────────────────────────────────────
export type PeriodKey = "hoy" | "7d" | "30d" | "todo";

export const PERIOD_PRESETS: Array<{ key: PeriodKey; label: string }> = [
  { key: "hoy", label: "Hoy" },
  { key: "7d", label: "7 días" },
  { key: "30d", label: "30 días" },
  { key: "todo", label: "Todo" }
];

export interface PeriodRange {
  from: number;
  to: number;
}

export function periodRange(key: PeriodKey, now = Date.now()): PeriodRange {
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  switch (key) {
    case "hoy":
      return { from: startOfDay.getTime(), to: now };
    case "7d":
      return { from: startOfDay.getTime() - 6 * DAY, to: now };
    case "30d":
      return { from: startOfDay.getTime() - 29 * DAY, to: now };
    default:
      return { from: 0, to: now };
  }
}

function tsOf(v: string | undefined): number {
  if (!v) return NaN;
  const t = new Date(v).getTime();
  return isFinite(t) ? t : NaN;
}

// ¿La orden fue RECIBIDA dentro del período? (para métricas de tiempos/proceso)
export function inReceptionPeriod(r: RepairItem, range: PeriodRange): boolean {
  if (range.from === 0) return true;
  const t = tsOf(r.receptionDate || r.serviceStartedAt);
  if (!isFinite(t)) return false;
  return t >= range.from && t <= range.to;
}

export function inTsPeriod(t: number, range: PeriodRange): boolean {
  if (!isFinite(t)) return false;
  if (range.from === 0) return true;
  return t >= range.from && t <= range.to;
}

function deliveryDate(r: RepairItem): Date | null {
  if (r.deliveredAt) {
    const d = new Date(r.deliveredAt);
    if (isFinite(d.getTime())) return d;
  }
  const logs = (r.historyLog || []).filter((l) => l.status === "delivered" && l.date);
  if (logs.length) {
    const d = new Date(logs[logs.length - 1].date);
    if (isFinite(d.getTime())) return d;
  }
  const rc = new Date(r.receptionDate || "");
  return isFinite(rc.getTime()) ? rc : null;
}

// Fecha de entrega (timestamp) de una orden entregada.
export function deliveryTs(r: RepairItem): number | null {
  if (r.status !== "delivered") return null;
  const d = deliveryDate(r);
  return d ? d.getTime() : null;
}

// ¿La orden fue ENTREGADA dentro del período? (para métricas de ingresos)
export function inDeliveryPeriod(r: RepairItem, range: PeriodRange): boolean {
  const t = deliveryTs(r);
  return t !== null && inTsPeriod(t, range);
}

// ── INGRESOS (definición real: SOLO órdenes ENTREGADAS) ────────────────────
export function orderRevenue(r: RepairItem): number {
  return r.status === "delivered" ? (r.actualCost || r.estimatedCost || 0) : 0;
}

export function sumRevenue(orders: RepairItem[]): number {
  return orders.reduce((s, r) => s + orderRevenue(r), 0);
}

export interface PipelineCounts {
  receptioned: number;
  diagnosing: number;
  quoted: number;
  paid: number;
  repairing: number;
  testing: number;
  ready: number;
  delivered: number;
}

export function pipelineCounts(orders: RepairItem[]): PipelineCounts {
  const c: PipelineCounts = {
    receptioned: 0,
    diagnosing: 0,
    quoted: 0,
    paid: 0,
    repairing: 0,
    testing: 0,
    ready: 0,
    delivered: 0
  };
  orders.forEach((r) => {
    if (r.status in c) c[r.status]++;
  });
  return c;
}

// ── METAS POR ETAPA (h en el talller) ───────────────────────────────────────
export const STAGE_KEYS = [
  "receptioned",
  "espera",
  "diagnosing",
  "quoted",
  "paid",
  "repairing",
  "testing",
  "ready"
] as const;

export type Goals = Record<string, number>; // en milisegundos

export const defaultGoals: Goals = {
  receptioned: 0.5 * HOUR,
  espera: 2 * HOUR,
  diagnosing: 2 * HOUR,
  quoted: 1 * HOUR,
  paid: 1 * HOUR,
  repairing: 4 * HOUR,
  testing: 1 * HOUR,
  ready: 1 * HOUR
};

const GOALS_KEY = "litio_metas";

export function loadGoals(): Goals {
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return { ...defaultGoals, ...parsed };
      }
    }
  } catch {
    /* ignore */
  }
  return { ...defaultGoals };
}

export function saveGoals(g: Goals): void {
  try {
    localStorage.setItem(GOALS_KEY, JSON.stringify(g));
  } catch {
    /* ignore */
  }
}

// Semáforo vs meta: dentro / atención (>1.5x) / crítico (>2x)
export type TrafficColor = "emerald" | "amber" | "rose";

export function trafficColor(avgMs: number, goalMs: number): TrafficColor {
  if (!(goalMs > 0)) return "amber";
  if (avgMs <= goalMs) return "emerald";
  if (avgMs <= goalMs * 1.5) return "amber";
  return "rose";
}

// ── CRONOLOGÍA DE UNA ORDEN (fuente única, también usada por Tiempos) ──────
export interface TimelineEntry {
  status: string;
  date: number;
  user: string;
}

export function buildTimeline(r: RepairItem): TimelineEntry[] {
  const timeline: TimelineEntry[] = [];
  const startMs = tsOf(r.receptionDate || r.serviceStartedAt);
  if (isFinite(startMs) && startMs > 0) {
    timeline.push({ status: "receptioned", date: startMs, user: "Sistema" });
  }
  const logs: HistoryLog[] = [...(r.historyLog || [])]
    .filter((l) => l && l.status && l.date)
    .filter((l) => !/derivad[oa]\s+al\s+t[eé]cnico/i.test(l.description || ""))
    .sort((a, b) => tsOf(a.date) - tsOf(b.date));
  logs.forEach((l) => {
    const t = tsOf(l.date);
    if (isFinite(t)) {
      timeline.push({ status: l.status, date: t, user: (l.user || "").trim() || "Sistema" });
    }
  });
  // Elimina entradas consecutivas con el mismo estado para no distorsionar
  // la duración real de la etapa (p.ej. la derivación mantiene "Recepción").
  if (timeline.length > 1) {
    const deduped = [timeline[0]];
    for (let i = 1; i < timeline.length; i++) {
      if (timeline[i].status !== timeline[i - 1].status) deduped.push(timeline[i]);
    }
    timeline.length = 0;
    timeline.push(...deduped);
  }
  return timeline;
}

export interface StageTiming {
  stage: string;
  durationMs: number;
  worker: string;
}

// Duración de cada etapa COMPLETADA de una orden (desde su historyLog).
export function stageTimings(r: RepairItem): StageTiming[] {
  const timeline = buildTimeline(r);
  if (timeline.length < 2) return [];
  const out: StageTiming[] = [];
  for (let i = 1; i < timeline.length; i++) {
    const delta = timeline[i].date - timeline[i - 1].date;
    if (delta >= 0 && delta < 90 * DAY) {
      // La etapa previa fue completada por quien hizo la transición actual.
      out.push({ stage: timeline[i - 1].status, durationMs: delta, worker: timeline[i].user });
    }
  }
  return out;
}

// Tiempo de la etapa "En Espera" (recepción → derivación al técnico).
// Si la orden sigue sin ser asignada, devuelve lo que lleva esperando (ongoing).
export function esperaDurationMs(
  r: RepairItem,
  now = Date.now()
): { ms: number; ongoing: boolean } | null {
  const startMs = tsOf(r.receptionDate || r.serviceStartedAt);
  if (!isFinite(startMs) || startMs <= 0) return null;
  let esperaEnd: number | null = null;
  const deriv = (r.historyLog || []).find((l) =>
    (l.description || "").toLowerCase().includes("derivado al t")
  );
  if (deriv && deriv.date) {
    const d = tsOf(deriv.date);
    if (isFinite(d)) esperaEnd = d;
  } else if (r.assignedTech) {
    const firstLog = [...(r.historyLog || [])]
      .filter((l) => l && l.date)
      .sort((a, b) => tsOf(a.date) - tsOf(b.date))[0];
    if (firstLog) {
      const d = tsOf(firstLog.date);
      if (isFinite(d)) esperaEnd = d;
    }
  }
  const end = expect(esperaEnd, now);
  const ms = end - startMs;
  if (ms < 0 || ms >= 90 * DAY) return null;
  return { ms, ongoing: esperaEnd == null };
}

function expect<T>(v: T | null, fallback: T): T {
  return v == null ? fallback : v;
}

// ── ESTADO EN VIVO DE UNA ORDEN ACTIVA ─────────────────────────────────────
export interface LiveStageInfo {
  stage: string;
  startedAt: number;
  elapsedMs: number;
}

// Etapa actual de una orden no entregada y cuánto lleva en ella.
// "En Espera" aplica a órdenes recibidas aún sin técnico asignado.
export function currentLiveStage(r: RepairItem, now = Date.now()): LiveStageInfo | null {
  if (r.status === "delivered") return null;
  const timeline = buildTimeline(r);
  const last = timeline[timeline.length - 1];
  let stage = last ? last.status : r.status;
  let startedAt = last ? last.date : now;
  if (!isFinite(startedAt) || startedAt <= 0) {
    const startMs = tsOf(r.receptionDate || r.serviceStartedAt);
    startedAt = isFinite(startMs) && startMs > 0 ? startMs : now;
  }
  // El estado "receptioned" no se persiste en el flujo real (la tablet ingresa
  // directo a "diagnosing"). Se normaliza a "diagnosing".
  if (stage === "receptioned") stage = "diagnosing";
  // "En Espera": la orden fue recibida (o entró directa a diagnóstico) pero aún
  // no tiene técnico asignado. Una vez derivada, la etapa pasa a Diagnóstico.
  if (stage === "diagnosing" && !r.assignedTech) {
    stage = "espera";
  }
  return { stage, startedAt, elapsedMs: Math.max(0, now - startedAt) };
}

// Orden aproximada del flujo para tableros.
// Nota: "receptioned" no es una etapa persistente (la tablet ingresa directo a
// "diagnosing"), por eso el tablero en vivo arranca en "espera".
export const LIVE_STAGE_ORDER = [
  "espera",
  "diagnosing",
  "quoted",
  "paid",
  "repairing",
  "testing",
  "ready"
] as const;

export const STAGE_LABELS: Record<string, string> = {
  receptioned: "Recepción",
  espera: "En Espera",
  diagnosing: "Diagnóstico",
  quoted: "Presupuesto",
  paid: "Pagado",
  repairing: "Reparación",
  testing: "Control Calidad",
  ready: "Listo / Entrega",
  delivered: "Entregados"
};

export const STAGE_COLOR: Record<string, string> = {
  receptioned: "cyan",
  espera: "rose",
  diagnosing: "purple",
  quoted: "amber",
  paid: "emerald",
  repairing: "blue",
  testing: "pink",
  ready: "teal"
};

// ── TENDENCIA MENSUAL DE INGRESOS (por fecha de entrega) ────────────────────
export interface MonthBucket {
  key: string;
  label: string;
  revenue: number;
  count: number;
}

export function monthlyTrend(orders: RepairItem[], months = 6, now = Date.now()): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  const d = new Date(now);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  for (let i = months - 1; i >= 0; i--) {
    const b = new Date(d);
    b.setMonth(d.getMonth() - i);
    buckets.push({
      key: `${b.getFullYear()}-${String(b.getMonth() + 1).padStart(2, "0")}`,
      label: b.toLocaleString("es", { month: "short" }),
      revenue: 0,
      count: 0
    });
  }
  orders.forEach((r) => {
    if (r.status !== "delivered") return;
    const m = deliveryDate(r);
    if (!m) return;
    const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
    const bucket = buckets.find((b) => b.key === key);
    if (bucket) {
      bucket.revenue += orderRevenue(r);
      bucket.count++;
    }
  });
  return buckets;
}