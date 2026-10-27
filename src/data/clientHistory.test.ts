import { describe, it, expect } from "vitest";
import type { RepairItem, WorkLogEntry } from "../types";
import {
  buildHistoryRows,
  parseSearchQuery,
  nameMatches,
  normalizePhone,
  phoneMatches,
  serviceState,
  serviceTimes,
  serviceTypeLabel
} from "./clientHistory";

function makeRepair(overrides: Partial<RepairItem> = {}): RepairItem {
  return {
    id: "LS-000001",
    receptionDate: "2026-10-20T10:00:00.000Z",
    workshopBranch: "lince_arenales",
    serviceType: "mantenimiento",
    client: { name: "José Pérez", phone: "987 654 321", email: "", dni: "12345678" },
    vehicle: {
      type: "scooter",
      brand: "Litio",
      model: "X1",
      voltage: "60V",
      batteryCondition: "0-1año",
      reportedFailure: "No enciende"
    },
    accessories: { charger: false, key: true, battery: true, helmet: false, padlock: false, others: "" },
    visualState: {
      scratches: false,
      cracks: false,
      brakesOk: true,
      lightsOk: true,
      screenOk: true,
      tiresOk: true,
      videoRecorded: false,
      photosTaken: false,
      notes: ""
    },
    status: "repairing",
    aiDiagnostic: null,
    technicianNotes: "",
    estimatedCost: 0,
    actualCost: 0,
    historyLog: [],
    ...overrides
  };
}

function wl(entries: Array<[WorkLogEntry["action"], string, string?]>): WorkLogEntry[] {
  return entries.map(([action, at, reason]) => ({ action, at, ...(reason ? { reason } : {}) }));
}

describe("búsqueda por nombre y celular", () => {
  it("busca por nombre sin tildes ni mayúsculas y exige 3 letras", () => {
    expect(nameMatches("José Pérez", "jose")).toBe(true);
    expect(nameMatches("José Pérez", "PEREZ")).toBe(true);
    expect(nameMatches("José Pérez", "jo")).toBe(false);
    expect(nameMatches("José Pérez", "maria")).toBe(false);
  });

  it("compara el celular por sus 9 dígitos exactos", () => {
    expect(normalizePhone("+51 987-654-321")).toBe("987654321");
    expect(phoneMatches("987 654 321", "987654321")).toBe(true);
    expect(phoneMatches("+51987654321", "987654321")).toBe(true);
    expect(phoneMatches("987654321", "98765432")).toBe(false);
    expect(phoneMatches("987654320", "987654321")).toBe(false);
  });
});

describe("lupa: reconoce qué se escribió", () => {
  it("nombre, celular, DNI y RUC", () => {
    expect(parseSearchQuery("José")).toMatchObject({ empty: false, name: "jose" });
    expect(parseSearchQuery("jo").empty).toBe(true);
    expect(parseSearchQuery("+51 987-654-321")).toMatchObject({ empty: false, phone: "987654321" });
    expect(parseSearchQuery("12345678")).toMatchObject({ empty: false, doc: "12345678", phone: "" });
    expect(parseSearchQuery("20123456789")).toMatchObject({ empty: false, doc: "20123456789" });
    expect(parseSearchQuery("").empty).toBe(true);
  });
});

describe("lista del historial por estado", () => {
  const now = new Date("2026-10-21T10:00:00.000Z").getTime();
  const repairs = [
    makeRepair({ id: "A", status: "repairing", receptionDate: "2026-10-20T10:00:00.000Z", workLog: wl([["inicio", "2026-10-21T09:00:00.000Z"]]) }),
    makeRepair({ id: "B", status: "quoted", receptionDate: "2026-10-18T10:00:00.000Z" }),
    makeRepair({ id: "C", status: "delivered", deliveredAt: "2026-10-20T12:00:00.000Z" }),
    makeRepair({ id: "D", status: "repairing", workshopBranch: "surco", client: { name: "Otra Sede", phone: "911111111", email: "", dni: "87654321" } })
  ];

  it("solo la sede, sin finalizados si no se busca, el más antiguo primero", () => {
    const res = buildHistoryRows(repairs, { branch: "lince_arenales", query: parseSearchQuery(""), filter: "todos", now });
    expect(res.rows.map((r) => r.repair.id)).toEqual(["B", "A"]);
    expect(res.counts).toMatchObject({ todos: 2, en_curso: 1, esperando: 1, finalizado: 0 });
    expect(res.finishedHidden).toBe(true);
  });

  it("filtra por estado", () => {
    const res = buildHistoryRows(repairs, { branch: "lince_arenales", query: parseSearchQuery(""), filter: "esperando", now });
    expect(res.rows.map((r) => r.repair.id)).toEqual(["B"]);
  });

  it("al buscar un cliente también muestra sus servicios finalizados", () => {
    const res = buildHistoryRows(repairs, { branch: "lince_arenales", query: parseSearchQuery("12345678"), filter: "todos", now });
    expect(res.rows.map((r) => r.repair.id)).toEqual(["B", "A", "C"]);
    expect(res.counts.finalizado).toBe(1);
  });

  it("no muestra clientes de otra sede", () => {
    const res = buildHistoryRows(repairs, { branch: "lince_arenales", query: parseSearchQuery("Otra Sede"), filter: "todos", now });
    expect(res.rows).toHaveLength(0);
  });
});

