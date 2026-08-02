import React, { useState } from "react";
import { 
  Wrench, 
  User, 
  Smartphone, 
  Layers, 
  Sparkles, 
  CheckSquare, 
  Clock, 
  DollarSign, 
  ChevronRight, 
  AlertTriangle, 
  FileText, 
  RotateCw, 
  AlertCircle,
  Truck,
  CheckCircle,
  Play,
  Tv,
  ArrowRight,
  MapPin,
  Tag,
  Lock,
  Battery,
  Video,
  Camera,
  Check,
  Activity,
  AlertOctagon,
  TrendingUp,
  Search,
  Printer
} from "lucide-react";
import { RepairItem, RepairStatus, HistoryLog, WorkshopBranch, ServiceType, PaymentMethod } from "../types";
import { generateRepairPdf } from "../utils/pdfGenerator";
import { SignaturePad } from "./TabletHelpers";

interface TechnicianViewProps {
  repairs: RepairItem[];
  onUpdateRepair: (id: string, updateData: any) => Promise<void>;
  isLoading: boolean;
}

const STATUS_COLUMNS: Array<{ id: RepairStatus; label: string; bg: string; text: string; border: string }> = [
  { id: "receptioned", label: "En Cola / Recibidos", bg: "bg-slate-800/40", text: "text-slate-200", border: "border-slate-700/60" },
  { id: "diagnosing", label: "Diagnosticando", bg: "bg-cyan-950/20", text: "text-cyan-400", border: "border-cyan-900/40" },
  { id: "waiting_parts", label: "Esperando Repuestos", bg: "bg-amber-950/20", text: "text-amber-400", border: "border-amber-900/40" },
  { id: "repairing", label: "En Reparación", bg: "bg-blue-950/20", text: "text-blue-400", border: "border-blue-900/40" },
  { id: "testing", label: "En Pruebas", bg: "bg-purple-950/20", text: "text-purple-400", border: "border-purple-900/40" },
  { id: "ready", label: "Listo para Entrega", bg: "bg-emerald-950/20", text: "text-emerald-400", border: "border-emerald-900/40" }
];

