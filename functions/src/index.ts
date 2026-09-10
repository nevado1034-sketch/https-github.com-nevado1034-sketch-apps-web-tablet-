import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { google } from "googleapis";
import * as path from "path";
import * as fs from "fs";

import * as adminDefault from "firebase-admin";
adminDefault.initializeApp();

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || "1V469eNmCQOai6by6_wmmguRrRg6WoHJt8IN1bo5e4gw";

let sheetsClient: ReturnType<typeof google.sheets> | null = null;

async function getSheets() {
  if (sheetsClient) return sheetsClient;

  const saPath = path.join(__dirname, "..", "service-account.json");
  if (!fs.existsSync(saPath)) {
    throw new Error("No se encontró service-account.json");
  }

  const creds = JSON.parse(fs.readFileSync(saPath, "utf-8"));
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  sheetsClient = google.sheets({ version: "v4", auth });
  return sheetsClient;
}

async function ensureSheetExists(sheets: ReturnType<typeof google.sheets>, title: string) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const titles = (meta.data.sheets || []).map((s: any) => s.properties?.title);
  if (titles.includes(title)) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests: [{ addSheet: { properties: { title } } }] },
  });
}

async function replaceSheet(sheets: ReturnType<typeof google.sheets>, tab: string, rows: any[][]) {
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tab}!A1:ZZ`,
  });
  if (rows.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${tab}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: rows },
    });
  }
}

function formatDate(date: any): string {
  if (!date) return "";
  if (date.toDate) return date.toDate().toLocaleString("es-PE");
  if (date.seconds) return new Date(date.seconds * 1000).toLocaleString("es-PE");
  const d = new Date(date);
  if (!isNaN(d.getTime())) return d.toLocaleString("es-PE");
  return String(date);
}

// ═══════ SYNC CLIENTES ═══════
export const syncClienteToSheet = onDocumentWritten("clientes/{clienteId}", async (event) => {
  if (!SPREADSHEET_ID) {
    console.log("No SPREADSHEET_ID configurado, saltando sync.");
    return;
  }

  try {
    const sheets = await getSheets();
    await ensureSheetExists(sheets, "Clientes");

    const snap = await adminDefault.firestore().collection("clientes").get();
    const docs = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .filter((c) => c.archived !== true && !c.mergedInto)
      .sort((a, b) => String(a.internalId || a.id).localeCompare(String(b.internalId || b.id)));

    const rows = [
      ["ID", "Nombre", "Teléfono", "DNI", "Sede", "Dirección", "Fecha Registro", "Última Actualización"]
    ].concat(docs.map((c) => [
      c.internalId || c.id,
      c.name || "",
      c.phone || "",
      c.dni || "",
      c.workshopBranch || "",
      c.address || "",
      formatDate(c.createdAt),
      formatDate(c.updatedAt),
    ]));

    await replaceSheet(sheets, "Clientes", rows);
  } catch (err) {
    console.error("Error syncing cliente to Sheets:", err);
  }
});

// ═══════ SYNC ORDENES (repairs) ═══════
function padOrderId(id: string): string {
  const match = id.match(/^([A-Za-z]+)-(\d+)$/);
  if (!match) return id;
  return `${match[1]}-${match[2].padStart(7, "0")}`;
}

export const syncOrdenToSheet = onDocumentWritten("repairs/{repairId}", async () => {
  if (!SPREADSHEET_ID) {
    console.log("No SPREADSHEET_ID configurado, saltando sync.");
    return;
  }

  try {
    const sheets = await getSheets();
    await ensureSheetExists(sheets, "Ordenes");

    const snap = await adminDefault.firestore().collection("repairs").get();
    const docs = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .sort((a, b) => String(a.receptionDate || "").localeCompare(String(b.receptionDate || "")));

    const rows = [
      ["N°", "OT", "Cliente", "DNI", "Teléfono", "Vehículo", "Tipo", "Sede",
        "Estado", "Técnico", "Costo Est.", "F. Ingreso", "F. Entrega"]
    ].concat(docs.map((d, i) => [
      String(i + 1),
      padOrderId(d.id),
      d.client?.name || "",
      d.client?.dni || "",
      d.client?.phone || "",
      `${d.vehicle?.brand || ""} ${d.vehicle?.model || ""}`.trim(),
      d.vehicle?.type || "",
      d.workshopBranch || "",
      d.status || "",
      d.technicianName || "",
      d.estimatedCost || 0,
      formatDate(d.receptionDate),
      d.status === "delivered" ? formatDate(d.deliveryDate || d.deliveredAt || d.updatedAt) : "",
    ]));

    await replaceSheet(sheets, "Ordenes", rows);
  } catch (err) {
    console.error("Error syncing orden to Sheets:", err);
  }
});

// ═══════ SYNC REPORTES ("lista de ordenes" + "informacion de los tecnicos") ═══════
const SEDES = ["lince_arenales", "lince_leal", "san_borja", "surco"];
const SEDE_LABEL: Record<string, string> = {
  surco: "Surco",
  lince_arenales: "Arenales",
  san_borja: "San Borja",
  lince_leal: "Lince Leal"
};

function parseDate(d: any): Date | null {
  if (!d) return null;
  if (typeof d.toDate === "function") return d.toDate();
  if (d.seconds) return new Date(d.seconds * 1000);
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
}

function serviceDur(receptionDate: any, endDate: any): string {
  const a = parseDate(receptionDate);
  const b = parseDate(endDate);
  if (!a || !b) return "";
  const ms = Math.max(0, b.getTime() - a.getTime());
  const m = Math.round(ms / 60000);
  if (m < 1) return "1m";
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const mm = m % 60;
  let s = "";
  if (d) s += d + "d ";
  if (h || d) s += h + "h ";
  s += mm + "m";
  return s.trim();
}

function stripTec(n: any): string {
  return String(n || "").replace(/^T[eé]c\.?\s*/i, "").trim();
}

async function rebuildReportSheets(sheets: ReturnType<typeof google.sheets>) {
  const db = adminDefault.firestore();

  const [repSnap, cliSnap] = await Promise.all([
    db.collection("repairs").get(),
    db.collection("clientes").get()
  ]);

  const dniToId: Record<string, string> = {};
  cliSnap.docs.forEach((d) => {
    const c = d.data() as any;
    if (c.archived === true || c.mergedInto) return;
    if (c.dni) dniToId[String(c.dni)] = c.internalId || d.id;
  });

  const expressRows: any[] = [];
  for (const sede of SEDES) {
    const snap = await db.collection("recibos_express").doc(sede).collection("recibos").get();
    snap.docs.forEach((d) => {
      const r = d.data() as any;
      if (r.annulled === true) return;
      expressRows.push({
        id: r.correlative || d.id,
        clientName: r.clientName || "",
        dni: r.clientDni || "",
        phone: r.clientPhone || "",
        vehicleType: r.vehicleType || "",
        service: "Express · " + (r.items || []).map((i: any) => i.name || i.description).filter(Boolean).join(", "),
        tech: stripTec(r.technicianName || r.createdBy || ""),
        sede: r.localKey || sede,
        reception: r.date || r.createdAt || "",
        delivered: "",
        type: r.vehicleType || ""
      });
    });
  }

  const repRows: any[] = [];
  repSnap.docs.forEach((d) => {
    const x = d.data() as any;
    repRows.push({
      id: d.id,
      clientName: x.client?.name || "",
      dni: x.client?.dni || "",
      phone: x.client?.phone || "",
      vehicleType: (x.vehicle?.type || "") + " " + (x.vehicle?.brand || "") + " " + (x.vehicle?.model || ""),
      service: x.serviceType || "",
      tech: stripTec(x.technicianName || x.assignedTech || ""),
      sede: x.workshopBranch || "",
      reception: x.receptionDate || x.serviceStartedAt || "",
      delivered: x.status === "delivered" ? x.deliveredAt || x.updatedAt : "",
      type: x.vehicle?.type || ""
    });
  });

  const all = [...repRows, ...expressRows]
    .filter((r) => r.id)
    .sort((a, b) => String(a.reception || "").localeCompare(String(b.reception || "")));

  await ensureSheetExists(sheets, "litio energy - lista de ordenes");
  await ensureSheetExists(sheets, "litio energy-informacion de los tecnicos");

  const rows1 = [
    ["  ", "ID", "DNI", "Nombre", "Tipo de Vehículo", "Tipo de Servicio", "Tiempo de Servicio"]
  ].concat(all.map((r: any, i: number) => [
    String(i + 1),
    dniToId[r.dni] || r.dni || r.id,
    r.dni,
    r.clientName,
    r.vehicleType,
    r.service,
    r.delivered ? serviceDur(r.reception, r.delivered) : ""
  ]));

  await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: "litio energy - lista de ordenes!A1:Z" });
  if (rows1.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: "litio energy - lista de ordenes!A1",
      valueInputOption: "RAW",
      requestBody: { values: rows1 }
    });
  }

  const tecRows = all.filter((r: any) => r.tech);
  const rows2 = [
    ["N°", "Técnico", "Sede", "Horas de trabajo", "Tipo de servicio", "Vehículo asignado", "Atendido OT"]
  ].concat(tecRows.map((r: any, i: number) => [
    String(i + 1),
    r.tech,
    SEDE_LABEL[r.sede] || r.sede,
    r.delivered ? serviceDur(r.reception, r.delivered) : "",
    r.service,
    r.type,
    r.id
  ]));

  await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: "litio energy-informacion de los tecnicos!A1:Z" });
  if (rows2.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: "litio energy-informacion de los tecnicos!A1",
      valueInputOption: "RAW",
      requestBody: { values: rows2 }
    });
  }
}

export const syncReportesToSheet = onDocumentWritten("repairs/{repairId}", async () => {
  if (!SPREADSHEET_ID) {
    console.log("No SPREADSHEET_ID configurado, saltando sync.");
    return;
  }
  try {
    await rebuildReportSheets(await getSheets());
  } catch (err) {
    console.error("Error syncing reportes to Sheets:", err);
  }
});

export const syncReportesExpressToSheet = onDocumentWritten("recibos_express/{localKey}/recibos/{receiptId}", async () => {
  if (!SPREADSHEET_ID) {
    console.log("No SPREADSHEET_ID configurado, saltando sync.");
    return;
  }
  try {
    await rebuildReportSheets(await getSheets());
  } catch (err) {
    console.error("Error syncing reportes express to Sheets:", err);
  }
});
