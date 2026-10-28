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
        conCronometro: 0
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
    }
  }

  for (const e of express) {
    if (!inRange(e.ts)) continue;
    const stat = upsert(e.technicianName || "", e.localKey || "");
    if (stat) stat.express++;
  }

  return [...agg.values()].sort((a, b) => b.netMs - a.netMs || b.ot - a.ot);
}
