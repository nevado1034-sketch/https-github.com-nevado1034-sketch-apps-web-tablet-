// Lógica de solo lectura para el Historial de Clientes (Tiempos por Proceso).
//
//  - búsqueda por nombre y celular
//  - tipo de servicio por el que vino el cliente
//  - estado actual del servicio (en curso / en pausa / esperando / finalizado)
//  - tiempos de cada servicio (en taller, del técnico y en la etapa actual)
//
// No escribe nada en Firestore ni modifica las órdenes.

import type { RepairItem } from "../types";
import { computeNetWorkMs, hasRegisteredWorkTime, isWorkLogRunning, workClosedAt } from "./technicianProduction";
import { detectDocumentType, normalizeDocument } from "./documentValidator";

export const SERVICE_TYPE_LABELS: Record<string, string> = {
  mantenimiento: "Mantenimiento",
  diagnostico: "Diagnóstico",
  garantia: "Garantía",
  cambio: "Cambio de Repuesto",
  express: "Servicio Express"
};

export const MIN_NAME_SEARCH_LENGTH = 3;
export const MAX_NAME_RESULTS = 20;
export const PHONE_LENGTH = 9;

function validTs(value: string | undefined | null): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return isFinite(t) ? t : null;
}

/** Texto comparable: sin tildes, minúsculas y espacios colapsados. */
export function normalizeText(value?: string | null): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Celular comparable: solo dígitos, últimos 9 (quita +51 / 51). */
export function normalizePhone(value?: string | null): string {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length > PHONE_LENGTH ? digits.slice(-PHONE_LENGTH) : digits;
}

/** ¿El nombre del cliente contiene el texto buscado? (sin tildes ni mayúsculas) */
export function nameMatches(name: string | undefined, term: string): boolean {
  const needle = normalizeText(term);
  if (needle.length < MIN_NAME_SEARCH_LENGTH) return false;
  return normalizeText(name).includes(needle);
}

/** ¿El celular coincide exactamente con los 9 dígitos buscados? */
export function phoneMatches(phone: string | undefined, term: string): boolean {
  const needle = normalizePhone(term);
  if (needle.length !== PHONE_LENGTH) return false;
  return normalizePhone(phone) === needle;
}

export function serviceTypeLabel(r: Pick<RepairItem, "serviceType">): string {
  return SERVICE_TYPE_LABELS[r.serviceType || ""] || r.serviceType || "Sin tipo";
}

export type ServiceStateKind = "en_curso" | "en_pausa" | "esperando" | "finalizado";

export interface ServiceState {
  kind: ServiceStateKind;
  label: string;
  detail: string;
}

const STATE_LABELS: Record<ServiceStateKind, string> = {
  en_curso: "En curso",
  en_pausa: "En pausa",
  esperando: "Esperando al cliente",
  finalizado: "Finalizado"
};

function state(kind: ServiceStateKind, detail: string): ServiceState {
  return { kind, label: STATE_LABELS[kind], detail };
}

/** Motivo de la última pausa del cronómetro, si la hay. */
function lastPauseReason(r: RepairItem): string {
  const pauses = (r.workLog || []).filter((e) => e.action === "pausa");
  const last = pauses[pauses.length - 1];
  const reason = (last?.reason || "").trim();
  if (!reason) return "";
  if (/^cierre autom/i.test(reason)) return "Pendiente de reanudar";
  return reason;
}

/** Estado actual del servicio a partir de la etapa y del cronómetro del técnico. */
export function serviceState(r: RepairItem): ServiceState {
  switch (r.status) {
    case "delivered":
      return state("finalizado", "Entregado");
    case "cancelled":
      return state("finalizado", "Cancelado");
    case "ready":
      return state("esperando", "Listo para recoger");
    case "quoted":
      return state("esperando", "Presupuesto por aprobar");
    case "paid":
      return state("en_pausa", "Pagado, esperando técnico");
    case "receptioned": {
      const tech = (r.assignedTech || "").trim();
      return tech ? state("en_curso", `Derivado a ${tech}`) : state("en_pausa", "En cola, sin técnico asignado");
    }
    case "diagnosing":
      return state("en_curso", "En diagnóstico");
    case "testing":
      return state("en_curso", "En Control de Calidad");
    case "repairing": {
      if (isWorkLogRunning(r.workLog)) return state("en_curso", "Técnico trabajando");
      if (hasRegisteredWorkTime(r.workLog)) {
        return state("en_pausa", lastPauseReason(r) || "Pausado por el técnico");
      }
      return state("en_curso", "En mesa de trabajo");
    }
    default:
      return state("en_curso", String(r.status || ""));
  }
}

/** Fin del servicio para el cliente: entrega o cancelación (null si sigue abierto). */
export function serviceEndTs(r: RepairItem): number | null {
  if (r.status === "delivered") {
    const delivered = validTs(r.deliveredAt);
    if (delivered !== null) return delivered;
  }
  if (r.status === "cancelled") {
    const cancelled = validTs((r as any).cancelledAt);
    if (cancelled !== null) return cancelled;
  }
  if (r.status === "delivered" || r.status === "cancelled") {
    const marks = (r.historyLog || [])
      .filter((log) => log.status === r.status)
      .map((log) => validTs(log.date))
      .filter((t): t is number => t !== null);
    if (marks.length) return Math.min(...marks);
  }
  return null;
}

/** Desde cuándo la orden está en su etapa actual (último ingreso a ese estado). */
export function currentStageSince(r: RepairItem): number | null {
  const marks = (r.historyLog || [])
    .filter((log) => log.status === r.status)
    .map((log) => validTs(log.date))
    .filter((t): t is number => t !== null);
  if (marks.length) return Math.max(...marks);
  return validTs(r.receptionDate);
}

