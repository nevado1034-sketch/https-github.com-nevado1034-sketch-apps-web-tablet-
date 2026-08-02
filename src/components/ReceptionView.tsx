import React, { useState } from "react";
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
  RefreshCw,
  Gauge,
  MapPin,
  CreditCard,
  Video,
  Camera,
  FileSignature,
  Printer,
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
  CloudDownload
} from "lucide-react";
import { RepairItem, VehicleType, VisualState, Accessories, WorkshopBranch, ServiceType, PaymentMethod, PaymentInfo } from "../types";
import { SignaturePad, PhotoManager } from "./TabletHelpers";
import { generateRepairPdf } from "../utils/pdfGenerator";
import { db, isFirebaseConfigured, collection, query, where, getDocs } from "../firebase";

interface ReceptionViewProps {
  repairs: RepairItem[];
  onCreateRepair: (newRepair: any) => Promise<RepairItem | undefined>;
  isLoading: boolean;
}

const COMMON_BRANDS: Record<VehicleType, string[]> = {
  scooter: ["Xiaomi", "Segway Ninebot", "Minimotors Dualtron", "Kaabo", "Vsett", "Joyor", "Cecotec"],
  moto: ["Super Soco", "Niu", "E-Volt", "Vespa Elettrica", "Sur-Ron", "Talaria", "Zero Motorcycles"],
  bici: ["Trek", "Specialized", "Giant", "Xiaomi Himo", "Decathlon Rockrider", "Cube", "Scott"],
  otro: ["Monociclo KingSong", "Monociclo Begode", "Skateboard Boosted", "Triciclo de carga"]
};

const VOLTAGES = ["24V", "36V", "48V", "52V", "60V", "72V", "84V", "96V", "No sabe"];

const WORKSHOP_BRANCH_LABELS: Record<WorkshopBranch, string> = {
  lince_arenales: "Sede Lince (Av. Arenales 2584)",
  surco: "Sede Surco (Av. Santiago de Surco 4352)",
  san_borja: "Sede San Borja (Av. Aviación 2410)",
  lince_leal: "Sede Lince (Av. Jose Leal 571)"
};

