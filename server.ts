import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const REPAIRS_FILE = path.join(process.cwd(), "repairs.json");
const CLIENTS_FILE = path.join(process.cwd(), "clients.json");

// Helper to read/write imported clients database
function readClients(): any[] {
  try {
    if (!fs.existsSync(CLIENTS_FILE)) {
      const initialClients = [
        {
          dni: "74839201",
          name: "Juan Pérez Ramos",
          phone: "+51 987 654 321",
          email: "juan.perez@example.com",
          defaultVehicle: {
            type: "scooter",
            brand: "Xiaomi",
            model: "Pro 2",
            voltage: "36V"
          },
          importedAt: new Date().toISOString()
        },
        {
          dni: "10472819",
          name: "María López Fernández",
          phone: "+51 912 345 678",
          email: "maria.lopez@gmail.com",
          defaultVehicle: {
            type: "bike",
            brand: "Segway Ninebot",
            model: "MAX G30",
            voltage: "48V"
          },
          importedAt: new Date().toISOString()
        },
        {
          dni: "20601234567",
          name: "Inversiones E-Mobility S.A.C.",
          phone: "+51 955 443 322",
          email: "contacto@emobility.pe",
          defaultVehicle: {
            type: "moped",
            brand: "NIU",
            model: "NQi GTS",
            voltage: "60V"
          },
          importedAt: new Date().toISOString()
        },
        {
          dni: "45892014",
          name: "Carlos Mendoza Silva",
          phone: "+51 933 221 100",
          email: "carlos.mendoza@hotmail.com",
          defaultVehicle: {
            type: "scooter",
            brand: "Dualtron",
            model: "Thunder 2",
            voltage: "72V"
          },
          importedAt: new Date().toISOString()
        }
      ];
      fs.writeFileSync(CLIENTS_FILE, JSON.stringify(initialClients, null, 2), "utf-8");
      return initialClients;
    }
    const data = fs.readFileSync(CLIENTS_FILE, "utf-8");
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const initialClients = [
        {
          dni: "74839201",
          name: "Juan Pérez Ramos",
          phone: "+51 987 654 321",
          email: "juan.perez@example.com",
          defaultVehicle: {
            type: "scooter",
            brand: "Xiaomi",
            model: "Pro 2",
            voltage: "36V"
          },
          importedAt: new Date().toISOString()
        },
        {
          dni: "10472819",
          name: "María López Fernández",
          phone: "+51 912 345 678",
          email: "maria.lopez@gmail.com",
          defaultVehicle: {
            type: "bike",
            brand: "Segway Ninebot",
            model: "MAX G30",
            voltage: "48V"
          },
          importedAt: new Date().toISOString()
        },
        {
          dni: "20601234567",
          name: "Inversiones E-Mobility S.A.C.",
          phone: "+51 955 443 322",
          email: "contacto@emobility.pe",
          defaultVehicle: {
            type: "moped",
            brand: "NIU",
            model: "NQi GTS",
            voltage: "60V"
          },
          importedAt: new Date().toISOString()
        }
      ];
      fs.writeFileSync(CLIENTS_FILE, JSON.stringify(initialClients, null, 2), "utf-8");
      return initialClients;
    }
    return parsed;
  } catch (error) {
    console.error("Error reading clients file:", error);
    return [];
  }
}

