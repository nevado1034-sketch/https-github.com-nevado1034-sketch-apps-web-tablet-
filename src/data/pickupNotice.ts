// Aviso de recojo por WhatsApp (Términos y Condiciones, punto 8: Almacenamiento y Abandono).
//
//  - El plazo de 10 días calendario sin costo corre desde el PRIMER aviso documentado.
//  - Desde el día 11 se cobra S/10.00 por día de almacenamiento (aquí solo es informativo).
//  - A los 30 días el equipo puede trasladarse; a los 60 días se considera en abandono.
//
// Los reenvíos son recordatorios: NO reinician el plazo.

import type { PickupNotice, RepairItem } from "../types";

export const FREE_STORAGE_DAYS = 10;
export const STORAGE_FEE_PER_DAY = 10;
export const TRANSFER_DAYS = 30;
export const ABANDON_DAYS = 60;

const DAY_MS = 24 * 60 * 60 * 1000;

const BRANCH_NAMES: Record<string, string> = {
  lince_arenales: "San Isidro",
  surco: "Surco",
  san_borja: "San Borja",
  lince_leal: "Lince"
};

const VEHICLE_NAMES: Record<string, string> = {
  scooter: "scooter",
  moto: "moto",
  bicimoto: "bicimoto",
  trimoto: "trimoto",
  bici: "bicicleta"
};

function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Días calendario transcurridos entre dos fechas (hora local). */
export function calendarDaysBetween(from: number, to: number): number {
  return Math.max(0, Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS));
}

function addDays(t: number, days: number): number {
  const d = new Date(startOfDay(t));
  d.setDate(d.getDate() + days);
  return d.getTime();
}

export function fmtDate(t: number): string {
  return new Date(t).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function fmtSoles(n: number): string {
  return `S/ ${n.toFixed(2)}`;
}

export function vehicleName(type?: string): string {
  return VEHICLE_NAMES[type || ""] || "equipo";
}

const FEMININE_VEHICLES = new Set(["moto", "bicimoto", "trimoto", "bici"]);

/** Concordancia: "listo/lista" y "recogerlo/recogerla" según el vehículo. */
function agreement(type?: string): { listo: string; lo: string } {
  return FEMININE_VEHICLES.has(type || "") ? { listo: "lista", lo: "la" } : { listo: "listo", lo: "lo" };
}

/** Celular en formato internacional para wa.me (agrega 51 a números de 9 dígitos). */
export function whatsappPhone(phone?: string): string {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 9) return `51${digits}`;
  return digits;
}