export default function TechnicianView({ repairs, onUpdateRepair, isLoading }: TechnicianViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(repairs[0]?.id || null);
  const [technicianName, setTechnicianName] = useState("Carlos Mendoza");
  
  // TV & Workshop Wide Screen TV states
  const [isTvMode, setIsTvMode] = useState(false);
  const [tvFilterBranch, setTvFilterBranch] = useState<string>("all");
  const [currentTime, setCurrentTime] = useState(new Date());

  // Local edit states for the selected vehicle workspace
  const [techNotes, setTechNotes] = useState("");
  const [actualCost, setActualCost] = useState("");
  const [techSignature, setTechSignature] = useState("");
  const [completedProcedures, setCompletedProcedures] = useState<Record<string, boolean>>({});

  const activeRepair = repairs.find(r => r.id === selectedId);

  // Sync state whenever active repair changes
  React.useEffect(() => {
    if (activeRepair) {
      setTechNotes(activeRepair.technicianNotes || "");
      setActualCost(String(activeRepair.actualCost || activeRepair.estimatedCost || 0));
      setTechSignature(activeRepair.technicianSignature || "");
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

  const handleUpdateStatus = async (newStatus: RepairStatus) => {
    if (!activeRepair) return;

    if (newStatus === "ready" || newStatus === "delivered") {
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
      actualCost: Number(actualCost) || 0,
      technicianName: `Téc. ${technicianName}`,
      technicianSignature: techSignature,
      technicianSignatureName: `Téc. ${technicianName}`
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
      actualCost: Number(actualCost) || 0,
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
      if (!item.technicianSignature) {
        alert(`Para cambiar el estado de la orden a ${statusLabels[newStatus]}, es obligatorio registrar el nombre y firma del técnico responsable. Por favor, realice este proceso desde el panel de detalles del taller.`);
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
      case "scooter": return "🛴";
      case "moto": return "🏍️";
      case "bici": return "🚲";
      default: return "🔋";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      
      {/* SECTOR DE SESIÓN DE TÉCNICO Y ACCESO A MODO TV */}
      <div className="mb-6 bg-slate-900 border border-slate-800 text-white p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/30 text-cyan-400">
            <Wrench className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="font-display font-black text-lg text-slate-100 tracking-tight flex items-center space-x-2">
              <span>ESTACIÓN DE TRABAJO TÉCNICO</span>
              <span className="text-[10px] uppercase font-mono bg-cyan-950 text-cyan-400 border border-cyan-800/40 px-2 py-0.5 rounded-full font-bold">Litio Energy v2.1</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Controla las colas de reparación, pautas de diagnóstico IA, estado de pagos e inspección de vehículos.</p>
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
            <span>{isTvMode ? "📺 Vista Normal" : "📺 Activar Vista TV (Televisor)"}</span>
          </button>

          <div className="flex items-center space-x-2 bg-slate-950/40 p-1.5 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-500 pl-1.5 font-bold uppercase tracking-wider">Técnico:</span>
            <select
              value={technicianName}
              onChange={e => setTechnicianName(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-white rounded-lg px-2.5 py-1 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
            >
              <option value="Carlos Mendoza">Carlos Mendoza (Controladoras)</option>
              <option value="Sandra Rojas">Sandra Rojas (Baterías)</option>
              <option value="Alberto Gómez">Alberto Gómez (Motores y Fases)</option>
            </select>
          </div>
        </div>
      </div>

      {/* RENDER CONDICIONAL: 1. MODO TV (PANTALLA DE TELEVISOR DE TALLER) */}
      {isTvMode ? (
        <div className="space-y-6 animate-fade-in">
          
          {/* Header Superior del Monitor de TV */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/30 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xl">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-cyan-500 rounded-xl flex items-center justify-center font-display font-black text-slate-950 text-xl tracking-tight shadow-md select-none">
                LE
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
              <select
                value={tvFilterBranch}
                onChange={e => setTvFilterBranch(e.target.value)}
                className="bg-transparent text-slate-200 text-xs font-black focus:outline-none"
              >
                <option value="all" className="bg-slate-950 text-slate-200">Todas las sedes</option>
                <option value="lince_arenales" className="bg-slate-950 text-slate-200">Lince (Arenales)</option>
                <option value="surco" className="bg-slate-950 text-slate-200">Surco</option>
                <option value="san_borja" className="bg-slate-950 text-slate-200">San Borja</option>
                <option value="lince_leal" className="bg-slate-950 text-slate-200">Lince (Jose Leal)</option>
              </select>
            </div>

            {/* ticking clock of TV Screen */}
            <div className="text-right flex items-center space-x-3.5 md:border-l md:border-slate-800 md:pl-5">
              <div className="font-mono text-xl font-bold text-slate-300">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <span className="bg-emerald-950 border border-emerald-500/25 text-emerald-400 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest font-mono animate-pulse">
                ● LIVE MONITOR
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
            
            {/* COLUMNA 1: RECEPCIONADOS Y DIAGNÓSTICO */}
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

            {/* COLUMNA 2: ESPERANDO REPUESTO / REPARACIÓN / PRUEBAS */}
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
      ) : (
        
        // RENDER 2: VISTA NORMAL (ESTACIÓN DE TRABAJO COMPLETA)
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
                            const branchShortLabels: Record<string, string> = {
                              lince_arenales: "Arenales",
                              surco: "Surco",
                              san_borja: "S. Borja",
                              lince_leal: "Leal"
                            };

                            // Service tag translation
                            const serviceLabels: Record<string, string> = {
                              mantenimiento: "Manto",
                              diagnostico: "Diag",
                              garantia: "Gara",
                              cambio: "Cambio"
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
                                        📍 {branchShortLabels[rep.workshopBranch || "lince_arenales"] || "Lince"}
                                      </span>
                                      <span className="text-[9px] bg-slate-950 text-cyan-400/80 px-1.5 py-0.2 rounded font-mono font-bold uppercase">
                                        🏷️ {serviceLabels[rep.serviceType || "diagnostico"] || "Diag"}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-right flex flex-col items-end justify-between self-stretch">
                                    <p className="text-[10px] text-slate-500 font-mono">
                                      {new Date(rep.receptionDate).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        generateRepairPdf(rep);
                                      }}
                                      className="p-1 bg-slate-950 text-cyan-400 hover:text-cyan-300 rounded-md border border-slate-800 hover:border-cyan-500/50 transition-all cursor-pointer my-1 shadow-sm"
                                      title="Imprimir Ficha PDF"
                                    >
                                      <Printer className="w-3.5 h-3.5" />
                                    </button>
                                    <p className="text-[10px] font-bold text-emerald-400 font-mono">
                                      S/. {rep.estimatedCost}
                                    </p>
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
                      Cliente: <strong className="text-slate-200">{activeRepair.client.name}</strong> • Teléfono: <strong className="text-slate-200">{activeRepair.client.phone}</strong> • DNI: <strong className="text-slate-200">{activeRepair.client.dni || "N/D"}</strong>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 md:items-end">
                    <button
                      type="button"
                      onClick={() => generateRepairPdf(activeRepair)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-cyan-400 border border-slate-800 hover:border-cyan-500/50 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                      title="Imprimir Certificado de Conformidad PDF"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Ficha PDF</span>
                    </button>
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

                {/* Contenido Detallado */}
                <div className="p-6 space-y-6">
                  
                  {/* 1. Detalle del Ingreso del Vehículo */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-850 text-xs">
                    <div>
                      <h4 className="font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Ficha de Recepción</span>
                      </h4>
                      <p className="mb-1 text-slate-300"><strong>Sede de Ingreso:</strong> {activeRepair.workshopBranch === "lince_arenales" ? "Arenales (Lince)" : activeRepair.workshopBranch === "surco" ? "Surco" : activeRepair.workshopBranch === "san_borja" ? "San Borja" : activeRepair.workshopBranch === "lince_leal" ? "Jose Leal (Lince)" : "Lince"}</p>
                      <p className="mb-1 text-slate-300"><strong>Tipo de Servicio:</strong> <span className="text-cyan-300 font-bold uppercase">{activeRepair.serviceType === "mantenimiento" ? "Mantenimiento" : activeRepair.serviceType === "diagnostico" ? "Diagnóstico" : activeRepair.serviceType === "garantia" ? "Garantía" : activeRepair.serviceType === "cambio" ? "Cambio de Repuesto" : "Diagnóstico"}</span> {activeRepair.serviceTypeDetail && `(${activeRepair.serviceTypeDetail})`}</p>
                      <p className="mb-1 text-slate-300"><strong>Tipo de Vehículo:</strong> {activeRepair.vehicle.type.toUpperCase()}</p>
                      <p className="mb-1 text-slate-300"><strong>Voltaje:</strong> {activeRepair.vehicle.voltage}</p>
                      <p className="mb-1 text-slate-300"><strong>Batería (Estado):</strong> {activeRepair.vehicle.batteryCondition.toUpperCase()}</p>
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
                          activeRepair.accessories.charger ? "Cargador ⚡" : null,
                          activeRepair.accessories.key ? "Llaves 🔑" : null,
                          activeRepair.accessories.battery ? "Batería Extra 🔋" : null,
                          activeRepair.accessories.helmet ? "Casco 🪖" : null,
                          activeRepair.accessories.padlock ? "Candado 🔒" : null,
                          activeRepair.accessories.others ? activeRepair.accessories.others : null
                        ].filter(Boolean).join(", ") || "Ninguno"}
                      </p>
                      <p className="mb-1 text-slate-300">
                        <strong>Rayones/Golpes:</strong> {activeRepair.visualState.scratches ? "Sí (Rayado) ⚠️" : "No"} / {activeRepair.visualState.cracks ? "Sí (Fisura) ⚠️" : "No"}
                      </p>
                      <p className="mb-1 text-slate-300">
                        <strong>Sistemas OK:</strong> {[
                          activeRepair.visualState.brakesOk ? "Frenos" : "Freno ❌",
                          activeRepair.visualState.lightsOk ? "Luces" : "Luz ❌",
                          activeRepair.visualState.screenOk ? "Pantalla" : "Display ❌",
                          activeRepair.visualState.tiresOk ? "Llantas" : "Llanta ❌"
                        ].join(" • ")}
                      </p>
                      
                      {/* Audiovisual verification state from PDF */}
                      <p className="mb-1 mt-1 text-slate-300 flex items-center gap-2">
                        <strong>Evidencia:</strong> 
                        <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] ${activeRepair.visualState.videoRecorded ? "bg-cyan-950 text-cyan-400 border border-cyan-900/40" : "bg-slate-950 text-slate-600"}`}>
                          <Video className="w-2.5 h-2.5 mr-1" /> Video {activeRepair.visualState.videoRecorded ? "Sí" : "No"}
                        </span>
                        <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] ${activeRepair.visualState.photosTaken ? "bg-cyan-950 text-cyan-400 border border-cyan-900/40" : "bg-slate-950 text-slate-600"}`}>
                          <Camera className="w-2.5 h-2.5 mr-1" /> Fotos {activeRepair.visualState.photosTaken ? "Sí" : "No"}
                        </span>
                      </p>

                      {activeRepair.visualState.notes && (
                        <p className="text-slate-400 text-[11px] mt-1.5 bg-slate-900 p-1.5 rounded border border-slate-800">
                          <strong>Obs estética:</strong> {activeRepair.visualState.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Firmas y Fotos tomadas en Tablet en Recepción */}
                  {(activeRepair.clientSignature || (activeRepair.visualState.photos && activeRepair.visualState.photos.length > 0)) && (
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-xs space-y-4">
                      {activeRepair.visualState.photos && activeRepair.visualState.photos.length > 0 && (
                        <div>
                          <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">📷 Fotografías de Evidencia (Ficha de Ingreso)</span>
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

                      {/* Firmas Digitales Registradas */}
                      <div className="pt-3 border-t border-slate-850/60 space-y-3">
                        <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">✍️ Firmas y Conformidades de la Orden</span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Firma Cliente */}
                          <div className="bg-slate-900/40 p-2.5 rounded-xl border border-slate-850 flex flex-col justify-between gap-2">
                            <div>
                              <span className="block text-[9px] uppercase font-bold text-slate-400">Cliente</span>
                              <p className="text-slate-200 font-semibold text-xs mt-0.5 truncate">{activeRepair.clientSignatureName || activeRepair.client.name}</p>
                            </div>
                            {activeRepair.clientSignature ? (
                              <div className="bg-white p-1 rounded-lg h-12 flex items-center justify-center border border-slate-800 shrink-0">
                                <img src={activeRepair.clientSignature} className="max-h-full max-w-full object-contain" alt="Firma Cliente" />
                              </div>
                            ) : (
                              <div className="h-12 flex items-center justify-center border border-dashed border-slate-800 text-slate-600 text-[9px] rounded-lg shrink-0">
                                Pendiente de Firma
                              </div>
                            )}
                          </div>

                          {/* Firma Recepcionista */}
                          <div className="bg-slate-900/40 p-2.5 rounded-xl border border-slate-850 flex flex-col justify-between gap-2">
                            <div>
                              <span className="block text-[9px] uppercase font-bold text-slate-400">Recepcionista</span>
                              <p className="text-slate-200 font-semibold text-xs mt-0.5 truncate">{activeRepair.tallerSignatureName || "Recepcionista Litio"}</p>
                            </div>
                            {activeRepair.tallerSignature ? (
                              <div className="bg-white p-1 rounded-lg h-12 flex items-center justify-center border border-slate-800 shrink-0">
                                <img src={activeRepair.tallerSignature} className="max-h-full max-w-full object-contain" alt="Firma Recepcionista" />
                              </div>
                            ) : (
                              <div className="h-12 flex items-center justify-center border border-dashed border-slate-800 text-slate-600 text-[9px] rounded-lg shrink-0">
                                Sin Firma de Ingreso
                              </div>
                            )}
                          </div>

                          {/* Firma Técnico */}
                          <div className="bg-slate-900/40 p-2.5 rounded-xl border border-slate-850 flex flex-col justify-between gap-2">
                            <div>
                              <span className="block text-[9px] uppercase font-bold text-slate-400">Técnico Responsable</span>
                              <p className="text-slate-200 font-semibold text-xs mt-0.5 truncate">{activeRepair.technicianSignatureName || (activeRepair.technicianNotes ? "Técnico Asignado" : "Pendiente")}</p>
                            </div>
                            {activeRepair.technicianSignature ? (
                              <div className="bg-white p-1 rounded-lg h-12 flex items-center justify-center border border-slate-800 shrink-0">
                                <img src={activeRepair.technicianSignature} className="max-h-full max-w-full object-contain" alt="Firma Técnico" />
                              </div>
                            ) : (
                              <div className="h-12 flex items-center justify-center border border-dashed border-slate-800 text-slate-600 text-[9px] rounded-lg shrink-0">
                                Pendiente de Firma
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Detalle de Presupuesto e Ingresos (Sección 8 en PDF) */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <p className="text-slate-500 font-semibold mb-0.5 uppercase text-[9px] tracking-wider">Costo Estimado</p>
                      <p className="font-mono text-sm font-black text-cyan-400">S/. {activeRepair.estimatedCost}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold mb-0.5 uppercase text-[9px] tracking-wider">Adelanto Recibido</p>
                      <p className="font-mono text-sm font-black text-amber-400">S/. {activeRepair.payment?.advancePayment || 0} <span className="text-[10px] text-slate-500">({activeRepair.payment?.paymentMethod === "yape_plin" ? "Yape/Plin" : activeRepair.payment?.paymentMethod || "Efectivo"})</span></p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold mb-0.5 uppercase text-[9px] tracking-wider">Saldo Pendiente</p>
                      <p className="font-mono text-sm font-black text-rose-400">S/. {activeRepair.payment?.remainingBalance ?? Math.max(0, activeRepair.estimatedCost - (activeRepair.payment?.advancePayment || 0))}</p>
                    </div>
                  </div>


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
                      <span className="text-[10px] text-slate-500">Operando como: Téc. {technicianName}</span>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Presupuesto Inicial Estimado</label>
                        <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm font-bold text-slate-400 h-[38px] flex items-center">
                          S/. {activeRepair.estimatedCost}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Costo Final Cobrado (S/.)</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-2.2 text-slate-500 text-xs font-bold font-mono">S/.</span>
                          <input
                            type="number"
                            value={actualCost}
                            onChange={e => setActualCost(e.target.value)}
                            placeholder="Costo definitivo de la reparación"
                            className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-cyan-400 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                          />
                        </div>
                      </div>
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
                                ✓ FIRMA DEL TÉCNICO VINCULADA
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
                      >
                        💾 Guardar Avance en Bitácora
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
                        { status: "diagnosing", label: "Diagnosticar", color: "bg-cyan-950 hover:bg-cyan-900/40 text-cyan-400 border border-cyan-500/20", activeStatus: "diagnosing" },
                        { status: "waiting_parts", label: "Esperar Repuesto", color: "bg-amber-950 hover:bg-amber-900/40 text-amber-400 border border-amber-500/20", activeStatus: "waiting_parts" },
                        { status: "repairing", label: "Reparar", color: "bg-blue-950 hover:bg-blue-900/40 text-blue-400 border border-blue-500/20", activeStatus: "repairing" },
                        { status: "testing", label: "Probar", color: "bg-purple-950 hover:bg-purple-900/40 text-purple-400 border border-purple-500/20", activeStatus: "testing" },
                        { status: "ready", label: "Marcar Listo", color: "bg-emerald-950 hover:bg-emerald-900/40 text-emerald-400 border border-emerald-500/20", activeStatus: "ready" }
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
                            {isCurrent && " ✓"}
                          </button>
                        );
                      })}
                    </div>

                    {activeRepair.status === "ready" && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus("delivered")}
                          className="w-full bg-slate-950 hover:bg-slate-900 text-emerald-400 border border-emerald-500/35 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.15)] transition-all flex items-center justify-center space-x-2"
                        >
                          <CheckCircle className="w-4.5 h-4.5 text-emerald-400 animate-pulse" />
                          <span>Entregar Vehículo al Cliente (Cerrar Historial)</span>
                        </button>
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
                  <p className="text-xs text-slate-500 mt-1">Selecciona un vehículo de la cola de trabajo de taller de la izquierda para abrir el puesto de trabajo técnico.</p>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}

// SUBCOMPONENTE DE TARJETA OPTIMIZADA PARA TELEVISIÓN (TV CARD)
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
    lince_arenales: "Arenales (Lince)",
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
    mantenimiento: "🔧 Mantenimiento",
    diagnostico: "🔍 Diagnóstico",
    garantia: "🛡️ Garantía",
    cambio: "🔄 Cambio"
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
              📍 {branchNames[item.workshopBranch || "lince_arenales"]}
            </span>
          </div>
          
          <h4 className="font-display font-black text-lg text-slate-100 uppercase tracking-tight mt-1">
            {getVehicleIcon(item.vehicle.type)} {item.vehicle.brand} {item.vehicle.model}
          </h4>

          <p className="text-xs text-slate-400">
            Cliente: <strong className="text-slate-300">{item.client.name}</strong> • Celular: <strong className="text-slate-300">{item.client.phone}</strong>
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

      {/* Falla reportada (Súper legible) */}
      <div className="bg-slate-950 p-3 rounded-lg border border-slate-850">
        <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-1">Síntoma reportado</p>
        <p className="text-xs text-slate-300 font-medium font-mono">
          "{item.vehicle.reportedFailure}"
        </p>
      </div>

      {/* Accesorios y evidencia audiovisual de un vistazo */}
      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
        {item.accessories.charger && <span className="bg-slate-950 px-2 py-0.5 rounded font-bold border border-slate-800 text-slate-300">⚡ Cargador</span>}
        {item.accessories.key && <span className="bg-slate-950 px-2 py-0.5 rounded font-bold border border-slate-800 text-slate-300">🔑 Llaves</span>}
        {item.accessories.padlock && <span className="bg-slate-950 px-2 py-0.5 rounded font-bold border border-slate-800 text-slate-300">🔒 Candado</span>}
        {item.accessories.battery && <span className="bg-slate-950 px-2 py-0.5 rounded font-bold border border-slate-800 text-slate-300">🔋 Batería Extra</span>}
        
        <div className="flex items-center space-x-1.5 ml-auto text-slate-500">
          {item.visualState.videoRecorded && <Video className="w-3.5 h-3.5 text-cyan-400/80" title="Video de ingreso realizado" />}
          {item.visualState.photosTaken && <Camera className="w-3.5 h-3.5 text-cyan-400/80" title="Fotografías de ingreso realizadas" />}
        </div>
      </div>

      {/* LINEA DE TIEMPO INTERACTIVA / CAMBIO DE ESTADO EN 1 TAP */}
      <div className="pt-2 border-t border-slate-800/50 space-y-2">
        <p className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Avance rápido del proceso de taller:</p>
        
        <div className="grid grid-cols-6 gap-1 relative">
          {pipeline.map((stepStatus, idx) => {
            const isPassed = idx <= currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            
            let stepStyle = "bg-slate-950 text-slate-500 border-slate-800 hover:bg-slate-800";
            if (isCurrent) {
              stepStyle = "bg-cyan-500 text-slate-950 font-black border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]";
            } else if (isPassed) {
              stepStyle = "bg-slate-800 text-slate-300 border-slate-700/60";
            }

            return (
              <button
                type="button"
                key={stepStatus}
                onClick={() => handleStatusChangeDirectly(item, stepStatus as RepairStatus)}
                className={`py-1.5 px-0.5 text-center text-[10px] font-bold rounded border transition-all ${stepStyle}`}
                title={`Cambiar a ${stepShortLabels[idx]}`}
              >
                {stepShortLabels[idx]}
              </button>
            );
          })}
        </div>
      </div>

      {/* BOTÓN FÁCIL: SIGUIENTE PASO ➔ */}
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