describe("tipo de servicio", () => {
  it("muestra la etiqueta del servicio", () => {
    expect(serviceTypeLabel({ serviceType: "garantia" })).toBe("Garantía");
    expect(serviceTypeLabel({ serviceType: "cambio" })).toBe("Cambio de Repuesto");
  });
});

describe("estado actual del servicio", () => {
  it("en mesa: en curso si el cronómetro corre, en pausa con el motivo si se pausó", () => {
    expect(serviceState(makeRepair({ workLog: wl([["inicio", "2026-10-21T10:00:00.000Z"]]) })).kind).toBe("en_curso");
    const paused = serviceState(
      makeRepair({
        workLog: wl([
          ["inicio", "2026-10-21T10:00:00.000Z"],
          ["pausa", "2026-10-21T11:00:00.000Z", "Esperando repuesto"]
        ])
      })
    );
    expect(paused).toMatchObject({ kind: "en_pausa", detail: "Esperando repuesto" });
  });

  it("clasifica las esperas y los servicios terminados", () => {
    expect(serviceState(makeRepair({ status: "quoted" })).kind).toBe("esperando");
    expect(serviceState(makeRepair({ status: "ready" })).kind).toBe("esperando");
    expect(serviceState(makeRepair({ status: "paid" })).kind).toBe("en_pausa");
    expect(serviceState(makeRepair({ status: "receptioned" })).kind).toBe("en_pausa");
    expect(serviceState(makeRepair({ status: "receptioned", assignedTech: "Ana" })).kind).toBe("en_curso");
    expect(serviceState(makeRepair({ status: "testing" })).kind).toBe("en_curso");
    expect(serviceState(makeRepair({ status: "delivered" })).kind).toBe("finalizado");
    expect(serviceState(makeRepair({ status: "cancelled" })).kind).toBe("finalizado");
  });
});

describe("tiempos del servicio", () => {
  const now = new Date("2026-10-21T10:00:00.000Z").getTime();

  it("servicio abierto: tiempo en taller hasta ahora y tiempo en la etapa actual", () => {
    const r = makeRepair({
      status: "quoted",
      historyLog: [
        { id: "1", date: "2026-10-21T07:00:00.000Z", status: "quoted", description: "A presupuesto", user: "Téc. Ana" }
      ]
    });
    const t = serviceTimes(r, now);
    expect(t.workshopMs).toBe(24 * 60 * 60 * 1000);
    expect(t.stageMs).toBe(3 * 60 * 60 * 1000);
    expect(t.finished).toBe(false);
    expect(t.technicianHasTime).toBe(false);
  });

  it("servicio entregado: el tiempo en taller se detiene en la entrega", () => {
    const r = makeRepair({ status: "delivered", deliveredAt: "2026-10-20T16:00:00.000Z" });
    const t = serviceTimes(r, now);
    expect(t.workshopMs).toBe(6 * 60 * 60 * 1000);
    expect(t.stageMs).toBeNull();
    expect(t.finished).toBe(true);
  });

  it("tiempo del técnico: neto, sin pausas", () => {
    const r = makeRepair({
      workLog: wl([
        ["inicio", "2026-10-21T08:00:00.000Z"],
        ["pausa", "2026-10-21T08:30:00.000Z"],
        ["reanudar", "2026-10-21T09:30:00.000Z"]
      ])
    });
    const t = serviceTimes(r, now);
    expect(t.technicianMs).toBe(60 * 60 * 1000);
    expect(t.technicianHasTime).toBe(true);
  });
});
