import { describe, it, expect } from "vitest";
import type { PickupNotice, RepairItem } from "../types";
import { buildPickupMessage, nextNotice, pickupStatus, whatsappPhone } from "./pickupNotice";

function makeRepair(notices: PickupNotice[] = []): RepairItem {
  return {
    id: "SI-000012",
    receptionDate: "2026-10-01T10:00:00",
    workshopBranch: "lince_arenales",
    serviceType: "mantenimiento",
    client: { name: "Joaquin", phone: "974 622 002", email: "", dni: "72704630" },
    vehicle: { type: "scooter", brand: "Tailg", model: "X", voltage: "48V", batteryCondition: "0-1año", reportedFailure: "" },
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
    status: "ready",
    aiDiagnostic: null,
    technicianNotes: "",
    estimatedCost: 0,
    actualCost: 0,
    historyLog: [],
    pickupNotices: notices
  };
}

const notice = (n: number, at: string): PickupNotice => ({ n, at, by: "Rosa", phone: "974622002" });
const T = (s: string) => new Date(s).getTime();
const terms = "https://litio-energy.web.app/terminos";

describe("whatsappPhone", () => {
  it("agrega el 51 a celulares de 9 dígitos", () => {
    expect(whatsappPhone("974 622 002")).toBe("51974622002");
    expect(whatsappPhone("+51 974622002")).toBe("51974622002");
    expect(whatsappPhone("")).toBe("");
  });
});

describe("pickupStatus (punto 8)", () => {
  it("sin aviso no corre plazo", () => {
    expect(pickupStatus(makeRepair(), T("2026-10-20T10:00:00"))).toMatchObject({ count: 0, level: "sin_aviso", storageFee: 0 });
  });

  it("el plazo de 10 días corre desde el PRIMER aviso; los recordatorios no lo reinician", () => {
    const r = makeRepair([notice(1, "2026-10-01T09:00:00"), notice(2, "2026-10-08T09:00:00")]);
    const s = pickupStatus(r, T("2026-10-10T18:00:00"));
    expect(s).toMatchObject({ count: 2, daysSinceFirst: 9, daysLeftFree: 1, storageDays: 0, level: "plazo" });
  });

  it("desde el día 11 corre el almacenaje de S/10 por día", () => {
    const r = makeRepair([notice(1, "2026-10-01T09:00:00")]);
    expect(pickupStatus(r, T("2026-10-11T09:00:00"))).toMatchObject({ daysSinceFirst: 10, storageDays: 0, level: "plazo" });
    expect(pickupStatus(r, T("2026-10-12T09:00:00"))).toMatchObject({ daysSinceFirst: 11, storageDays: 1, storageFee: 10, level: "almacenaje" });
    expect(pickupStatus(r, T("2026-10-31T09:00:00"))).toMatchObject({ daysSinceFirst: 30, storageDays: 20, storageFee: 200, level: "traslado" });
    expect(pickupStatus(r, T("2026-11-30T09:00:00"))).toMatchObject({ daysSinceFirst: 60, level: "abandono" });
  });
});

describe("mensaje de WhatsApp", () => {
  it("primer aviso: listo para recojo y cita el punto 8 con el enlace a los términos", () => {
    const msg = buildPickupMessage(makeRepair(), { now: T("2026-10-01T09:00:00"), termsUrl: terms });
    expect(msg).toContain("listo para su recojo");
    expect(msg).toContain("scooter");
    expect(msg).toContain("SI-000012");
    expect(msg).toContain("punto 8");
    expect(msg).toContain("10 días calendario");
    expect(msg).toContain("11/10/2026");
    expect(msg).toContain(terms);
    expect(msg).toContain("listo para su recojo");
  });

  it("concuerda en femenino para moto, bicimoto, trimoto y bicicleta", () => {
    const moto = { ...makeRepair(), vehicle: { ...makeRepair().vehicle, type: "moto" as const } };
    const msg = buildPickupMessage(moto, { now: T("2026-10-01T09:00:00"), termsUrl: terms });
    expect(msg).toContain("Tu moto");
    expect(msg).toContain("lista para su recojo");
    expect(msg).toContain("recogerla sin costo");
  });

  it("recordatorio con almacenaje acumulado", () => {
    const r = makeRepair([notice(1, "2026-10-01T09:00:00")]);
    const msg = buildPickupMessage(r, { now: T("2026-10-14T09:00:00"), termsUrl: terms });
    expect(msg).toContain("Recordatorio N°2");
    expect(msg).toContain("01/10/2026");
    expect(msg).toContain("3 día(s) – S/ 30.00");
  });

  it("el nuevo aviso se numera después de los anteriores", () => {
    const r = makeRepair([notice(1, "2026-10-01T09:00:00")]);
    expect(nextNotice(r, "Rosa", T("2026-10-05T09:00:00"))).toMatchObject({ n: 2, by: "Rosa", phone: "974 622 002" });
  });
});