export interface ServiceTimes {
  /** Desde la recepción hasta la entrega/cancelación, o hasta ahora. */
  workshopMs: number | null;
  /** Tiempo neto del cronómetro del técnico (sin pausas). */
  technicianMs: number;
  technicianHasTime: boolean;
  /** Tiempo en la etapa actual; null si el servicio ya terminó. */
  stageMs: number | null;
  finished: boolean;
}

// ----------------- BÚSQUEDA ÚNICA + FILTRO POR ESTADO -----------------

/**
 * Lo que la asesora escribió en la lupa, interpretado automáticamente:
 *  - letras → nombre (mínimo 3)
 *  - 9 dígitos que empiezan con 9 → celular (y también documento, por si es un C.E.)
 *  - DNI (8) / RUC (11) / C.E → documento
 */
export interface SearchQuery {
  empty: boolean;
  name: string;
  phone: string;
  doc: string;
}

export function parseSearchQuery(raw: string): SearchQuery {
  const text = (raw || "").trim();
  const none: SearchQuery = { empty: true, name: "", phone: "", doc: "" };
  if (!text) return none;

  const compact = normalizeDocument(text).replace(/[^a-zA-Z0-9]/g, "");
  const hasLetters = /\p{L}/u.test(text);
  const hasDigits = /\d/.test(text);

  if (hasLetters && !hasDigits) {
    const name = normalizeText(text);
    return name.length >= MIN_NAME_SEARCH_LENGTH ? { empty: false, name, phone: "", doc: "" } : none;
  }

  // Números (con o sin +51, espacios o guiones) y C.E alfanuméricos.
  let digits = text.replace(/\D/g, "");
  if (!hasLetters && digits.length > PHONE_LENGTH && digits.startsWith("51")) digits = digits.slice(2);
  const phone = !hasLetters && digits.length === PHONE_LENGTH && digits.startsWith("9") ? digits : "";
  const doc = detectDocumentType(compact) ? compact.toUpperCase() : "";
  if (!phone && !doc) return none;
  return { empty: false, name: "", phone, doc };
}

/** ¿La orden pertenece al cliente buscado? */
export function repairMatchesQuery(r: RepairItem, q: SearchQuery): boolean {
  if (q.empty) return true;
  if (q.name) return nameMatches(r.client?.name, q.name);
  const byPhone = !!q.phone && phoneMatches(r.client?.phone, q.phone);
  const byDoc = !!q.doc && normalizeDocument(r.client?.dni || "").toUpperCase() === q.doc;
  return byPhone || byDoc;
}

export type StateFilter = "todos" | ServiceStateKind;

export const STATE_FILTERS: Array<{ key: StateFilter; label: string }> = [
  { key: "todos", label: "Todos" },
  { key: "en_curso", label: "En curso" },
  { key: "en_pausa", label: "En pausa" },
  { key: "esperando", label: "Esperando al cliente" },
  { key: "finalizado", label: "Finalizado" }
];

export interface HistoryRow {
  repair: RepairItem;
  state: ServiceState;
  times: ServiceTimes;
}

export interface HistoryResult {
  rows: HistoryRow[];
  counts: Record<StateFilter, number>;
  /** Los finalizados solo se listan si se buscó a un cliente. */
  finishedHidden: boolean;
}

/**
 * Servicios de la sede filtrados por búsqueda y estado.
 * Sin búsqueda solo se listan los servicios abiertos (no la lista larga de
 * entregados). Los abiertos se ordenan por el que más tiempo lleva en taller.
 */
export function buildHistoryRows(
  repairs: RepairItem[],
  opts: { branch?: string; query: SearchQuery; filter: StateFilter; now?: number }
): HistoryResult {
  const now = opts.now ?? Date.now();
  const finishedHidden = opts.query.empty;

  const base: HistoryRow[] = repairs
    .filter((r) => !opts.branch || r.workshopBranch === opts.branch)
    .filter((r) => repairMatchesQuery(r, opts.query))
    .map((repair) => ({ repair, state: serviceState(repair), times: serviceTimes(repair, now) }))
    .filter((row) => !(finishedHidden && row.state.kind === "finalizado"));

  const counts: Record<StateFilter, number> = { todos: base.length, en_curso: 0, en_pausa: 0, esperando: 0, finalizado: 0 };
  for (const row of base) counts[row.state.kind]++;

  const rows = base
    .filter((row) => opts.filter === "todos" || row.state.kind === opts.filter)
    .sort((a, b) => {
      if (a.times.finished !== b.times.finished) return a.times.finished ? 1 : -1;
      if (!a.times.finished) return (b.times.workshopMs ?? 0) - (a.times.workshopMs ?? 0);
      return (validTs(b.repair.receptionDate) ?? 0) - (validTs(a.repair.receptionDate) ?? 0);
    });

  return { rows, counts, finishedHidden };
}

export function serviceTimes(r: RepairItem, now = Date.now()): ServiceTimes {
  const start = validTs(r.receptionDate);
  const end = serviceEndTs(r);
  const finished = r.status === "delivered" || r.status === "cancelled";
  const workshopMs = start === null ? null : Math.max(0, (end ?? now) - start);
  const since = finished ? null : currentStageSince(r);
  return {
    workshopMs,
    technicianMs: computeNetWorkMs(r.workLog, now, workClosedAt(r)),
    technicianHasTime: hasRegisteredWorkTime(r.workLog),
    stageMs: since === null ? null : Math.max(0, now - since),
    finished
  };
}