function writeClients(clients: any[]): void {
  try {
    fs.writeFileSync(CLIENTS_FILE, JSON.stringify(clients, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing clients file:", error);
  }
}

// Helper to read database
function readRepairs(): any[] {
  try {
    if (!fs.existsSync(REPAIRS_FILE)) {
      // Seed initial mock repairs so the app is immediately populated with high-quality example data!
      const initialSeed = [
        {
          id: "LT-2026-0001",
          receptionDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          client: {
            name: "Juan Pérez",
            phone: "+51 987 654 321",
            email: "juan.perez@example.com",
            dni: "74839201"
          },
          vehicle: {
            type: "scooter",
            brand: "Xiaomi",
            model: "Pro 2",
            voltage: "36V",
            batteryCondition: "regular",
            reportedFailure: "No enciende después de pasar por un charco de agua. Tampoco carga."
          },
          accessories: {
            charger: true,
            key: false,
            battery: false,
            helmet: false,
            others: "Bolsito portacelular en manubrio"
          },
          visualState: {
            scratches: true,
            cracks: false,
            brakesOk: false,
            lightsOk: true,
            screenOk: false,
            tiresOk: true,
            notes: "Pantalla rayada y freno trasero suelto. Guardabarros trasero un poco flojo."
          },
          status: "repairing",
          aiDiagnostic: {
            probableCauses: [
              "Humedad en la controladora de potencia principal.",
              "Cortocircuito en el puerto de carga o batería.",
              "Fallo del BMS de la batería debido a filtración de agua."
            ],
            testProcedures: [
              "Desmontar la tapa inferior del chasis con precaución.",
              "Inspeccionar visualmente rastros de humedad u oxidación en placa madre.",
              "Medir voltaje directo de salida de la batería con multímetro.",
              "Verificar estado de los fusibles térmicos en la controladora."
            ],
            estimatedTime: "2 a 3 horas",
            suggestedParts: [
              "Controladora Xiaomi Pro 2",
              "Aislante/Silicona de sellado de chasis",
              "Puerto de carga nuevo"
            ],
            aiNote: "ADVERTENCIA: Si sospecha ingreso de agua en la batería, no conecte el cargador. Riesgo de fuga térmica. Deje secar el compartimento en zona ventilada."
          },
          technicianNotes: "Se desmontó la tapa inferior. Se encontró rastro de agua condensada cerca a la controladora. Se procedió a limpieza con alcohol isopropílico. Batería marca 37.2V directos, el BMS está bien. Se dejará secar 24h.",
          estimatedCost: 150,
          actualCost: 150,
          historyLog: [
            {
              id: "log_1",
              date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
              status: "receptioned",
              description: "Vehículo recibido en taller para diagnóstico.",
              user: "Recepcionista Litio"
            },
            {
              id: "log_2",
              date: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000).toISOString(),
              status: "diagnosing",
              description: "Iniciado diagnóstico técnico. Se detecta rastro de humedad.",
              user: "Téc. Carlos"
            },
            {
              id: "log_3",
              date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              status: "repairing",
              description: "Humedad encontrada en placa de control. Limpieza y secado en progreso.",
              user: "Téc. Carlos"
            }
          ]
        },
        {
          id: "LT-2026-0002",
          receptionDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          client: {
            name: "María Gómez",
            phone: "+51 912 345 678",
            email: "maria.gomez@example.com",
            dni: "48291039"
          },
          vehicle: {
            type: "bici",
            brand: "Trek",
            model: "Powerfly 4",
            voltage: "48V",
            batteryCondition: "bueno",
            reportedFailure: "Ruido metálico extraño en el motor central al pedalear con asistencia alta."
          },
          accessories: {
            charger: false,
            key: true,
            battery: true,
            helmet: false,
            others: "Candado de seguridad en tija"
          },
          visualState: {
            scratches: false,
            cracks: false,
            brakesOk: true,
            lightsOk: true,
            screenOk: true,
            tiresOk: true,
            notes: "Bicicleta en excelente estado general."
          },
          status: "receptioned",
          aiDiagnostic: {
            probableCauses: [
              "Desgaste o falta de grasa en los engranajes internos del motor central Bosch.",
              "Rodamientos del eje pedalier dañados.",
              "Fijación floja del motor al cuadro de la bicicleta."
            ],
            testProcedures: [
              "Asegurar los pernos de montaje del motor central Trek/Bosch.",
              "Probar la bicicleta en pedestal de taller aplicando resistencia al pedal.",
              "Desacoplar la cadena para aislar el ruido del motor frente a la transmisión."
            ],
            estimatedTime: "3 a 5 horas",
            suggestedParts: [
              "Rodamiento de eje central",
              "Grasa especial para engranajes de nylon (Bosch approved)",
              "Kit de sellos del motor"
            ],
            aiNote: "Recuerde no abrir la carcasa del motor central si el vehículo está en periodo de garantía oficial Trek."
          },
          technicianNotes: "Pendiente de ingresar a la estación del técnico Carlos.",
          estimatedCost: 220,
          actualCost: 0,
          historyLog: [
            {
              id: "log_4",
              date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
              status: "receptioned",
              description: "Bicicleta eléctrica Trek ingresada a taller. Llave y batería entregadas por la cliente.",
              user: "Recepcionista Litio"
            }
          ]
        },
        {
          id: "LT-2026-0003",
          receptionDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          client: {
            name: "Diego Torres",
            phone: "+51 945 888 123",
            email: "diego.torres@example.com",
            dni: "10293847"
          },
          vehicle: {
            type: "moto",
            brand: "Super Soco",
            model: "TC Max",
            voltage: "72V",
            batteryCondition: "bueno",
            reportedFailure: "Pérdida de fuerza súbita al subir cuestas empinadas, el display parpadea con código de error 96."
          },
          accessories: {
            charger: true,
            key: true,
            battery: true,
            helmet: true,
            others: "Espejos deportivos de repuesto en mochila"
          },
          visualState: {
            scratches: true,
            cracks: false,
            brakesOk: true,
            lightsOk: true,
            screenOk: true,
            tiresOk: false,
            notes: "Llanta trasera desgastada. Rayón leve en el carenado derecho."
          },
          status: "ready",
          aiDiagnostic: {
            probableCauses: [
              "Sobrecalentamiento del controlador de motor debido a alta demanda.",
              "Bajo voltaje temporal (sag) en las celdas de la batería de 72V.",
              "Fallo de comunicación del cable de fase del motor hub."
            ],
            testProcedures: [
              "Verificar temperatura de la controladora en carga.",
              "Escanear códigos OBD o revisar el manual del controlador Super Soco para Error 96 (Suele ser sobrecorriente o sensor Hall).",
              "Reajustar los conectores de fase de alta tensión."
            ],
            estimatedTime: "1 a 2 horas",
            suggestedParts: [
              "Aislante térmico para controladora",
              "Terminales de fase de alta resistencia"
            ],
            aiNote: "ATENCIÓN: Manejar la batería de 72V con herramientas aisladas. Altas tensiones de CC."
          },
          technicianNotes: "Error 96 indica sobrecalentamiento/protección del controlador. Se limpiaron las aletas de disipación del controlador y se reajustó la pasta térmica. También se ajustaron las fases del motor que estaban sueltas. En pruebas posteriores de esfuerzo no volvió a fallar.",
          estimatedCost: 180,
          actualCost: 180,
          historyLog: [
            {
              id: "log_5",
              date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
              status: "receptioned",
              description: "Moto eléctrica ingresada a taller.",
              user: "Recepcionista Litio"
            },
            {
              id: "log_6",
              date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
              status: "diagnosing",
              description: "Escaneo de error 96 y ajuste de terminales de potencia.",
              user: "Téc. Sandra"
            },
            {
              id: "log_7",
              date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              status: "testing",
              description: "Pruebas de ruta realizadas con éxito. Se subieron pendientes sin pérdida de fuerza.",
              user: "Téc. Sandra"
            },
            {
              id: "log_8",
              date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
              status: "ready",
              description: "Vehículo listo para entrega. Presupuesto final confirmado.",
              user: "Téc. Sandra"
            }
          ]
        }
      ];
      fs.writeFileSync(REPAIRS_FILE, JSON.stringify(initialSeed, null, 2), "utf-8");
      return initialSeed;
    }
    const data = fs.readFileSync(REPAIRS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error al leer base de datos:", error);
    return [];
  }
}

// Helper to write database
function writeRepairs(repairs: any[]) {
  try {
    fs.writeFileSync(REPAIRS_FILE, JSON.stringify(repairs, null, 2), "utf-8");
  } catch (error) {
    console.error("Error al escribir base de datos:", error);
  }
}

// Lazy Gemini API Initializer
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
  }
  return aiClient;
}

