import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { RepairItem, WorkLogEntry } from "../types";
import TechnicianProductionView from "./TechnicianProductionView";

function makeRepair(overrides: Partial<RepairItem> = {}): RepairItem {
  return {
    id: "LS-000001",
    receptionDate: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
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
    status: "delivered",
    aiDiagnostic: null,
    technicianNotes: "",
    estimatedCost: 0,
    actualCost: 0,
    historyLog: [],
    ...overrides
  };
}

function workLog(tech: string): WorkLogEntry[] {
  const start = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
  const end = new Date(Date.now() - 1 * 3600 * 1000).toISOString();
  return [
    { action: "inicio", at: start, user: tech },
    { action: "pausa", at: end, user: tech }
  ];
}

describe("TechnicianProductionView", () => {
  const ana = makeRepair({
    id: "LS-ANA-1",
    client: { ...makeRepair().client, name: "Cliente de Ana" },
    assignedTech: "Téc. Ana",
    assignedByName: "Asesora Rosa",
    workLog: workLog("Téc. Ana"),
    historyLog: [
      {
        id: "asg",
        date: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        status: "repairing",
        description: "Derivado al técnico Téc. Ana.",
        user: "Asesora Rosa"
      }
    ]
  });

  const susana = makeRepair({
    id: "LS-SUS-2",
    client: { ...makeRepair().client, name: "Cliente de Susana" },
    assignedTech: "Susana",
    assignedByName: "Asesora Luz",
    historyLog: [
      {
        id: "asg2",
        date: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        status: "repairing",
        description: "Derivado al técnico Susana.",
        user: "Asesora Luz"
      }
    ]
  });

  it("muestra solo los trabajos del técnico exacto y su tiempo", () => {
    const html = renderToStaticMarkup(
      <TechnicianProductionView
        repairs={[ana, susana]}
        userName="Ana"
        userRole="tecnico"
        userLocalKey="lince_arenales"
      />
    );
    expect(html).toContain("Mis trabajos");
    expect(html).toContain("Cliente de Ana");
    expect(html).not.toContain("Cliente de Susana");
    expect(html).toContain("Asesora Rosa");
    expect(html).toContain("01:00:00");
  });

  it("marca sin tiempo registrado cuando no se usó el cronómetro", () => {
    const html = renderToStaticMarkup(
      <TechnicianProductionView
        repairs={[susana]}
        userName="Susana"
        userRole="tecnico"
        userLocalKey="lince_arenales"
      />
    );
    expect(html).toContain("Sin tiempo registrado");
    expect(html).toContain("Cliente de Susana");
  });

  it("la jefa ve los trabajos de todos los técnicos de la sede", () => {
    const html = renderToStaticMarkup(
      <TechnicianProductionView
        repairs={[ana, susana]}
        userName="Jefa"
        userRole="jefa"
        userLocalKey="lince_arenales"
      />
    );
    expect(html).toContain("Cliente de Ana");
    expect(html).toContain("Cliente de Susana");
    expect(html).toContain("Producción del taller");
  });
});
