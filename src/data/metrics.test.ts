import { describe, it, expect } from "vitest";
import {
  fmtMoney,
  fmtDuration,
  median,
  periodRange,
  pipelineCounts,
  orderRevenue,
  sumRevenue,
  trafficColor,
  deliveryTs,
  buildTimeline,
  HOUR,
  DAY
} from "./metrics";
import type { RepairItem } from "../types";

function makeOrder(partial: Partial<RepairItem>): RepairItem {
  return {
    id: "OT-1",
    receptionDate: "2026-01-01T10:00:00.000Z",
    workshopBranch: "lince_arenales",
    serviceType: "diagnostico",
    client: { name: "Cliente", phone: "999999999", email: "", dni: "12345678" },
    vehicle: {
      type: "scooter",
      brand: "X",
      model: "Y",
      voltage: "48V",
      batteryCondition: "0-1año",
      reportedFailure: ""
    },
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
    status: "receptioned",
    aiDiagnostic: null,
    technicianNotes: "",
    estimatedCost: 0,
    actualCost: 0,
    historyLog: [],
    ...partial
  };
}

describe("fmtMoney", () => {
  it("formatea en soles sin decimales", () => {
    expect(fmtMoney(1500)).toBe("S/ 1,500");
    expect(fmtMoney(0)).toBe("S/ 0");
  });

  it("tolera valores nulos", () => {
    expect(fmtMoney(undefined as unknown as number)).toBe("S/ 0");
  });
});

describe("fmtDuration", () => {
  it("formatea horas y minutos", () => {
    expect(fmtDuration(2 * HOUR + 30 * 60000)).toBe("2h 30m");
  });

  it("formatea días", () => {
    expect(fmtDuration(2 * DAY + 5 * HOUR)).toBe("2d 5h");
  });

  it("devuelve guion para valores no válidos", () => {
    expect(fmtDuration(0)).toBe("—");
    expect(fmtDuration(NaN)).toBe("—");
  });
});

describe("median", () => {
  it("devuelve la mediana impar", () => {
    expect(median([1, 3, 2])).toBe(2);
  });

  it("promedia los dos centrales en par", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it("devuelve 0 para lista vacía", () => {
    expect(median([])).toBe(0);
  });
});

describe("periodRange", () => {
  const now = new Date("2026-01-15T12:00:00.000").getTime();

  it("'hoy' arranca a medianoche", () => {
    const r = periodRange("hoy", now);
    const start = new Date(r.from);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(r.to).toBe(now);
  });

  it("'todo' empieza en 0", () => {
    expect(periodRange("todo", now).from).toBe(0);
  });
});

describe("pipelineCounts", () => {
  it("cuenta órdenes por estado", () => {
    const orders = [
      makeOrder({ id: "a", status: "receptioned" }),
      makeOrder({ id: "b", status: "receptioned" }),
      makeOrder({ id: "c", status: "delivered" }),
      makeOrder({ id: "d", status: "cancelled" })
    ];
    const c = pipelineCounts(orders);
    expect(c.receptioned).toBe(2);
    expect(c.delivered).toBe(1);
    expect(c.repairing).toBe(0);
  });

  it("ignora estados fuera del pipeline (cancelled)", () => {
    const c = pipelineCounts([makeOrder({ status: "cancelled" })]);
    expect(Object.values(c).reduce((s, n) => s + n, 0)).toBe(0);
  });
});

describe("orderRevenue / sumRevenue", () => {
  it("solo cuenta órdenes entregadas", () => {
    expect(orderRevenue(makeOrder({ status: "delivered", actualCost: 500 }))).toBe(500);
    expect(orderRevenue(makeOrder({ status: "repairing", actualCost: 500 }))).toBe(0);
  });

  it("usa estimatedCost si no hay actualCost", () => {
    expect(orderRevenue(makeOrder({ status: "delivered", actualCost: 0, estimatedCost: 300 }))).toBe(300);
  });

  it("suma ingresos", () => {
    const total = sumRevenue([
      makeOrder({ status: "delivered", actualCost: 500 }),
      makeOrder({ status: "delivered", actualCost: 250 }),
      makeOrder({ status: "repairing", actualCost: 999 })
    ]);
    expect(total).toBe(750);
  });
});

describe("trafficColor", () => {
  it("verde dentro de la meta", () => {
    expect(trafficColor(1 * HOUR, 2 * HOUR)).toBe("emerald");
  });

  it("ámbar hasta 1.5x", () => {
    expect(trafficColor(2.5 * HOUR, 2 * HOUR)).toBe("amber");
  });

  it("rojo por encima de 2x", () => {
    expect(trafficColor(5 * HOUR, 2 * HOUR)).toBe("rose");
  });
});

describe("deliveryTs", () => {
  it("devuelve null si no está entregada", () => {
    expect(deliveryTs(makeOrder({ status: "ready" }))).toBeNull();
  });

  it("usa deliveredAt cuando existe", () => {
    const ts = deliveryTs(makeOrder({ status: "delivered", deliveredAt: "2026-02-01T00:00:00.000Z" }));
    expect(ts).toBe(new Date("2026-02-01T00:00:00.000Z").getTime());
  });
});

describe("buildTimeline", () => {
  it("agrega la recepción como primer evento", () => {
    const t = buildTimeline(makeOrder({ receptionDate: "2026-01-01T10:00:00.000Z" }));
    expect(t[0].status).toBe("receptioned");
  });

  it("elimina eventos consecutivos con el mismo estado", () => {
    const order = makeOrder({
      historyLog: [
        { id: "1", date: "2026-01-01T11:00:00.000Z", status: "diagnosing", description: "Diag", user: "T" },
        { id: "2", date: "2026-01-01T12:00:00.000Z", status: "diagnosing", description: "Diag", user: "T" }
      ]
    });
    const statuses = buildTimeline(order).map((e) => e.status);
    expect(statuses.filter((s) => s === "diagnosing").length).toBe(1);
  });

  it("ignora logs de derivación a técnico", () => {
    const order = makeOrder({
      historyLog: [
        {
          id: "1",
          date: "2026-01-01T11:00:00.000Z",
          status: "diagnosing",
          description: "Derivado al técnico Juan",
          user: "Asesora"
        }
      ]
    });
    const statuses = buildTimeline(order).map((e) => e.status);
    expect(statuses).not.toContain("diagnosing");
  });
});
