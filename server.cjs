var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json());
var REPAIRS_FILE = import_path.default.join(process.cwd(), "repairs.json");
var CLIENTS_FILE = import_path.default.join(process.cwd(), "clients.json");
function readClients() {
  try {
    if (!import_fs.default.existsSync(CLIENTS_FILE)) {
      const initialClients = [
        {
          dni: "74839201",
          name: "Juan P\xE9rez Ramos",
          phone: "+51 987 654 321",
          email: "juan.perez@example.com",
          defaultVehicle: {
            type: "scooter",
            brand: "Xiaomi",
            model: "Pro 2",
            voltage: "36V"
          },
          importedAt: (/* @__PURE__ */ new Date()).toISOString()
        },
        {
          dni: "10472819",
          name: "Mar\xEDa L\xF3pez Fern\xE1ndez",
          phone: "+51 912 345 678",
          email: "maria.lopez@gmail.com",
          defaultVehicle: {
            type: "bike",
            brand: "Segway Ninebot",
            model: "MAX G30",
            voltage: "48V"
          },
          importedAt: (/* @__PURE__ */ new Date()).toISOString()
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
          importedAt: (/* @__PURE__ */ new Date()).toISOString()
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
          importedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      ];
      import_fs.default.writeFileSync(CLIENTS_FILE, JSON.stringify(initialClients, null, 2), "utf-8");
      return initialClients;
    }
    const data = import_fs.default.readFileSync(CLIENTS_FILE, "utf-8");
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const initialClients = [
        {
          dni: "74839201",
          name: "Juan P\xE9rez Ramos",
          phone: "+51 987 654 321",
          email: "juan.perez@example.com",
          defaultVehicle: {
            type: "scooter",
            brand: "Xiaomi",
            model: "Pro 2",
            voltage: "36V"
          },
          importedAt: (/* @__PURE__ */ new Date()).toISOString()
        },
        {
          dni: "10472819",
          name: "Mar\xEDa L\xF3pez Fern\xE1ndez",
          phone: "+51 912 345 678",
          email: "maria.lopez@gmail.com",
          defaultVehicle: {
            type: "bike",
            brand: "Segway Ninebot",
            model: "MAX G30",
            voltage: "48V"
          },
          importedAt: (/* @__PURE__ */ new Date()).toISOString()
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
          importedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      ];
      import_fs.default.writeFileSync(CLIENTS_FILE, JSON.stringify(initialClients, null, 2), "utf-8");
      return initialClients;
    }
    return parsed;
  } catch (error) {
    console.error("Error reading clients file:", error);
    return [];
  }
}
function writeClients(clients) {
  try {
    import_fs.default.writeFileSync(CLIENTS_FILE, JSON.stringify(clients, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing clients file:", error);
  }
}
function readRepairs() {
  try {
    if (!import_fs.default.existsSync(REPAIRS_FILE)) {
      const initialSeed = [
        {
          id: "LT-2026-0001",
          receptionDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1e3).toISOString(),
          client: {
            name: "Juan P\xE9rez",
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
            reportedFailure: "No enciende despu\xE9s de pasar por un charco de agua. Tampoco carga."
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
              "Cortocircuito en el puerto de carga o bater\xEDa.",
              "Fallo del BMS de la bater\xEDa debido a filtraci\xF3n de agua."
            ],
            testProcedures: [
              "Desmontar la tapa inferior del chasis con precauci\xF3n.",
              "Inspeccionar visualmente rastros de humedad u oxidaci\xF3n en placa madre.",
              "Medir voltaje directo de salida de la bater\xEDa con mult\xEDmetro.",
              "Verificar estado de los fusibles t\xE9rmicos en la controladora."
            ],
            estimatedTime: "2 a 3 horas",
            suggestedParts: [
              "Controladora Xiaomi Pro 2",
              "Aislante/Silicona de sellado de chasis",
              "Puerto de carga nuevo"
            ],
            aiNote: "ADVERTENCIA: Si sospecha ingreso de agua en la bater\xEDa, no conecte el cargador. Riesgo de fuga t\xE9rmica. Deje secar el compartimento en zona ventilada."
          },
          technicianNotes: "Se desmont\xF3 la tapa inferior. Se encontr\xF3 rastro de agua condensada cerca a la controladora. Se procedi\xF3 a limpieza con alcohol isoprop\xEDlico. Bater\xEDa marca 37.2V directos, el BMS est\xE1 bien. Se dejar\xE1 secar 24h.",
          estimatedCost: 150,
          actualCost: 150,
          historyLog: [
            {
              id: "log_1",
              date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1e3).toISOString(),
              status: "receptioned",
              description: "Veh\xEDculo recibido en taller para diagn\xF3stico.",
              user: "Recepcionista Litio"
            },
            {
              id: "log_2",
              date: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1e3).toISOString(),
              status: "diagnosing",
              description: "Iniciado diagn\xF3stico t\xE9cnico. Se detecta rastro de humedad.",
              user: "T\xE9c. Carlos"
            },
            {
              id: "log_3",
              date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1e3).toISOString(),
              status: "repairing",
              description: "Humedad encontrada en placa de control. Limpieza y secado en progreso.",
              user: "T\xE9c. Carlos"
            }
          ]
        },
        {
          id: "LT-2026-0002",
          receptionDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1e3).toISOString(),
          client: {
            name: "Mar\xEDa G\xF3mez",
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
            reportedFailure: "Ruido met\xE1lico extra\xF1o en el motor central al pedalear con asistencia alta."
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
              "Rodamientos del eje pedalier da\xF1ados.",
              "Fijaci\xF3n floja del motor al cuadro de la bicicleta."
            ],
            testProcedures: [
              "Asegurar los pernos de montaje del motor central Trek/Bosch.",
              "Probar la bicicleta en pedestal de taller aplicando resistencia al pedal.",
              "Desacoplar la cadena para aislar el ruido del motor frente a la transmisi\xF3n."
            ],
            estimatedTime: "3 a 5 horas",
            suggestedParts: [
              "Rodamiento de eje central",
              "Grasa especial para engranajes de nylon (Bosch approved)",
              "Kit de sellos del motor"
            ],
            aiNote: "Recuerde no abrir la carcasa del motor central si el veh\xEDculo est\xE1 en periodo de garant\xEDa oficial Trek."
          },
          technicianNotes: "Pendiente de ingresar a la estaci\xF3n del t\xE9cnico Carlos.",
          estimatedCost: 220,
          actualCost: 0,
          historyLog: [
            {
              id: "log_4",
              date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1e3).toISOString(),
              status: "receptioned",
              description: "Bicicleta el\xE9ctrica Trek ingresada a taller. Llave y bater\xEDa entregadas por la cliente.",
              user: "Recepcionista Litio"
            }
          ]
        },
        {
          id: "LT-2026-0003",
          receptionDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1e3).toISOString(),
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
            reportedFailure: "P\xE9rdida de fuerza s\xFAbita al subir cuestas empinadas, el display parpadea con c\xF3digo de error 96."
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
            notes: "Llanta trasera desgastada. Ray\xF3n leve en el carenado derecho."
          },
          status: "ready",
          aiDiagnostic: {
            probableCauses: [
              "Sobrecalentamiento del controlador de motor debido a alta demanda.",
              "Bajo voltaje temporal (sag) en las celdas de la bater\xEDa de 72V.",
              "Fallo de comunicaci\xF3n del cable de fase del motor hub."
            ],
            testProcedures: [
              "Verificar temperatura de la controladora en carga.",
              "Escanear c\xF3digos OBD o revisar el manual del controlador Super Soco para Error 96 (Suele ser sobrecorriente o sensor Hall).",
              "Reajustar los conectores de fase de alta tensi\xF3n."
            ],
            estimatedTime: "1 a 2 horas",
            suggestedParts: [
              "Aislante t\xE9rmico para controladora",
              "Terminales de fase de alta resistencia"
            ],
            aiNote: "ATENCI\xD3N: Manejar la bater\xEDa de 72V con herramientas aisladas. Altas tensiones de CC."
          },
          technicianNotes: "Error 96 indica sobrecalentamiento/protecci\xF3n del controlador. Se limpiaron las aletas de disipaci\xF3n del controlador y se reajust\xF3 la pasta t\xE9rmica. Tambi\xE9n se ajustaron las fases del motor que estaban sueltas. En pruebas posteriores de esfuerzo no volvi\xF3 a fallar.",
          estimatedCost: 180,
          actualCost: 180,
          historyLog: [
            {
              id: "log_5",
              date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1e3).toISOString(),
              status: "receptioned",
              description: "Moto el\xE9ctrica ingresada a taller.",
              user: "Recepcionista Litio"
            },
            {
              id: "log_6",
              date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1e3).toISOString(),
              status: "diagnosing",
              description: "Escaneo de error 96 y ajuste de terminales de potencia.",
              user: "T\xE9c. Sandra"
            },
            {
              id: "log_7",
              date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1e3).toISOString(),
              status: "testing",
              description: "Pruebas de ruta realizadas con \xE9xito. Se subieron pendientes sin p\xE9rdida de fuerza.",
              user: "T\xE9c. Sandra"
            },
            {
              id: "log_8",
              date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1e3).toISOString(),
              status: "ready",
              description: "Veh\xEDculo listo para entrega. Presupuesto final confirmado.",
              user: "T\xE9c. Sandra"
            }
          ]
        }
      ];
      import_fs.default.writeFileSync(REPAIRS_FILE, JSON.stringify(initialSeed, null, 2), "utf-8");
      return initialSeed;
    }
    const data = import_fs.default.readFileSync(REPAIRS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error al leer base de datos:", error);
    return [];
  }
}
function writeRepairs(repairs) {
  try {
    import_fs.default.writeFileSync(REPAIRS_FILE, JSON.stringify(repairs, null, 2), "utf-8");
  } catch (error) {
    console.error("Error al escribir base de datos:", error);
  }
}
var aiClient = null;
function getGeminiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      aiClient = new import_genai.GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
    }
  }
  return aiClient;
}
app.get("/api/repairs", (req, res) => {
  const repairs = readRepairs();
  res.json(repairs);
});
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
    monthlyEarnings: repairs.filter((r) => r.status === "delivered" || r.status === "ready").reduce((sum, r) => sum + (r.actualCost || r.estimatedCost || 0), 0)
  };
  res.json(stats);
});
app.get("/api/clients", (req, res) => {
  const clients = readClients();
  res.json(clients);
});
app.delete("/api/clients", (req, res) => {
  writeClients([]);
  res.json({ success: true, message: "Base de datos de clientes limpiada correctamente." });
});
function normalizeClientRecord(raw) {
  if (!raw || typeof raw !== "object") return null;
  const keys = Object.keys(raw);
  const getVal = (...patterns) => {
    for (const p of patterns) {
      const match = keys.find((k) => k.toLowerCase().replace(/[^a-z0-9]/g, "").includes(p.toLowerCase()));
      if (match && raw[match] !== void 0 && raw[match] !== null && String(raw[match]).trim() !== "") {
        return String(raw[match]).trim();
      }
    }
    return "";
  };
  const dni = getVal("dni", "ruc", "documento", "cedula", "id", "numdoc");
  const name = getVal("nombre", "cliente", "razon", "name", "contacto", "apellidos");
  const phone = getVal("telefono", "celular", "tel", "phone", "movil", "whatsapp");
  const email = getVal("email", "correo", "mail");
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
      voltage
    },
    importedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