export function sortedNotices(r: Pick<RepairItem, "pickupNotices">): PickupNotice[] {
  return [...(r.pickupNotices || [])]
    .filter((n) => isFinite(new Date(n.at).getTime()))
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

export type PickupLevel = "sin_aviso" | "plazo" | "almacenaje" | "traslado" | "abandono";

export interface PickupStatus {
  count: number;
  firstAt: number | null;
  lastAt: number | null;
  /** Días calendario desde el primer aviso. */
  daysSinceFirst: number;
  /** Último día sin costo (primer aviso + 10 días). */
  freeUntil: number | null;
  daysLeftFree: number;
  /** Días de almacenaje (desde el día 11). */
  storageDays: number;
  /** Monto informativo: storageDays × S/10. */
  storageFee: number;
  transferDate: number | null;
  abandonDate: number | null;
  level: PickupLevel;
}

export function pickupStatus(r: Pick<RepairItem, "pickupNotices">, now = Date.now()): PickupStatus {
  const notices = sortedNotices(r);
  const first = notices[0];
  const last = notices[notices.length - 1];
  if (!first) {
    return {
      count: 0,
      firstAt: null,
      lastAt: null,
      daysSinceFirst: 0,
      freeUntil: null,
      daysLeftFree: FREE_STORAGE_DAYS,
      storageDays: 0,
      storageFee: 0,
      transferDate: null,
      abandonDate: null,
      level: "sin_aviso"
    };
  }
  const firstAt = new Date(first.at).getTime();
  const days = calendarDaysBetween(firstAt, now);
  const storageDays = Math.max(0, days - FREE_STORAGE_DAYS);
  const level: PickupLevel =
    days >= ABANDON_DAYS ? "abandono" : days >= TRANSFER_DAYS ? "traslado" : storageDays > 0 ? "almacenaje" : "plazo";
  return {
    count: notices.length,
    firstAt,
    lastAt: new Date(last.at).getTime(),
    daysSinceFirst: days,
    freeUntil: addDays(firstAt, FREE_STORAGE_DAYS),
    daysLeftFree: Math.max(0, FREE_STORAGE_DAYS - days),
    storageDays,
    storageFee: storageDays * STORAGE_FEE_PER_DAY,
    transferDate: addDays(firstAt, TRANSFER_DAYS),
    abandonDate: addDays(firstAt, ABANDON_DAYS),
    level
  };
}

export interface PickupMessageOptions {
  now?: number;
  termsUrl: string;
}

/**
 * Mensaje de WhatsApp. Si aún no hay avisos, es el PRIMER aviso (inicia el
 * plazo). Si ya hay, es un recordatorio que se adapta a los días transcurridos.
 */
export function buildPickupMessage(r: RepairItem, { now = Date.now(), termsUrl }: PickupMessageOptions): string {
  const name = (r.client?.name || "").trim() || "cliente";
  const sede = BRANCH_NAMES[r.workshopBranch] || r.workshopBranch || "";
  const vehicle = vehicleName(r.vehicle?.type);
  const model = `${r.vehicle?.brand || ""} ${r.vehicle?.model || ""}`.trim();
  const equipo = `tu ${vehicle}${model ? ` *${model}*` : ""} (Orden *${r.id}*)`;
  const status = pickupStatus(r, now);
  const g = agreement(r.vehicle?.type);
  const lines: string[] = [];

  if (status.count === 0) {
    const freeUntil = addDays(now, FREE_STORAGE_DAYS);
    lines.push(
      `Hola ${name} 👋`,
      `Te saluda *Litio Energy${sede ? ` – Sede ${sede}` : ""}*.`,
      "",
      `✅ ${equipo.charAt(0).toUpperCase()}${equipo.slice(1)} ya está *${g.listo} para su recojo*.`,
      "",
      "📌 *Términos y Condiciones – punto 8 (Almacenamiento y Abandono):*",
      `• Tienes *${FREE_STORAGE_DAYS} días calendario* desde este aviso para recoger${g.lo} sin costo (hasta el *${fmtDate(freeUntil)}*).`,
      `• Desde el día 11 se cobra *${fmtSoles(STORAGE_FEE_PER_DAY)} por cada día* de almacenamiento.`,
      `• A los ${TRANSFER_DAYS} días el equipo podrá trasladarse a otra sede o almacén seguro, y a los ${ABANDON_DAYS} días se considerará en estado de abandono.`,
      "",
      `Términos completos: ${termsUrl}`,
      "",
      "Responde este mensaje para coordinar tu recojo. ¡Gracias por confiar en *Litio Energy*!"
    );
    return lines.join("\n");
  }

  lines.push(
    `Hola ${name}, te escribe *Litio Energy${sede ? ` – Sede ${sede}` : ""}*.`,
    "",
    `🔔 *Recordatorio N°${status.count + 1}:* ${equipo} está ${g.listo} para su recojo desde el *${fmtDate(status.firstAt!)}* (primer aviso).`,
    ""
  );

  if (status.level === "plazo") {
    lines.push(
      status.daysLeftFree > 0
        ? `Te quedan *${status.daysLeftFree} día(s)* para recoger${g.lo} sin costo (hasta el *${fmtDate(status.freeUntil!)}*).`
        : `Hoy es el *último día* para recoger${g.lo} sin costo (${fmtDate(status.freeUntil!)}).`,
      `Desde el día 11 se cobra *${fmtSoles(STORAGE_FEE_PER_DAY)} por día* de almacenamiento (punto 8 de los Términos y Condiciones).`
    );
  } else {
    lines.push(
      `Han pasado *${status.daysSinceFirst} días* desde el primer aviso. Según el punto 8 de los Términos y Condiciones, corre el almacenamiento de *${fmtSoles(STORAGE_FEE_PER_DAY)} por día*: a la fecha van *${status.storageDays} día(s) – ${fmtSoles(status.storageFee)}*.`
    );
    if (status.level === "traslado") {
      lines.push(
        `Al superar los ${TRANSFER_DAYS} días, el equipo puede ser trasladado a otra sede o almacén seguro.`,
        `El *${fmtDate(status.abandonDate!)}* (${ABANDON_DAYS} días) se considerará en estado de abandono.`
      );
    } else if (status.level === "abandono") {
      lines.push(
        `Se superaron los ${ABANDON_DAYS} días desde el primer aviso: el equipo se encuentra en estado de abandono según el punto 8 de los Términos y Condiciones.`
      );
    } else {
      lines.push(`El *${fmtDate(status.transferDate!)}* (${TRANSFER_DAYS} días) el equipo podrá ser trasladado a otra sede o almacén seguro.`);
    }
  }

  lines.push("", `Términos completos: ${termsUrl}`, "", "Por favor, responde este mensaje para coordinar tu recojo.");
  return lines.join("\n");
}

/** Nuevo aviso a registrar (no modifica los anteriores). */
export function nextNotice(r: Pick<RepairItem, "pickupNotices" | "client">, by: string, now = Date.now()): PickupNotice {
  return {
    n: sortedNotices(r).length + 1,
    at: new Date(now).toISOString(),
    by: by || "Asesora de Servicio",
    phone: r.client?.phone || ""
  };
}
