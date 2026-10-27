import { describe, it, expect } from "vitest";
import type { RepairItem, RepairStatus } from "../types";
import {
  normalizeTechName,
  sameTechnician,
  matchesAssignedTechnician,
  isClosedStatus,
  assignmentInfo,
  workClosedAt,
  computeNetWorkMs,
  isWorkLogRunning,
  hasRegisteredWorkTime,
  closeRunningWorkLog,
  buildProductionJobs,
  summarizeProduction,
  formatWorkClock,
  formatWorkDuration
} from "./technicianProduction";
import type { WorkLogEntry } from "../types";

function makeRepair(overrides: Partial<RepairItem> = {}): RepairItem {
  return {
    id: "LS-000001",
    receptionDate: "2026-10-20T10:00:00.000Z",
    workshopBranch: "lince_arenales",
    serviceType: "diagnostico",
    client: { name: "Cliente Uno", phone: "999999999", email: "", dni: "12345678" },
    vehicle: {
      type: "scooter",
      brand: "Litio",
      model: "X1",
      voltage: "60V",
      batteryCondition: "0-1año",
      reportedFailure: "No enciende"
    },
    accessories: {
      charger: false,
      key: true,
      battery: true,
      helmet: false,
      padlock: false,
      others: ""
    },
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

function wl(entries: Array<[WorkLogEntry["action"], string]>): WorkLogEntry[] {
  return entries.map(([action, at]) => ({ action, at }));
}

describe("normalizeTechName / sameTechnician", () => {
  it("normaliza tildes, mayúsculas y el prefijo Téc.", () => {
    expect(normalizeTechName("Téc. José  Pérez")).toBe("jose perez");
    expect(normalizeTechName("TEC. JOSE PEREZ")).toBe("jose perez");
    expect(normalizeTechName("  Ana   María ")).toBe("ana maria");
    expect(normalizeTechName("")).toBe("");
    expect(normalizeTechName(undefined)).toBe("");
  });

  it("compara de forma exacta y no por subcadena", () => {
    expect(sameTechnician("Téc. Ana", "Ana")).toBe(true);
    expect(sameTechnician("ANA", "ana")).toBe(true);
    expect(sameTechnician("Ana", "Susana")).toBe(false);
    expect(sameTechnician("José", "Jose")).toBe(true);
    expect(sameTechnician("", "")).toBe(false);
    expect(sameTechnician("Ana", undefined)).toBe(false);
  });

  it("solo restringe la visibilidad al rol técnico", () => {
    expect(matchesAssignedTechnician("Ana", "Susana", "tecnico")).toBe(false);
    expect(matchesAssignedTechnician("Téc. Ana", "Ana", "tecnico")).toBe(true);
    expect(matchesAssignedTechnician("Ana", "Susana", "jefa")).toBe(true);
    expect(matchesAssignedTechnician("Ana", "Susana", "admin")).toBe(true);
  });
});

describe("isClosedStatus", () => {
  it("reconoce los estados que cierran la mesa del técnico", () => {
    (["testing", "ready", "delivered", "cancelled"] as RepairStatus[]).forEach((s) => {
      expect(isClosedStatus(s)).toBe(true);
    });
    (["receptioned", "diagnosing", "quoted", "paid", "repairing"] as RepairStatus[]).forEach((s) => {
      expect(isClosedStatus(s)).toBe(false);
    });
  });
});

describe("assignmentInfo", () => {
  it("usa assignedByName y la fecha del evento de derivación", () => {
    const repair = makeRepair({
      assignedTech: "Ana",
      assignedByName: "Asesora Rosa",
      historyLog: [
        {
          id: "1",
          date: "2026-10-21T09:30:00.000Z",
          status: "diagnosing",
          description: "Derivado al técnico Ana.",
          user: "Asesora Rosa"
        }
      ]
    });
    const info = assignmentInfo(repair);
    expect(info.by).toBe("Asesora Rosa");
    expect(info.at).toBe(new Date("2026-10-21T09:30:00.000Z").getTime());
  });

  it("cae al operador del historial en órdenes antiguas", () => {
    const repair = makeRepair({
      assignedTech: "Ana",
      historyLog: [
        {
          id: "1",
          date: "2026-10-21T09:30:00.000Z",
          status: "diagnosing",
          description: "Derivado al técnico Ana.",
          user: "Asesora Luz"
        }
      ]
    });
    expect(assignmentInfo(repair).by).toBe("Asesora Luz");
  });

  it("usa la recepción como fecha si no hay derivación registrada", () => {
    const repair = makeRepair({ assignedTech: "Ana" });
    expect(assignmentInfo(repair).at).toBe(new Date("2026-10-20T10:00:00.000Z").getTime());
    expect(assignmentInfo(repair).by).toBe("—");
  });
});

describe("computeNetWorkMs", () => {
  const now = new Date("2026-10-21T12:00:00.000Z").getTime();

  it("suma tramos y excluye pausas", () => {
    const log = wl([
      ["inicio", "2026-10-21T10:00:00.000Z"],
      ["pausa", "2026-10-21T10:30:00.000Z"],
      ["reanudar", "2026-10-21T11:00:00.000Z"],
      ["pausa", "2026-10-21T11:30:00.000Z"]
    ]);
    expect(computeNetWorkMs(log, now)).toBe(60 * 60 * 1000);
  });

  it("cuenta el tramo abierto hasta ahora", () => {
    const log = wl([["inicio", "2026-10-21T11:30:00.000Z"]]);
    expect(computeNetWorkMs(log, now)).toBe(30 * 60 * 1000);
  });

  it("corta el tramo abierto en el cierre de la orden", () => {
    const log = wl([["inicio", "2026-10-21T11:30:00.000Z"]]);
    const closedAt = new Date("2026-10-21T11:45:00.000Z").getTime();
    expect(computeNetWorkMs(log, now, closedAt)).toBe(15 * 60 * 1000);
  });

  it("ignora un segundo inicio sin pausa para no perder el tramo", () => {
    const log = wl([
      ["inicio", "2026-10-21T10:00:00.000Z"],
      ["inicio", "2026-10-21T11:00:00.000Z"]
    ]);
    expect(computeNetWorkMs(log, now)).toBe(2 * 60 * 60 * 1000);
  });

  it("devuelve 0 sin cronómetro", () => {
    expect(computeNetWorkMs(undefined, now)).toBe(0);
    expect(computeNetWorkMs([], now)).toBe(0);
  });
});

describe("cronómetro: estado y cierre automático", () => {
  it("detecta si está corriendo y si se usó", () => {
    expect(isWorkLogRunning(undefined)).toBe(false);
    expect(isWorkLogRunning(wl([["inicio", "2026-10-21T10:00:00.000Z"]]))).toBe(true);
    expect(
      isWorkLogRunning(
        wl([
          ["inicio", "2026-10-21T10:00:00.000Z"],
          ["pausa", "2026-10-21T10:30:00.000Z"]
        ])
      )
    ).toBe(false);
    expect(hasRegisteredWorkTime(wl([["inicio", "2026-10-21T10:00:00.000Z"]]))).toBe(true);
    expect(hasRegisteredWorkTime(wl([["pausa", "2026-10-21T10:00:00.000Z"]]))).toBe(false);
  });

  it("cierra con una pausa solo si estaba corriendo", () => {
    const running = wl([["inicio", "2026-10-21T10:00:00.000Z"]]);
    const closed = closeRunningWorkLog(running, "2026-10-21T10:45:00.000Z", "Téc. Ana", "Enviado a calidad");
    expect(closed).toHaveLength(2);
    expect(closed?.[1]).toMatchObject({
      action: "pausa",
      at: "2026-10-21T10:45:00.000Z",
      user: "Téc. Ana",
      reason: "Enviado a calidad"
    });
    expect(closeRunningWorkLog(undefined, "2026-10-21T10:45:00.000Z")).toBeNull();
    expect(
      closeRunningWorkLog(
        wl([
          ["inicio", "2026-10-21T10:00:00.000Z"],
          ["pausa", "2026-10-21T10:30:00.000Z"]
        ]),
        "2026-10-21T10:45:00.000Z"
      )
    ).toBeNull();
  });
});

describe("workClosedAt", () => {
  it("usa la primera marca del estado de cierre", () => {
    const repair = makeRepair({
      status: "testing",
      historyLog: [
        {
          id: "1",
          date: "2026-10-21T12:00:00.000Z",
          status: "testing",
          description: "Estado cambiado a En Pruebas.",
          user: "Téc. Ana"
        }
      ]
    });
    expect(workClosedAt(repair)).toBe(new Date("2026-10-21T12:00:00.000Z").getTime());
  });

  it("usa deliveredAt para entregas", () => {
    const repair = makeRepair({
      status: "delivered",
      deliveredAt: "2026-10-22T15:00:00.000Z"
    });
    expect(workClosedAt(repair)).toBe(new Date("2026-10-22T15:00:00.000Z").getTime());
  });

  it("es null mientras la orden sigue en mesa", () => {
    expect(workClosedAt(makeRepair({ status: "repairing" }))).toBeNull();
  });
});

describe("buildProductionJobs / summarizeProduction", () => {
  const now = new Date("2026-10-25T12:00:00.000Z").getTime();

  const baseLogs = (tech: string, date = "2026-10-24T09:00:00.000Z"): RepairItem["historyLog"] => [
    {
      id: `asg-${tech}`,
      date,
      status: "repairing",
      description: `Derivado al técnico ${tech}.`,
      user: "Asesora Rosa"
    }
  ];

  const ana = makeRepair({
    id: "LS-1",
    status: "delivered",
    assignedTech: "Téc. Ana",
    assignedByName: "Asesora Rosa",
    historyLog: [
      ...baseLogs("Téc. Ana"),
      {
        id: "close",
        date: "2026-10-24T11:00:00.000Z",
        status: "delivered",
        description: "Entregado",
        user: "Téc. Ana"
      }
    ],
    workLog: wl([
      ["inicio", "2026-10-24T09:00:00.000Z"],
      ["pausa", "2026-10-24T11:00:00.000Z"]
    ])
  });

  const susana = makeRepair({
    id: "LS-2",
    status: "repairing",
    assignedTech: "Susana",
    assignedByName: "Asesora Luz",
    historyLog: baseLogs("Susana", "2026-10-24T10:00:00.000Z"),
    workLog: wl([
      ["inicio", "2026-10-24T10:00:00.000Z"],
      ["pausa", "2026-10-24T12:00:00.000Z"]
    ])
  });

  const old = makeRepair({
    id: "LS-3",
    status: "delivered",
    assignedTech: "Ana",
    assignedByName: "Asesora Rosa",
    historyLog: [
      {
        id: "old",
        date: "2026-09-01T09:00:00.000Z",
        status: "repairing",
        description: "Derivado al técnico Ana.",
        user: "Asesora Rosa"
      }
    ],
    workLog: wl([
      ["inicio", "2026-09-01T09:00:00.000Z"],
      ["pausa", "2026-09-01T10:00:00.000Z"]
    ])
  });

  it("solo incluye trabajos del técnico exacto dentro del periodo", () => {
    const jobs = buildProductionJobs([ana, susana, old], {
      userName: "Ana",
      userRole: "tecnico",
      period: "7d",
      now
    });
    expect(jobs.map((job) => job.id)).toEqual(["LS-1"]);
    expect(jobs[0].assignedBy).toBe("Asesora Rosa");
    expect(jobs[0].hasTime).toBe(true);
  });

  it("para jefas incluye toda la sede y ordena por envío reciente", () => {
    const jobs = buildProductionJobs([ana, susana, old], {
      userName: "Jefa",
      userRole: "jefa",
      period: "todo",
      now
    });
    expect(jobs.map((job) => job.id)).toEqual(["LS-2", "LS-1", "LS-3"]);
  });

  it("resume trabajos terminados, horas y promedio con tiempo registrado", () => {
    const jobs = buildProductionJobs([ana, susana], {
      userName: "Jefa",
      userRole: "jefa",
      period: "7d",
      now
    });
    const summary = summarizeProduction(jobs);
    expect(summary.totalJobs).toBe(2);
    expect(summary.finishedJobs).toBe(1);
    expect(summary.inProgressJobs).toBe(1);
    expect(summary.jobsWithTime).toBe(2);
    expect(summary.totalNetMs).toBe(2 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000);
    expect(summary.averageNetMs).toBe(2 * 60 * 60 * 1000);
  });

  it("cuenta como sin tiempo las órdenes sin cronómetro", () => {
    const noTime = makeRepair({
      id: "LS-4",
      status: "testing",
      assignedTech: "Ana",
      assignedByName: "Asesora Rosa",
      historyLog: baseLogs("Ana")
    });
    const jobs = buildProductionJobs([noTime], {
      userName: "Ana",
      userRole: "tecnico",
      period: "7d",
      now
    });
    const summary = summarizeProduction(jobs);
    expect(jobs[0].hasTime).toBe(false);
    expect(summary.jobsWithoutTime).toBe(1);
    expect(summary.averageNetMs).toBe(0);
  });
});

describe("formatos de tiempo", () => {
  it("formatea el reloj en HH:MM:SS", () => {
    expect(formatWorkClock(0)).toBe("00:00:00");
    expect(formatWorkClock(3661000)).toBe("01:01:01");
  });

  it("formatea la duración de forma legible", () => {
    expect(formatWorkDuration(0)).toBe("0m");
    expect(formatWorkDuration(45 * 1000)).toBe("45s");
    expect(formatWorkDuration(75 * 60 * 1000)).toBe("1h 15m");
    expect(formatWorkDuration(26 * 60 * 60 * 1000)).toBe("1d 2h");
  });
});