export default function ReceptionView({ repairs, onCreateRepair, isLoading }: ReceptionViewProps) {
  // Branch state (Sede)
  const [workshopBranch, setWorkshopBranch] = useState<WorkshopBranch>("lince_arenales");

  // Service Type state
  const [serviceType, setServiceType] = useState<ServiceType>("mantenimiento");
  const [serviceTypeDetail, setServiceTypeDetail] = useState("");

  // Client State
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientDni, setClientDni] = useState(""); // Will hold DNI or RUC

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
      alert("Por favor ingrese un número de DNI o RUC para buscar.");
      return;
    }

    setIsSearchingClient(true);
    setFoundClientData(null);
    setClientSearchStatus("idle");

    try {
      // 1) Buscar en Firestore la colección "clientes" (registrados desde la App Android)
      let firestoreMatch: any | null = null;
      if (isFirebaseConfigured && db) {
        try {
          const q = query(collection(db, "clientes"), where("dni", "==", queryInput));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const d = snap.docs[0].data() as any;
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
                  : appVehicleType.includes("moto")
                    ? "moto"
                    : appVehicleType.includes("bici") || appVehicleType.includes("bicicl")
                      ? "bici"
                      : "otro"
            };
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

      const res = await fetch(`/api/clients/search?query=${encodeURIComponent(queryInput)}`);
      let data = [];
      if (res.ok) {
        data = await res.json();
      }

      if (data && data.length > 0) {
        const match = data[0];
        setFoundClientData(match);
        setClientSearchStatus("found");

        if (autoApply) {
          handleApplyClientData(match, match.defaultVehicle || (match.vehiclesHistory && match.vehiclesHistory[0]));
        }
      } else {
        const localMatch = repairs.find(
          r => r.client?.dni?.toLowerCase().includes(query.toLowerCase()) ||
               r.client?.name?.toLowerCase().includes(query.toLowerCase())
        );
        if (localMatch) {
          const clientRepairs = repairs.filter(r => r.client?.dni === localMatch.client?.dni);
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
            handleApplyClientData(foundObj, foundObj.vehiclesHistory[0]);
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

    if (selectedVehicle) {
      if (selectedVehicle.type) setVehicleType(selectedVehicle.type as VehicleType);
      if (selectedVehicle.brand) setBrand(selectedVehicle.brand);
      if (selectedVehicle.model) setModel(selectedVehicle.model);
      if (selectedVehicle.voltage) setVoltage(selectedVehicle.voltage);
    } else if (clientData.vehicleTypeMap || clientData.vehicleBrand) {
      if (clientData.vehicleTypeMap) setVehicleType(clientData.vehicleTypeMap as VehicleType);
      if (clientData.vehicleBrand) setBrand(clientData.vehicleBrand);
      if (clientData.vehicleModel) setModel(clientData.vehicleModel);
      if (clientData.problemDescription) setReportedFailure(clientData.problemDescription);
    }
  };

  // Vehicle State
  const [vehicleType, setVehicleType] = useState<VehicleType>("scooter");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [voltage, setVoltage] = useState("36V");
  const [batteryCondition, setBatteryCondition] = useState<'bueno' | 'regular' | 'malo' | 'no_aplica'>("bueno");
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
    videos: []
  });

  // Drawn conformity signatures
  const [clientSignature, setClientSignature] = useState("");
  const [tallerSignature, setTallerSignature] = useState("");

  // Presupuesto y Pago State
  const [estimatedCost, setEstimatedCost] = useState("120");
  const [advancePayment, setAdvancePayment] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("efectivo");
  const [paymentNotes, setPaymentNotes] = useState("");

  // Signatures & Acceptance State
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [clientSignatureName, setClientSignatureName] = useState("");
  const [tallerSignatureName, setTallerSignatureName] = useState("Taller Litio");

  // AI Suggestion State
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiDiagnostic, setAiDiagnostic] = useState<any | null>(null);
  const [aiError, setAiError] = useState("");

  // UI state
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [createdId, setCreatedId] = useState("");
  const [lastCreatedRepair, setLastCreatedRepair] = useState<RepairItem | null>(null);

  const handleAccessoriesChange = (field: keyof Accessories, value: any) => {
    setAccessories(prev => ({ ...prev, [field]: value }));
  };

  const handleVisualStateChange = (field: keyof VisualState, value: any) => {
    setVisualState(prev => ({ ...prev, [field]: value }));
  };

  // Trigger Gemini API to analyze reported failure
  const fetchAiDiagnostic = async () => {
    if (!reportedFailure.trim()) {
      setAiError("Por favor describe primero la falla reportada para generar sugerencias.");
      return;
    }

    setIsGeneratingAi(true);
    setAiError("");
    setAiDiagnostic(null);

    try {
      const response = await fetch("/api/ai-diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleType,
          brand,
          model,
          voltage,
          reportedFailure
        })
      });

      if (!response.ok) {
        throw new Error("No se pudo obtener el diagnóstico del servidor.");
      }

      const data = await response.json();
      setAiDiagnostic(data);
      
      // Auto adjust estimated time/cost suggestions if the AI brings a custom estimate
      if (data.estimatedTime.includes("3") || data.estimatedTime.includes("4")) {
        setEstimatedCost("250");
      } else if (data.estimatedTime.includes("5") || data.estimatedTime.includes("6")) {
        setEstimatedCost("400");
      }
    } catch (error: any) {
      console.error(error);
      setAiError("La conexión con el asistente de IA falló temporalmente, pero puedes continuar con el ingreso manual.");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientPhone || !brand || !reportedFailure) {
      alert("Por favor completa los campos obligatorios (*)");
      return;
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
      visualState,
      aiDiagnostic,
      estimatedCost: Number(estimatedCost) || 0,
      actualCost: 0,
      clientSignature,
      clientSignatureName,
      tallerSignature,
      tallerSignatureName,
      payment: {
        estimatedCost: Number(estimatedCost) || 0,
        advancePayment: Number(advancePayment) || 0,
        remainingBalance: Math.max(0, (Number(estimatedCost) || 0) - (Number(advancePayment) || 0)),
        paymentMethod,
        paymentNotes
      }
    };

    try {
      const created = await onCreateRepair(payload);
      if (created) {
        setLastCreatedRepair(created);
        setCreatedId(created.id);
      }
      setSubmitSuccess(true);
      
      // Reset form
      setClientName("");
      setClientPhone("");
      setClientEmail("");
      setClientDni("");
      setBrand("");
      setModel("");
      setReportedFailure("");
      setServiceTypeDetail("");
      setAccessories({ charger: false, key: false, battery: false, helmet: false, padlock: false, others: "" });
      setVisualState({ scratches: false, cracks: false, brakesOk: true, lightsOk: true, screenOk: true, tiresOk: true, videoRecorded: false, photosTaken: false, notes: "", photos: [], videos: [] });
      setAiDiagnostic(null);
      setEstimatedCost("120");
      setAdvancePayment("0");
      setPaymentNotes("");
      setTermsAccepted(false);
      setClientSignatureName("");
      setClientSignature("");
      setTallerSignature("");
      
      setTimeout(() => {
        setSubmitSuccess(false);
        setLastCreatedRepair(null);
      }, 15000);
    } catch (err) {
      console.error(err);
      alert("Error al ingresar vehículo a taller.");
    }
  };


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
              <span>Imprimir Ficha de Ingreso</span>
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
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  <select
                    value={workshopBranch}
                    onChange={e => setWorkshopBranch(e.target.value as WorkshopBranch)}
                    className="bg-transparent text-slate-200 text-xs font-bold focus:outline-none pr-2"
                  >
                    <option value="lince_arenales" className="bg-slate-950 text-slate-100">Sede Arenales - Lince</option>
                    <option value="surco" className="bg-slate-950 text-slate-100">Sede Surco</option>
                    <option value="san_borja" className="bg-slate-950 text-slate-100">Sede San Borja</option>
                    <option value="lince_leal" className="bg-slate-950 text-slate-100">Sede Jose Leal - Lince</option>
                  </select>
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
                    <button
                      type="button"
                      onClick={() => {
                        setShowImportModal(true);
                        setImportStatusMessage(null);
                      }}
                      className="flex items-center space-x-1.5 px-3 py-1 bg-cyan-950/90 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-bold transition-all shadow-[0_0_10px_rgba(6,182,212,0.15)] cursor-pointer"
                      title="Importar base de datos de clientes desde Excel, CSV o Google Sheets"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
                      <span>📊 Vincular Google Sheets / Excel</span>
                    </button>
                    <span className="hidden sm:flex text-[10px] text-cyan-400/80 font-mono items-center gap-1 bg-slate-950 px-2 py-1 rounded-md border border-slate-800">
                      <Database className="w-3 h-3" />
                      Búsqueda Litio
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Campo DNI / RUC con botón de búsqueda rápida */}
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">DNI / RUC *</label>
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
                        placeholder="Ej. 74839201 o 20601234567"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-100 placeholder:text-slate-600 text-sm transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => handleSearchClientByDni()}
                        disabled={isSearchingClient}
                        className="px-3.5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl font-bold text-xs flex items-center space-x-1 shrink-0 transition-all shadow-md hover:shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
                        title="Buscar cliente registrado en el sistema por DNI"
                      >
                        <Search className={`w-4 h-4 ${isSearchingClient ? "animate-spin" : ""}`} />
                        <span className="hidden sm:inline">Buscar DNI</span>
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
                    <span>No se encontraron registros previos para el DNI/RUC ingresado. Proceda ingresando los datos del cliente nuevo.</span>
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
                    {[
                      { value: "scooter", label: "Scooter / Patinete", desc: "Monopatines eléctricos" },
                      { value: "moto", label: "Moto Eléctrica", desc: "Motos y ciclomotores" },
                      { value: "bici", label: "Bici Eléctrica", desc: "e-Bikes urbanas / montaña" },
                      { value: "otro", label: "Otro Vehículo", desc: "Monociclos, triciclos" }
                    ].map(opt => (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => {
                          setVehicleType(opt.value as VehicleType);
                          setBrand(""); 
                        }}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          vehicleType === opt.value
                            ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400 ring-2 ring-cyan-500/10 font-bold"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900"
                        }`}
                      >
                        <p className="text-sm font-semibold">{opt.label}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-none">{opt.desc}</p>
                      </button>
                    ))}
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
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Condición de Batería Física</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { value: "bueno", label: "Bueno" },
                        { value: "regular", label: "Regular" },
                        { value: "malo", label: "Malo" },
                        { value: "no_aplica", label: "N/A" }
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
                  <textarea
                    rows={3}
                    required
                    value={reportedFailure}
                    onChange={e => setReportedFailure(e.target.value)}
                    placeholder="Ej. El motor da tirones al acelerar, la batería no carga más del 50%, ruidos extraños en freno..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-100 placeholder:text-slate-600 text-sm transition-all"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={fetchAiDiagnostic}
                      disabled={isGeneratingAi}
                      className="flex items-center space-x-1.5 bg-slate-950 text-cyan-400 border border-cyan-500/30 hover:border-cyan-400 px-4 py-2 rounded-xl text-xs font-bold shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all hover:bg-slate-900 disabled:opacity-50"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isGeneratingAi ? "animate-spin text-cyan-400" : ""}`} />
                      <span>{isGeneratingAi ? "Generando diagnóstico..." : "Asistente de Diagnóstico IA"}</span>
                    </button>
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
                      onClick={() => setServiceType(opt.value as ServiceType)}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col items-start ${
                        serviceType === opt.value
                          ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400 ring-2 ring-cyan-500/10 font-bold"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900"
                      }`}
                    >
                      <span className="text-xl mb-1">{opt.icon}</span>
                      <span className="text-xs font-bold">{opt.label}</span>
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


              {/* SECCIÓN 5: OBSERVACIONES GENERALES Y EVIDENCIA */}
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

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Observaciones Generales</label>
                  <textarea
                    rows={2}
                    value={visualState.notes}
                    onChange={e => handleVisualStateChange("notes", e.target.value)}
                    placeholder="Escribe comentarios generales sobre el chasis, partes sueltas u otras especificaciones visuales..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-100 text-sm transition-all"
                  />
                </div>
              </div>


              {/* SECCIÓN 6: PRESUPUESTO Y PAGO (8 in PDF) */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 text-slate-100">
                  <CreditCard className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-display font-bold text-sm uppercase tracking-wider">6. Presupuesto y Pago</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Total Estimado (S/.)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-slate-500 font-bold text-sm">S/.</span>
                      <input
                        type="number"
                        value={estimatedCost}
                        onChange={e => setEstimatedCost(e.target.value)}
                        placeholder="120"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-cyan-400 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Adelanto (S/.)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-slate-500 font-bold text-sm">S/.</span>
                      <input
                        type="number"
                        value={advancePayment}
                        onChange={e => setAdvancePayment(e.target.value)}
                        placeholder="0"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-amber-400 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Saldo Pendiente (S/.)</label>
                    <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm font-black text-rose-400 flex items-center h-[46px]">
                      S/. {Math.max(0, (Number(estimatedCost) || 0) - (Number(advancePayment) || 0))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Método de Pago</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { value: "efectivo", label: "Efectivo" },
                        { value: "transferencia", label: "Transf." },
                        { value: "yape_plin", label: "Yape/Plin" },
                        { value: "tarjeta", label: "Tarjeta" }
                      ].map(opt => (
                        <button
                          type="button"
                          key={opt.value}
                          onClick={() => setPaymentMethod(opt.value as PaymentMethod)}
                          className={`py-2 text-xs rounded-xl border font-bold transition-all ${
                            paymentMethod === opt.value
                              ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400"
                              : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Observaciones de Pago</label>
                    <input
                      type="text"
                      value={paymentNotes}
                      onChange={e => setPaymentNotes(e.target.value)}
                      placeholder="Ej. Pagado por Yape al ingreso..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>


              {/* SECCIÓN 7: TÉRMINOS Y CONDICIONES (6 in PDF) & CONFORMIDAD */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 text-slate-100">
                  <FileSignature className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-display font-bold text-sm uppercase tracking-wider">7. Términos, Firmas y Conformidad</h3>
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
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 py-3.5 px-6 rounded-xl font-bold text-sm tracking-wide shadow-[0_4px_25px_rgba(6,182,212,0.25)] hover:scale-[1.005] active:scale-[0.995] transition-all flex items-center justify-center space-x-2 disabled:opacity-55"
                >
                  <PlusCircle className="w-5 h-5" />
                  <span>{isLoading ? "Ingresando a taller..." : "REGISTRAR VEHÍCULO E INGRESO EN COLA"}</span>
                </button>
                <p className="text-[10px] text-slate-500 text-center mt-2.5 font-mono">
                  Gracias por confiar en LITIO ENERGY • Av. Arenales, Surco, San Borja & Jose Leal
                </p>
              </div>

            </form>
          </div>
        </div>


        {/* PANEL LATERAL DE DIAGNÓSTICO IA (TOMA 1/3 DE LA PANTALLA) */}
        <div className="space-y-6">
          
          {/* ASISTENTE COMPLEMENTARIO DE IA */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 text-white shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 rounded-full blur-2xl"></div>
            
            <div className="p-6 relative">
              <div className="flex items-center space-x-2 mb-4">
                <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-emerald-300">Asistente Técnico Litio</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Powered by Gemini AI</p>
                </div>
              </div>

              {isGeneratingAi ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
                  <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
                  <div>
                    <p className="text-sm font-semibold text-slate-200">Analizando el comportamiento del motor...</p>
                    <p className="text-xs text-slate-500 mt-1">Calculando causas probables y pautas de seguridad específicas</p>
                  </div>
                </div>
              ) : aiDiagnostic ? (
                <div className="space-y-5 animate-fade-in text-sm">
                  
                  {/* Causas Probables */}
                  <div>
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                      <span>Causas Probables</span>
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                      {aiDiagnostic.probableCauses.map((cause: string, idx: number) => (
                        <li key={idx} className="leading-relaxed pl-1">{cause}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Procedimientos Sugeridos */}
                  <div>
                    <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></span>
                      <span>Rutina de Diagnóstico</span>
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {aiDiagnostic.testProcedures.map((proc: string, idx: number) => (
                        <li key={idx} className="flex items-start space-x-1.5 leading-relaxed">
                          <span className="text-cyan-500 font-bold font-mono text-[10px] bg-cyan-950/40 border border-cyan-800/30 px-1 rounded mt-0.5">{idx + 1}</span>
                          <span>{proc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Repuestos recomendados */}
                  <div>
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                      <span>Repuestos Sugeridos</span>
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {aiDiagnostic.suggestedParts.map((part: string, idx: number) => (
                        <span key={idx} className="text-[10px] bg-amber-950/30 border border-amber-900/40 text-amber-300 font-medium px-2 py-0.5 rounded-md">
                          {part}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Tiempo estimado */}
                  <div className="flex justify-between items-center bg-slate-800/40 border border-slate-800 p-3 rounded-xl">
                    <span className="text-xs text-slate-400">Tiempo de Taller:</span>
                    <span className="text-sm font-bold text-cyan-300 font-mono">{aiDiagnostic.estimatedTime}</span>
                  </div>

                  {/* Alerta de Seguridad de IA */}
                  {aiDiagnostic.aiNote && (
                    <div className="p-3 bg-rose-950/20 border border-rose-900/30 text-rose-300 rounded-xl text-xs leading-relaxed flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{aiDiagnostic.aiNote}</span>
                    </div>
                  )}

                  <div className="text-[10px] text-slate-500 pt-1 text-center border-t border-slate-800">
                    Sugerencias aplicadas automáticamente al registro de recepción.
                  </div>

                </div>
              ) : (
                <div className="py-8 text-center text-slate-500 space-y-3">
                  <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                    <Sparkles className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400">¿Necesitas soporte técnico de entrada?</p>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                      Completa los detalles de la falla reportada y haz clic en <strong>Asistente de Diagnóstico IA</strong> para predecir fallas eléctricas y rutinas paso a paso.
                    </p>
                  </div>
                </div>
              )}

              {aiError && (
                <div className="mt-3 p-3 bg-amber-950/20 border border-amber-900/40 text-amber-300 rounded-xl text-xs">
                  {aiError}
                </div>
              )}

            </div>
          </div>


          {/* HISTORIAL RECIENTE DE VEHÍCULOS (VISTA RÁPIDA TABLET) */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-sm">
            <h3 className="font-display font-bold text-sm text-slate-100 uppercase tracking-wider mb-4 flex items-center justify-between">
              <span>Ingresos Recientes</span>
              <span className="text-xs bg-slate-950 text-slate-400 px-2.5 py-0.5 rounded-full font-mono border border-slate-800">{repairs.length} total</span>
            </h3>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {repairs.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No hay vehículos registrados hoy.</p>
              ) : (
                repairs.map(rep => {
                  const typeIcons: Record<string, string> = {
                    scooter: "🛴",
                    moto: "🏍️",
                    bici: "🚲",
                    otro: "🔋"
                  };
                  
                  const statusColors: Record<string, string> = {
                    receptioned: "bg-cyan-500/10 text-cyan-400 border-cyan-500/25",
                    diagnosing: "bg-purple-500/10 text-purple-400 border-purple-500/25",
                    waiting_parts: "bg-amber-500/10 text-amber-400 border-amber-500/25",
                    repairing: "bg-blue-500/10 text-blue-400 border-blue-500/25",
                    testing: "bg-pink-500/10 text-pink-400 border-pink-500/25",
                    ready: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
                    delivered: "bg-slate-500/10 text-slate-400 border-slate-500/25"
                  };

                  const statusLabels: Record<string, string> = {
                    receptioned: "Recibido",
                    diagnosing: "Diag.",
                    waiting_parts: "Repuestos",
                    repairing: "Reparando",
                    testing: "Pruebas",
                    ready: "Listo",
                    delivered: "Entregado"
                  };

                  return (
                    <div key={rep.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs hover:bg-slate-900 transition-colors group">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-cyan-400 font-mono">{rep.id.slice(0, 8)}</span>
                          <span className="text-slate-700">|</span>
                          <span className="font-semibold text-slate-200">{rep.client.name}</span>
                        </div>
                        <p className="text-slate-400 text-[11px] truncate max-w-[150px]">
                          {typeIcons[rep.vehicle.type] || "🔋"} {rep.vehicle.brand} {rep.vehicle.model}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => generateRepairPdf(rep)}
                          className="p-1.5 bg-slate-900 text-cyan-400 rounded-lg border border-slate-800 hover:border-cyan-500 hover:bg-cyan-950/20 transition-all cursor-pointer opacity-80 group-hover:opacity-100"
                          title="Imprimir Ficha de Conformidad PDF"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
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
    var dniIdx = headers.findIndex(function(h) { return h.includes("dni") || h.includes("ruc") || h.includes("doc"); });
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
    var dniIdx = headers.findIndex(function(h) { return h.includes("dni") || h.includes("ruc") || h.includes("doc"); });
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
                        Soporta columnas de DNI, RUC, Nombre, Celular, Email, Modelo de Vehículo
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
    </div>
  );
}
