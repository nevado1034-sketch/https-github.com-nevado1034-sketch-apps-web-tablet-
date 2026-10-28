import { describe, it, expect } from "vitest";
import type { RepairItem, WorkLogEntry } from "../types";
import type { AuthConfig } from "../auth";
import { buildTechnicianStats, isActiveOrder, orderTechnician, paymentMethodOf } from "./adminMetrics";
import { monthlyTrend } from "./metrics";

function makeRepair(overrides: Partial<RepairItem> = {}): RepairItem {
  return {
    id: "SI-000001",
    receptionDate: "2026-10-01T10:00:00.000Z",
    workshopBranch: "lince_arenales",
    serviceType: "mantenimiento",
    client: { name: "Cliente", phone: "999999999", email: "", dni: "12345678" },
    vehicle: { type: "scooter", brand: "X", model: "Y", voltage: "48V", batteryCondition: "0-1año", reportedFailure: "" },
    accessories: { charger: false, key: false, battery: false, helmet: false, padlock: false, others: "" },
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
    status: "delivered",
    aiDiagnostic: null,
    technicianNotes: "",
    estimatedCost: 100,
    actualCost: 0,
    historyLog: [],
    ...overrides
  };
}

const wl = (entries: Array<[WorkLogEntry["action"], string]>): WorkLogEntry[] => entries.map(([action, at]) => ({ action, at }));

const config: AuthConfig = {
  admin: { name: "Admin", clave: "" },
  locales: [
    { key: "lince_arenales", name: "San Isidro", jefa: { name: "Rosa", clave: "" }, jefas: [{ name: "Carmen", clave: "" }], tecnicos: [{ name: "Ana", clave: "" }] },
    { key: "surco", name: "Surco", jefa: { name: "", clave: "" }, tecnicos: [{ name: "Luis", clave: "" }] }
  ]
};

const range = { from: new Date("2026-10-01T00:00:00.000Z").getTime(), to: new Date("2026-10-31T23:59:59.000Z").getTime() };
const orderTs = (r: RepairItem) => new Date(r.deliveredAt || r.receptionDate).getTime();

describe("técnicos: horas netas del cronómetro", () => {
  it("suma solo el tiempo neto, no recepción → entrega", () => {
    const r = makeRepair({
      assignedTech: "Ana",
      receptionDate: "2026-10-01T08:00:00.000Z",
      deliveredAt: "2026-10-05T18:00:00.000Z",
      workLog: wl([
        ["inicio", "2026-10-02T10:00:00.000Z"],
        ["pausa", "2026-10-02T12:00:00.000Z"]
      ])
    });
    const [ana] = buildTechnicianStats([r], [], { range, config, orderTs });
    expect(ana).toMatchObject({ name: "Ana", sede: "lince_arenales", ot: 1, terminadas: 1, conCronometro: 1 });
    expect(ana.netMs).toBe(2 * 60 * 60 * 1000);
  });

  it("toma la sede de la configuración y no cuenta a las asesoras", () => {
    const rows = buildTechnicianStats(
      [
        makeRepair({ assignedTech: "Luis", workshopBranch: "lince_arenales" }),
        makeRepair({ id: "2", technicianName: "Téc. Carmen" }),
        makeRepair({ id: "3", technicianName: "Rosa" })
      ],
      [],
      { range, config, orderTs }
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: "Luis", sede: "surco", conCronometro: 0, netMs: 0 });
  });

  it("técnico que no está en la configuración usa la sede de la orden", () => {
    const [t] = buildTechnicianStats([makeRepair({ assignedTech: "Pedro", workshopBranch: "san_borja" })], [], { range, config, orderTs });
    expect(t).toMatchObject({ name: "Pedro", sede: "san_borja" });
  });

  it("cuenta los recibos Express del técnico", () => {
    const [t] = buildTechnicianStats([], [{ technicianName: "Ana", localKey: "lince_arenales", ts: range.from + 1000 }], { range, config, orderTs });
    expect(t).toMatchObject({ name: "Ana", express: 1, ot: 0 });
  });

  it("une el nombre corto del Express con el técnico completo solo si no hay dudas en la sede", () => {
    const cfg: AuthConfig = {
      admin: { name: "", clave: "" },
      locales: [
        { key: "lince_arenales", name: "SI", jefa: { name: "", clave: "" }, tecnicos: [{ name: "Gustavo Soto", clave: "" }, { name: "Diego Rosales", clave: "" }, { name: "Diego Paz", clave: "" }] }
      ]
    };
    const rows = buildTechnicianStats(
      [makeRepair({ assignedTech: "Gustavo Soto" })],
      [
        { technicianName: "Gustavo", localKey: "lince_arenales", ts: range.from + 1000 },
        { technicianName: "Diego", localKey: "lince_arenales", ts: range.from + 1000 },
        { technicianName: "Gustavo", localKey: "surco", ts: range.from + 1000 }
      ],
      { range, config: cfg, orderTs }
    );
    const names = rows.map((r) => `${r.name}@${r.sede}:${r.ot}/${r.express}`).sort();
    expect(names).toEqual(["Diego@lince_arenales:0/1", "Gustavo Soto@lince_arenales:1/1", "Gustavo@surco:0/1"]);
  });

  it("prioriza al técnico derivado a la mesa", () => {
    expect(orderTechnician({ assignedTech: "Ana", technicianName: "Téc. Luis" })).toBe("Ana");
    expect(orderTechnician({ technicianName: "Téc. Luis" })).toBe("Luis");
  });
});

describe("órdenes activas y métodos de pago", () => {
  it("las canceladas no cuentan como activas", () => {
    expect(isActiveOrder({ status: "repairing" })).toBe(true);
    expect(isActiveOrder({ status: "delivered" })).toBe(false);
    expect(isActiveOrder({ status: "cancelled" })).toBe(false);
  });

  it("un método vacío queda como sin registrar (no se asume efectivo)", () => {
    expect(paymentMethodOf("")).toBe("sin_registrar");
    expect(paymentMethodOf(undefined)).toBe("sin_registrar");
    expect(paymentMethodOf("yape_plin")).toBe("yape_plin");
  });
});

describe("tendencia mensual con Express", () => {
  it("suma taller y express por mes", () => {
    const now = new Date("2026-10-20T12:00:00").getTime();
    const trend = monthlyTrend(
      [makeRepair({ deliveredAt: "2026-10-05T12:00:00", estimatedCost: 300 })],
      6,
      now,
      [{ ts: new Date("2026-10-10T12:00:00").getTime(), amount: 50 }, { ts: new Date("2026-09-10T12:00:00").getTime(), amount: 20 }]
    );
    const oct = trend[trend.length - 1];
    const sep = trend[trend.length - 2];
    expect(oct).toMatchObject({ tallerRevenue: 300, expressRevenue: 50, revenue: 350, count: 1 });
    expect(sep).toMatchObject({ tallerRevenue: 0, expressRevenue: 20, revenue: 20 });
  });
});
