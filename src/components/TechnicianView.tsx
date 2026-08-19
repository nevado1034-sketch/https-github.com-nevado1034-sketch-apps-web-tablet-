import React, { useState } from "react";
import { 
  Wrench, 
  User, 
  Smartphone, 
  Layers, 
  Sparkles, 
  CheckSquare, 
  AlertTriangle, 
  Tv,
  ArrowRight,
  MapPin,
  Video,
  Camera,
  CheckCircle,
  Plus,
  X,
  Package,
  Stethoscope,
  Trash2
} from "lucide-react";
import { RepairItem, RepairStatus, HistoryLog, WorkshopBranch, ServiceType, PaymentMethod, SparePart } from "../types";
import { SignaturePad, PhotoManager, VideoRecorder, RecordedVideo } from "./TabletHelpers";
import litioLogo from "../assets/litio-logo.png";

interface TechnicianViewProps {
  repairs: RepairItem[];
  onUpdateRepair: (id: string, updateData: any) => Promise<void>;
  isLoading: boolean;
  userLocalKey?: string;
}

const BRANCH_SHORT_LABELS: Record<string, string> = {
  lince_arenales: "S. Isidro",
  surco: "Surco",
  san_borja: "S. Borja",
  lince_leal: "Leal"
};

const STATUS_COLUMNS: Array<{ id: RepairStatus; label: string; bg: string; text: string; border: string }> = [
  { id: "receptioned", label: "En Cola / Recibidos", bg: "bg-slate-800/40", text: "text-slate-200", border: "border-slate-700/60" },
  { id: "diagnosing", label: "Diagnosticando", bg: "bg-cyan-950/20", text: "text-cyan-400", border: "border-cyan-900/40" },
  { id: "waiting_parts", label: "Esperando Repuestos", bg: "bg-amber-950/20", text: "text-amber-400", border: "border-amber-900/40" },
  { id: "repairing", label: "En Reparación", bg: "bg-blue-950/20", text: "text-blue-400", border: "border-blue-900/40" },
  { id: "testing", label: "En Pruebas", bg: "bg-purple-950/20", text: "text-purple-400", border: "border-purple-900/40" },
  { id: "ready", label: "Listo para Entrega", bg: "bg-emerald-950/20", text: "text-emerald-400", border: "border-emerald-900/40" }
];

