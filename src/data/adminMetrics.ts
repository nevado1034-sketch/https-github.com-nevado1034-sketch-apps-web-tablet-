// Métricas del panel del administrador (solo lectura).
//
// Correcciones de la Fase 1:
//  - Horas de técnicos = tiempo NETO del cronómetro (no recepción → entrega).
//  - Sede del técnico tomada de la configuración de accesos (sin nombres fijos).
//  - Asesoras (jefa / jefas) excluidas del ranking de técnicos.
//  - Órdenes canceladas fuera de "activas".
//  - Método de pago faltante = "sin registrar" (no se asume efectivo).

import type { RepairItem } from "../types";
import type { AuthConfig } from "../auth";
import { computeNetWorkMs, hasRegisteredWorkTime, isFinishedStatus, normalizeTechName, workClosedAt } from "./technicianProduction";
import { pickupStatus } from "./pickupNotice";

export interface TimeRange {
  from: number;
  to: number;
}

export interface TechnicianStat {
  name: string;
  sede: string;
  /** Órdenes del período asignadas al técnico. */
  ot: number;
  /** De esas, enviadas a Calidad, listas o entregadas. */
  terminadas: number;
  express: number;
  /** Tiempo neto del cronómetro (pausas y esperas excluidas). */
  netMs: number;
  /** Órdenes en las que se usó el cronómetro. */
  conCronometro: number;
  /** Veces que Control de Calidad devolvió un trabajo a la mesa. */
  retrabajos: number;
  /** Órdenes con un tramo de cronómetro sospechosamente largo (probable olvido). */
  sospechosos: number;
}

/** Un tramo continuo de cronómetro más largo que esto se considera sospechoso. */
export const SUSPICIOUS_SEGMENT_MS = 12 * 60 * 60 * 1000;

function logTs(date?: string): number {
  const t = new Date(date || "").getTime();
  return isFinite(t) ? t : NaN;
}

/** Veces que la orden pasó de Control de Calidad (testing) de vuelta a la mesa (repairing). */
export function reworkCount(r: Pick<RepairItem, "historyLog">): number {
  const logs = (r.historyLog || [])
    .filter((l) => isFinite(logTs(l.date)) && l.status)
    .sort((a, b) => logTs(a.date) - logTs(b.date));
  let count = 0;
  let prev: string | null = null;
  for (const l of logs) {
    if (l.status === prev) continue;
    if (prev === "testing" && l.status === "repairing") count++;
    prev = l.status;
  }
  return count;
}

/**
 * ¿Algún tramo del cronómetro duró más de 12 h seguidas? Suele indicar que el
 * técnico olvidó pausar. Solo se señala; los datos no se modifican.
 */
export function hasSuspiciousTimer(r: RepairItem, now = Date.now(), thresholdMs = SUSPICIOUS_SEGMENT_MS): boolean {
  const entries = (r.workLog || [])
    .map((e) => ({ action: e.action, t: logTs(e.at) }))
    .filter((e) => isFinite(e.t))
    .sort((a, b) => a.t - b.t);
  let start: number | null = null;
  for (const e of entries) {
    if (e.action === "inicio" || e.action === "reanudar") {
      if (start === null) start = e.t;
    } else if (e.action === "pausa" && start !== null) {
      if (e.t - start > thresholdMs) return true;
      start = null;
    }
  }
  if (start !== null) {
    const closed = workClosedAt(r);
    const end = closed !== null ? Math.min(now, Math.max(closed, start)) : now;
    if (end - start > thresholdMs) return true;
  }
  return false;
}

/** Una orden sigue abierta en el taller (no entregada ni cancelada). */
export function isActiveOrder(r: Pick<RepairItem, "status">): boolean {
  return r.status !== "delivered" && r.status !== "cancelled";
}

export const UNREGISTERED_METHOD = "sin_registrar";

export function paymentMethodOf(method?: string | null): string {
  const m = String(method || "").trim();
  return m || UNREGISTERED_METHOD;
}

function cleanName(raw?: string | null): string {
  return String(raw || "").replace(/^t[eé]c\.?\s*/i, "").replace(/\s+/g, " ").trim();
}