// REST API Endpoints

// 1. Get all repairs
app.get("/api/repairs", (req, res) => {
  const repairs = readRepairs();
  res.json(repairs);
});

// 2. Get repair stats
app.get("/api/stats", (req, res) => {
  const repairs = readRepairs();
  
  const stats = {
    total: repairs.length,
    receptioned: repairs.filter((r) => r.status === "receptioned").length,
    diagnosing: repairs.filter((r) => r.status === "diagnosing").length,
    waiting_parts: repairs.filter((r) => r.status === "waiting_parts").length,
    repairing: repairs.filter((r) => r.status === "repairing").length,
    testing: repairs.filter((r) => r.status === "testing").length,
    ready: repairs.filter((r) => r.status === "ready").length,
    delivered: repairs.filter((r) => r.status === "delivered").length,
    monthlyEarnings: repairs
      .filter((r) => r.status === "delivered" || r.status === "ready")
      .reduce((sum, r) => sum + (r.actualCost || r.estimatedCost || 0), 0)
  };
  
  res.json(stats);
});

// Get all imported clients
app.get("/api/clients", (req, res) => {
  const clients = readClients();
  res.json(clients);
});

// Clear imported clients
app.delete("/api/clients", (req, res) => {
  writeClients([]);
  res.json({ success: true, message: "Base de datos de clientes limpiada correctamente." });
});