export default function TechnicianView({ repairs, onUpdateRepair, isLoading, userLocalKey }: TechnicianViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(repairs[0]?.id || null);
  const [technicianName, setTechnicianName] = useState("");
  
  // TV & Workshop Wide Screen TV states
  const [isTvMode, setIsTvMode] = useState(false);
  const [tvFilterBranch, setTvFilterBranch] = useState<string>(userLocalKey || "all");
  const [currentTime, setCurrentTime] = useState(new Date());

  // Local edit states for the selected vehicle workspace
  const [techNotes, setTechNotes] = useState("");
  const [techSignature, setTechSignature] = useState("");
  const [completedProcedures, setCompletedProcedures] = useState<Record<string, boolean>>({});

  // Modal de entrega: confirmación + firma del cliente al recibir el vehículo
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryClientName, setDeliveryClientName] = useState("");
  const [deliverySignature, setDeliverySignature] = useState("");

  // Repuestos detectados por el técnico en el diagnóstico
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [newPartDesc, setNewPartDesc] = useState("");
  const [newPartType, setNewPartType] = useState<"reparacion" | "cambio">("reparacion");

  // Modo de trabajo del técnico: Diagnóstico (recién ingresados) o Reparación (taller completo)
  const [techMode, setTechMode] = useState<"diagnostico" | "reparacion">("diagnostico");

  // Fotos y videos tomados durante el diagnóstico técnico
  const [diagPhotos, setDiagPhotos] = useState<string[]>([]);
  const [diagVideos, setDiagVideos] = useState<RecordedVideo[]>([]);

  const activeRepair = repairs.find(r => r.id === selectedId);

  // En modo Diagnóstico, preselecciona automáticamente el primer vehículo recién ingresado
  // si la selección actual ya no corresponde a la cola de diagnóstico.
  React.useEffect(() => {
    if (techMode === "diagnostico") {
      const queue = repairs.filter(r => r.status === "receptioned" || r.status === "diagnosing");
      const isCurrentInQueue = selectedId && queue.some(r => r.id === selectedId);
      if (queue.length > 0 && !isCurrentInQueue) {
        setSelectedId(queue[0].id);
      } else if (queue.length === 0 && selectedId) {
        setSelectedId(null);
      }
    }
  }, [techMode, repairs, selectedId]);

  // Sync state whenever active repair changes
  React.useEffect(() => {
    if (activeRepair) {
      setTechNotes(activeRepair.technicianNotes || "");
      setTechSignature(activeRepair.technicianSignature || "");
      setSpareParts(activeRepair.spareParts || []);
      setNewPartDesc("");
      setNewPartType("reparacion");
      setDiagPhotos(activeRepair.visualState.photos || []);
      setDiagVideos([]);
      // Reset procedures check
      setCompletedProcedures({});
    }
  }, [selectedId, activeRepair]);

  // Clock effect for TV Mode
  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleProcedure = (key: string) => {
    setCompletedProcedures(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleUpdateStatus = async (newStatus: RepairStatus, extra?: Record<string, any>) => {
    if (!activeRepair) return;

    if (newStatus === "ready" || newStatus === "delivered") {
      if (activeRepair.qcReport?.result !== "approved") {
        alert("Esta orden primero debe pasar por Control de Calidad. La jefa del local debe aprobar la revisión antes de marcarla como Lista o Entregada.");
        return;
      }
      if (!technicianName || !technicianName.trim()) {
        alert("¡Nombre de Técnico requerido! Por favor, ingrese su nombre de técnico responsable para poder marcar el vehículo como Listo o Entregado.");
        return;
      }
      if (!techSignature) {
        alert("¡Firma requerida! Por favor, realice su firma digital en el recuadro 'Firma Digital del Técnico Responsable' para certificar que el vehículo está listo para entregar.");
        return;
      }
    }

    const payload = {
      status: newStatus,
      technicianNotes: techNotes,
      actualCost: activeRepair.actualCost || 0,
      technicianName: `Téc. ${technicianName}`,
      technicianSignature: techSignature,
      technicianSignatureName: `Téc. ${technicianName}`,
      ...(extra || {})
    };

    try {
      await onUpdateRepair(activeRepair.id, payload);
    } catch (err) {
      console.error(err);
      alert("Error al actualizar estado.");
    }
  };

  const handleSaveNotes = async () => {
    if (!activeRepair) return;
    
    const payload = {
      technicianNotes: techNotes,
      actualCost: activeRepair.actualCost || 0,
      technicianName: `Téc. ${technicianName}`,
      technicianSignature: techSignature,
      technicianSignatureName: `Téc. ${technicianName}`
    };

    try {
      await onUpdateRepair(activeRepair.id, payload);
      alert("Notas, presupuesto y firma guardados con éxito.");
    } catch (err) {
      console.error(err);
      alert("Error al guardar notas de taller.");
    }
  };

  const addSparePart = () => {
    const desc = newPartDesc.trim();
    if (!desc) return;
    const part: SparePart = {
      id: `part_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      description: desc,
      type: newPartType
    };
    setSpareParts((prev) => [...prev, part]);
    setNewPartDesc("");
  };

  const removeSparePart = (id: string) => {
    setSpareParts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSaveSpareParts = async () => {
    if (!activeRepair) return;
    const clean = spareParts.filter((p) => p.description.trim());
    if (clean.length === 0) {
      alert("Agrega al menos un repuesto o trabajo detectado.");
      return;
    }
    try {
      await onUpdateRepair(activeRepair.id, {
        spareParts: clean,
        technicianName: `Téc. ${technicianName}`
      });
      alert("Repuestos/trabajos guardados. La jefa del local podrá colocar el presupuesto.");
    } catch (err) {
      console.error(err);
      alert("Error al guardar los repuestos.");
    }
  };

  // Guarda el diagnóstico completo del técnico: notas, repuestos, fotos y videos.
  // Además pasa el vehículo de "Recepción" a "En Diagnóstico" automáticamente.
  const handleSaveDiagnosis = async () => {
    if (!activeRepair) return;
    const clean = spareParts.filter((p) => p.description.trim());

    const payload: any = {
      technicianNotes: techNotes,
      spareParts: clean,
      technicianName: `Téc. ${technicianName}`,
      visualState: {
        ...activeRepair.visualState,
        photos: diagPhotos,
        photosTaken: diagPhotos.length > 0
      },
      videoEvidenceBlobs: diagVideos
    };

    if (activeRepair.status === "receptioned") {
      payload.status = "diagnosing";
    }

    try {
      await onUpdateRepair(activeRepair.id, payload);
      setDiagVideos([]);
      alert(
        clean.length > 0
          ? "Diagnóstico guardado. El vehículo pasó a 'En Diagnóstico' y la jefa ya puede armar el presupuesto."
          : "Diagnóstico guardado (notas, fotos y videos). El vehículo pasó a 'En Diagnóstico'."
      );
    } catch (err) {
      console.error(err);
      alert("Error al guardar el diagnóstico.");
    }
  };

  // Sincroniza las fotos del diagnóstico con el estado visual del vehículo
  const handleDiagPhotosChange = (updated: string[]) => {
    setDiagPhotos(updated);
  };

  // One-click change of status directly from the TV card step indicators
  const handleStatusChangeDirectly = async (item: RepairItem, newStatus: RepairStatus) => {
    const statusLabels: Record<string, string> = {
      receptioned: "Cola",
      diagnosing: "Diag",
      waiting_parts: "Repuestos",
      repairing: "Reparando",
      testing: "Pruebas",
      ready: "Listo",
      delivered: "Entregado"
    };

    if (newStatus === "ready" || newStatus === "delivered") {
      if (item.qcReport?.result !== "approved") {
        alert("Esta orden primero debe pasar por Control de Calidad. La jefa del local debe aprobar la revisión antes de marcarla como Lista o Entregada.");
        return;
      }
      if (!item.technicianSignature) {
        alert(`Para cambiar el estado de la orden a ${statusLabels[newStatus]}, es obligatorio registrar el nombre y firma del técnico responsable. Por favor, realice este proceso desde el panel de detalles del taller.`);
        return;
      }
      if (newStatus === "delivered") {
        alert("La entrega del vehículo debe registrarse desde el panel de taller: la jefa del local entrega el vehículo y el cliente firma la conformidad. No se puede entregar directamente desde el Monitor TV.");
        return;
      }
    }

    const payload = {
      status: newStatus,
      technicianNotes: item.technicianNotes || `Estado actualizado directamente desde el Monitor TV de Taller a ${statusLabels[newStatus]}.`,
      actualCost: item.actualCost || item.estimatedCost || 0,
      technicianName: item.technicianSignatureName || `Téc. ${technicianName} (Monitor TV)`
    };

    try {
      await onUpdateRepair(item.id, payload);
    } catch (err) {
      console.error(err);
      alert("Error al cambiar de estado.");
    }
  };

  // Quick next-stage advancement helper
  const handleQuickAdvance = async (item: RepairItem) => {
    const pipeline: RepairStatus[] = ["receptioned", "diagnosing", "waiting_parts", "repairing", "testing", "ready", "delivered"];
    const currentIndex = pipeline.indexOf(item.status);
    if (currentIndex !== -1 && currentIndex < pipeline.length - 1) {
      const nextStatus = pipeline[currentIndex + 1];
      await handleStatusChangeDirectly(item, nextStatus);
    }
  };

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case "scooter": return "";
      case "bici": return "";
      case "moto": return "";
      case "bicimoto": return "";
      case "trimoto": return "";
      default: return "";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      
      {/* SECTOR DE SESIN DE T0CNICO Y ACCESO A MODO TV */}
      <div className="mb-6 bg-slate-900 border border-slate-800 text-white p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/30 text-cyan-400">
            <Wrench className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="font-display font-black text-lg text-slate-100 tracking-tight flex items-center space-x-2">
              <span>ZONA DE TRABAJO TÉCNICO</span>
              <span className="text-[10px] uppercase font-mono bg-cyan-950 text-cyan-400 border border-cyan-800/40 px-2 py-0.5 rounded-full font-bold">Litio Energy v2.1</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Controla las colas de reparación, las fallas reportadas y la pauta de diagnóstico IA de cada vehículo.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* TV Mode Switcher Button */}
          <button
            type="button"
            onClick={() => setIsTvMode(!isTvMode)}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider border transition-all ${
              isTvMode
                ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:bg-cyan-400"
                : "bg-slate-950 text-cyan-400 border-cyan-500/25 hover:border-cyan-400 hover:bg-slate-900"
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>{isTvMode ? "Salir de Vista TV" : "Activar Vista TV"}</span>
          </button>

          <div className="flex items-center space-x-2 bg-slate-950/40 p-1.5 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-500 pl-1.5 font-bold uppercase tracking-wider">Técnico:</span>
            <input
              type="text"
              value={technicianName}
              onChange={e => setTechnicianName(e.target.value)}
              placeholder="Nombre del técnico"
              className="bg-slate-900 border border-slate-800 text-white placeholder:text-slate-600 rounded-lg px-2.5 py-1 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-cyan-500/30 w-44"
            />
          </div>
        </div>
      </div>

      {/* SELECTOR DE MODO: DIAGNSTICO (VEHCULOS QUE ACABAN DE INGRESAR) / REPARACIN (TALLER COMPLETO) */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setTechMode("diagnostico")}
          className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all group ${
            techMode === "diagnostico"
              ? "bg-cyan-500/15 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
              : "bg-slate-900 border-slate-800 hover:border-cyan-500/40"
          }`}
        >
          <div className={`p-3 rounded-xl ${techMode === "diagnostico" ? "bg-cyan-500 text-slate-950" : "bg-slate-950 text-cyan-400 border border-cyan-800/40"}`}>
            <Stethoscope className="w-6 h-6" />
          </div>
          <span className={`mt-2 font-display font-black text-sm uppercase tracking-wider ${techMode === "diagnostico" ? "text-cyan-400" : "text-slate-300"}`}>
            Diagnóstico
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5">
            {repairs.filter(r => r.status === "receptioned" || r.status === "diagnosing").length} vehículos recién ingresados
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTechMode("reparacion")}
          className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all group ${
            techMode === "reparacion"
              ? "bg-blue-500/15 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.25)]"
              : "bg-slate-900 border-slate-800 hover:border-blue-500/40"
          }`}
        >
          <div className={`p-3 rounded-xl ${techMode === "reparacion" ? "bg-blue-500 text-slate-950" : "bg-slate-950 text-blue-400 border border-blue-800/40"}`}>
            <Wrench className="w-6 h-6" />
          </div>
          <span className={`mt-2 font-display font-black text-sm uppercase tracking-wider ${techMode === "reparacion" ? "text-blue-400" : "text-slate-300"}`}>
            Reparación
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5">
            {repairs.filter(r => r.status !== "receptioned" && r.status !== "diagnosing" && r.status !== "delivered").length} vehículos en taller
          </span>
        </button>
      </div>

      {/* RENDER CONDICIONAL: 1. MODO TV (PANTALLA DE TELEVISOR DE TALLER) */}
      {isTvMode ? (
        <div className="space-y-6 animate-fade-in">
          
          {/* Header Superior del Monitor de TV */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/30 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xl">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center overflow-hidden drop-shadow-[0_0_12px_rgba(6,182,212,0.4)] shrink-0">
                <img
                  src={litioLogo}
                  alt="Isotipo Litio Energy"
                  className="w-16 h-16 object-contain"
                  draggable={false}
                />
              </div>
              <div>
                <h1 className="font-display font-black text-2xl text-white tracking-tight flex items-center gap-2">
                  <span>LITIO ENERGY</span>
                  <span className="text-cyan-400 font-mono text-sm uppercase px-2 py-0.5 bg-slate-950 rounded-md border border-slate-800">Taller TV Monitor</span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">Avance rápido táctil y visualización en tiempo real para mecánicos</p>
              </div>
            </div>

            {/* Branch Selector Filter for TV */}
            <div className="flex items-center space-x-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Sede TV:</span>
              {userLocalKey ? (
                <span className="text-slate-200 text-xs font-black">
                  {tvFilterBranch === "lince_arenales" ? "San Isidro (Arenales)" : tvFilterBranch === "surco" ? "Surco" : tvFilterBranch === "san_borja" ? "San Borja" : tvFilterBranch === "lince_leal" ? "Lince (Jose Leal)" : "Todas las sedes"}
                </span>
              ) : (
                <select
                  value={tvFilterBranch}
                  onChange={e => setTvFilterBranch(e.target.value)}
                  className="bg-transparent text-slate-200 text-xs font-black focus:outline-none"
                >
                  <option value="all" className="bg-slate-950 text-slate-200">Todas las sedes</option>
                  <option value="lince_arenales" className="bg-slate-950 text-slate-200">San Isidro (Arenales)</option>
                  <option value="surco" className="bg-slate-950 text-slate-200">Surco</option>
                  <option value="san_borja" className="bg-slate-950 text-slate-200">San Borja</option>
                  <option value="lince_leal" className="bg-slate-950 text-slate-200">Lince (Jose Leal)</option>
                </select>
              )}
            </div>

            {/* ticking clock of TV Screen */}
            <div className="text-right flex items-center space-x-3.5 md:border-l md:border-slate-800 md:pl-5">
              <div className="font-mono text-xl font-bold text-slate-300">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <span className="bg-emerald-950 border border-emerald-500/25 text-emerald-400 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest font-mono animate-pulse">
                 LIVE MONITOR
              </span>
            </div>
          </div>

          {/* Estadísticas de TV */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">En Cola / Recibidos</p>
              <p className="text-2xl font-black text-slate-100 font-mono mt-1">
                {repairs.filter(r => (r.status === "receptioned" || r.status === "diagnosing") && (tvFilterBranch === "all" || r.workshopBranch === tvFilterBranch)).length}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
              <p className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">En Reparación Activa</p>
              <p className="text-2xl font-black text-cyan-400 font-mono mt-1">
                {repairs.filter(r => (r.status === "waiting_parts" || r.status === "repairing" || r.status === "testing") && (tvFilterBranch === "all" || r.workshopBranch === tvFilterBranch)).length}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
              <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold">Listos Para Retirar</p>
              <p className="text-2xl font-black text-emerald-400 font-mono mt-1">
                {repairs.filter(r => r.status === "ready" && (tvFilterBranch === "all" || r.workshopBranch === tvFilterBranch)).length}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Entregas Totales</p>
              <p className="text-2xl font-black text-slate-400 font-mono mt-1">
                {repairs.filter(r => r.status === "delivered" && (tvFilterBranch === "all" || r.workshopBranch === tvFilterBranch)).length}
              </p>
            </div>
          </div>

          {/* Grid de 3 Columnas Gigantes para Televisor */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* COLUMNA 1: RECEPCIONADOS Y DIAGNSTICO */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-850 pb-2.5">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-slate-400"></span>
                  <h3 className="font-display font-black text-sm uppercase tracking-wider text-slate-200">1. Entrada & Diagnóstico</h3>
                </div>
                <span className="bg-slate-900 text-slate-400 px-2 py-0.5 rounded font-mono text-xs font-black">
                  {repairs.filter(r => (r.status === "receptioned" || r.status === "diagnosing") && (tvFilterBranch === "all" || r.workshopBranch === tvFilterBranch)).length}
                </span>
              </div>

              <div className="space-y-4 max-h-[700px] overflow-y-auto pr-1">
                {repairs.filter(r => (r.status === "receptioned" || r.status === "diagnosing") && (tvFilterBranch === "all" || r.workshopBranch === tvFilterBranch)).length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-600 italic">No hay vehículos en ingreso o diagnóstico</div>
                ) : (
                  repairs.filter(r => (r.status === "receptioned" || r.status === "diagnosing") && (tvFilterBranch === "all" || r.workshopBranch === tvFilterBranch)).map(item => (
                    <TvCard 
                      key={item.id} 
                      item={item} 
                      handleStatusChangeDirectly={handleStatusChangeDirectly}
                      handleQuickAdvance={handleQuickAdvance}
                      getVehicleIcon={getVehicleIcon}
                    />
                  ))
                )}
              </div>
            </div>

            {/* COLUMNA 2: ESPERANDO REPUESTO / REPARACIN / PRUEBAS */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-850 pb-2.5">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse"></span>
                  <h3 className="font-display font-black text-sm uppercase tracking-wider text-cyan-400">2. Reparación Activa</h3>
                </div>
                <span className="bg-cyan-950/40 text-cyan-400 border border-cyan-900/30 px-2 py-0.5 rounded font-mono text-xs font-black">
                  {repairs.filter(r => (r.status === "waiting_parts" || r.status === "repairing" || r.status === "testing") && (tvFilterBranch === "all" || r.workshopBranch === tvFilterBranch)).length}
                </span>
              </div>

              <div className="space-y-4 max-h-[700px] overflow-y-auto pr-1">
                {repairs.filter(r => (r.status === "waiting_parts" || r.status === "repairing" || r.status === "testing") && (tvFilterBranch === "all" || r.workshopBranch === tvFilterBranch)).length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-600 italic">No hay vehículos en reparación activa en este momento</div>
                ) : (
                  repairs.filter(r => (r.status === "waiting_parts" || r.status === "repairing" || r.status === "testing") && (tvFilterBranch === "all" || r.workshopBranch === tvFilterBranch)).map(item => (
                    <TvCard 
                      key={item.id} 
                      item={item} 
                      handleStatusChangeDirectly={handleStatusChangeDirectly}
                      handleQuickAdvance={handleQuickAdvance}
                      getVehicleIcon={getVehicleIcon}
                    />
                  ))
                )}
              </div>
            </div>

            {/* COLUMNA 3: LISTO PARA ENTREGA */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-850 pb-2.5">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                  <h3 className="font-display font-black text-sm uppercase tracking-wider text-emerald-400">3. Listos Para Entrega</h3>
                </div>
                <span className="bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 px-2 py-0.5 rounded font-mono text-xs font-black">
                  {repairs.filter(r => r.status === "ready" && (tvFilterBranch === "all" || r.workshopBranch === tvFilterBranch)).length}
                </span>
              </div>

              <div className="space-y-4 max-h-[700px] overflow-y-auto pr-1">
                {repairs.filter(r => r.status === "ready" && (tvFilterBranch === "all" || r.workshopBranch === tvFilterBranch)).length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-600 italic">No hay vehículos listos para retiro</div>
                ) : (
                  repairs.filter(r => r.status === "ready" && (tvFilterBranch === "all" || r.workshopBranch === tvFilterBranch)).map(item => (
                    <TvCard 
                      key={item.id} 
                      item={item} 
                      handleStatusChangeDirectly={handleStatusChangeDirectly}
                      handleQuickAdvance={handleQuickAdvance}
                      getVehicleIcon={getVehicleIcon}
                    />
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      ) : techMode === "diagnostico" ? (
        
        // RENDER 1b: DIAGNOSTICO DEL TECNICO (VEHICULOS QUE ACABAN DE INGRESAR)
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
          
          {/* COLA DE DIAGNOSTICO (5 COLS): SOLO VEHICULOS RECIEN INGRESADOS */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 text-white">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Stethoscope className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-display font-bold text-sm uppercase tracking-wider text-slate-300">Vehículos por Diagnosticar</h3>
                </div>
                <span className="text-xs bg-cyan-950 text-cyan-400 px-2.5 py-1 rounded-full font-mono font-bold border border-cyan-800/40">
                  {repairs.filter(r => r.status === "receptioned" || r.status === "diagnosing").length}
                </span>
              </div>

              <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                {repairs.filter(r => r.status === "receptioned" || r.status === "diagnosing").length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-600 italic">
                    No hay vehículos recién ingresados. En cuanto la recepción registre un vehículo, aparecerá automáticamente aquí.
                  </div>
                ) : (
                  repairs.filter(r => r.status === "receptioned" || r.status === "diagnosing").map(rep => {
                    const isSelected = rep.id === selectedId;
                    const isDiagnosing = rep.status === "diagnosing";
                    return (
                      <div
                        key={rep.id}
                        onClick={() => setSelectedId(rep.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? "bg-slate-800/80 border-cyan-500/80 shadow-[0_0_12px_rgba(6,182,212,0.15)] text-white"
                            : "bg-slate-900/40 border-slate-800/80 text-slate-400 hover:bg-slate-800/30 hover:text-slate-300"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-mono font-bold text-xs text-white bg-slate-950 px-1.5 py-0.5 rounded border border-slate-850">{rep.id}</span>
                              <span className={`text-xs font-black ${isSelected ? "text-cyan-300" : "text-slate-300"}`}>{rep.client.name}</span>
                            </div>
                            <p className="text-xs">
                              {getVehicleIcon(rep.vehicle.type)} <strong className="text-slate-200">{rep.vehicle.brand}</strong> {rep.vehicle.model}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              <span className="text-[9px] bg-slate-950 text-slate-400 px-1.5 py-0.2 rounded font-mono font-bold uppercase">
                                {BRANCH_SHORT_LABELS[rep.workshopBranch || "lince_arenales"] || "Lince"}
                              </span>
                              {isDiagnosing && (
                                <span className="text-[9px] bg-cyan-950 text-cyan-400 px-1.5 py-0.2 rounded font-mono font-bold uppercase animate-pulse">
                                   En Diagnóstico
                                </span>
                              )}
                              {(rep.spareParts?.length || 0) > 0 && (
                                <span className="text-[9px] bg-amber-950 text-amber-400 px-1.5 py-0.2 rounded font-mono font-bold uppercase">
                                  {rep.spareParts!.length} repuestos
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end justify-between self-stretch">
                            <p className="text-[10px] text-slate-500 font-mono">
                              {new Date(rep.receptionDate).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono">Recién ingresado</p>
                          </div>
                        </div>
                        
                        {rep.vehicle.reportedFailure && (
                          <p className="text-[10px] text-cyan-200/80 truncate mt-2 italic bg-cyan-950/20 p-1.5 rounded border border-cyan-900/30">
                            "Falla: {rep.vehicle.reportedFailure}"
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* PANEL DE DIAGNOSTICO TECNICO (7 COLS) */}
          <div className="lg:col-span-7">
            {activeRepair && (activeRepair.status === "receptioned" || activeRepair.status === "diagnosing") ? (
              <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden animate-fade-in">
                {/* Header de Detalle */}
                <div className="bg-slate-950 text-white p-6 border-b border-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="bg-cyan-500 text-slate-950 font-mono font-black px-2.5 py-1 rounded text-sm tracking-wider">
                        {activeRepair.id}
                      </span>
                      <span className="text-slate-700">/</span>
                      <h2 className="font-display font-black text-xl text-slate-100 tracking-tight">
                        {activeRepair.vehicle.brand} {activeRepair.vehicle.model}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-400">
                      Cliente: <strong className="text-slate-200">{activeRepair.client.name}</strong>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 md:items-end">
                    <div className="flex flex-col items-start md:items-end">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Estado</span>
                      <div className="flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse mr-1.5"></span>
                        <span className="text-sm font-bold text-cyan-400 font-display uppercase tracking-wide">
                          {activeRepair.status === "diagnosing" ? "En Diagnóstico" : "Recién Ingresado"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contenido Detallado */}
                <div className="p-6 space-y-6">
                  
                  {/* FICHA TECNICA DEL CLIENTE PARA EL DIAGNOSTICO (solo el tecnico ve nombre y falla) */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-xs">
                    <h4 className="font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span>Datos Técnicos para el Diagnóstico</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <p className="text-slate-300"><strong>Cliente:</strong> <span className="text-white font-bold">{activeRepair.client.name}</span></p>
                        <p className="text-slate-300"><strong>Teléfono:</strong> {activeRepair.client.phone}</p>
                        <p className="text-slate-300"><strong>Tipo de Vehículo:</strong> {activeRepair.vehicle.type.toUpperCase()}</p>
                        <p className="text-slate-300"><strong>Marca / Modelo:</strong> {activeRepair.vehicle.brand} {activeRepair.vehicle.model}</p>
                        <p className="text-slate-300"><strong>Voltaje:</strong> {activeRepair.vehicle.voltage}</p>
                        <p className="text-slate-300"><strong>Vida útil Batería:</strong> {activeRepair.vehicle.batteryCondition.toUpperCase()}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-slate-300"><strong>Sede de Ingreso:</strong> {activeRepair.workshopBranch === "lince_arenales" ? "Arenales (San Isidro)" : activeRepair.workshopBranch === "surco" ? "Surco" : activeRepair.workshopBranch === "san_borja" ? "San Borja" : activeRepair.workshopBranch === "lince_leal" ? "Jose Leal (Lince)" : "Lince"}</p>
                        <p className="text-slate-300"><strong>Tipo de Servicio:</strong> <span className="text-cyan-300 font-bold uppercase">{activeRepair.serviceType === "mantenimiento" ? "Mantenimiento" : activeRepair.serviceType === "diagnostico" ? "Diagnóstico" : activeRepair.serviceType === "garantia" ? "Garantía" : activeRepair.serviceType === "cambio" ? "Cambio de Repuesto" : activeRepair.serviceType === "express" ? "Servicio Express" : "Diagnóstico"}</span></p>
                        <p className="text-slate-300"><strong>Accesorios:</strong> {[
                          activeRepair.accessories.charger ? "Cargador" : null,
                          activeRepair.accessories.key ? "Llaves" : null,
                          activeRepair.accessories.battery ? "Batería Extra" : null,
                          activeRepair.accessories.helmet ? "Casco" : null,
                          activeRepair.accessories.padlock ? "Candado" : null,
                          activeRepair.accessories.others ? activeRepair.accessories.others : null
                        ].filter(Boolean).join(", ") || "Ninguno"}</p>
                      </div>
                    </div>
                  </div>

                  {/* FALLA REPORTADA DESTACADA (solo la ve el tecnico) */}
                  <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-4">
                    <p className="text-[10px] uppercase font-black tracking-widest text-rose-400 mb-1.5 flex items-center space-x-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Falla reportada por la que llega</span>
                    </p>
                    <p className="text-sm text-slate-100 font-semibold leading-relaxed">
                      "{activeRepair.vehicle.reportedFailure}"
                    </p>
                  </div>

                  {/* FOTOS Y VIDEOS DEL DIAGNOSTICO (BOTONES ACTIVADOS) */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wider font-display flex items-center space-x-2">
                        <Camera className="w-4 h-4 text-cyan-400" />
                        <span>Evidencia del Diagnóstico</span>
                      </h3>
                      <span className="text-[10px] text-slate-500">Fotos y videos del estado detectado</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <PhotoManager
                        photos={diagPhotos}
                        onPhotosChange={handleDiagPhotosChange}
                        title="Fotos del Diagnóstico Técnico"
                        subtitle="Captura o sube las fotos del estado interno del vehículo que sustentan tu diagnóstico."
                        storageBadge="MEMORIA TECNICO"
                      />

                      <div className="space-y-3">
                        <VideoRecorder
                          onRecorded={(v) => setDiagVideos(prev => [...prev, v])}
                          branchLabel={BRANCH_SHORT_LABELS[activeRepair.workshopBranch] || "Taller"}
                        />

                        {diagVideos.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[10px] uppercase font-black text-slate-500 tracking-wider">
                              Videos de diagnóstico pendientes ({diagVideos.length})
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                              {diagVideos.map((v, idx) => (
                                <div
                                  key={idx}
                                  className="relative flex flex-col items-center justify-center gap-1 rounded-lg border border-cyan-800/40 bg-slate-950 p-3 text-center"
                                >
                                  <Video className="w-5 h-5 text-cyan-400" />
                                  <span className="text-[9px] font-mono text-slate-400">
                                    {v.durationSec}s  {(v.sizeBytes / 1024 / 1024).toFixed(2)} MB
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setDiagVideos(prev => prev.filter((_, i) => i !== idx))}
                                    className="absolute top-1 right-1 p-1 bg-slate-950/80 border border-slate-800 text-rose-400 hover:text-rose-300 rounded-md"
                                    title="Quitar video"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* RELACION DE REPUESTOS POR CAMBIAR / REPARAR + OBSERVACION */}
                  <div className="pt-2 border-t border-slate-850 text-xs">
                    <div className="flex items-center justify-between mb-2">
                      <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        <Package className="w-3.5 h-3.5 text-amber-400" />
                        <span>Repuestos / Trabajos que necesita el vehículo</span>
                      </label>
                      <span className="text-[10px] text-slate-500">
                        La jefa del local colocará el precio
                      </span>
                    </div>

                    {spareParts.length > 0 && (
                      <ul className="space-y-1.5 mb-2">
                        {spareParts.map((p) => (
                          <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800">
                            <div className="flex items-center space-x-2 min-w-0">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide shrink-0 ${p.type === "cambio" ? "bg-amber-500/15 text-amber-400 border border-amber-500/25" : "bg-blue-500/15 text-blue-400 border border-blue-500/25"}`}>
                                {p.type === "cambio" ? "Cambiar" : "Reparar"}
                              </span>
                              <span className="text-slate-100 font-medium truncate">{p.description}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeSparePart(p.id)}
                              className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded transition-colors shrink-0"
                              title="Quitar"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setNewPartType("cambio")}
                          className={`px-2.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition-colors ${newPartType === "cambio" ? "bg-amber-500/20 border-amber-500/40 text-amber-300" : "bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300"}`}
                        >
                          Cambiar
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewPartType("reparacion")}
                          className={`px-2.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition-colors ${newPartType === "reparacion" ? "bg-blue-500/20 border-blue-500/40 text-blue-300" : "bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300"}`}
                        >
                          Reparar
                        </button>
                      </div>
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={newPartDesc}
                          onChange={e => setNewPartDesc(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") addSparePart(); }}
                          placeholder="Ej. Cambio de acelerador, purgado, cambio de llantas..."
                          className="flex-1 px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 text-xs"
                        />
                        <button
                          type="button"
                          onClick={addSparePart}
                          disabled={!newPartDesc.trim()}
                          className="px-3 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/25 rounded-lg font-bold text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Agregar</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* OBSERVACION DEL TECNICO PARA CUALQUIER CAMBIO */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Observación del técnico para el cambio o trabajo
                    </label>
                    <textarea
                      rows={3}
                      value={techNotes}
                      onChange={e => setTechNotes(e.target.value)}
                      placeholder="Describe tu observación técnica: causa probable, piezas a considerar, recomendaciones..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-xs transition-all font-mono"
                    />
                  </div>

                  {/* ACCIONES DEL DIAGNOSTICO */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleSaveDiagnosis}
                      disabled={isLoading}
                      className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition-all shadow-md"
                    >
                      Guardar Diagnóstico y Pasar a Reparación
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-12 text-center text-slate-500 space-y-4 shadow-xl">
                <div className="w-16 h-16 bg-slate-950 rounded-full flex items-center justify-center mx-auto border border-slate-800">
                  <Stethoscope className="w-8 h-8 text-slate-400" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-slate-300">No hay vehículo seleccionado</h3>
                  <p className="text-xs text-slate-500 mt-1">Selecciona un vehículo recién ingresado de la cola de la izquierda para abrir la zona de diagnóstico técnico.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        
        // RENDER 2: VISTA NORMAL (ESTACIN DE TRABAJO COMPLETA)
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
          
          {/* KANBAN / LISTADO DE TRABAJOS (5 COLS) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 text-white">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                <h3 className="font-display font-bold text-sm uppercase tracking-wider text-slate-300">Cola de Trabajo de Taller</h3>
                <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full font-mono font-bold">
                  {repairs.filter(r => r.status !== "delivered").length} Activos
                </span>
              </div>

              <div className="space-y-6 max-h-[660px] overflow-y-auto pr-1">
                {STATUS_COLUMNS.map(col => {
                  const columnRepairs = repairs.filter(r => r.status === col.id);
                  return (
                    <div key={col.id} className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider py-1.5 px-2.5 rounded-xl bg-slate-950/60 border border-slate-850">
                        <span className={col.text}>{col.label}</span>
                        <span className="bg-slate-800 text-slate-300 px-2 py-0.2 rounded-full font-mono text-[10px] font-bold">{columnRepairs.length}</span>
                      </div>

                      <div className="space-y-2 pl-2">
                        {columnRepairs.length === 0 ? (
                          <p className="text-[10px] text-slate-600 italic py-1 pl-1">Sin vehículos en esta etapa.</p>
                        ) : (
                          columnRepairs.map(rep => {
                            const isSelected = rep.id === selectedId;
                            
                            // Branch tag translation
                            const serviceLabels: Record<string, string> = {
                              mantenimiento: "Manto",
                              diagnostico: "Diag",
                              garantia: "Gara",
                              cambio: "Cambio",
                              express: "Express"
                            };

                            return (
                              <div
                                key={rep.id}
                                onClick={() => setSelectedId(rep.id)}
                                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                                  isSelected
                                    ? "bg-slate-800/80 border-cyan-500/80 shadow-[0_0_12px_rgba(6,182,212,0.15)] text-white"
                                    : "bg-slate-900/40 border-slate-800/80 text-slate-400 hover:bg-slate-800/30 hover:text-slate-300"
                                }`}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="space-y-1">
                                    <div className="flex items-center space-x-1.5">
                                      <span className="font-mono font-bold text-xs text-white bg-slate-950 px-1.5 py-0.5 rounded border border-slate-850">{rep.id}</span>
                                      <span className={`text-xs font-black ${isSelected ? "text-cyan-300" : "text-slate-300"}`}>
                                        {rep.client.name}
                                      </span>
                                    </div>
                                    <p className="text-xs">
                                      {getVehicleIcon(rep.vehicle.type)} <strong className="text-slate-200">{rep.vehicle.brand}</strong> {rep.vehicle.model}
                                    </p>
                                    
                                    {/* Subtags of metadata (Sede, Servicio) */}
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                      <span className="text-[9px] bg-slate-950 text-slate-400 px-1.5 py-0.2 rounded font-mono font-bold uppercase">
                                        x {BRANCH_SHORT_LABELS[rep.workshopBranch || "lince_arenales"] || "Lince"}
                                      </span>
                                      <span className="text-[9px] bg-slate-950 text-cyan-400/80 px-1.5 py-0.2 rounded font-mono font-bold uppercase">
                                        x {serviceLabels[rep.serviceType || "diagnostico"] || "Diag"}
                                      </span>
                                      {rep.serviceAuthorized && (
                                        <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.2 rounded font-mono font-black uppercase border border-emerald-500/40">
                                           Servicio aprobado
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right flex flex-col items-end justify-between self-stretch">
                                    <p className="text-[10px] text-slate-500 font-mono">
                                      {new Date(rep.receptionDate).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-mono">Orden en cola</p>
                                  </div>
                                </div>
                                
                                {rep.vehicle.reportedFailure && (
                                  <p className="text-[10px] text-slate-500 truncate mt-2 italic bg-slate-950/20 p-1.5 rounded border border-slate-850/30">
                                    "{rep.vehicle.reportedFailure}"
                                  </p>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>


          {/* PANEL DE CONTROL DEL TRABAJO SELECCIONADO (7 COLS) */}
          <div className="lg:col-span-7">
            {activeRepair ? (
              <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden animate-fade-in">
                {/* Header de Detalle */}
                <div className="bg-slate-950 text-white p-6 border-b border-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="bg-cyan-500 text-slate-950 font-mono font-black px-2.5 py-1 rounded text-sm tracking-wider">
                        {activeRepair.id}
                      </span>
                      <span className="text-slate-700">/</span>
                      <h2 className="font-display font-black text-xl text-slate-100 tracking-tight">
                        {activeRepair.vehicle.brand} {activeRepair.vehicle.model}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-400">
                      Cliente: <strong className="text-slate-200">{activeRepair.client.name}</strong>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 md:items-end">
                    <div className="flex flex-col items-start md:items-end">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Estado de Taller</span>
                      <div className="flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse mr-1.5"></span>
                        <span className="text-sm font-bold text-cyan-400 font-display uppercase tracking-wide">
                          {STATUS_COLUMNS.find(c => c.id === activeRepair.status)?.label || activeRepair.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Banner: Servicio aprobado por el cliente */}
                {activeRepair.serviceAuthorized && (
                  <div className="bg-emerald-500/10 border-b border-emerald-500/40 px-6 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-2 text-emerald-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                      <span className="font-display font-black text-sm uppercase tracking-wide">
                         Servicio aprobado por el cliente
                      </span>
                    </div>
                    <span className="text-emerald-200/90 text-xs font-bold hidden sm:block">
                      Proceda con la reparación
                    </span>
                  </div>
                )}

                {/* Contenido Detallado */}
                <div className="p-6 space-y-6">
                  
                  {/* 1. Detalle del Ingreso del Vehículo */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-850 text-xs">
                    <div>
                      <h4 className="font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Ficha de Recepción</span>
                      </h4>
                      <p className="mb-1 text-slate-300"><strong>Sede de Ingreso:</strong> {activeRepair.workshopBranch === "lince_arenales" ? "Arenales (San Isidro)" : activeRepair.workshopBranch === "surco" ? "Surco" : activeRepair.workshopBranch === "san_borja" ? "San Borja" : activeRepair.workshopBranch === "lince_leal" ? "Jose Leal (Lince)" : "Lince"}</p>
                      <p className="mb-1 text-slate-300"><strong>Tipo de Servicio:</strong> <span className="text-cyan-300 font-bold uppercase">{activeRepair.serviceType === "mantenimiento" ? "Mantenimiento" : activeRepair.serviceType === "diagnostico" ? "Diagnóstico" : activeRepair.serviceType === "garantia" ? "Garantía" : activeRepair.serviceType === "cambio" ? "Cambio de Repuesto" : activeRepair.serviceType === "express" ? "Servicio Express" : "Diagnóstico"}</span> {activeRepair.serviceTypeDetail && `(${activeRepair.serviceTypeDetail})`}</p>
                      <p className="mb-1 text-slate-300"><strong>Tipo de Vehículo:</strong> {activeRepair.vehicle.type.toUpperCase()}</p>
                      <p className="mb-1 text-slate-300"><strong>Voltaje:</strong> {activeRepair.vehicle.voltage}</p>
                      <p className="mb-1 text-slate-300"><strong>Vida útil de la Batería:</strong> {activeRepair.vehicle.batteryCondition.toUpperCase()}</p>
                      <p className="mb-1 text-slate-300">
                        <strong>Falla Reportada:</strong> <span className="italic text-slate-400 font-medium">"{activeRepair.vehicle.reportedFailure}"</span>
                      </p>
                    </div>
                    <div>
                      <h4 className="font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                        <Layers className="w-3.5 h-3.5" />
                        <span>Inventario y Audiovisual</span>
                      </h4>
                      <p className="mb-1 text-slate-300">
                        <strong>Accesorios:</strong> {[
                          activeRepair.accessories.charger ? "Cargador" : null,
                          activeRepair.accessories.key ? "Llaves x" : null,
                          activeRepair.accessories.battery ? "Batería Extra x9" : null,
                          activeRepair.accessories.helmet ? "Casco x" : null,
                          activeRepair.accessories.padlock ? "Candado x" : null,
                          activeRepair.accessories.others ? activeRepair.accessories.others : null
                        ].filter(Boolean).join(", ") || "Ninguno"}
                      </p>
                      <p className="mb-1 text-slate-300">
                        <strong>Rayones/Golpes:</strong> {activeRepair.visualState.scratches ? "Sí (Rayado)" : "No"} / {activeRepair.visualState.cracks ? "Sí (Fisura)" : "No"}
                      </p>
                      <p className="mb-1 text-slate-300">
                        <strong>Sistemas OK:</strong> {[
                          activeRepair.visualState.brakesOk ? "Frenos" : "Freno",
                          activeRepair.visualState.lightsOk ? "Luces" : "Luz",
                          activeRepair.visualState.screenOk ? "Pantalla" : "Display",
                          activeRepair.visualState.tiresOk ? "Llantas" : "Llanta"
                        ].join("  ")}
                      </p>
                      
                      {/* Audiovisual verification state from PDF */}
                      <p className="mb-1 mt-1 text-slate-300 flex items-center gap-2">
                        <strong>Evidencia:</strong> 
                        <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] ${(activeRepair.visualState.videoEvidence?.length || 0) > 0 ? "bg-cyan-950 text-cyan-400 border border-cyan-900/40" : "bg-slate-950 text-slate-600"}`}>
                          <Video className="w-2.5 h-2.5 mr-1" /> Video {(activeRepair.visualState.videoEvidence?.length || 0) > 0 ? `${activeRepair.visualState.videoEvidence!.length} en nube` : "No"}
                        </span>
                        <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] ${activeRepair.visualState.photosTaken ? "bg-cyan-950 text-cyan-400 border border-cyan-900/40" : "bg-slate-950 text-slate-600"}`}>
                          <Camera className="w-2.5 h-2.5 mr-1" /> Fotos {activeRepair.visualState.photosTaken ? "Sí" : "No"}
                        </span>
                      </p>

                      {(activeRepair.visualState.videoEvidence && activeRepair.visualState.videoEvidence.length > 0) && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {activeRepair.visualState.videoEvidence.map((ve, idx) => (
                            <a
                              key={idx}
                              href={ve.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-cyan-950/60 hover:bg-cyan-900/70 text-cyan-300 border border-cyan-800/50 rounded-lg text-[10px] font-bold transition-colors"
                            >
                              <Video className="w-3 h-3" />
                              <span>Video respaldo {idx + 1}  {ve.durationSec}s</span>
                            </a>
                          ))}
                        </div>
                      )}

                      {activeRepair.visualState.notes && (
                        <p className="text-slate-400 text-[11px] mt-1.5 bg-slate-900 p-1.5 rounded border border-slate-800">
                          <strong>Obs estética:</strong> {activeRepair.visualState.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Falla reportada destacada para el técnico */}
                  <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-4">
                    <p className="text-[10px] uppercase font-black tracking-widest text-rose-400 mb-1.5 flex items-center space-x-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Falla reportada por el cliente</span>
                    </p>
                    <p className="text-sm text-slate-100 font-semibold leading-relaxed">
                      "{activeRepair.vehicle.reportedFailure}"
                    </p>
                  </div>

                  {/* Evidencia fotográfica de ingreso (info técnica del vehículo) */}
                  {(activeRepair.visualState.photos && activeRepair.visualState.photos.length > 0) && (
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-xs">
                      <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">x Evidencia Fotográfica de Ingreso</span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {activeRepair.visualState.photos.map((ph, idx) => (
                          <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-900 group">
                            <img 
                              src={ph} 
                              className="w-full h-20 object-cover cursor-zoom-in hover:scale-105 transition-all" 
                              alt={`Evidencia ${idx + 1}`} 
                              onClick={() => {
                                const w = window.open();
                                if (w) w.document.write(`<img src="${ph}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`);
                              }} 
                            />
                            <span className="absolute bottom-1 left-1 bg-slate-950/80 px-1 py-0.2 rounded text-[8px] font-mono text-slate-400 font-bold">Captura #{idx + 1}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}


                  {/* 2. Diagnóstico Sugerido de Gemini AI (Interactiva) */}
                  {activeRepair.aiDiagnostic && (
                    <div className="bg-slate-950 text-white rounded-xl border border-slate-800 overflow-hidden shadow-md">
                      <div className="bg-gradient-to-r from-slate-950 to-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-display">
                            Pauta de Diagnóstico Gemini AI
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">Taller Inteligente</span>
                      </div>

                      <div className="p-4 space-y-4 text-xs">
                        {/* Procedimientos interactivos para el Técnico */}
                        <div>
                          <p className="text-slate-400 font-semibold mb-2 uppercase tracking-wide text-[10px]">
                            Pasos de diagnóstico recomendados (Marca al realizarlos):
                          </p>
                          <div className="space-y-2">
                            {activeRepair.aiDiagnostic.testProcedures.map((proc, idx) => {
                              const isChecked = completedProcedures[idx] === true;
                              return (
                                <button
                                  type="button"
                                  key={idx}
                                  onClick={() => toggleProcedure(String(idx))}
                                  className={`w-full text-left p-2 rounded-lg border text-xs flex items-start space-x-2.5 transition-all ${
                                    isChecked
                                      ? "bg-cyan-950/20 border-cyan-500/40 text-cyan-300 font-semibold"
                                      : "bg-slate-950/30 border-slate-800 text-slate-300 hover:bg-slate-900"
                                  }`}
                                >
                                  <span className={`p-0.5 rounded shrink-0 mt-0.5 border ${isChecked ? "bg-cyan-500 border-cyan-400 text-slate-950" : "border-slate-700 bg-slate-800 text-transparent"}`}>
                                    <CheckSquare className="w-3 h-3" />
                                  </span>
                                  <span>{proc}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Repuestos recomendados por IA */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800/60">
                          <div>
                            <p className="text-slate-400 font-semibold mb-1.5 uppercase tracking-wide text-[10px]">
                              Repuestos recomendados:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {activeRepair.aiDiagnostic.suggestedParts.map((part, idx) => (
                                <span key={idx} className="bg-amber-950/30 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded font-bold text-[10px]">
                                  {part}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="text-slate-400 font-semibold mb-1 uppercase tracking-wide text-[10px]">
                              Causas Técnicas Predichas:
                            </p>
                            <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-[11px] leading-relaxed">
                              {activeRepair.aiDiagnostic.probableCauses.slice(0, 2).map((cause, idx) => (
                                <li key={idx} className="truncate">{cause}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}


                  {/* 3. Acción y Trabajo del Técnico (Notas y Costo Real) */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wider font-display">Bitácora Técnica de Reparación</h3>
                      <span className="text-[10px] text-slate-500">Operando como: Téc. {technicianName.trim() || ""}</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Comentarios y Diagnóstico del Mecánico</label>
                      <textarea
                        rows={3}
                        value={techNotes}
                        onChange={e => setTechNotes(e.target.value)}
                        placeholder="Escribe aquí los avances: Ej. Se desarma el motor y se detectan cables de fase fundidos, se procede a re-aislar y soldar conectores..."
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-xs transition-all font-mono"
                      />
                    </div>

                    {/* Repuestos y trabajos detectados por el técnico */}
                    <div className="pt-2 border-t border-slate-850 text-xs">
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                          <Package className="w-3.5 h-3.5 text-amber-400" />
                          <span>Repuestos / Trabajos que necesita el vehículo</span>
                        </label>
                        <span className="text-[10px] text-slate-500">
                          La jefa del local colocará el precio de repuesto y mano de obra
                        </span>
                      </div>

                      {spareParts.length > 0 && (
                        <ul className="space-y-1.5 mb-2">
                          {spareParts.map((p) => (
                            <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800">
                              <div className="flex items-center space-x-2 min-w-0">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide shrink-0 ${p.type === "cambio" ? "bg-amber-500/15 text-amber-400 border border-amber-500/25" : "bg-blue-500/15 text-blue-400 border border-blue-500/25"}`}>
                                  {p.type === "cambio" ? "Cambiar" : "Reparar"}
                                </span>
                                <span className="text-slate-100 font-medium truncate">{p.description}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeSparePart(p.id)}
                                className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded transition-colors shrink-0"
                                title="Quitar"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setNewPartType("cambio")}
                            className={`px-2.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition-colors ${newPartType === "cambio" ? "bg-amber-500/20 border-amber-500/40 text-amber-300" : "bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300"}`}
                          >
                            Cambiar
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewPartType("reparacion")}
                            className={`px-2.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition-colors ${newPartType === "reparacion" ? "bg-blue-500/20 border-blue-500/40 text-blue-300" : "bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300"}`}
                          >
                            Reparar
                          </button>
                        </div>
                        <div className="flex-1 flex gap-2">
                          <input
                            type="text"
                            value={newPartDesc}
                            onChange={e => setNewPartDesc(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") addSparePart(); }}
                            placeholder="Ej. Cambio de acelerador, purgado, cambio de llantas..."
                            className="flex-1 px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 text-xs"
                          />
                          <button
                            type="button"
                            onClick={addSparePart}
                            disabled={!newPartDesc.trim()}
                            className="px-3 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/25 rounded-lg font-bold text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Agregar</span>
                          </button>
                        </div>
                      </div>

                      {spareParts.length > 0 && (
                        <div className="flex justify-end pt-2">
                          <button
                            type="button"
                            onClick={handleSaveSpareParts}
                            disabled={isLoading}
                            className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/25 font-bold text-xs px-5 py-2.5 rounded-xl transition-all"
                          >
                            Guardar Repuestos / Trabajos
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 pt-2 border-t border-slate-850 text-xs">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Firma Digital del Técnico Responsable <span className="text-rose-500 font-bold">* (Obligatorio para Listo / Entregado)</span></label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <span className="text-[11px] text-slate-500">Nombre del Técnico Responsable:</span>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-slate-500">
                                <User className="w-3.5 h-3.5" />
                              </span>
                              <input
                                type="text"
                                value={technicianName}
                                onChange={e => setTechnicianName(e.target.value)}
                                placeholder="Nombre completo"
                                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 text-slate-100 border border-slate-800 rounded-xl text-xs focus:outline-none focus:border-cyan-500 font-medium"
                              />
                            </div>
                            <p className="text-[10px] text-slate-500 leading-relaxed">
                              Al firmar este recuadro, declaras bajo juramento técnico la veracidad de las pruebas, reparaciones y observaciones realizadas sobre este vehículo eléctrico.
                            </p>
                          </div>
                          <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-850">
                            <SignaturePad
                              onSave={(dataUrl) => setTechSignature(dataUrl)}
                              onClear={() => setTechSignature("")}
                              initialData={techSignature}
                              placeholderText="Firma aquí como Técnico de Litio Energy"
                            />
                            {techSignature && (
                              <p className="text-[10px] text-center font-bold text-cyan-400 font-mono tracking-widest uppercase">
                                S FIRMA DEL T0CNICO VINCULADA
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={handleSaveNotes}
                        disabled={isLoading}
                        className="bg-slate-950 hover:bg-slate-900 text-cyan-400 border border-cyan-500/30 hover:border-cyan-400 font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm"
                      >                        Guardar Cambios
                      </button>
                    </div>
                  </div>


                  {/* 4. Operaciones de Estado en Taller (Botones Grandes) */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Cambiar Estado Operativo del Equipo
                    </span>
                    
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      {[
                        { status: "diagnosing", label: "En Diagnóstico", color: "bg-cyan-950 hover:bg-cyan-900/40 text-cyan-400 border border-cyan-500/20", activeStatus: "diagnosing" },
                        { status: "waiting_parts", label: "Esperando Repuestos", color: "bg-amber-950 hover:bg-amber-900/40 text-amber-400 border border-amber-500/20", activeStatus: "waiting_parts" },
                        { status: "repairing", label: "En Reparación", color: "bg-blue-950 hover:bg-blue-900/40 text-blue-400 border border-blue-500/20", activeStatus: "repairing" },
                        { status: "testing", label: "En Pruebas", color: "bg-purple-950 hover:bg-purple-900/40 text-purple-400 border border-purple-500/20", activeStatus: "testing" },
                        { status: "ready", label: "Listo para Entrega", color: "bg-emerald-950 hover:bg-emerald-900/40 text-emerald-400 border border-emerald-500/20", activeStatus: "ready" }
                      ].map(btn => {
                        const isCurrent = activeRepair.status === btn.activeStatus;
                        return (
                          <button
                            type="button"
                            key={btn.status}
                            onClick={() => handleUpdateStatus(btn.status as RepairStatus)}
                            disabled={isLoading}
                            className={`py-2.5 px-1 text-center rounded-xl font-bold text-xs transition-all ${
                              isCurrent 
                                ? "bg-cyan-500 text-slate-950 font-black shadow-[0_0_15px_rgba(6,182,212,0.3)] border border-cyan-400" 
                                : btn.color
                            }`}
                          >
                            {btn.label}
                            {isCurrent && " S"}
                          </button>
                        );
                      })}
                    </div>

                    {activeRepair.status === "ready" && (
                      <div className="pt-2 space-y-2">
                        {activeRepair.qcReport?.result === "approved" ? (
                          <button
                            type="button"
                            onClick={() => {
                              setDeliveryClientName(activeRepair.client?.name || "");
                              setDeliverySignature(activeRepair.deliverySignature || "");
                              setShowDeliveryModal(true);
                            }}
                            className="w-full bg-slate-950 hover:bg-slate-900 text-emerald-400 border border-emerald-500/35 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.15)] transition-all flex items-center justify-center space-x-2"
                          >
                            <CheckCircle className="w-4.5 h-4.5 text-emerald-400 animate-pulse" />
                            <span>Entregar Vehículo al Cliente (Cerrar Historial)</span>
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus("testing")}
                              className="w-full bg-slate-950 hover:bg-slate-900 text-cyan-400 border border-cyan-500/35 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all flex items-center justify-center space-x-2"
                            >
                              <Sparkles className="w-4.5 h-4.5 text-cyan-400 animate-pulse" />
                              <span>Pasa a Control de Calidad (Revisa la Jefa del Local)</span>
                            </button>
                            <p className="text-[10px] text-amber-400/90 text-center">
                              La jefa de {BRANCH_SHORT_LABELS[activeRepair.workshopBranch] || "tu local"} revisará el vehículo y lo aprobará para entrega.
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </div>


                  {/* 5. Historial y Línea de Tiempo (Logs) */}
                  <div className="space-y-3">
                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                      Historial de Transiciones y Logs de Taller
                    </span>
                    
                    <div className="space-y-3 pl-2">
                      {activeRepair.historyLog?.slice().reverse().map((log: HistoryLog) => (
                        <div key={log.id} className="flex items-start space-x-3 text-xs leading-relaxed">
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)] shrink-0 mt-1.5 animate-pulse"></div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-200">{log.description}</span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {new Date(log.date).toLocaleDateString()} {new Date(log.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400">Operador: <strong className="text-slate-300">{log.user}</strong></p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            ) : (
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-12 text-center text-slate-500 space-y-4 shadow-xl">
                <div className="w-16 h-16 bg-slate-950 rounded-full flex items-center justify-center mx-auto border border-slate-800">
                  <Wrench className="w-8 h-8 text-slate-400" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-slate-300">No hay vehículo seleccionado</h3>
                  <p className="text-xs text-slate-500 mt-1">Selecciona un vehículo de la cola de trabajo de taller de la izquierda para abrir la zona de trabajo técnico.</p>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* MODAL DE ENTREGA AL CLIENTE: confirmación + firma del cliente */}
      {showDeliveryModal && activeRepair && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950 shrink-0">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span className="font-semibold text-sm text-slate-100 uppercase tracking-wider">Entrega del Vehículo al Cliente</span>
              </div>
              <button
                onClick={() => setShowDeliveryModal(false)}
                className="p-1 text-slate-400 hover:text-slate-100 bg-slate-850 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5">
                <p className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">Orden</span>
                  <span className="font-mono font-black text-cyan-400">{activeRepair.id}</span>
                </p>
                <p className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">Vehículo</span>
                  <span className="text-slate-200 font-semibold">{activeRepair.vehicle.brand} {activeRepair.vehicle.model}</span>
                </p>
                <p className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">Cliente</span>
                  <span className="text-slate-200 font-semibold">{activeRepair.client.name}</span>
                </p>
                <p className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">Total</span>
                  <span className="text-emerald-400 font-black font-mono">${activeRepair.actualCost || activeRepair.estimatedCost || 0}</span>
                </p>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-200 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Confirmar esta entrega <strong>cierra el historial</strong> de la orden y registra la fecha, hora y firma del cliente. El vehículo pasará al historial de entregados en Estadísticas.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nombre del Cliente que recibe</label>
                <input
                  type="text"
                  value={deliveryClientName}
                  onChange={(e) => setDeliveryClientName(e.target.value)}
                  placeholder="Nombre completo del cliente"
                  className="w-full px-3 py-2.5 bg-slate-950 text-xs text-slate-200 border border-slate-800 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Firma del Cliente (recibo del vehículo)</span>
                <SignaturePad
                  onSave={(dataUrl) => setDeliverySignature(dataUrl)}
                  onClear={() => setDeliverySignature("")}
                  initialData={deliverySignature}
                  placeholderText="El cliente firma aquí al recibir su vehículo"
                />
                {deliverySignature && (
                  <div className="flex items-center justify-between text-[11px] text-emerald-400 font-semibold">
                    <span> Firma capturada correctamente</span>
                    <button
                      type="button"
                      onClick={() => setDeliverySignature("")}
                      className="text-rose-400 hover:text-rose-300 underline"
                    >
                      Borrar firma
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 bg-slate-950 border-t border-slate-800 shrink-0">
              <button
                onClick={() => setShowDeliveryModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!deliveryClientName || !deliveryClientName.trim()) {
                    alert("Ingrese el nombre del cliente que recibe el vehículo.");
                    return;
                  }
                  if (!deliverySignature) {
                    alert("El cliente debe firmar para confirmar la entrega del vehículo.");
                    return;
                  }
                  handleUpdateStatus("delivered", {
                    deliveredAt: new Date().toISOString(),
                    deliverySignature,
                    deliverySignatureName: deliveryClientName.trim()
                  });
                  setShowDeliveryModal(false);
                  setDeliverySignature("");
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center space-x-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Confirmar Entrega</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// SUBCOMPONENTE DE TARJETA OPTIMIZADA PARA TELEVISIN (TV CARD)
function TvCard({ 
  item, 
  handleStatusChangeDirectly, 
  handleQuickAdvance, 
  getVehicleIcon 
}: { 
  item: RepairItem; 
  handleStatusChangeDirectly: (item: RepairItem, newStatus: RepairStatus) => Promise<void>;
  handleQuickAdvance: (item: RepairItem) => Promise<void>;
  getVehicleIcon: (type: string) => string;
  key?: string | number | null;
}) {
  const pipeline: RepairStatus[] = ["receptioned", "diagnosing", "waiting_parts", "repairing", "testing", "ready"];
  const currentStepIndex = pipeline.indexOf(item.status);

  const stepShortLabels = ["Cola", "Diag", "Repu", "Repa", "Prue", "Listo"];

  // Sede label and color
  const branchNames: Record<string, string> = {
    lince_arenales: "Arenales (San Isidro)",
    surco: "Surco",
    san_borja: "San Borja",
    lince_leal: "Jose Leal (Lince)"
  };

  const branchColors: Record<string, string> = {
    lince_arenales: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    surco: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    san_borja: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    lince_leal: "bg-teal-500/10 text-teal-400 border-teal-500/20"
  };

  const serviceIcons: Record<string, string> = {
    mantenimiento: "x Mantenimiento",
    diagnostico: "x Diagnóstico",
    garantia: "x: Garantía",
    cambio: "x Cambio"
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4 hover:border-slate-700 transition-all relative overflow-hidden group">
      {/* Glow effect for ready items on TV */}
      {item.status === "ready" && (
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400 animate-pulse"></div>
      )}

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="bg-slate-950 font-mono font-black text-cyan-400 text-sm px-2.5 py-0.5 rounded border border-slate-800">
              {item.id}
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${branchColors[item.workshopBranch || "lince_arenales"]}`}>
              x {branchNames[item.workshopBranch || "lince_arenales"]}
            </span>
          </div>
          
          <h4 className="font-display font-black text-lg text-slate-100 uppercase tracking-tight mt-1">
            {getVehicleIcon(item.vehicle.type)} {item.vehicle.brand} {item.vehicle.model}
          </h4>

          <p className="text-xs text-slate-400">
            Cliente: <strong className="text-slate-300">{item.client.name}</strong>
          </p>
        </div>

        <div className="text-right">
          <span className="text-[10px] bg-slate-950 text-cyan-300 border border-slate-850 px-2 py-0.5 rounded font-black uppercase font-mono">
            {serviceIcons[item.serviceType || "diagnostico"]}
          </span>
          <p className="text-[11px] font-mono font-bold text-slate-500 mt-2">
            Ingreso: {new Date(item.receptionDate).toLocaleDateString([], { day: "2-digit", month: "short" })}
          </p>
        </div>
      </div>

      {/* Servicio aprobado por el cliente (TV) */}
      {item.serviceAuthorized && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 rounded-lg px-3 py-2 flex items-center justify-between">
          <span className="text-emerald-300 font-display font-black text-sm uppercase tracking-wide">
             Servicio aprobado por el cliente
          </span>
          <span className="text-emerald-200/90 text-[10px] font-bold uppercase hidden sm:block">
            Proceda
          </span>
        </div>
      )}

      {/* Falla reportada (Súper legible) */}
      <div className="bg-slate-950 p-3 rounded-lg border border-slate-850">
        <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-1">Síntoma reportado</p>
        <p className="text-xs text-slate-300 font-medium font-mono">
          "{item.vehicle.reportedFailure}"
        </p>
      </div>

      {/* LINEA DE TIEMPO INTERACTIVA / CAMBIO DE ESTADO EN 1 TAP */}
      <div className="pt-2 border-t border-slate-800/50 space-y-2">
        <p className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Avance rápido del proceso de taller:</p>
        
        <div className="grid grid-cols-6 gap-1 relative">
          {pipeline.map((stepStatus, idx) => {
            const isPassed = idx <= currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            const qcApproved = item.qcReport?.result === "approved";
            const isLocked = (stepStatus === "ready" || stepStatus === "delivered") && !qcApproved;
            
            let stepStyle = "bg-slate-950 text-slate-500 border-slate-800 hover:bg-slate-800";
            if (isLocked) {
              stepStyle = "bg-slate-950 text-slate-600 border-slate-800 opacity-40 cursor-not-allowed";
            } else if (isCurrent) {
              stepStyle = "bg-cyan-500 text-slate-950 font-black border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]";
            } else if (isPassed) {
              stepStyle = "bg-slate-800 text-slate-300 border-slate-700/60";
            }

            return (
              <button
                type="button"
                key={stepStatus}
                disabled={isLocked}
                onClick={() => !isLocked && handleStatusChangeDirectly(item, stepStatus as RepairStatus)}
                className={`py-1.5 px-0.5 text-center text-[10px] font-bold rounded border transition-all ${stepStyle}`}
                title={isLocked ? "Requiere Control de Calidad" : `Cambiar a ${stepShortLabels[idx]}`}
              >
                {isLocked ? "\uD83D\uDD12 " : ""}{stepShortLabels[idx]}
              </button>
            );
          })}
        </div>
      </div>

      {/* BOTN FÁCIL: SIGUIENTE PASO ~ */}
      {item.status !== "ready" && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => handleQuickAdvance(item)}
            className="w-full bg-slate-950 hover:bg-slate-800 border border-cyan-500/20 hover:border-cyan-400 text-cyan-400 font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center space-x-1.5 transition-all group-hover:scale-[1.005]"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>
              Avanzar a: <strong>{
                item.status === "receptioned" ? "Diagnóstico" :
                item.status === "diagnosing" ? "Espera Repuesto" :
                item.status === "waiting_parts" ? "En Reparación" :
                item.status === "repairing" ? "En Pruebas" :
                item.status === "testing" ? "Listo para Retiro" : "Listo"
              }</strong>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