/** Técnico responsable de la orden: el derivado a la mesa, si no el que figura en la OT. */
export function orderTechnician(r: Pick<RepairItem, "assignedTech" | "technicianName" | "diagnosisTech">): string {
  return cleanName(r.assignedTech) || cleanName(r.technicianName) || cleanName(r.diagnosisTech);
}

interface StaffIndex {
  techSede: Map<string, { name: string; sede: string }>;
  advisors: Set<string>;
}

/**
 * Resuelve un nombre corto (ej. "Gustavo" en un recibo Express) al técnico
 * completo de la configuración ("Gustavo Soto"), SOLO si en esa sede hay un
 * único técnico con ese primer nombre. Si hay dudas, se deja como está.
 */
function resolveShortName(key: string, sede: string, staff: StaffIndex): string | null {
  if (!key || key.includes(" ") || !sede) return null;
  const matches = [...staff.techSede.entries()].filter(([full, info]) => info.sede === sede && full.split(" ")[0] === key);
  return matches.length === 1 ? matches[0][0] : null;
}

export function buildStaffIndex(config: AuthConfig | null | undefined): StaffIndex {
  const techSede = new Map<string, { name: string; sede: string }>();
  const advisors = new Set<string>();
  for (const l of config?.locales || []) {
    for (const t of l?.tecnicos || []) {
      const key = normalizeTechName(t?.name);
      if (key) techSede.set(key, { name: cleanName(t.name), sede: l.key });
    }
    const jefas = [l?.jefa, ...(l?.jefas || [])];
    for (const j of jefas) {
      const key = normalizeTechName(j?.name);
      if (key) advisors.add(key);
    }
  }
  return { techSede, advisors };
}

// ─────────────────────────── ASESORAS POR SEDE ───────────────────────────

export interface BranchAdvisorStat {
  branch: string;
  /** Vehículos ingresados (recepción) en el período. */
  recepciones: number;
  /** Órdenes que pasaron a Presupuesto en el período. */
  presupuestos: number;
  /** Órdenes que pasaron a Pagado (presupuesto aprobado) en el período. */
  aprobados: number;
  /** aprobados / presupuestos (0–1); null si no hubo presupuestos. */
  tasaAprobacion: number | null;
  entregas: number;
  cancelaciones: number;
  expressCount: number;
  expressTotal: number;
  /** Avisos de recojo por WhatsApp enviados en el período. */
  avisosRecojo: number;
  /** Situación actual: vehículos listos sin ningún aviso de recojo. */
  listosSinAviso: number;
  /** Situación actual: vehículos listos con almacenaje corriendo (más de 10 días desde el primer aviso). */
  listosConAlmacenaje: number;
}

const AFTER_BUDGET = new Set(["paid", "repairing", "testing", "ready", "delivered"]);

/**
 * Momento en que se aprobó el presupuesto:
 *  - si el cliente respondió "aprobado" en su enlace, esa fecha;
 *  - si no, cuando la orden avanzó desde Presupuesto (a pago, reparación,
 *    calidad, listo o entregado), que es como se aprueba por teléfono o en tienda.
 */
export function budgetApprovedAt(r: Pick<RepairItem, "approvalStatus" | "approvalResponseAt" | "historyLog">): number | null {
  if (r.approvalStatus === "aprobado") {
    const t = logTs(r.approvalResponseAt);
    if (isFinite(t)) return t;
  }
  const logs = (r.historyLog || [])
    .filter((l) => isFinite(logTs(l.date)))
    .sort((a, b) => logTs(a.date) - logTs(b.date));
  const quoted = logs.find((l) => l.status === "quoted");
  if (!quoted) return null;
  const next = logs.find((l) => logTs(l.date) > logTs(quoted.date) && AFTER_BUDGET.has(l.status));
  return next ? logTs(next.date) : null;
}

function firstStatusTs(r: RepairItem, status: string, range: TimeRange): boolean {
  return (r.historyLog || []).some((l) => {
    if (l.status !== status) return false;
    const t = logTs(l.date);
    return isFinite(t) && t >= range.from && t <= range.to;
  });
}