app.post("/api/clients/import", (req, res) => {
  const { clients: rawList } = req.body;
  if (!Array.isArray(rawList)) {
    return res.status(400).json({ error: "El formato debe incluir una lista 'clients' v\xE1lida." });
  }
  const existingClients = readClients();
  const existingDnis = new Set(existingClients.map((c) => (c.dni || "").toLowerCase()));
  const existingNames = new Set(existingClients.map((c) => (c.name || "").toLowerCase()));
  let addedCount = 0;
  let updatedCount = 0;
  rawList.forEach((raw) => {
    const norm = normalizeClientRecord(raw);
    if (!norm) return;
    const keyDni = norm.dni.toLowerCase();
    const keyName = norm.name.toLowerCase();
    const existingIdx = existingClients.findIndex(
      (c) => c.dni && c.dni.toLowerCase() === keyDni && keyDni !== "s/d" || c.name && c.name.toLowerCase() === keyName
    );
    if (existingIdx >= 0) {
      existingClients[existingIdx] = {
        ...existingClients[existingIdx],
        ...norm,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
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
app.post("/api/clients/import-google-sheets", async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Se requiere un enlace v\xE1lido de Google Sheets." });
  }
  try {
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
        error: "No se pudo descargar la hoja de c\xE1lculo. Aseg\xFArese de que el enlace de Google Sheets est\xE9 configurado como 'Cualquier persona con el enlace puede ver'."
      });
    }
    const csvText = await fetchRes.text();
    const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) {
      return res.status(400).json({ error: "La hoja de c\xE1lculo est\xE1 vac\xEDa o no tiene filas de datos." });
    }
    const headers = lines[0].split(",").map((h) => h.replace(/^["']|["']$/g, "").trim());
    const rawRows = lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.replace(/^["']|["']$/g, "").trim());
      const obj = {};
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
      const existingIdx = existingClients.findIndex(
        (c) => c.dni && c.dni.toLowerCase() === keyDni && keyDni !== "s/d" || c.name && c.name.toLowerCase() === keyName
      );
      if (existingIdx >= 0) {
        existingClients[existingIdx] = {
          ...existingClients[existingIdx],
          ...norm,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
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
      message: `\xA1Google Sheet sincronizado! Se importaron ${addedCount} clientes y se actualizaron ${updatedCount}.`
    });
  } catch (error) {
    console.error("Error importing Google Sheet:", error);
    res.status(500).json({ error: `Error al procesar la hoja de Google: ${error?.message || "Sintaxis no v\xE1lida"}` });
  }
});
var SAVED_SHEET_URL_FILE = import_path.default.join(process.cwd(), "saved_sheet_url.json");
var DEFAULT_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzvoPzO-magsnJG9EMBGtpawmykzVgc36oZ4-wqJI3PPFGcGt_XVAho3gZbbyozvnaUDQ/exec";
function readSavedSheetUrl() {
  try {
    if (import_fs.default.existsSync(SAVED_SHEET_URL_FILE)) {
      const data = import_fs.default.readFileSync(SAVED_SHEET_URL_FILE, "utf-8");
      const parsed = JSON.parse(data);
      return parsed.url || "";
    }
  } catch (e) {
  }
  return "";
}
function writeSavedSheetUrl(url) {
  try {
    import_fs.default.writeFileSync(SAVED_SHEET_URL_FILE, JSON.stringify({ url, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, null, 2), "utf-8");
  } catch (e) {
  }
}
function parseCSVOrDSV(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];
  const firstLine = lines[0];
  let delimiter = ",";
  if (firstLine.includes("	")) delimiter = "	";
  else if ((firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length) delimiter = ";";
  const parseLine = (line) => {
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
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length === 0 || values.every((v) => v === "")) continue;
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] || "";
    });
    rows.push(obj);
  }
  return rows;
}
async function fetchAndSyncGoogleSheet(url) {
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
    throw new Error("No se pudo descargar la hoja de c\xE1lculo. Verifique que el enlace tenga permisos de visualizaci\xF3n p\xFAblica ('Cualquier persona con el enlace').");
  }
  const csvText = await fetchRes.text();
  const rawRows = parseCSVOrDSV(csvText);
  if (rawRows.length === 0) {
    throw new Error("La hoja de c\xE1lculo est\xE1 vac\xEDa o no contiene filas de clientes.");
  }
  const existingClients = readClients();
  let addedCount = 0;
  let updatedCount = 0;
  rawRows.forEach((raw) => {
    const norm = normalizeClientRecord(raw);
    if (!norm) return;
    const keyDni = norm.dni.toLowerCase();
    const keyName = norm.name.toLowerCase();
    const existingIdx = existingClients.findIndex(
      (c) => c.dni && c.dni.toLowerCase() === keyDni && keyDni !== "s/d" || c.name && c.name.toLowerCase() === keyName
    );
    if (existingIdx >= 0) {
      existingClients[existingIdx] = {
        ...existingClients[existingIdx],
        ...norm,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
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
app.post("/api/clients/import-google-sheets", async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Se requiere un enlace v\xE1lido de Google Sheets o Google Apps Script." });
  }
  try {
    const result = await fetchAndSyncGoogleSheet(url);
    res.json({
      success: true,
      addedCount: result.addedCount,
      updatedCount: result.updatedCount,
      totalClients: result.totalClients,
      message: `\xA1Hoja 'clientes litio apps' sincronizada con \xE9xito! Se procesaron ${result.totalClients} clientes.`
    });
  } catch (error) {
    console.error("Error importing Google Sheet:", error);
    res.status(500).json({ error: `Error al procesar Google Sheets: ${error?.message || "Sintaxis no v\xE1lida"}` });
  }
});
app.get("/api/clients/search", async (req, res) => {
  const query = (req.query.query || req.query.dni || "").toString().trim().toLowerCase();
  if (!query) {
    return res.json([]);
  }
  const repairs = readRepairs();
  let importedClients = readClients();
  const matchedClientsMap = /* @__PURE__ */ new Map();
  const savedSheetUrl = readSavedSheetUrl();
  const localMatchExists = importedClients.some(
    (c) => c.dni && c.dni.toLowerCase().includes(query) || c.name && c.name.toLowerCase().includes(query) || c.phone && c.phone.toLowerCase().includes(query)
  );
  if (savedSheetUrl && !localMatchExists) {
    try {
      await fetchAndSyncGoogleSheet(savedSheetUrl);
      importedClients = readClients();
    } catch (e) {
      console.log("Auto-sync background attempt on search failed:", e);
    }
  }
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
      let responseData = null;
      if (contentType.includes("json")) {
        responseData = await fetchRes.json();
      } else {
        const textData = await fetchRes.text();
        try {
          responseData = JSON.parse(textData);
        } catch (e) {
        }
      }
      if (responseData) {
        let items = [];
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
                reportedFailure: "Extra\xEDdo en vivo desde Google Sheets Litio Apps"
              }] : [],
              totalRepairs: 0
            });
            const existingIdx = importedClients.findIndex((c) => c.dni && c.dni.toLowerCase() === key || c.name && c.name.toLowerCase() === key);
            if (existingIdx === -1) {
              importedClients.push(norm);
              writeClients(importedClients);
            }
          }
        });
      }
    }
  } catch (err) {
    console.log("Note: Apps Script query bypassed or timed out:", err?.message || err);
  }
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
            reportedFailure: "Veh\xEDculo registrado en base de datos de cliente"
          }] : [],
          totalRepairs: 0
        });
      }
    }
  });
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
      const hasVehicle = clientEntry.vehiclesHistory.some(
        (vh) => vh.repairId === r.id
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
app.get("/api/repairs/:id", (req, res) => {
  const repairs = readRepairs();
  const repair = repairs.find((r) => r.id === req.params.id);
  if (!repair) {
    return res.status(404).json({ error: "Reparaci\xF3n no encontrada." });
  }
  res.json(repair);
});
app.post("/api/repairs", (req, res) => {
  const repairs = readRepairs();
  const newRepair = req.body;
  const year = (/* @__PURE__ */ new Date()).getFullYear();
  const count = repairs.length + 1;
  const seqId = `LT-${year}-${String(count).padStart(4, "0")}`;
  const repairItem = {
    id: seqId,
    receptionDate: (/* @__PURE__ */ new Date()).toISOString(),
    client: newRepair.client,
    vehicle: newRepair.vehicle,
    accessories: newRepair.accessories,
    visualState: newRepair.visualState,
    status: "receptioned",
    aiDiagnostic: newRepair.aiDiagnostic || null,
    technicianNotes: "Veh\xEDculo reci\xE9n ingresado por recepci\xF3n.",
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
        date: (/* @__PURE__ */ new Date()).toISOString(),
        status: "receptioned",
        description: "Ingreso del veh\xEDculo a taller por recepci\xF3n en tablet.",
        user: newRepair.tallerSignatureName || "Recepcionista Litio"
      }
    ]
  };
  repairs.push(repairItem);
  writeRepairs(repairs);
  res.status(201).json(repairItem);
});
app.put("/api/repairs/:id", (req, res) => {
  const repairs = readRepairs();
  const index = repairs.findIndex((r) => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Reparaci\xF3n no encontrada" });
  }
  const currentItem = repairs[index];
  const updateData = req.body;
  const oldStatus = currentItem.status;
  const newStatus = updateData.status;
  let logs = currentItem.historyLog || [];
  if (newStatus && oldStatus !== newStatus) {
    const statusLabels = {
      receptioned: "Recibido",
      diagnosing: "En Diagn\xF3stico",
      waiting_parts: "Esperando Repuestos",
      repairing: "En Reparaci\xF3n",
      testing: "En Pruebas",
      ready: "Listo para Entrega",
      delivered: "Entregado al Cliente"
    };
    logs.push({
      id: `log_${Date.now()}`,
      date: (/* @__PURE__ */ new Date()).toISOString(),
      status: newStatus,
      description: `Estado cambiado de "${statusLabels[oldStatus] || oldStatus}" a "${statusLabels[newStatus] || newStatus}".`,
      user: updateData.technicianName || "Sistema Litio"
    });
  }
  repairs[index] = {
    ...currentItem,
    ...updateData,
    historyLog: logs
  };
  writeRepairs(repairs);
  res.json(repairs[index]);
});
app.post("/api/ai-diagnostic", async (req, res) => {
  const { vehicleType, brand, model, voltage, reportedFailure } = req.body;
  if (!reportedFailure) {
    return res.status(400).json({ error: "La falla reportada es obligatoria para el diagn\xF3stico IA." });
  }
  const ai = getGeminiClient();
  if (!ai) {
    console.log("Gemini API Key no configurada. Retornando diagn\xF3stico mock premium.");
    const fallbackDiagnostic = {
      probableCauses: [
        `Falla de aislamiento el\xE9ctrico o humedad en conectores (Com\xFAn en ${vehicleType}).`,
        `Desbalance o ca\xEDda de tensi\xF3n en celdas de la bater\xEDa de ${voltage || "alta potencia"}.`,
        "Fallo de comunicaci\xF3n por protocolo CAN-Bus o controladora da\xF1ada."
      ],
      testProcedures: [
        `Verificar el voltaje total de la bater\xEDa con un mult\xEDmetro en el puerto de carga y de descarga.`,
        "Realizar inspecci\xF3n visual de la controladora buscando quemaduras o sulfataci\xF3n por agua.",
        "Probar funcionamiento del acelerador y sensores Hall del motor con osciloscopio o probador r\xE1pido."
      ],
      estimatedTime: "2-4 horas",
      suggestedParts: [
        "Controladora de repuesto compatible",
        "Sensor de acelerador",
        "Sellador diel\xE9ctrico"
      ],
      aiNote: "Modo de simulaci\xF3n inteligente activo: Para diagn\xF3sticos ultra precisos con Gemini de \xFAltima generaci\xF3n, configure su clave API en la barra lateral de AI Studio."
    };
    return res.json(fallbackDiagnostic);
  }
  try {
    const prompt = `Act\xFAa como el experto l\xEDder de taller en diagn\xF3stico de veh\xEDculos el\xE9ctricos personales (motos, scooters, bicicletas el\xE9ctricas) para "Litio Energy". 
    El cliente ha tra\xEDdo el siguiente veh\xEDculo con la siguiente falla reportada:
    
    - Tipo de Veh\xEDculo: ${vehicleType}
    - Marca: ${brand || "Gen\xE9rico"}
    - Modelo: ${model || "Est\xE1ndar"}
    - Voltaje: ${voltage || "No especificado"}
    - Falla Reportada por el Cliente: "${reportedFailure}"
    
    Por favor genera un diagn\xF3stico estructurado y profesional que oriente al t\xE9cnico de taller.`;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Genera tu respuesta estrictamente en formato JSON utilizando el esquema de respuesta provisto. Todo el contenido debe ser en idioma Espa\xF1ol claro, profesional y de alta utilidad t\xE9cnica de taller.",
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.OBJECT,
          properties: {
            probableCauses: {
              type: import_genai.Type.ARRAY,
              items: { type: import_genai.Type.STRING },
              description: "3 causas t\xE9cnicas m\xE1s probables del fallo para este modelo o tipo de veh\xEDculo"
            },
            testProcedures: {
              type: import_genai.Type.ARRAY,
              items: { type: import_genai.Type.STRING },
              description: "3 o 4 procedimientos t\xE9cnicos paso a paso para diagnosticar este fallo espec\xEDfico en taller"
            },
            estimatedTime: {
              type: import_genai.Type.STRING,
              description: "Tiempo estimado promedio para realizar la reparaci\xF3n (ej. '1.5 - 3 horas')"
            },
            suggestedParts: {
              type: import_genai.Type.ARRAY,
              items: { type: import_genai.Type.STRING },
              description: "Repuestos comunes o insumos necesarios que el t\xE9cnico debe alistar"
            },
            aiNote: {
              type: import_genai.Type.STRING,
              description: "Consejo r\xE1pido de seguridad o advertencia de Litio Energy especial para este tipo de reparaci\xF3n de potencia"
            }
          },
          required: ["probableCauses", "testProcedures", "estimatedTime", "suggestedParts", "aiNote"]
        }
      }
    });
    const resultText = response.text || "{}";
    const diagnostic = JSON.parse(resultText);
    res.json(diagnostic);
  } catch (error) {
    console.error("Error al generar diagn\xF3stico con Gemini API:", error);
    res.status(500).json({ error: "Error de comunicaci\xF3n con la IA. Por favor, reintente." });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Litio Energy server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