// Helper to normalize client object from various column names
function normalizeClientRecord(raw: any) {
  if (!raw || typeof raw !== "object") return null;

  const keys = Object.keys(raw);
  const getVal = (...patterns: string[]) => {
    for (const p of patterns) {
      const match = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, "").includes(p.toLowerCase()));
      if (match && raw[match] !== undefined && raw[match] !== null && String(raw[match]).trim() !== "") {
        return String(raw[match]).trim();
      }
    }
    return "";
  };

  const dni = getVal("dni", "ruc", "documento", "cedula", "id", "numdoc");
  const name = getVal("nombre", "cliente", "razon", "name", "contacto", "apellidos");
  const phone = getVal("telefono", "celular", "tel", "phone", "movil", "whatsapp");
  const email = getVal("email", "correo", "mail");

  // Vehicle info if present in datasheet
  const type = getVal("tipo", "vehiculo", "scooter", "bici", "moto", "category") || "scooter";
  const brand = getVal("marca", "brand", "fabricante");
  const model = getVal("modelo", "model", "version");
  const voltage = getVal("voltaje", "volts", "volt", "tension", "bateria") || "36V";

  if (!dni && !name) return null;

  return {
    dni: dni || "S/D",
    name: name || "Cliente Registrado",
    phone: phone || "",
    email: email || "",
    defaultVehicle: {
      type: type.toLowerCase().includes("bici") ? "bike" : type.toLowerCase().includes("moto") ? "moped" : "scooter",
      brand: brand || "Xiaomi",
      model: model || "Standard",
      voltage: voltage
    },
    importedAt: new Date().toISOString()
  };
}

// Bulk import clients endpoint
app.post("/api/clients/import", (req, res) => {
  const { clients: rawList } = req.body;

  if (!Array.isArray(rawList)) {
    return res.status(400).json({ error: "El formato debe incluir una lista 'clients' válida." });
  }

  const existingClients = readClients();
  const existingDnis = new Set(existingClients.map(c => (c.dni || "").toLowerCase()));
  const existingNames = new Set(existingClients.map(c => (c.name || "").toLowerCase()));

  let addedCount = 0;
  let updatedCount = 0;

  rawList.forEach((raw) => {
    const norm = normalizeClientRecord(raw);
    if (!norm) return;

    const keyDni = norm.dni.toLowerCase();
    const keyName = norm.name.toLowerCase();

    const existingIdx = existingClients.findIndex(c => 
      (c.dni && c.dni.toLowerCase() === keyDni && keyDni !== "s/d") ||
      (c.name && c.name.toLowerCase() === keyName)
    );

    if (existingIdx >= 0) {
      // Update
      existingClients[existingIdx] = {
        ...existingClients[existingIdx],
        ...norm,
        updatedAt: new Date().toISOString()
      };
      updatedCount++;
    } else {
      existingClients.push(norm);
      existingDnis.add(keyDni);
      existingNames.add(keyName);
      addedCount++;
    }
  });

  writeClients(existingClients);

  res.json({
    success: true,
    addedCount,
    updatedCount,
    totalClients: existingClients.length,
    message: `Se importaron ${addedCount} clientes nuevos y se actualizaron ${updatedCount}.`
  });
});