export function buildBranchAdvisorStats(
  repairs: RepairItem[],
  express: Array<{ localKey?: string; ts: number; total: number }>,
  opts: { branches: readonly string[]; range: TimeRange; now?: number }
): BranchAdvisorStat[] {
  const now = opts.now ?? Date.now();
  const inRange = (t: number) => isFinite(t) && t >= opts.range.from && t <= opts.range.to;

  return opts.branches.map((branch) => {
    const rs = repairs.filter((r) => r.workshopBranch === branch);
    const presupuestos = rs.filter((r) => firstStatusTs(r, "quoted", opts.range)).length;
    const aprobados = rs.filter((r) => inRange(budgetApprovedAt(r) ?? NaN)).length;
    const ex = express.filter((e) => e.localKey === branch && inRange(e.ts));
    const ready = rs.filter((r) => r.status === "ready");
    return {
      branch,
      recepciones: rs.filter((r) => inRange(logTs(r.receptionDate))).length,
      presupuestos,
      aprobados,
      tasaAprobacion: presupuestos > 0 ? Math.min(1, aprobados / presupuestos) : null,
      entregas: rs.filter((r) => r.status === "delivered" && inRange(logTs(r.deliveredAt || ""))).length,
      cancelaciones: rs.filter((r) => r.status === "cancelled" && (inRange(logTs((r as any).cancelledAt)) || firstStatusTs(r, "cancelled", opts.range))).length,
      expressCount: ex.length,
      expressTotal: ex.reduce((s, e) => s + (Number(e.total) || 0), 0),
      avisosRecojo: rs.reduce((s, r) => s + (r.pickupNotices || []).filter((n) => inRange(logTs(n.at))).length, 0),
      listosSinAviso: ready.filter((r) => (r.pickupNotices || []).length === 0).length,
      listosConAlmacenaje: ready.filter((r) => pickupStatus(r, now).storageDays > 0).length
    };
  });
}

export function buildTechnicianStats(
  repairs: RepairItem[],
  express: Array<{ technicianName?: string; localKey?: string; ts: number }>,
  opts: { range: TimeRange; config: AuthConfig | null | undefined; orderTs: (r: RepairItem) => number; now?: number }
): TechnicianStat[] {
  const now = opts.now ?? Date.now();
  const staff = buildStaffIndex(opts.config);
  const agg = new Map<string, TechnicianStat>();
  const inRange = (t: number) => isFinite(t) && t >= opts.range.from && t <= opts.range.to;

  const upsert = (raw: string, sedeHint: string): TechnicianStat | null => {
    const rawKey = normalizeTechName(raw);
    if (!rawKey || staff.advisors.has(rawKey)) return null;
    const key = staff.techSede.has(rawKey) ? rawKey : resolveShortName(rawKey, sedeHint, staff) || rawKey;
    let stat = agg.get(key);
    if (!stat) {
      const known = staff.techSede.get(key);
      stat = {
        name: known?.name || cleanName(raw),
        sede: known?.sede || sedeHint || "",
        ot: 0,
        terminadas: 0,
        express: 0,
        netMs: 0,
        conCronometro: 0,
        retrabajos: 0,
        sospechosos: 0
      };
      agg.set(key, stat);
    }
    return stat;
  };

  for (const r of repairs) {
    if (!inRange(opts.orderTs(r))) continue;
    const stat = upsert(orderTechnician(r), r.workshopBranch);
    if (!stat) continue;
    stat.ot++;
    if (isFinishedStatus(r.status)) stat.terminadas++;
    if (hasRegisteredWorkTime(r.workLog)) {
      stat.conCronometro++;
      stat.netMs += computeNetWorkMs(r.workLog, now, workClosedAt(r));
      if (hasSuspiciousTimer(r, now)) stat.sospechosos++;
    }
    stat.retrabajos += reworkCount(r);
  }

  for (const e of express) {
    if (!inRange(e.ts)) continue;
    const stat = upsert(e.technicianName || "", e.localKey || "");
    if (stat) stat.express++;
  }

  return [...agg.values()].sort((a, b) => b.netMs - a.netMs || b.ot - a.ot);
}
