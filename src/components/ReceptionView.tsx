import React, { useState, useEffect, useMemo } from "react";
import { 
  PlusCircle, 
  User, 
  Smartphone, 
  Clipboard, 
  Battery, 
  HelpCircle, 
  Wrench, 
  Sparkles, 
  Check, 
  AlertTriangle, 
  Tag, 
  FileText, 
  Gauge,
  MapPin,
  Video,
  Camera,
  Trash2,
  FileSignature,
  Printer,
  Pencil,
  Search,
  Database,
  History,
  CheckCircle2,
  FileSpreadsheet,
  Upload,
  Link,
  Code,
  Copy,
  X,
  Table,
  CloudDownload,
  Mic,
  Play,
  Zap
} from "lucide-react";
import { RepairItem, VehicleType, VisualState, Accessories, WorkshopBranch, ServiceType } from "../types";
import { SignaturePad, PhotoManager, VideoRecorder, RecordedVideo } from "./TabletHelpers";
import { generateRepairPdf } from "../utils/pdfGenerator";
import { db, isFirebaseConfigured, collection, doc, setDoc, query, where, getDocs, onSnapshot, orderBy, limit } from "../firebase";

interface ReceptionViewProps {
  repairs: RepairItem[];
  onCreateRepair: (newRepair: any) => Promise<RepairItem | undefined>;
  onDeleteRepair?: (repair: RepairItem) => Promise<void>;
  onUpdateRepair?: (id: string, updates: Partial<RepairItem>) => Promise<void>;
  isLoading: boolean;
  userLocalKey?: string;
  userRole?: string;
  onOpenExpress?: () => void;
}

const COMMON_BRANDS: Record<VehicleType, string[]> = {
  scooter: ["Xiaomi", "Segway Ninebot", "Minimotors Dualtron", "Kaabo", "Vsett", "Blade", "Navee", "Yadea", "Tailg"],
  bici: ["Trek", "Specialized", "Giant", "Xiaomi Himo", "Decathlon Rockrider", "Cube", "Scott", "Moustache"],
  moto: ["Super Soco", "Niu", "E-Volt", "Vespa Elettrica", "Sur-Ron", "Talaria", "Zero Motorcycles"],
  bicimoto: ["Bimotion", "Super Soco", "Niu", "Koyota", "Thunder", "E-Volt", "Genérica"],
  trimoto: ["Bajaj", "Koyota", "Zuzuki", "Thunder", "Yingang", "Honda", "Genérica"],
  otro: ["Monociclo KingSong", "Monociclo Begode", "Skateboard Boosted", "Triciclo de carga"]
};

const VOLTAGES = ["24V --- 7 series", "36V --- 10 series", "48V --- 13 series", "52V --- 14 series", "60V --- 16 series", "64V --- 17 series", "72V --- 20 series", "No sabe"];

function SpeechToTextButton({ onResult, label }: { onResult: (text: string) => void; label: string }) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = React.useRef<any>(null);

  const toggle = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge."); return; }
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = "es-PE";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (e: any) => {
      let t = "";
      for (let i = e.resultIndex; i < e.results.length; i++) { if (e.results[i].isFinal) t += e.results[i][0].transcript + " "; }
      if (t) onResult(t.trim());
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    setIsListening(true);
    recognition.start();
  };

  return (
    <button type="button" onClick={toggle}
      className={`absolute right-2 bottom-2 p-1.5 rounded-lg border text-xs font-bold transition-all z-10 ${isListening ? "bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse" : "bg-slate-800 border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50"}`}
      title={isListening ? "Detener dictado" : `Dictar ${label} por voz`}
    >
      <Mic className="w-3.5 h-3.5" />
    </button>
  );
}

const WORKSHOP_BRANCH_LABELS: Record<WorkshopBranch, string> = {
  lince_arenales: "Sede San Isidro (Av. Arenales 2584)",
  surco: "Sede Surco (Av. Santiago de Surco 4352)",
  san_borja: "Sede San Borja (Av. Aviación 2410)",
  lince_leal: "Sede Lince (Av. Jose Leal 571)"
};

// Mismo mapeo que la app usa al guardar el cliente (campo "sede")
const BRANCH_TO_SEDE_LABEL: Record<string, string> = {
  lince_arenales: "Litio Lince",
  surco: "Litio Surco",
  san_borja: "Litio San Borja",
  lince_leal: "Litio Jose Leal"
};

// Etiquetas de sede usadas por la app Android (puede variar por versión)
const ANDROID_SEDE_LABELS: Record<string, string[]> = {
  lince_arenales: ["Litio Lince", "Litio San Isidro", "Litio Arenales"],
  surco: ["Litio Surco"],
  san_borja: ["Litio San Borja"],
  lince_leal: ["Litio Jose Leal", "Litio Leal"]
};

// Convierte la etiqueta de vehículo de la app Android al tipo interno
const ANDROID_TYPE_KEYS: Record<string, string> = {
  Scooter: "scooter",
  Bicicleta: "bici",
  Moto: "moto",
  Bicimoto: "bicimoto",
  Trimoto: "trimoto",
  Otro: "otro"
};