// Import from Google Sheets public CSV link
app.post("/api/clients/import-google-sheets", async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Se requiere un enlace válido de Google Sheets." });
  }

  try {
    // Transform Google Sheets URL to export CSV URL
    let csvUrl = url;
    if (url.includes("docs.google.com/spreadsheets")) {
      const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        const sheetId = match[1];
        csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      }
    }

    const fetchRes = await fetch(csvUrl);
    if (!fetchRes.ok) {
      return res.status(400).json({ 
        error: "No se pudo descargar la hoja de cálculo. Asegúrese de que el enlace de Google Sheets esté configurado como 'Cualquier persona con el enlace puede ver'." 
      });
    }

    const csvText = await fetchRes.text();
    // Parse CSV lines
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      return res.status(400).json({ error: "La hoja de cálculo está vacía o no tiene filas de datos." });
    }

    const headers = lines[0].split(",").map(h => h.replace(/^["']|["']$/g, "").trim());
    const rawRows = lines.slice(1).map(line => {
      const values = line.split(",").map(v => v.replace(/^["']|["']$/g, "").trim());
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        obj[h] = values[idx] || "";
      });
      return obj;
    });

    const existingClients = readClients();
    let addedCount = 0;
    let updatedCount = 0;

    rawRows.forEach((raw) => {
      const norm = normalizeClientRecord(raw);
      if (!norm) return;

      const keyDni = norm.dni.toLowerCase();
      const keyName = norm.name.toLowerCase();

      const existingIdx = existingClients.findIndex(c => 
        (c.dni && c.dni.toLowerCase() === keyDni && keyDni !== "s/d") ||
        (c.name && c.name.toLowerCase() === keyName)
      );

      if (existingIdx >= 0) {
        existingClients[existingIdx] = {
          ...existingClients[existingIdx],
          ...norm,
          updatedAt: new Date().toISOString()
        };
        updatedCount++;
      } else {
        existingClients.push(norm);
        addedCount++;
      }
    });

    writeClients(existingClients);

    res.json({
      success: true,
      addedCount,
      updatedCount,
      totalClients: existingClients.length,
      message: `¡Google Sheet sincronizado! Se importaron ${addedCount} clientes y se actualizaron ${updatedCount}.`
    });
  } catch (error: any) {
    console.error("Error importing Google Sheet:", error);
    res.status(500).json({ error: `Error al procesar la hoja de Google: ${error?.message || "Sintaxis no válida"}` });
  }
});

// Configurable Google Sheets and Apps Script settings
const SAVED_SHEET_URL_FILE = path.join(process.cwd(), "saved_sheet_url.json");
const DEFAULT_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzvoPzO-magsnJG9EMBGtpawmykzVgc36oZ4-wqJI3PPFGcGt_XVAho3gZbbyozvnaUDQ/exec";

function readSavedSheetUrl(): string {
  try {
    if (fs.existsSync(SAVED_SHEET_URL_FILE)) {
      const data = fs.readFileSync(SAVED_SHEET_URL_FILE, "utf-8");
      const parsed = JSON.parse(data);
      return parsed.url || "";
    }
  } catch (e) {}
  return "";
}

function writeSavedSheetUrl(url: string): void {
  try {
    fs.writeFileSync(SAVED_SHEET_URL_FILE, JSON.stringify({ url, updatedAt: new Date().toISOString() }, null, 2), "utf-8");
  } catch (e) {}
}

// Robust CSV/DSV parser for Google Sheets exports (handles quotes, commas, semicolons, tabs)
function parseCSVOrDSV(text: string) {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const firstLine = lines[0];
  let delimiter = ",";
  if (firstLine.includes("\t")) delimiter = "\t";
  else if ((firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length) delimiter = ";";

  const parseLine = (line: string) => {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim().replace(/^["']|["']$/g, ""));
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^["']|["']$/g, ""));
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length === 0 || values.every(v => v === "")) continue;
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] || "";
    });
    rows.push(obj);
  }

  return rows;
}

// Helper function to sync clients from a Google Sheets URL
async function fetchAndSyncGoogleSheet(url: string) {
  let csvUrl = url;
  if (url.includes("docs.google.com/spreadsheets")) {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      const sheetId = match[1];
      csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
    }
  }

  const fetchRes = await fetch(csvUrl);
  if (!fetchRes.ok) {
    throw new Error("No se pudo descargar la hoja de cálculo. Verifique que el enlace tenga permisos de visualización pública ('Cualquier persona con el enlace').");
  }

  const csvText = await fetchRes.text();
  const rawRows = parseCSVOrDSV(csvText);
  if (rawRows.length === 0) {
    throw new Error("La hoja de cálculo está vacía o no contiene filas de clientes.");
  }

  const existingClients = readClients();
  let addedCount = 0;
  let updatedCount = 0;

  rawRows.forEach((raw) => {
    const norm = normalizeClientRecord(raw);
    if (!norm) return;

    const keyDni = norm.dni.toLowerCase();
    const keyName = norm.name.toLowerCase();

    const existingIdx = existingClients.findIndex(c => 
      (c.dni && c.dni.toLowerCase() === keyDni && keyDni !== "s/d") ||
      (c.name && c.name.toLowerCase() === keyName)
    );

    if (existingIdx >= 0) {
      existingClients[existingIdx] = {
        ...existingClients[existingIdx],
        ...norm,
        updatedAt: new Date().toISOString()
      };
      updatedCount++;
    } else {
      existingClients.push(norm);
      addedCount++;
    }
  });

  writeClients(existingClients);
  writeSavedSheetUrl(url);

  return { addedCount, updatedCount, totalClients: existingClients.length };
}