export default function ReceptionView({ repairs, onCreateRepair, onDeleteRepair, onUpdateRepair, isLoading, userLocalKey, userRole, onOpenExpress }: ReceptionViewProps) {
  // Branch state (Sede)
  const [workshopBranch, setWorkshopBranch] = useState<WorkshopBranch>(
    (userLocalKey as WorkshopBranch) || "lince_arenales"
  );

  // Clientes ingresados desde la app Android (colección "clientes")
  const [androidClients, setAndroidClients] = useState<any[]>([]);
  useEffect(() => {
    if (!isFirebaseConfigured || !db) return;
    const q = query(collection(db, "clientes"), orderBy("createdAt", "desc"), limit(80));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setAndroidClients(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      },
      (err) => console.error("Error cargando clientes de la app Android:", err)
    );
    return unsub;
  }, []);

  // Service Type state
  const [serviceType, setServiceType] = useState<ServiceType>("mantenimiento");
  const [serviceTypeDetail, setServiceTypeDetail] = useState("");
  const [scheduledDeadline, setScheduledDeadline] = useState<string>("");

  // Client State
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientDni, setClientDni] = useState(""); // Will hold DNI or C.E

  // DNI Search / Client Auto-fill State
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [foundClientData, setFoundClientData] = useState<any | null>(null);
  const [clientSearchStatus, setClientSearchStatus] = useState<"idle" | "found" | "not_found">("idle");

  // Import Datasheet / Google Sheets / Excel Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTab, setImportTab] = useState<"sheet_url" | "apps_script" | "file" | "text">("sheet_url");
  const [sheetUrlInput, setSheetUrlInput] = useState("");
  const [pastedTextInput, setPastedTextInput] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importStatusMessage, setImportStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);

  // Edit client state
  const [editingRepairId, setEditingRepairId] = useState<string | null>(null);
  const [editClientName, setEditClientName] = useState("");
  const [editClientPhone, setEditClientPhone] = useState("");
  const [editClientEmail, setEditClientEmail] = useState("");
  const [editClientDni, setEditClientDni] = useState("");

  const handleImportGoogleSheets = async () => {
    if (!sheetUrlInput || !sheetUrlInput.trim()) {
      setImportStatusMessage({ type: "error", text: "Por favor pegue el enlace de su Google Sheets." });
      return;
    }

    setImportLoading(true);
    setImportStatusMessage(null);

    try {
      const res = await fetch("/api/clients/import-google-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sheetUrlInput.trim() })
      });

      const data = await res.json();
      if (res.ok) {
        setImportStatusMessage({ type: "success", text: data.message || "¡Clientes sincronizados correctamente desde Google Sheets!" });
        setSheetUrlInput("");
      } else {
        setImportStatusMessage({ type: "error", text: data.error || "Error al conectar con Google Sheets." });
      }
    } catch (e: any) {
      setImportStatusMessage({ type: "error", text: `Error de conexión: ${e.message}` });
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportPastedText = async () => {
    if (!pastedTextInput || !pastedTextInput.trim()) {
      setImportStatusMessage({ type: "error", text: "Por favor pegue las filas de texto o CSV." });
      return;
    }

    setImportLoading(true);
    setImportStatusMessage(null);

    try {
      const lines = pastedTextInput.split(/\r?\n/).filter(l => l.trim().length > 0);
      const parsedClients = lines.map(line => {
        const parts = line.split(/[,;\t]/).map(p => p.trim());
        return {
          dni: parts[0] || "",
          name: parts[1] || parts[0] || "",
          phone: parts[2] || "",
          email: parts[3] || "",
          brand: parts[4] || "",
          model: parts[5] || ""
        };
      });

      const res = await fetch("/api/clients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clients: parsedClients })
      });

      const data = await res.json();
      if (res.ok) {
        setImportStatusMessage({ type: "success", text: data.message || "¡Texto procesado e importado!" });
        setPastedTextInput("");
      } else {
        setImportStatusMessage({ type: "error", text: data.error || "Error al importar el texto." });
      }
    } catch (e: any) {
      setImportStatusMessage({ type: "error", text: `Error de procesamiento: ${e.message}` });
    } finally {
      setImportLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportLoading(true);
    setImportStatusMessage(null);

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      
      let rawClients: any[] = [];
      if (lines.length > 0) {
        const headers = lines[0].split(/[,;\t]/).map(h => h.replace(/^["']|["']$/g, "").trim());
        rawClients = lines.slice(1).map(line => {
          const vals = line.split(/[,;\t]/).map(v => v.replace(/^["']|["']$/g, "").trim());
          const obj: Record<string, string> = {};
          headers.forEach((h, idx) => {
            obj[h] = vals[idx] || "";
          });
          return obj;
        });
      }

      const res = await fetch("/api/clients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clients: rawClients })
      });

      const data = await res.json();
      if (res.ok) {
        setImportStatusMessage({ type: "success", text: data.message || `¡Archivo ${file.name} importado exitosamente!` });
      } else {
        setImportStatusMessage({ type: "error", text: data.error || "Error al importar el archivo." });
      }
    } catch (e: any) {
      setImportStatusMessage({ type: "error", text: `No se pudo leer el archivo: ${e.message}` });
    } finally {
      setImportLoading(false);
    }
  };

  const handleSearchClientByDni = async (targetDni?: string, autoApply: boolean = true) => {
    const queryInput = (targetDni || clientDni).trim();
    if (!queryInput) {
      alert("Por favor ingrese un número de DNI, C.E o RUC para buscar.");
      return;
    }

    setIsSearchingClient(true);
    setFoundClientData(null);
    setClientSearchStatus("idle");

    try {
      // 1) Buscar en Firestore la subcolección del local (clientes/{localKey}/clientes)
      let firestoreMatch: any | null = null;
      if (isFirebaseConfigured && db) {
        try {
          // Primero el registro propio del local
          const localQ = query(collection(db, "clientes", workshopBranch, "clientes"), where("dni", "==", queryInput));
          const localSnap = await getDocs(localQ);
          if (!localSnap.empty) {
            const d = localSnap.docs[0].data() as any;
            const appVehicleType = String(d.vehicleType || "").toLowerCase();
            firestoreMatch = {
              name: d.name || "",
              dni: d.dni || queryInput,
              phone: d.phone || "",
              email: d.email || "",
              vehicleBrand: d.vehicleBrand || "",
              vehicleModel: d.vehicleModel || "",
              vehicleType: d.vehicleType || "",
              problemDescription: d.problemDescription || "",
              source: "Registro de local",
              vehicleTypeMap:
                appVehicleType.includes("scooter") || appVehicleType.includes("patin")
                  ? "scooter"
                  : appVehicleType.includes("bicimoto") || appVehicleType.includes("bici-moto")
                    ? "bicimoto"
                    : appVehicleType.includes("trimoto")
                      ? "trimoto"
                      : appVehicleType.includes("moto")
                        ? "moto"
                        : appVehicleType.includes("bici") || appVehicleType.includes("bicicl")
                          ? "bici"
                          : "otro"
            };
          }

          // 2) Si no hay match en el local, buscar en la colección canónica (App Android)
          // Acepta clientes de CUALQUIER sede: un DNI es único por persona sin importar la sede de origen
          if (!firestoreMatch) {
            const q = query(collection(db, "clientes"), where("dni", "==", queryInput));
            const snap = await getDocs(q);
            for (const sdoc of snap.docs) {
              const d = sdoc.data() as any;
              const appVehicleType = String(d.vehicleType || "").toLowerCase();
              firestoreMatch = {
                name: d.name || "",
                dni: d.dni || queryInput,
                phone: d.phone || "",
                email: d.email || "",
                vehicleBrand: d.vehicleBrand || "",
                vehicleModel: d.vehicleModel || "",
                vehicleType: d.vehicleType || "",
                problemDescription: d.problemDescription || "",
                source: "App Android Litio Energy",
                vehicleTypeMap:
                  appVehicleType.includes("scooter") || appVehicleType.includes("patin")
                    ? "scooter"
                    : appVehicleType.includes("bicimoto") || appVehicleType.includes("bici-moto")
                      ? "bicimoto"
                      : appVehicleType.includes("trimoto")
                        ? "trimoto"
                        : appVehicleType.includes("moto")
                          ? "moto"
                          : appVehicleType.includes("bici") || appVehicleType.includes("bicicl")
                            ? "bici"
                            : "otro"
              };
              break;
            }
          }
        } catch (e) {
          console.error("Error buscando en Firestore:", e);
        }
      }

      if (firestoreMatch) {
        setFoundClientData(firestoreMatch);
        setClientSearchStatus("found");
        if (autoApply) {
          handleApplyClientData(firestoreMatch);
        }
        return;
      }

      let data: any[] = [];
      try {
        const res = await fetch(`/api/clients/search?query=${encodeURIComponent(queryInput)}`);
        if (res.ok) {
          const ct = res.headers.get("content-type") || "";
          if (ct.includes("application/json")) {
            data = await res.json();
          }
        }
      } catch (e) {
        console.warn("Servidor de clientes no disponible (modo hosting).", e);
      }

      if (data && data.length > 0) {
        const match = data[0];
        setFoundClientData(match);
        setClientSearchStatus("found");

        if (autoApply) {
          handleApplyClientData(match);
        }
      } else {
        const localMatch = repairs.find(
          r =>
            r.status !== "delivered" &&
            r.workshopBranch === workshopBranch &&
            (r.client?.dni?.toLowerCase().includes(queryInput.toLowerCase()) ||
             r.client?.name?.toLowerCase().includes(queryInput.toLowerCase()))
        );
        if (localMatch) {
          const clientRepairs = repairs.filter(r => r.workshopBranch === workshopBranch && r.status !== "delivered" && r.client?.dni === localMatch.client?.dni);
          const foundObj = {
            name: localMatch.client.name,
            dni: localMatch.client.dni,
            phone: localMatch.client.phone,
            email: localMatch.client.email,
            source: "Historial Taller Litio",
            totalRepairs: clientRepairs.length,
            vehiclesHistory: clientRepairs.map(r => ({
              repairId: r.id,
              type: r.vehicle?.type,
              brand: r.vehicle?.brand,
              model: r.vehicle?.model,
              voltage: r.vehicle?.voltage,
              reportedFailure: r.vehicle?.reportedFailure
            }))
          };
          setFoundClientData(foundObj);
          setClientSearchStatus("found");

          if (autoApply) {
            handleApplyClientData(foundObj);
          }
        } else {
          setClientSearchStatus("not_found");
        }
      }
    } catch (e) {
      console.error(e);
      setClientSearchStatus("not_found");
    } finally {
      setIsSearchingClient(false);
    }
  };

  const handleApplyClientData = (clientData: any, selectedVehicle?: any) => {
    if (clientData.name) setClientName(clientData.name);
    if (clientData.dni) setClientDni(clientData.dni);
    if (clientData.phone) setClientPhone(clientData.phone);
    if (clientData.email) setClientEmail(clientData.email);
    if (clientData.name) setClientSignatureName(clientData.name);

    // Solo se autocompleta el vehículo cuando el usuario lo selecciona explícitamente
    // en el historial. El auto-llenado por DNI deja la sección 2 en blanco.
    if (selectedVehicle) {
      if (selectedVehicle.type) setVehicleType(selectedVehicle.type as VehicleType);
      if (selectedVehicle.brand) setBrand(selectedVehicle.brand);
      if (selectedVehicle.model) setModel(selectedVehicle.model);
      if (selectedVehicle.voltage) setVoltage(selectedVehicle.voltage);
    }
  };

  // Al hacer clic en una entrada "App Android" de Ingresos Recientes, llena el formulario
  const canFillAndroid = userRole === "jefa"; // Solo las jefas de local rellenan los datos faltantes
  const handleApplyAndroidClient = (c: any) => {
    handleApplyClientData({
      name: c.name || "",
      dni: c.dni || "",
      phone: c.phone || "",
      email: c.email || "",
      vehicleTypeMap: ANDROID_TYPE_KEYS[c.vehicleType] || "otro",
      vehicleBrand: c.vehicleBrand || "",
      vehicleModel: c.vehicleModel || "",
      problemDescription: c.problemDescription || ""
    });
    setClientSearchStatus("found");
  };

  const handleNewVehicleForClient = (clientData: any) => {
    if (clientData.name) setClientName(clientData.name);
    if (clientData.dni) setClientDni(clientData.dni);
    if (clientData.phone) setClientPhone(clientData.phone);
    if (clientData.email) setClientEmail(clientData.email);
    if (clientData.name) setClientSignatureName(clientData.name);
    setVehicleType("otro");
    setBrand("");
    setModel("");
    setVoltage("36V");
    setReportedFailure("");
  };

  // Vehicle State
  const [vehicleType, setVehicleType] = useState<VehicleType>("otro");
  const [showMotoMenu, setShowMotoMenu] = useState(false);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [voltage, setVoltage] = useState("36V");
  const [batteryCondition, setBatteryCondition] = useState<'0-1año' | '1-2años' | '2-3años' | '3-4años'>("0-1año");
  const [reportedFailure, setReportedFailure] = useState("");

  // Accessories State
  const [accessories, setAccessories] = useState<Accessories>({
    charger: false,
    key: false,
    battery: false,
    helmet: false,
    padlock: false,
    others: ""
  });

  // Visual State & Observations
  const [visualState, setVisualState] = useState<VisualState>({
    scratches: false,
    cracks: false,
    brakesOk: true,
    lightsOk: true,
    screenOk: true,
    tiresOk: true,
    videoRecorded: false,
    photosTaken: false,
    notes: "", // "5. OBSERVACIONES GENERALES" in PDF
    photos: [],
    videoEvidence: []
  });

  // Videos de respaldo grabados (se suben a Firebase Storage al registrar la orden)
  const [recordedVideos, setRecordedVideos] = useState<RecordedVideo[]>([]);
  const [reviewIdx, setReviewIdx] = useState<number | null>(null);
  const reviewUrl = useMemo(() => (reviewIdx !== null && recordedVideos[reviewIdx] ? URL.createObjectURL(recordedVideos[reviewIdx].blob) : ""), [reviewIdx, recordedVideos]);

  // Drawn conformity signatures
  const [clientSignature, setClientSignature] = useState("");
  const [tallerSignature, setTallerSignature] = useState("");

  // Presupuesto y Pago: ahora lo maneja la jefa en la pestaña "Presupuesto y Pago"
  // El vehículo se registra sin monto; la jefa colocará el presupuesto al diagnosticarse.

  // Signatures & Acceptance State
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [clientSignatureName, setClientSignatureName] = useState("");
  const [tallerSignatureName, setTallerSignatureName] = useState("Taller Litio");

  // UI state
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [createdId, setCreatedId] = useState("");
  const [lastCreatedRepair, setLastCreatedRepair] = useState<RepairItem | null>(null);
  const submittingRef = React.useRef(false);

  const buildWelcomeMessage = (r: RepairItem): string => {
    const typeLabels: Record<string, string> = {
      scooter: "Scooter", bici: "Bicicleta", moto: "Moto",
      bicimoto: "Bicimoto", trimoto: "Trimoto", otro: "Otro"
    };
    const svcLabels: Record<string, string> = {
      mantenimiento: "Mantenimiento", diagnostico: "Diagnóstico",
      garantia: "Garantía", cambio: "Cambio", express: "Express"
    };
    const recepcionLink = `${window.location.origin}${window.location.pathname}recepcion/${r.id}`;
    const terminosLink = `${window.location.origin}${window.location.pathname}terminos`;
    const lines: string[] = [
      `Hola *${r.client.name}* 👋`,
      "",
      "Somos *Litio Energy*, taller especialista en vehículos eléctricos.",
      "",
      "Tu vehículo ha sido ingresado correctamente a nuestra sede *" + (WORKSHOP_BRANCH_LABELS[r.workshopBranch] || r.workshopBranch) + "*.",
      "",
      "Puedes ver los detalles de tu vehículo en el siguiente enlace:",
      recepcionLink,
      "",
      "Gracias por confiar en *Litio Energy* ⚡"
    ];
    return lines.join("\n");
  };


  const handleAccessoriesChange = (field: keyof Accessories, value: any) => {
    setAccessories(prev => ({ ...prev, [field]: value }));
  };

  const handleVisualStateChange = (field: keyof VisualState, value: any) => {
    setVisualState(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || isLoading) return;
    submittingRef.current = true;
    if (!clientName || !clientPhone || !brand || !reportedFailure) {
      alert("Por favor completa los campos obligatorios (*)");
      return;
    }

    if (clientDni && clientDni.trim()) {
      const doc = clientDni.trim();
      if (!/^\d{8}$/.test(doc) && !/^\d{11}$/.test(doc)) {
        alert("El documento ingresado no es válido. Ingrese un DNI (8 dígitos) o un RUC (11 dígitos).");
        return;
      }
    }

    if (!termsAccepted) {
      alert("Por favor acepte los términos y condiciones firmando la conformidad antes de registrar el vehículo.");
      return;
    }

    const payload = {
      workshopBranch,
      serviceType,
      serviceTypeDetail,
      client: { name: clientName, phone: clientPhone, email: clientEmail, dni: clientDni },
      vehicle: { type: vehicleType, brand, model, voltage, batteryCondition, reportedFailure },
      accessories,
      visualState: {
        ...visualState,
        videoRecorded: recordedVideos.length > 0,
        videoEvidence: []
      },
      videoEvidenceBlobs: recordedVideos,
      estimatedCost: 0,
      actualCost: 0,
      clientSignature,
      clientSignatureName,
      tallerSignature,
      tallerSignatureName,
      scheduledDeadline: scheduledDeadline || undefined,
      serviceStartedAt: new Date().toISOString(),
      payment: {
        estimatedCost: 0,
        advancePayment: 0,
        remainingBalance: 0,
        paymentMethod: "efectivo",
        paymentNotes: ""
      }
    };

    try {
      const created = await onCreateRepair(payload);
      if (created) {
        setLastCreatedRepair(created);
        setCreatedId(created.id);
      }
      setSubmitSuccess(true);

      if (created) {
        const phone = (created.client?.phone || "").replace(/[^\d]/g, "");
        if (phone) {
          const waPhone = phone.startsWith("51") ? phone : phone.length === 9 ? "51" + phone : phone;
          const message = buildWelcomeMessage(created);
          window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`, "_blank");
        }
      }
      
      // Reset form
      setClientName("");
      setClientPhone("");
      setClientEmail("");
      setClientDni("");
      setClientSearchStatus("idle");
      setFoundClientData(null);
      setServiceType("mantenimiento");
      setServiceTypeDetail("");
      setScheduledDeadline("");
      setVehicleType("otro");
      setShowMotoMenu(false);
      setBrand("");
      setModel("");
      setVoltage("36V");
      setBatteryCondition("0-1año");
      setReportedFailure("");
      setAccessories({ charger: false, key: false, battery: false, helmet: false, padlock: false, others: "" });
      setVisualState({ scratches: false, cracks: false, brakesOk: true, lightsOk: true, screenOk: true, tiresOk: true, videoRecorded: false, photosTaken: false, notes: "", photos: [], videoEvidence: [] });
      setRecordedVideos([]);
      setReviewIdx(null);
      setTermsAccepted(false);
      setClientSignatureName("");
      setClientSignature("");
      setTallerSignature("");
      
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 15000);
    } catch (err) {
      console.error(err);
      alert("Error al ingresar vehículo a taller.");
    } finally {
      submittingRef.current = false;
    }
  };

  // Fusiona los ingresos de la tablet (repairs) con los de la app Android (clientes sin OT aún)
  const recentEntries = useMemo(() => {
    const isAdmin = !userLocalKey;

    const filteredRepairs = isAdmin
      ? repairs.filter((r) => r.workshopBranch === workshopBranch)
      : repairs;

    const repairKeys = new Set(
      filteredRepairs
        .map((r) => `${(r.client?.dni || "").trim()}|${(r.client?.phone || "").trim()}`)
        .filter((k) => k !== "|")
    );
    const sedeLabels = isAdmin ? (ANDROID_SEDE_LABELS[workshopBranch] || null) : ANDROID_SEDE_LABELS[workshopBranch] || null;

    const android = androidClients
      .filter((c) => c.source !== "tablet")
      .filter((c) => {
        const phone = (c.phone || "").trim();
        const dni = (c.dni || "").trim();
        return !repairKeys.has(`${dni}|${phone}`);
      })
      .filter((c) => sedeLabels === null || sedeLabels.includes(c.sede))
      .map((c) => ({
        id: `android-${(c.phone || c.dni || "app").replace(/[^a-zA-Z0-9]/g, "")}`,
        client: { name: c.name || "", dni: c.dni || "", phone: c.phone || "" },
        vehicle: {
          type: ANDROID_TYPE_KEYS[c.vehicleType] || "otro",
          brand: c.vehicleBrand || "",
          model: c.vehicleModel || ""
        },
        status: "receptioned",
        receptionDate: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
        source: "android",
        androidRaw: c
      }));

    return [...android, ...repairs.filter(r => r.status !== "delivered")]
      .sort((a, b) => new Date(b.receptionDate).getTime() - new Date(a.receptionDate).getTime());
  }, [androidClients, repairs, workshopBranch, userLocalKey]);


  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      {/* Mensaje de Éxito al Enviar */}
      {submitSuccess && (
        <div className="mb-6 p-4 bg-emerald-950/40 border-l-4 border-emerald-500 rounded-r-xl shadow-sm animate-fade-in flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-emerald-500 rounded-lg text-slate-950 shrink-0">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-emerald-200">¡Ingreso de Vehículo Exitoso!</h3>
              <p className="text-emerald-400 text-sm mt-0.5">
                El vehículo se ha registrado correctamente en la base de datos de <strong>Litio Energy</strong>. 
                El técnico ya puede visualizarlo en tiempo real en la pantalla del taller.
              </p>
            </div>
          </div>
          {lastCreatedRepair && (
            <button
              type="button"
              onClick={() => generateRepairPdf(lastCreatedRepair)}
              className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all self-start sm:self-center shrink-0 cursor-pointer shadow-lg hover:shadow-emerald-500/20"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Ficha de Conformidad</span>
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* FORMULARIO DE INGRESO (TOMA 2/3 DE LA PANTALLA) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
            {/* Header Formulario */}
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 px-6 py-5 text-white border-b border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="font-display font-black text-xl tracking-tight">INFORME DE RECEPCIÓN DE TALLER</h2>
                    <p className="text-xs text-slate-400">Litio Energy • Formulario Digital de Ingreso</p>
                  </div>
                </div>

                {/* Sede Selector */}
                <div className="flex items-center space-x-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                  {onOpenExpress && (
                    <button
                      type="button"
                      onClick={onOpenExpress}
                      className="flex items-center space-x-1.5 text-cyan-400 hover:text-cyan-300 text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Servicios Express</span>
                    </button>
                  )}
                  {!userLocalKey && (
                    <>
                      <MapPin className="w-4 h-4 text-cyan-400" />
                      <select
                        value={workshopBranch}
                        onChange={e => setWorkshopBranch(e.target.value as WorkshopBranch)}
                        className="bg-transparent text-slate-200 text-xs font-bold focus:outline-none pr-2"
                      >
                        <option value="lince_arenales" className="bg-slate-950 text-slate-100">Sede Arenales - San Isidro</option>
                        <option value="surco" className="bg-slate-950 text-slate-100">Sede Surco</option>
                        <option value="san_borja" className="bg-slate-950 text-slate-100">Sede San Borja</option>
                        <option value="lince_leal" className="bg-slate-950 text-slate-100">Sede Jose Leal - Lince</option>
                      </select>
                    </>
                  )}
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-8">
              
              {/* SECCIÓN 1: DATOS DEL CLIENTE */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2 text-slate-100">
                  <div className="flex items-center space-x-2">
                    <User className="w-5 h-5 text-cyan-400" />
                    <h3 className="font-display font-bold text-sm uppercase tracking-wider">1. Datos del Cliente</h3>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Campo DNI / C.E con botón de búsqueda rápida */}
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">DNI / C.E / RUC *</label>
                    <div className="relative flex space-x-2">
                      <input
                        type="text"
                        required
                        value={clientDni}
                        onChange={e => {
                          const val = e.target.value;
                          setClientDni(val);
                          if (clientSearchStatus !== "idle") setClientSearchStatus("idle");
                          
                          if (val.trim().length === 8 || val.trim().length === 11) {
                            handleSearchClientByDni(val.trim());
                          }
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSearchClientByDni();
                          }
                        }}
                        placeholder="Ej. 74839201 (DNI) o 20123456789 (RUC)"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-100 placeholder:text-slate-600 text-sm transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => handleSearchClientByDni()}
                        disabled={isSearchingClient}
                        className="px-3.5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl font-bold text-xs flex items-center space-x-1 shrink-0 transition-all shadow-md hover:shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
                        title="Buscar cliente registrado por DNI / C.E / RUC"
                      >
                        <Search className={`w-4 h-4 ${isSearchingClient ? "animate-spin" : ""}`} />
                        <span className="hidden sm:inline">Buscar Doc</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nombre Completo *</label>
                    <input
                      type="text"
                      required
                      value={clientName}
                      onChange={e => {
                        setClientName(e.target.value);
                        setClientSignatureName(e.target.value);
                      }}
                      placeholder="Ej. Juan Pérez Ramos"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-100 placeholder:text-slate-600 text-sm transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Celular *</label>
                    <input
                      type="tel"
                      required
                      value={clientPhone}
                      onChange={e => setClientPhone(e.target.value)}
                      placeholder="Ej. 987 654 321"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-100 placeholder:text-slate-600 text-sm transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Correo Electrónico</label>
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={e => setClientEmail(e.target.value)}
                      placeholder="Ej. cliente@ejemplo.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-100 placeholder:text-slate-600 text-sm transition-all"
                    />
                  </div>
                </div>

                {/* Resultado de Búsqueda por DNI */}
                {clientSearchStatus === "found" && foundClientData && (
                  <div className="p-4 bg-cyan-950/40 border border-cyan-500/30 rounded-2xl space-y-3 animate-fade-in shadow-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg">
                          <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider block">
                            ¡Cliente Encontrado en Base de Datos Litio Energy!
                          </span>
                          <p className="text-sm font-semibold text-slate-100 mt-0.5">
                            {foundClientData.name} <span className="text-xs text-slate-400 font-mono">(DNI: {foundClientData.dni})</span>
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-[10px] font-bold border border-cyan-500/30">
                        {foundClientData.totalRepairs || 1} Visita(s) Registrar(as)
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-850">
                      <div>📞 Teléfono: <span className="text-white font-medium">{foundClientData.phone || "Sin teléfono"}</span></div>
                      <div>✉️ Email: <span className="text-white font-medium">{foundClientData.email || "Sin email"}</span></div>
                      {(foundClientData.vehicleBrand || foundClientData.vehicleModel) && (
                        <>
                          <div>🔧 Vehículo: <span className="text-white font-medium">{foundClientData.vehicleType} {foundClientData.vehicleBrand} {foundClientData.vehicleModel}</span></div>
                          {foundClientData.problemDescription && (
                            <div>⚠️ Falla reportada: <span className="text-white font-medium">{foundClientData.problemDescription}</span></div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Botones de acción rápida */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleApplyClientData(foundClientData)}
                        className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all shadow-md cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>Auto-completar Datos del Cliente</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleNewVehicleForClient(foundClientData)}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all border border-slate-700 cursor-pointer"
                        title="Mantiene los datos del cliente y limpia los datos del vehículo para registrar uno nuevo"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>Registrar Otro Vehículo</span>
                      </button>

                      {foundClientData.vehiclesHistory && foundClientData.vehiclesHistory.length > 0 && (
                        <div className="w-full mt-2 pt-2 border-t border-slate-800">
                          <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 flex items-center gap-1">
                            <History className="w-3 h-3 text-cyan-400" />
                            Vehículos Registrados Anteriormente en Litio Energy (Haga clic para auto-llenar vehículo):
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {foundClientData.vehiclesHistory.map((vh: any, idx: number) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleApplyClientData(foundClientData, vh)}
                                className="px-3 py-1.5 bg-slate-900 hover:bg-cyan-950 hover:border-cyan-500/50 border border-slate-800 rounded-xl text-left text-xs transition-all flex items-center space-x-2 group cursor-pointer"
                              >
                                <span className="font-bold text-cyan-400 group-hover:text-cyan-300">
                                  {vh.brand} {vh.model} ({vh.voltage || '36V'})
                                </span>
                                <span className="text-[10px] text-slate-400">({vh.type})</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {clientSearchStatus === "not_found" && (
                  <div className="p-3 bg-amber-950/30 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>No se encontraron registros previos para el DNI/C.E ingresado. Proceda ingresando los datos del cliente nuevo.</span>
                  </div>
                )}
              </div>


              {/* SECCIÓN 2: DATOS DEL VEHÍCULO */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 text-slate-100">
                  <Smartphone className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-display font-bold text-sm uppercase tracking-wider">2. Datos del Vehículo</h3>
                </div>

                {/* Tipo de Vehículo */}
                <div>
                  <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tipo de Vehículo *</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => { setVehicleType("scooter"); setBrand(""); }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        vehicleType === "scooter"
                          ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400 ring-2 ring-cyan-500/10 font-bold"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900"
                      }`}
                    >
                      <p className="text-sm font-semibold">🛴 Scooter</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-none">Scooter eléctrico</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setVehicleType("bici"); setBrand(""); }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        vehicleType === "bici"
                          ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400 ring-2 ring-cyan-500/10 font-bold"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900"
                      }`}
                    >
                      <p className="text-sm font-semibold">🚲 Bicicletas</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-none">Bicicleta eléctrica</p>
                    </button>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => { setVehicleType("moto"); setBrand(""); }}
                        className={`w-full p-3 rounded-xl border text-left transition-all ${
                          ["moto", "bicimoto", "trimoto"].includes(vehicleType)
                            ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400 ring-2 ring-cyan-500/10 font-bold"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900"
                        }`}
                      >
                        <p className="text-sm font-semibold">🏍️ Motos</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-none">
                          {vehicleType === "bicimoto" ? "Bicimoto" : vehicleType === "trimoto" ? "Trimoto" : "Motos"}
                        </p>
                      </button>
                      <button
                        type="button"
                        aria-label="Más opciones de motos"
                        onClick={() => setShowMotoMenu(v => !v)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-md bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 text-sm font-bold leading-none"
                      >
                        ⋯
                      </button>
                      {showMotoMenu && (
                        <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 shadow-xl overflow-hidden">
                          {[
                            { value: "bicimoto", label: "Bicimoto" },
                            { value: "moto", label: "Motos" },
                            { value: "trimoto", label: "Trimotos" }
                          ].map(opt => (
                            <button
                              type="button"
                              key={opt.value}
                              onClick={() => { setVehicleType(opt.value as VehicleType); setBrand(""); setShowMotoMenu(false); }}
                              className={`w-full px-3 py-2.5 text-sm text-left transition-colors ${
                                vehicleType === opt.value
                                  ? "bg-cyan-500/10 text-cyan-400 font-bold"
                                  : "text-slate-300 hover:bg-slate-800"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => { setVehicleType("otro"); setBrand(""); }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        vehicleType === "otro"
                          ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400 ring-2 ring-cyan-500/10 font-bold"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900"
                      }`}
                    >
                      <p className="text-sm font-semibold">Otros</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-none">Monociclos, triciclos, otros</p>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Marca *</label>
                    <input
                      type="text"
                      required
                      value={brand}
                      onChange={e => setBrand(e.target.value)}
                      placeholder="Ej. Xiaomi, Super Soco, Trek..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-100 placeholder:text-slate-600 text-sm transition-all"
                    />
                    {/* Brand suggestions */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {COMMON_BRANDS[vehicleType].map(br => (
                        <button
                          type="button"
                          key={br}
                          onClick={() => setBrand(br)}
                          className="text-[10px] bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800 px-2 py-0.5 rounded-full transition-colors"
                        >
                          {br}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Modelo</label>
                    <input
                      type="text"
                      value={model}
                      onChange={e => setModel(e.target.value)}
                      placeholder="Ej. Pro 2, TC Max, Powerfly 4"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-100 placeholder:text-slate-600 text-sm transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Voltaje</label>
                    <select
                      value={voltage}
                      onChange={e => setVoltage(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-100 text-sm transition-all"
                    >
                      {VOLTAGES.map(v => (
                        <option key={v} value={v} className="bg-slate-950 text-slate-100">{v}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tiempo de Uso de la Batería</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { value: "0-1año", label: "0-1 año" },
                        { value: "1-2años", label: "1-2 años" },
                        { value: "2-3años", label: "2-3 años" },
                        { value: "3-4años", label: "3-4 años" }
                      ].map(opt => (
                        <button
                          type="button"
                          key={opt.value}
                          onClick={() => setBatteryCondition(opt.value as any)}
                          className={`py-2 text-xs rounded-xl border font-bold transition-all ${
                            batteryCondition === opt.value
                              ? "bg-cyan-500 border-cyan-500 text-slate-950 shadow-sm"
                              : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Síntomas / Falla reportada */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Sintoma / Falla Reportada por el Cliente *</label>
                  <div className="relative">
                    <textarea
                      rows={3}
                      required
                      value={reportedFailure}
                      onChange={e => setReportedFailure(e.target.value)}
                      placeholder="Ej. El motor da tirones al acelerar, la batería no carga más del 50%, ruidos extraños en freno..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-100 placeholder:text-slate-600 text-sm transition-all"
                    />
                    <SpeechToTextButton onResult={(t) => setReportedFailure(prev => prev ? prev + " " + t : t)} label="síntoma" />
                  </div>
                </div>
              </div>


              {/* SECCIÓN 3: TIPO DE SERVICIO */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 text-slate-100">
                  <Tag className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-display font-bold text-sm uppercase tracking-wider">3. Tipo de Servicio</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { value: "mantenimiento", label: "Mantenimiento", icon: "🔧" },
                    { value: "diagnostico", label: "Diagnóstico", icon: "🔍" },
                    { value: "garantia", label: "Garantía", icon: "🛡️" },
                    { value: "cambio", label: "Cambio / Repuesto", icon: "🔄" }
                  ].map(opt => (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => {
                        setServiceType(opt.value as ServiceType);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col items-start ${
                        serviceType === opt.value
                          ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400 ring-2 ring-cyan-500/10 font-bold"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900"
                      }`}
                    >
                      <span className="text-xl mb-1">{opt.icon}</span>
                      <span className="text-xs font-bold">{opt.label}</span>
                      {serviceType === opt.value && scheduledDeadline && (
                        <span className="text-[9px] text-cyan-300/70 mt-1">
                          ⏰ {new Date(scheduledDeadline).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {serviceType === "cambio" && (
                  <div className="animate-fade-in">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Detalle del Cambio solicitado</label>
                    <input
                      type="text"
                      required
                      value={serviceTypeDetail}
                      onChange={e => setServiceTypeDetail(e.target.value)}
                      placeholder="Ej. Cambio de neumático trasero macizo, cambio de pastillas de freno..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-100 text-sm transition-all"
                    />
                  </div>
                )}
              </div>


              {/* SECCIÓN 4: ACCESORIOS ENTREGADOS */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 text-slate-100">
                  <Clipboard className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-display font-bold text-sm uppercase tracking-wider">4. Accesorios Entregados</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { id: "charger", label: "Cargador", icon: "⚡" },
                    { id: "key", label: "Llaves / Mando", icon: "🔑" },
                    { id: "helmet", label: "Casco", icon: "🪖" },
                    { id: "padlock", label: "Candado", icon: "🔒" },
                    { id: "battery", label: "Batería Extra", icon: "🔋" }
                  ].map(acc => (
                    <label
                      key={acc.id}
                      className={`flex items-center space-x-3 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                        accessories[acc.id as keyof Accessories] === true
                          ? "bg-cyan-500/10 border-cyan-500/45 text-cyan-400 font-bold"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={accessories[acc.id as keyof Accessories] === true}
                        onChange={e => handleAccessoriesChange(acc.id as keyof Accessories, e.target.checked)}
                        className="rounded border-slate-800 text-cyan-500 focus:ring-cyan-500 h-4 w-4 bg-slate-950"
                      />
                      <span className="text-xs">
                        <span className="mr-1.5">{acc.icon}</span>
                        {acc.label}
                      </span>
                    </label>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Otros Accesorios / Detalles adicionales</label>
                  <input
                    type="text"
                    value={accessories.others}
                    onChange={e => handleAccessoriesChange("others", e.target.value)}
                    placeholder="Ej. Mochila portatodo, soporte celular de metal, etc."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-100 text-sm transition-all"
                  />
                </div>
              </div>


              {/* SECCIÓN 5: INSPECCIÓN VISUAL Y EVIDENCIA */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 text-slate-100">
                  <Gauge className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-display font-bold text-sm uppercase tracking-wider">5. Inspección Visual y Evidencia</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { id: "scratches", label: "Tiene Rayones / Raspones", negative: true },
                    { id: "cracks", label: "Tiene Fisuras o Golpes", negative: true },
                    { id: "brakesOk", label: "Frenos Operativos", negative: false },
                    { id: "lightsOk", label: "Luces Funcionales", negative: false },
                    { id: "screenOk", label: "Pantalla/Display OK", negative: false },
                    { id: "tiresOk", label: "Neumáticos/Llantas OK", negative: false }
                  ].map(chk => {
                    const checkedValue = visualState[chk.id as keyof VisualState] === true;
                    const isIssue = chk.negative ? checkedValue : !checkedValue;
                    
                    return (
                      <label
                        key={chk.id}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer select-none transition-all ${
                          isIssue 
                            ? "bg-rose-950/20 border-rose-900/40 text-rose-300" 
                            : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900"
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={checkedValue}
                            onChange={e => handleVisualStateChange(chk.id as keyof VisualState, e.target.checked)}
                            className={`rounded border-slate-800 bg-slate-950 h-4 w-4 ${
                              chk.negative ? "text-rose-500 focus:ring-rose-500" : "text-cyan-500 focus:ring-cyan-500"
                            }`}
                          />
                          <span className="text-xs font-medium">{chk.label}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Evidencia audiovisual (9. Observaciones Generales en PDF) */}
                <PhotoManager
                  photos={visualState.photos || []}
                  onPhotosChange={(updatedPhotos) => {
                    setVisualState(prev => ({
                      ...prev,
                      photos: updatedPhotos,
                      photosTaken: updatedPhotos.length > 0
                    }));
                  }}
                  title="Evidencia Fotográfica de Recepción (Tablet)"
                  subtitle="Registra las fotos directamente en la memoria de esta tablet."
                />

                {/* Video de respaldo (evidencia ante reclamos) */}
                <VideoRecorder
                  onRecorded={(v) => setRecordedVideos(prev => [...prev, v])}
                  branchLabel={WORKSHOP_BRANCH_LABELS[workshopBranch]}
                />

                {recordedVideos.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase font-black text-slate-500 tracking-wider">
                      Videos de respaldo pendientes ({recordedVideos.length})
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {recordedVideos.map((v, idx) => (
                        <div
                          key={idx}
                          className="relative flex flex-col items-center justify-center gap-1 rounded-lg border border-cyan-800/40 bg-slate-950 p-3 text-center"
                        >
                          <Video className="w-5 h-5 text-cyan-400" />
                          <span className="text-[9px] font-mono text-slate-400">
                            {v.durationSec}s · {(v.sizeBytes / 1024 / 1024).toFixed(2)} MB
                          </span>
                          <button
                            type="button"
                            onClick={() => setReviewIdx(idx)}
                            className="flex items-center space-x-1 px-2 py-1 bg-rose-500/90 hover:bg-rose-400 text-white rounded-lg text-[9px] font-bold transition-colors"
                          >
                            <Play className="w-2.5 h-2.5" />
                            <span>Revisar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRecordedVideos(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute top-1 right-1 p-1 bg-slate-950/80 border border-slate-800 text-rose-400 hover:text-rose-300 rounded-md"
                            title="Quitar video"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Observaciones Generales</label>
                  <div className="relative">
                    <textarea
                      rows={2}
                      value={visualState.notes}
                      onChange={e => handleVisualStateChange("notes", e.target.value)}
                      placeholder="Escribe o dicta por voz comentarios generales sobre el chasis, partes sueltas u otras especificaciones visuales..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-100 text-sm transition-all"
                    />
                    <SpeechToTextButton onResult={(t) => handleVisualStateChange("notes", visualState.notes ? visualState.notes + " " + t : t)} label="observaciones" />
                  </div>
                </div>
              </div>


              {/* SECCIÓN 6: TÉRMINOS, FIRMAS Y CONFORMIDAD */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 text-slate-100">
                  <FileSignature className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-display font-bold text-sm uppercase tracking-wider">6. Términos, Firmas y Conformidad</h3>
                </div>

                {/* Resumen de términos tal cual el PDF */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-[10.5px] text-slate-400 leading-relaxed space-y-2 max-h-40 overflow-y-auto pr-1">
                  <h4 className="font-bold text-slate-300 uppercase mb-1">TÉRMINOS Y CONDICIONES DEL SERVICIO (RESUMEN)</h4>
                  <p><strong>1.</strong> El diagnóstico y presupuesto son estimados y pueden variar según fallas detectadas durante la intervención de taller.</p>
                  <p><strong>2.</strong> No se realizarán reparaciones adicionales sin la previa autorización del cliente.</p>
                  <p><strong>3.</strong> El plazo de entrega dependerá de la disponibilidad de repuestos y complejidad técnica de la falla.</p>
                  <p><strong>4.</strong> Todo vehículo no recogido dentro del plazo establecido podrá generar un cobro adicional por almacenaje.</p>
                  <p><strong>5.</strong> Toda aprobación enviada por WhatsApp o medios digitales oficiales será considerada plenamente válida.</p>
                  <p><strong>6.</strong> <strong>LITIO ENERGY</strong> no se responsabiliza por accesorios u objetos no declarados explícitamente en el presente documento.</p>
                  <p><strong>7.</strong> Al firmar y confirmar este documento, el cliente acepta expresamente todos los términos y condiciones generales del taller.</p>
                </div>

                {/* Firmas Digitales de Taller (Tablet Canvas) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Firma de Cliente */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <span className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Firma de Conformidad del Cliente</span>
                    <input
                      type="text"
                      required
                      value={clientSignatureName}
                      onChange={e => setClientSignatureName(e.target.value)}
                      placeholder="Nombre completo del cliente"
                      className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 text-xs focus:outline-none text-slate-100"
                    />
                    <SignaturePad
                      onSave={(dataUrl) => setClientSignature(dataUrl)}
                      onClear={() => setClientSignature("")}
                      initialData={clientSignature}
                      placeholderText="Firme aquí (Firma del Cliente)"
                    />
                    {clientSignature && (
                      <div className="text-center text-[9px] text-cyan-400 font-mono tracking-widest uppercase">
                        ✓ Firma Digital Registrada en Tablet
                      </div>
                    )}
                  </div>

                  {/* Firma de Taller */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <span className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Firma Autorizada del Taller</span>
                    <input
                      type="text"
                      required
                      value={tallerSignatureName}
                      onChange={e => setTallerSignatureName(e.target.value)}
                      placeholder="Nombre del recepcionista"
                      className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 text-xs focus:outline-none text-slate-100"
                    />
                    <SignaturePad
                      onSave={(dataUrl) => setTallerSignature(dataUrl)}
                      onClear={() => setTallerSignature("")}
                      initialData={tallerSignature}
                      placeholderText="Firme aquí (Representante de Taller)"
                    />
                    {tallerSignature && (
                      <div className="text-center text-[9px] text-emerald-400 font-mono tracking-widest uppercase">
                        ✓ Firma Autorizada Litio Energy
                      </div>
                    )}
                  </div>
                </div>

                <label className="flex items-start space-x-3 cursor-pointer select-none bg-cyan-950/15 p-3 rounded-xl border border-cyan-900/40">
                  <input
                    type="checkbox"
                    required
                    checked={termsAccepted}
                    onChange={e => setTermsAccepted(e.target.checked)}
                    className="rounded border-slate-800 text-cyan-500 focus:ring-cyan-500 h-4.5 w-4.5 mt-0.5 bg-slate-950 cursor-pointer"
                  />
                  <div className="text-xs">
                    <p className="font-bold text-cyan-300">Acepto los términos y firmas de conformidad</p>
                    <p className="text-slate-400 mt-0.5 text-[11px]">
                      Al marcar esta casilla, confirmo que la información proporcionada es correcta y que acepto los términos de servicio de Litio Energy.
                    </p>
                  </div>
                </label>
              </div>


              {/* ACCIÓN PRINCIPAL DE ENVÍO */}
              <div className="pt-2">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 py-3.5 px-6 rounded-xl font-bold text-sm tracking-wide shadow-[0_4px_25px_rgba(6,182,212,0.25)] hover:scale-[1.005] active:scale-[0.995] transition-all flex items-center justify-center space-x-2 disabled:opacity-55"
                  >
                    <PlusCircle className="w-5 h-5" />
                    <span>{isLoading ? "Ingresando a taller..." : "REGISTRAR VEHÍCULO E INGRESO EN COLA"}</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 text-center mt-2.5 font-mono">
                  Gracias por confiar en LITIO ENERGY • Av. Arenales, Surco, San Borja & Jose Leal
                </p>
              </div>

            </form>
          </div>
        </div>


        {/* COLUMNA LATERAL (TOMA 1/3 DE LA PANTALLA) */}
        <div className="space-y-6">


          {/* HISTORIAL RECIENTE DE VEHÍCULOS (VISTA RÁPIDA TABLET) */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-sm">
            <h3 className="font-display font-bold text-sm text-slate-100 uppercase tracking-wider mb-4 flex items-center justify-between">
              <span>Ingresos Recientes</span>
              <span className="text-xs bg-slate-950 text-slate-400 px-2.5 py-0.5 rounded-full font-mono border border-slate-800">{recentEntries.length} total</span>
            </h3>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {recentEntries.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No hay vehículos registrados hoy.</p>
              ) : (
                recentEntries.map(rep => {
                  const typeIcons: Record<string, string> = {
                    scooter: "🛴",
                    bici: "🚲",
                    moto: "🏍️",
                    bicimoto: "🛵",
                    trimoto: "🛺",
                    otro: "🔋"
                  };
                  
                  const statusColors: Record<string, string> = {
                    receptioned: "bg-cyan-500/10 text-cyan-400 border-cyan-500/25",
                    diagnosing: "bg-purple-500/10 text-purple-400 border-purple-500/25",
                    quoted: "bg-amber-500/10 text-amber-400 border-amber-500/25",
                    paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
                    repairing: "bg-blue-500/10 text-blue-400 border-blue-500/25",
                    testing: "bg-pink-500/10 text-pink-400 border-pink-500/25",
                    ready: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
                    delivered: "bg-slate-500/10 text-slate-400 border-slate-500/25"
                  };

                  const statusLabels: Record<string, string> = {
                    receptioned: "Recibido",
                    diagnosing: "Diag.",
                    quoted: "Ppto",
                    paid: "Pagado",
                    repairing: "Reparando",
                    testing: "Pruebas",
                    ready: "Listo",
                    delivered: "Entregado"
                  };

                  return (
                    <div
                      key={rep.id}
                      onClick={rep.source === "android" && canFillAndroid ? () => handleApplyAndroidClient(rep.androidRaw) : undefined}
                      className={`p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs hover:bg-slate-900 transition-colors group ${rep.source === "android" && canFillAndroid ? "cursor-pointer border-green-500/20 hover:border-green-500/50" : ""}`}
                      title={rep.source === "android" && canFillAndroid ? "Clic para llenar el formulario con los datos de la app Android" : undefined}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-cyan-400 font-mono">{rep.id.startsWith("android-") ? rep.id.slice(8) : rep.id.slice(0, 8)}</span>
                          <span className="text-slate-700">|</span>
                          <span className="font-semibold text-slate-200">{rep.client.name}</span>
                          {rep.source === "android" && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-green-950/60 border border-green-500/30 text-green-400 text-[9px] font-bold tracking-wide uppercase ml-1">
                              📱 App Android
                            </span>
                          )}
                        </div>
                        <p className="text-slate-400 text-[11px] truncate max-w-[150px]">
                          {typeIcons[rep.vehicle.type] || "🔋"} {rep.vehicle.brand} {rep.vehicle.model}
                        </p>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        {rep.source === "android" ? (
                          <span className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wide ${canFillAndroid ? "text-green-400/80" : "text-slate-600"}`}>
                            {canFillAndroid ? "Clic para llenar ⤴" : "Solo lectura"}
                          </span>
                        ) : (
                        <>
                        <button
                          type="button"
                          onClick={() => generateRepairPdf(rep)}
                          className="p-1.5 bg-slate-900 text-cyan-400 rounded-lg border border-slate-800 hover:border-cyan-500 hover:bg-cyan-950/20 transition-all cursor-pointer opacity-80 group-hover:opacity-100"
                          title="Imprimir Ficha de Conformidad"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        {onUpdateRepair && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingRepairId(rep.id);
                              setEditClientName(rep.client.name || "");
                              setEditClientPhone(rep.client.phone || "");
                              setEditClientEmail(rep.client.email || "");
                              setEditClientDni(rep.client.dni || "");
                            }}
                            className="p-1.5 bg-slate-900 text-amber-400 rounded-lg border border-slate-800 hover:border-amber-500 hover:bg-amber-950/20 transition-all cursor-pointer opacity-80 group-hover:opacity-100"
                            title="Editar datos del cliente"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); if (confirm("¿Eliminar este registro?")) onDeleteRepair(rep); }}
                          className="hidden p-1.5 text-red-400"
                          title="Eliminar registro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        </>
                        )}
                        <div className="text-right space-y-1">
                          <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-bold leading-none ${statusColors[rep.status] || "bg-slate-950 text-slate-400"}`}>
                            {statusLabels[rep.status] || rep.status}
                          </span>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {new Date(rep.receptionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>

      {/* MODAL DE IMPORTACIÓN / VINCULACIÓN DE HOJA DE DATOS Y GOOGLE SHEETS */}
      {showImportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-fade-in">
            {/* Header Modal */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
                <span className="font-bold text-sm text-slate-100 uppercase tracking-wider">
                  Vincular Hoja de Datos / Google Sheets de Clientes
                </span>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Pestañas de opción de importación */}
            <div className="p-6 space-y-5">
              <div className="flex space-x-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => { setImportTab("sheet_url"); setImportStatusMessage(null); }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                    importTab === "sheet_url"
                      ? "bg-cyan-500 text-slate-950 shadow-md"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Link className="w-3.5 h-3.5" />
                  <span>Google Sheets Link</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setImportTab("apps_script"); setImportStatusMessage(null); }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                    importTab === "apps_script"
                      ? "bg-cyan-500 text-slate-950 shadow-md"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>Apps Script (En Vivo)</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setImportTab("file"); setImportStatusMessage(null); }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                    importTab === "file"
                      ? "bg-cyan-500 text-slate-950 shadow-md"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Subir Archivo</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setImportTab("text"); setImportStatusMessage(null); }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                    importTab === "text"
                      ? "bg-cyan-500 text-slate-950 shadow-md"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>Pegar Texto</span>
                </button>
              </div>

              {/* OPCIÓN 1: GOOGLE SHEETS ENLACE DIRECTO */}
              {importTab === "sheet_url" && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-850 space-y-2">
                    <span className="text-xs font-bold text-cyan-300 block flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      Método 1 (Recomendado): Sincronizar Google Sheets 'clientes litio apps'
                    </span>
                    <ol className="text-xs text-slate-300 space-y-1 list-decimal list-inside leading-relaxed">
                      <li>Abre tu hoja de cálculo <b>clientes litio apps</b> en Google Sheets.</li>
                      <li>Haz clic en el botón verde <b>Compartir</b> (arriba a la derecha).</li>
                      <li>Selecciona <b>"Cualquier persona con el enlace"</b> (Acceso de Lector).</li>
                      <li>Copia y pega la URL de la barra de direcciones de tu navegador aquí abajo y presiona <b>Sincronizar</b>.</li>
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Enlace de Google Sheets:
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="url"
                        value={sheetUrlInput}
                        onChange={(e) => setSheetUrlInput(e.target.value)}
                        placeholder="Ej. https://docs.google.com/spreadsheets/d/123456789.../edit"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleImportGoogleSheets}
                        disabled={importLoading}
                        className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl flex items-center space-x-1.5 shrink-0 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <CloudDownload className={`w-4 h-4 ${importLoading ? "animate-bounce" : ""}`} />
                        <span>Sincronizar</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* OPCIÓN GOOGLE APPS SCRIPT CODE */}
              {importTab === "apps_script" && (
                <div className="space-y-3">
                  <div className="p-3 bg-cyan-950/40 border border-cyan-800/40 rounded-xl text-xs text-cyan-200 leading-relaxed">
                    <b>⚡ Búsqueda en Vivo vía Webhook de Apps Script:</b> Para que el DNI jale datos automáticamente directamente desde tu Google Sheet sin tener que exportar, copia este código en tu Google Sheet en <b>Extensiones &gt; Apps Script</b> y presiona <b>Implementar &gt; Nueva implementación (Web App)</b>:
                  </div>

                  <div className="relative bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 max-h-52 overflow-y-auto">
                    <pre className="whitespace-pre-wrap">{`function doGet(e) {
  try {
    var search = (e && e.parameter && (e.parameter.dni || e.parameter.query || e.parameter.search)) ? String(e.parameter.dni || e.parameter.query || e.parameter.search).trim().toLowerCase() : "";
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("clientes") || ss.getSheetByName("Clientes") || ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();
    if (!data || data.length <= 1) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    
    var headers = data[0].map(function(h) { return String(h).toLowerCase().trim(); });
    var dniIdx = headers.findIndex(function(h) { return h.includes("dni") || h.includes("ruc") || h.includes("doc") || h.includes("ce") || h.includes("c.e") || h.includes("carnet"); });
    var nameIdx = headers.findIndex(function(h) { return h.includes("nombre") || h.includes("cliente"); });
    var phoneIdx = headers.findIndex(function(h) { return h.includes("tel") || h.includes("cel") || h.includes("phone"); });
    var emailIdx = headers.findIndex(function(h) { return h.includes("email") || h.includes("correo"); });
    var typeIdx = headers.findIndex(function(h) { return h.includes("tipo") || h.includes("vehiculo"); });
    var brandIdx = headers.findIndex(function(h) { return h.includes("marca") || h.includes("brand"); });
    var modelIdx = headers.findIndex(function(h) { return h.includes("modelo") || h.includes("model"); });
    var voltIdx = headers.findIndex(function(h) { return h.includes("volt") || h.includes("bateria"); });

    var results = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowDni = dniIdx >= 0 ? String(row[dniIdx]).trim() : "";
      var rowName = nameIdx >= 0 ? String(row[nameIdx]).trim() : "";
      if (!search || rowDni.toLowerCase().includes(search) || rowName.toLowerCase().includes(search)) {
        results.push({
          dni: rowDni,
          nombre: rowName,
          telefono: phoneIdx >= 0 ? String(row[phoneIdx]).trim() : "",
          email: emailIdx >= 0 ? String(row[emailIdx]).trim() : "",
          tipo: typeIdx >= 0 ? String(row[typeIdx]).trim() : "scooter",
          marca: brandIdx >= 0 ? String(row[brandIdx]).trim() : "Xiaomi",
          modelo: modelIdx >= 0 ? String(row[modelIdx]).trim() : "Standard",
          voltaje: voltIdx >= 0 ? String(row[voltIdx]).trim() : "36V"
        });
      }
    }
    return ContentService.createTextOutput(JSON.stringify(results)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}`}</pre>
                    <button
                      type="button"
                      onClick={() => {
                        const scriptCode = `function doGet(e) {
  try {
    var search = (e && e.parameter && (e.parameter.dni || e.parameter.query || e.parameter.search)) ? String(e.parameter.dni || e.parameter.query || e.parameter.search).trim().toLowerCase() : "";
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("clientes") || ss.getSheetByName("Clientes") || ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();
    if (!data || data.length <= 1) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    
    var headers = data[0].map(function(h) { return String(h).toLowerCase().trim(); });
    var dniIdx = headers.findIndex(function(h) { return h.includes("dni") || h.includes("ruc") || h.includes("doc") || h.includes("ce") || h.includes("c.e") || h.includes("carnet"); });
    var nameIdx = headers.findIndex(function(h) { return h.includes("nombre") || h.includes("cliente"); });
    var phoneIdx = headers.findIndex(function(h) { return h.includes("tel") || h.includes("cel") || h.includes("phone"); });
    var emailIdx = headers.findIndex(function(h) { return h.includes("email") || h.includes("correo"); });
    var typeIdx = headers.findIndex(function(h) { return h.includes("tipo") || h.includes("vehiculo"); });
    var brandIdx = headers.findIndex(function(h) { return h.includes("marca") || h.includes("brand"); });
    var modelIdx = headers.findIndex(function(h) { return h.includes("modelo") || h.includes("model"); });
    var voltIdx = headers.findIndex(function(h) { return h.includes("volt") || h.includes("bateria"); });

    var results = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowDni = dniIdx >= 0 ? String(row[dniIdx]).trim() : "";
      var rowName = nameIdx >= 0 ? String(row[nameIdx]).trim() : "";
      if (!search || rowDni.toLowerCase().includes(search) || rowName.toLowerCase().includes(search)) {
        results.push({
          dni: rowDni,
          nombre: rowName,
          telefono: phoneIdx >= 0 ? String(row[phoneIdx]).trim() : "",
          email: emailIdx >= 0 ? String(row[emailIdx]).trim() : "",
          tipo: typeIdx >= 0 ? String(row[typeIdx]).trim() : "scooter",
          marca: brandIdx >= 0 ? String(row[brandIdx]).trim() : "Xiaomi",
          modelo: modelIdx >= 0 ? String(row[modelIdx]).trim() : "Standard",
          voltaje: voltIdx >= 0 ? String(row[voltIdx]).trim() : "36V"
        });
      }
    }
    return ContentService.createTextOutput(JSON.stringify(results)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}`;
                        navigator.clipboard.writeText(scriptCode);
                        setCopiedScript(true);
                        setTimeout(() => setCopiedScript(false), 3000);
                      }}
                      className="absolute top-2 right-2 px-2.5 py-1 bg-cyan-500 text-slate-950 font-bold text-[10px] rounded-lg flex items-center space-x-1 cursor-pointer hover:bg-cyan-400 transition-all"
                    >
                      {copiedScript ? <Check className="w-3 h-3 text-emerald-950" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedScript ? "¡Código Copiado!" : "Copiar Código"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* OPCIÓN 2: ARCHIVO EXCEL / CSV */}
              {importTab === "file" && (
                <div className="space-y-4">
                  <div className="p-6 border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-2xl bg-slate-950/50 flex flex-col items-center justify-center text-center space-y-3 transition-colors cursor-pointer relative">
                    <input
                      type="file"
                      accept=".csv, .xlsx, .xls, .txt"
                      onChange={handleFileUpload}
                      disabled={importLoading}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-full border border-cyan-500/20">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">
                        Haz clic o arrastra tu archivo Excel / CSV de clientes aquí
                      </span>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Soporta columnas de DNI, C.E, Nombre, Celular, Email, Modelo de Vehículo
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* OPCIÓN 3: PEGAR TEXTO */}
              {importTab === "text" && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Pega filas de clientes (Formato: DNI, Nombre, Celular, Email, Modelo):
                  </label>
                  <textarea
                    rows={5}
                    value={pastedTextInput}
                    onChange={(e) => setPastedTextInput(e.target.value)}
                    placeholder={"74839201, Juan Pérez, 987654321, juan@gmail.com, Xiaomi Pro 2\n10472819, Maria Lopez, 912345678, maria@gmail.com, Segway G30"}
                    className="w-full p-3 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 leading-relaxed"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleImportPastedText}
                      disabled={importLoading}
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>Procesar e Importar</span>
                    </button>
                  </div>
                </div>
              )}

              {/* MENSAJE DE ESTADO DE IMPORTACIÓN */}
              {importStatusMessage && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-center space-x-2 animate-fade-in ${
                    importStatusMessage.type === "success"
                      ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                      : "bg-rose-950/40 border-rose-500/30 text-rose-300"
                  }`}
                >
                  {importStatusMessage.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{importStatusMessage.text}</span>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="flex items-center justify-between p-4 bg-slate-950 border-t border-slate-800">
              <span className="text-[11px] text-slate-500">
                ⚡ Todos los clientes importados se autocompletarán al buscar por DNI en la Tablet.
              </span>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {editingRepairId && (() => {
        const editRepair = repairs.find(r => r.id === editingRepairId);
        if (!editRepair) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Pencil className="w-4 h-4 text-amber-400" />
                  <span className="font-display font-black text-sm text-slate-100 uppercase tracking-wide">
                    Editar Cliente
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono">{editRepair.id}</span>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nombre del Cliente</label>
                  <input
                    type="text"
                    value={editClientName}
                    onChange={(e) => setEditClientName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 font-semibold focus:border-amber-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">DNI / C.E.</label>
                  <input
                    type="text"
                    value={editClientDni}
                    onChange={(e) => setEditClientDni(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 font-mono focus:border-amber-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={editClientPhone}
                    onChange={(e) => setEditClientPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 font-mono focus:border-amber-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email</label>
                  <input
                    type="text"
                    value={editClientEmail}
                    onChange={(e) => setEditClientEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:border-amber-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setEditingRepairId(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-400 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!editClientName.trim()) {
                      alert("El nombre del cliente es obligatorio.");
                      return;
                    }
                    if (onUpdateRepair) {
                      const updatedClient = {
                        name: editClientName.trim(),
                        phone: editClientPhone.trim(),
                        email: editClientEmail.trim(),
                        dni: editClientDni.trim()
                      };
                      await onUpdateRepair(editingRepairId, {
                        client: updatedClient
                      });

                      if (isFirebaseConfigured && db) {
                        const editRepair = repairs.find(r => r.id === editingRepairId);
                        if (editRepair) {
                          const oldPhone = editRepair.client?.phone;
                          const branch = editRepair.workshopBranch || workshopBranch;
                          if (updatedClient.phone) {
                            setDoc(doc(db, "clientes", branch, "clientes", updatedClient.phone), updatedClient, { merge: true }).catch(() => {});
                            if (oldPhone && oldPhone !== updatedClient.phone) {
                              setDoc(doc(db, "clientes", branch, "clientes", oldPhone), updatedClient, { merge: true }).catch(() => {});
                            }
                          }
                          if (updatedClient.dni) {
                            setDoc(doc(db, "clientes", updatedClient.dni), updatedClient, { merge: true }).catch(() => {});
                          }
                          if (editRepair.client?.dni && editRepair.client.dni !== updatedClient.dni) {
                            setDoc(doc(db, "clientes", editRepair.client.dni), updatedClient, { merge: true }).catch(() => {});
                          }
                        }
                      }

                      setEditingRepairId(null);
                    }
                  }}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer shadow-lg shadow-amber-600/20"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Revisar video de respaldo en pantalla completa */}
      {reviewIdx !== null && reviewUrl && recordedVideos[reviewIdx] && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-950/90 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center space-x-2">
              <Video className="w-4 h-4 text-cyan-400" />
              <span>Revisar Video de Respaldo {reviewIdx + 1}</span>
            </span>
            <button
              type="button"
              onClick={() => setReviewIdx(null)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-colors"
            >
              <span>Cerrar</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 w-full flex items-center justify-center bg-black p-2">
            <video
              src={reviewUrl}
              className="max-h-full w-full object-contain"
              controls
              autoPlay
              playsInline
              preload="auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