// Import from Google Sheets public link or Apps Script
app.post("/api/clients/import-google-sheets", async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Se requiere un enlace válido de Google Sheets o Google Apps Script." });
  }

  try {
    const result = await fetchAndSyncGoogleSheet(url);
    res.json({
      success: true,
      addedCount: result.addedCount,
      updatedCount: result.updatedCount,
      totalClients: result.totalClients,
      message: `¡Hoja 'clientes litio apps' sincronizada con éxito! Se procesaron ${result.totalClients} clientes.`
    });
  } catch (error: any) {
    console.error("Error importing Google Sheet:", error);
    res.status(500).json({ error: `Error al procesar Google Sheets: ${error?.message || "Sintaxis no válida"}` });
  }
});

// Search clients by DNI, RUC, Phone, or Name (Unified Search across Google Sheets, Apps Script, Local Clients & Repairs)
app.get("/api/clients/search", async (req, res) => {
  const query = (req.query.query || req.query.dni || "").toString().trim().toLowerCase();
  if (!query) {
    return res.json([]);
  }

  const repairs = readRepairs();
  let importedClients = readClients();
  const matchedClientsMap = new Map<string, any>();

  // A. If saved Google Sheet URL exists, try auto-syncing if query is not in local DB
  const savedSheetUrl = readSavedSheetUrl();
  const localMatchExists = importedClients.some(c => 
    (c.dni && c.dni.toLowerCase().includes(query)) ||
    (c.name && c.name.toLowerCase().includes(query)) ||
    (c.phone && c.phone.toLowerCase().includes(query))
  );

  if (savedSheetUrl && !localMatchExists) {
    try {
      await fetchAndSyncGoogleSheet(savedSheetUrl);
      importedClients = readClients();
    } catch (e) {
      console.log("Auto-sync background attempt on search failed:", e);
    }
  }

  // B. Live Query to Google Apps Script Web App (if returning JSON)
  try {
    const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL;
    const targetUrl = `${scriptUrl}?dni=${encodeURIComponent(query)}&query=${encodeURIComponent(query)}&search=${encodeURIComponent(query)}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const fetchRes = await fetch(targetUrl, { 
      signal: controller.signal,
      headers: { "Accept": "application/json" }
    });
    clearTimeout(timeoutId);

    if (fetchRes.ok) {
      const contentType = fetchRes.headers.get("content-type") || "";
      let responseData: any = null;

      if (contentType.includes("json")) {
        responseData = await fetchRes.json();
      } else {
        const textData = await fetchRes.text();
        try {
          responseData = JSON.parse(textData);
        } catch (e) {}
      }

      if (responseData) {
        let items: any[] = [];
        if (Array.isArray(responseData)) {
          items = responseData;
        } else if (responseData.data && Array.isArray(responseData.data)) {
          items = responseData.data;
        } else if (typeof responseData === "object" && (responseData.dni || responseData.nombre || responseData.name || responseData.cliente)) {
          items = [responseData];
        }

        items.forEach((item) => {
          const norm = normalizeClientRecord(item);
          if (norm) {
            const key = (norm.dni && norm.dni !== "S/D" ? norm.dni : norm.name).toLowerCase();
            matchedClientsMap.set(key, {
              name: norm.name,
              dni: norm.dni,
              phone: norm.phone,
              email: norm.email,
              source: "Google Sheets Litio Apps (Apps Script en Vivo)",
              defaultVehicle: norm.defaultVehicle,
              vehiclesHistory: norm.defaultVehicle ? [{
                type: norm.defaultVehicle.type,
                brand: norm.defaultVehicle.brand,
                model: norm.defaultVehicle.model,
                voltage: norm.defaultVehicle.voltage,
                reportedFailure: "Extraído en vivo desde Google Sheets Litio Apps"
              }] : [],
              totalRepairs: 0
            });

            // Cache into local clients
            const existingIdx = importedClients.findIndex(c => (c.dni && c.dni.toLowerCase() === key) || (c.name && c.name.toLowerCase() === key));
            if (existingIdx === -1) {
              importedClients.push(norm);
              writeClients(importedClients);
            }
          }
        });
      }
    }
  } catch (err: any) {
    console.log("Note: Apps Script query bypassed or timed out:", err?.message || err);
  }

  // C. Match from local imported clients database
  importedClients.forEach((ic) => {
    const dniMatch = (ic.dni || "").toLowerCase().includes(query);
    const nameMatch = (ic.name || "").toLowerCase().includes(query);
    const phoneMatch = (ic.phone || "").toLowerCase().includes(query);

    if (dniMatch || nameMatch || phoneMatch) {
      const key = (ic.dni && ic.dni !== "S/D" ? ic.dni : ic.name).toLowerCase();
      if (!matchedClientsMap.has(key)) {
        matchedClientsMap.set(key, {
          name: ic.name,
          dni: ic.dni,
          phone: ic.phone,
          email: ic.email,
          source: "Google Sheets / Base de Datos Litio",
          defaultVehicle: ic.defaultVehicle,
          vehiclesHistory: ic.defaultVehicle ? [{
            type: ic.defaultVehicle.type,
            brand: ic.defaultVehicle.brand,
            model: ic.defaultVehicle.model,
            voltage: ic.defaultVehicle.voltage,
            reportedFailure: "Vehículo registrado en base de datos de cliente"
          }] : [],
          totalRepairs: 0
        });
      }
    }
  });

  // 3. Merge with history from actual repairs
  repairs.forEach((r) => {
    const client = r.client || {};
    const dniMatch = (client.dni || "").toLowerCase().includes(query);
    const nameMatch = (client.name || "").toLowerCase().includes(query);
    const phoneMatch = (client.phone || "").toLowerCase().includes(query);

    if (dniMatch || nameMatch || phoneMatch) {
      const key = (client.dni || client.name || "").toLowerCase();
      
      if (!matchedClientsMap.has(key)) {
        matchedClientsMap.set(key, {
          name: client.name,
          dni: client.dni,
          phone: client.phone,
          email: client.email,
          source: "Historial Taller Litio",
          vehiclesHistory: [],
          totalRepairs: 0
        });
      }

      const clientEntry = matchedClientsMap.get(key);
      clientEntry.totalRepairs += 1;
      
      // Avoid duplicate vehicle history items
      const hasVehicle = clientEntry.vehiclesHistory.some(
        (vh: any) => vh.repairId === r.id
      );
      if (!hasVehicle) {
        clientEntry.vehiclesHistory.push({
          repairId: r.id,
          receptionDate: r.receptionDate,
          status: r.status,
          type: r.vehicle?.type,
          brand: r.vehicle?.brand,
          model: r.vehicle?.model,
          voltage: r.vehicle?.voltage,
          batteryCondition: r.vehicle?.batteryCondition,
          reportedFailure: r.vehicle?.reportedFailure
        });
      }
    }
  });

  const results = Array.from(matchedClientsMap.values());
  res.json(results);
});

// 3. Get single repair
app.get("/api/repairs/:id", (req, res) => {
  const repairs = readRepairs();
  const repair = repairs.find((r) => r.id === req.params.id);
  if (!repair) {
    return res.status(404).json({ error: "Reparación no encontrada." });
  }
  res.json(repair);
});

// 4. Create new repair
app.post("/api/repairs", (req, res) => {
  const repairs = readRepairs();
  const newRepair = req.body;
  
  // Create unique consecutive sequential ID like LT-2026-0004
  const year = new Date().getFullYear();
  const count = repairs.length + 1;
  const seqId = `LT-${year}-${String(count).padStart(4, "0")}`;
  
  const repairItem = {
    id: seqId,
    receptionDate: new Date().toISOString(),
    client: newRepair.client,
    vehicle: newRepair.vehicle,
    accessories: newRepair.accessories,
    visualState: newRepair.visualState,
    status: "receptioned",
    aiDiagnostic: newRepair.aiDiagnostic || null,
    technicianNotes: "Vehículo recién ingresado por recepción.",
    estimatedCost: Number(newRepair.estimatedCost) || 0,
    actualCost: 0,
    clientSignature: newRepair.clientSignature || "",
    tallerSignature: newRepair.tallerSignature || "",
    clientSignatureName: newRepair.clientSignatureName || "",
    tallerSignatureName: newRepair.tallerSignatureName || "",
    technicianSignature: newRepair.technicianSignature || "",
    technicianSignatureName: newRepair.technicianSignatureName || "",
    historyLog: [
      {
        id: `log_${Date.now()}`,
        date: new Date().toISOString(),
        status: "receptioned",
        description: "Ingreso del vehículo a taller por recepción en tablet.",
        user: newRepair.tallerSignatureName || "Recepcionista Litio"
      }
    ]
  };
  
  repairs.push(repairItem);
  writeRepairs(repairs);
  res.status(201).json(repairItem);
});

// 5. Update repair
app.put("/api/repairs/:id", (req, res) => {
  const repairs = readRepairs();
  const index = repairs.findIndex((r) => r.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: "Reparación no encontrada" });
  }
  
  const currentItem = repairs[index];
  const updateData = req.body;
  
  // Add log if status changed
  const oldStatus = currentItem.status;
  const newStatus = updateData.status;
  let logs = currentItem.historyLog || [];
  
  if (newStatus && oldStatus !== newStatus) {
    const statusLabels: Record<string, string> = {
      receptioned: "Recibido",
      diagnosing: "En Diagnóstico",
      waiting_parts: "Esperando Repuestos",
      repairing: "En Reparación",
      testing: "En Pruebas",
      ready: "Listo para Entrega",
      delivered: "Entregado al Cliente"
    };
    
    logs.push({
      id: `log_${Date.now()}`,
      date: new Date().toISOString(),
      status: newStatus,
      description: `Estado cambiado de "${statusLabels[oldStatus] || oldStatus}" a "${statusLabels[newStatus] || newStatus}".`,
      user: updateData.technicianName || "Sistema Litio"
    });
  }
  
  // Update fields
  repairs[index] = {
    ...currentItem,
    ...updateData,
    historyLog: logs
  };
  
  writeRepairs(repairs);
  res.json(repairs[index]);
});

// 6. Generate AI Diagnostic using Gemini API (via process.env.GEMINI_API_KEY)
app.post("/api/ai-diagnostic", async (req, res) => {
  const { vehicleType, brand, model, voltage, reportedFailure } = req.body;
  
  if (!reportedFailure) {
    return res.status(400).json({ error: "La falla reportada es obligatoria para el diagnóstico IA." });
  }

  const ai = getGeminiClient();
  
  if (!ai) {
    // Graceful fallback if API key is not present or not set up
    console.log("Gemini API Key no configurada. Retornando diagnóstico mock premium.");
    const fallbackDiagnostic = {
      probableCauses: [
        `Falla de aislamiento eléctrico o humedad en conectores (Común en ${vehicleType}).`,
        `Desbalance o caída de tensión en celdas de la batería de ${voltage || 'alta potencia'}.`,
        "Fallo de comunicación por protocolo CAN-Bus o controladora dañada."
      ],
      testProcedures: [
        `Verificar el voltaje total de la batería con un multímetro en el puerto de carga y de descarga.`,
        "Realizar inspección visual de la controladora buscando quemaduras o sulfatación por agua.",
        "Probar funcionamiento del acelerador y sensores Hall del motor con osciloscopio o probador rápido."
      ],
      estimatedTime: "2-4 horas",
      suggestedParts: [
        "Controladora de repuesto compatible",
        "Sensor de acelerador",
        "Sellador dieléctrico"
      ],
      aiNote: "Modo de simulación inteligente activo: Para diagnósticos ultra precisos con Gemini de última generación, configure su clave API en la barra lateral de AI Studio."
    };
    return res.json(fallbackDiagnostic);
  }

  try {
    const prompt = `Actúa como el experto líder de taller en diagnóstico de vehículos eléctricos personales (motos, scooters, bicicletas eléctricas) para "Litio Energy". 
    El cliente ha traído el siguiente vehículo con la siguiente falla reportada:
    
    - Tipo de Vehículo: ${vehicleType}
    - Marca: ${brand || "Genérico"}
    - Modelo: ${model || "Estándar"}
    - Voltaje: ${voltage || "No especificado"}
    - Falla Reportada por el Cliente: "${reportedFailure}"
    
    Por favor genera un diagnóstico estructurado y profesional que oriente al técnico de taller.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Genera tu respuesta estrictamente en formato JSON utilizando el esquema de respuesta provisto. Todo el contenido debe ser en idioma Español claro, profesional y de alta utilidad técnica de taller.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            probableCauses: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3 causas técnicas más probables del fallo para este modelo o tipo de vehículo"
            },
            testProcedures: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3 o 4 procedimientos técnicos paso a paso para diagnosticar este fallo específico en taller"
            },
            estimatedTime: {
              type: Type.STRING,
              description: "Tiempo estimado promedio para realizar la reparación (ej. '1.5 - 3 horas')"
            },
            suggestedParts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Repuestos comunes o insumos necesarios que el técnico debe alistar"
            },
            aiNote: {
              type: Type.STRING,
              description: "Consejo rápido de seguridad o advertencia de Litio Energy especial para este tipo de reparación de potencia"
            }
          },
          required: ["probableCauses", "testProcedures", "estimatedTime", "suggestedParts", "aiNote"]
        }
      }
    });

    const resultText = response.text || "{}";
    const diagnostic = JSON.parse(resultText);
    res.json(diagnostic);
  } catch (error: any) {
    console.error("Error al generar diagnóstico con Gemini API:", error);
    res.status(500).json({ error: "Error de comunicación con la IA. Por favor, reintente." });
  }
});


// Serve React app
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Litio Energy server running on http://localhost:${PORT}`);
  });
}

startServer();
