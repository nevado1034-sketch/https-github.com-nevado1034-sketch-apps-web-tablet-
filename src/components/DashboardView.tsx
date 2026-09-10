import React, { useState, useEffect } from "react";
import { 
  BarChart3, 
  TrendingUp, 
  Settings, 
  Users, 
  Wrench, 
  CheckCircle2, 
  DollarSign, 
  Activity, 
  Smartphone, 
  Cpu,
  Printer,
  Search,
  FileText,
  Calendar,
  Clock,
  AlertTriangle
} from "lucide-react";
import { RepairItem, WorkshopStats } from "../types";
import { generateRepairPdf } from "../utils/pdfGenerator";

interface DashboardViewProps {
  repairs: RepairItem[];
  stats: WorkshopStats;
}

export default function DashboardView({ repairs, stats }: DashboardViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const branchLabels: Record<string, string> = {
    lince_arenales: "San Isidro",
    surco: "Surco",
    san_borja: "San Borja",
    lince_leal: "Lince"
  };

  const deliveredRepairs = repairs.filter(r => r.status === "delivered");

  const filteredDelivered = deliveredRepairs.filter(r => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      r.client.name.toLowerCase().includes(term) ||
      r.id.toLowerCase().includes(term) ||
      (r.client.phone && r.client.phone.includes(term)) ||
      (r.client.dni && r.client.dni.includes(term)) ||
      r.vehicle.brand.toLowerCase().includes(term) ||
      r.vehicle.model.toLowerCase().includes(term);
      
    const matchesBranch = selectedBranch === "all" || r.workshopBranch === selectedBranch;
    
    return matchesSearch && matchesBranch;
  });

  const getDeliveryDateStr = (item: RepairItem) => {
    const deliveryLog = item.historyLog?.find(log => log.status === "delivered");
    if (deliveryLog) {
      return new Date(deliveryLog.date).toLocaleDateString("es-PE", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
    return new Date(item.receptionDate).toLocaleDateString("es-PE", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  // Extract custom metrics
  const totalReceivedThisMonth = repairs.length;
  const earningsEstimated = stats.monthlyEarnings;
  
  // Calculate distribution by type
  const scooterCount = repairs.filter(r => r.vehicle.type === "scooter").length;
  const motoCount = repairs.filter(r => ["moto", "bicimoto", "trimoto"].includes(r.vehicle.type)).length;
  const biciCount = repairs.filter(r => r.vehicle.type === "bici").length;
  const otherCount = repairs.filter(r => r.vehicle.type === "otro").length;
  
  const scooterPct = totalReceivedThisMonth ? Math.round((scooterCount / totalReceivedThisMonth) * 100) : 0;
  const motoPct = totalReceivedThisMonth ? Math.round((motoCount / totalReceivedThisMonth) * 100) : 0;
  const biciPct = totalReceivedThisMonth ? Math.round((biciCount / totalReceivedThisMonth) * 100) : 0;
  const otherPct = totalReceivedThisMonth ? Math.round((otherCount / totalReceivedThisMonth) * 100) : 0;

  // Recent activity log aggregation
  const allLogs = repairs.flatMap(r => 
    (r.historyLog || []).map(l => ({
      ...l,
      vehicleId: r.id,
      vehicleName: `${r.vehicle.brand} ${r.vehicle.model}`
    }))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const scheduledRepairs = repairs
    .filter(r => r.scheduledDeadline && r.status !== "delivered")
    .sort((a, b) => new Date(a.scheduledDeadline!).getTime() - new Date(b.scheduledDeadline!).getTime());

  const fmt = (ms: number) => {
    const absMs = Math.abs(ms);
    const d = Math.floor(absMs / (1000 * 60 * 60 * 24));
    const h = Math.floor((absMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((absMs % (1000 * 60 * 60)) / (1000 * 60));
    if (d > 0) return `${d}d ${h}h ${m}m`;
    return `${h}h ${m}m`;
  };

  const getUrgency = (deadlineMs: number) => {
    const remaining = deadlineMs - now;
    const isOverdue = remaining < 0;
    const hoursLeft = Math.abs(remaining) / (1000 * 60 * 60);
    if (isOverdue) return { color: "text-red-400", bar: "bg-red-500", badge: "bg-red-500/10 border-red-500/25", label: `Vencido hace ${fmt(remaining)}` };
    if (hoursLeft < 2) return { color: "text-amber-400", bar: "bg-amber-500", badge: "bg-amber-500/10 border-amber-500/25", label: `${fmt(remaining)} restantes` };
    if (hoursLeft < 4) return { color: "text-orange-400", bar: "bg-orange-500", badge: "bg-orange-500/10 border-orange-500/25", label: `${fmt(remaining)} restantes` };
    return { color: "text-emerald-400", bar: "bg-emerald-500", badge: "bg-emerald-500/10 border-emerald-500/25", label: `${fmt(remaining)} restantes` };
  };

  const serviceLabels: Record<string, string> = {
    mantenimiento: "Mantenimiento",
    diagnostico: "Diagnóstico",
    garantia: "Garantía",
    cambio: "Cambio"
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      
      {/* HEADER DE BIENVENIDA */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden border border-slate-850">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="relative">
          <p className="text-cyan-400 text-xs font-mono font-bold tracking-widest uppercase">Estadísticas Litio Energy</p>
          <h1 className="font-display font-black text-2xl mt-1 tracking-tight">Panel General de Productividad</h1>
          <p className="text-slate-300 text-sm mt-1 max-w-xl">
            Control de ingresos, estados de taller, productividad de mecánicos y analíticas de rentabilidad en tiempo real.
          </p>
        </div>
      </div>

      {/* METRICAS CLAVE DE NEGOCIO (4 TARJETAS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Metrica 1: Total Ingresos */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Facturado de Mes</span>
            <p className="text-2xl font-bold font-mono text-slate-100">${earningsEstimated} USD</p>
            <p className="text-[10px] text-cyan-400 font-medium">Facturación cerrada y lista</p>
          </div>
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-cyan-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Metrica 2: Activos en Taller */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">En Reparación Activa</span>
            <p className="text-2xl font-bold font-mono text-slate-100">
              {stats.diagnosing + stats.repairing + stats.testing}
            </p>
            <p className="text-[10px] text-purple-400 font-medium">En banco de mecánicos</p>
          </div>
          <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-2xl text-purple-400">
            <Wrench className="w-6 h-6" />
          </div>
        </div>

        {/* Metrica 3: En Diagnóstico */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">En Diagnóstico</span>
            <p className="text-2xl font-bold font-mono text-slate-100">{stats.diagnosing}</p>
            <p className="text-[10px] text-purple-400 font-medium">Evaluación de falla</p>
          </div>
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* Metrica 4: Listos para entrega */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Listos para Entrega</span>
            <p className="text-2xl font-bold font-mono text-slate-100">{stats.ready}</p>
            <p className="text-[10px] text-emerald-400 font-medium">Clientes notificados</p>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* SECCIÓN: VEHÍCULOS CON TIEMPO PROGRAMADO */}
      {scheduledRepairs.length > 0 && (
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4 text-white">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-display font-bold text-sm text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Tiempos Programados de Servicio
            </h3>
            {scheduledRepairs.some(r => r.scheduledDeadline && new Date(r.scheduledDeadline).getTime() < now) && (
              <span className="text-xs bg-red-500/10 text-red-400 px-2.5 py-0.5 rounded-full font-mono border border-red-500/25 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" />
                {scheduledRepairs.filter(r => r.scheduledDeadline && new Date(r.scheduledDeadline).getTime() < now).length} vencidos
              </span>
            )}
          </div>

          <div className="space-y-3 max-h-[290px] overflow-y-auto pr-1">
            {scheduledRepairs.map(r => {
              const deadline = new Date(r.scheduledDeadline!).getTime();
              const startMs = new Date(r.serviceStartedAt || r.receptionDate).getTime();
              const elapsed = now - startMs;
              const totalMs = deadline - startMs;
              const progress = totalMs > 0 ? Math.min(100, Math.max(0, (elapsed / totalMs) * 100)) : 100;
              const urgency = getUrgency(deadline);
              const isOverdue = deadline < now;

              return (
                <div key={r.id} className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${isOverdue ? "bg-red-950/20 border-red-500/20" : "bg-slate-950 border-slate-800/80 hover:bg-slate-900"}`}>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs text-cyan-400">{r.id}</span>
                      <span className="text-slate-700">|</span>
                      <span className="font-bold text-xs text-slate-200 truncate">{r.client.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {r.vehicle.brand} {r.vehicle.model} &middot; {serviceLabels[r.serviceType] || r.serviceType}
                    </p>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                      <div className={`${urgency.bar} h-full rounded-full transition-all duration-1000`} style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <span className={`inline-block px-2 py-0.5 rounded-full border text-[9px] font-bold ${urgency.badge} ${urgency.color}`}>
                      {urgency.label}
                    </span>
                    <p className="text-[9px] text-slate-500 font-mono block">
                      Límite: {new Date(deadline).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* DISTRIBUCIÓN DE VEHÍCULOS & ACTIVIDAD RECIENTE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Gráfico 1: Tipo de Vehículos en Taller (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4 text-white">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-display font-bold text-sm text-slate-100 uppercase tracking-wider">Frecuencia por Tipo de Vehículo</h3>
            <span className="text-xs text-slate-400 font-semibold">Tasa Mensual</span>
          </div>

          <div className="space-y-4">
            
            {/* Scooter Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">🛴 Scooter Eléctrico</span>
                <span className="font-mono text-slate-400">{scooterCount} ({scooterPct}%)</span>
              </div>
              <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-850">
                <div className="bg-cyan-500 h-full rounded-full transition-all duration-500" style={{ width: `${scooterPct}%` }}></div>
              </div>
            </div>

            {/* Moto Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">🏍️ Motocicleta Eléctrica</span>
                <span className="font-mono text-slate-400">{motoCount} ({motoPct}%)</span>
              </div>
              <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-850">
                <div className="bg-purple-500 h-full rounded-full transition-all duration-500" style={{ width: `${motoPct}%` }}></div>
              </div>
            </div>

            {/* Bici Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">🚲 Bicicleta Eléctrica</span>
                <span className="font-mono text-slate-400">{biciCount} ({biciPct}%)</span>
              </div>
              <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-850">
                <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${biciPct}%` }}></div>
              </div>
            </div>

            {/* Otro Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">🔋 Monociclos / Otros</span>
                <span className="font-mono text-slate-400">{otherCount} ({otherPct}%)</span>
              </div>
              <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-850">
                <div className="bg-slate-500 h-full rounded-full transition-all duration-500" style={{ width: `${otherPct}%` }}></div>
              </div>
            </div>

          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
            💡 <strong>Dato de Litio:</strong> Los scooters eléctricos siguen representando el mayor volumen de mantenimiento preventivo, mientras que las motocicletas generan mayor margen de ganancia en repuestos de potencia.
          </div>
        </div>

        {/* Gráfico 2: Actividad de Taller Reciente (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4 text-white">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-display font-bold text-sm text-slate-100 uppercase tracking-wider">Bitácora Global de Taller</h3>
            <span className="text-xs bg-slate-950 text-slate-400 px-2.5 py-0.5 rounded-full font-mono border border-slate-800">Últimas acciones</span>
          </div>

          <div className="space-y-3 max-h-[290px] overflow-y-auto pr-1">
            {allLogs.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-12">Ninguna actividad registrada aún.</p>
            ) : (
              allLogs.slice(0, 10).map((log, idx) => {
                
                const badgeStyles: Record<string, string> = {
                  receptioned: "bg-cyan-500/10 text-cyan-400 border-cyan-500/25",
                  diagnosing: "bg-purple-500/10 text-purple-400 border-purple-500/25",
                  quoted: "bg-amber-500/10 text-amber-400 border-amber-500/25",
                  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
                  repairing: "bg-blue-500/10 text-blue-400 border-blue-500/25",
                  testing: "bg-pink-500/10 text-pink-400 border-pink-500/25",
                  ready: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
                  delivered: "bg-slate-500/10 text-slate-400 border-slate-500/25"
                };

                return (
                   <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs hover:bg-slate-900 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-cyan-400 font-mono">{log.vehicleId}</span>
                        <span className="text-slate-700">•</span>
                        <span className="font-medium text-slate-300 truncate max-w-[180px]">{log.vehicleName}</span>
                      </div>
                      <p className="text-slate-200 font-semibold">{log.description}</p>
                      <p className="text-[10px] text-slate-400">Operado por: <strong className="text-slate-300">{log.user}</strong></p>
                    </div>

                    <div className="text-right space-y-1 shrink-0">
                      <span className={`inline-block px-2 py-0.5 rounded-full border text-[9px] font-bold ${badgeStyles[log.status] || "bg-slate-950 text-slate-400"}`}>
                        {log.status.toUpperCase()}
                      </span>
                      <p className="text-[9px] text-slate-500 font-mono">
                        {new Date(log.date).toLocaleDateString()} {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* SECCIÓN HISTORIAL DE VEHÍCULOS ENTREGADOS */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <h3 className="font-display font-bold text-base text-slate-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              <span>Historial de Vehículos Entregados</span>
            </h3>
            <p className="text-xs text-slate-400">
              Listado histórico de clientes con vehículos eléctricos entregados y sus respectivos certificados de conformidad PDF.
            </p>
          </div>
          <span className="text-xs font-semibold bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20 font-mono flex items-center gap-1.5 self-start">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            {deliveredRepairs.length} Entregados
          </span>
        </div>

        {/* Buscador y filtros */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="w-4 h-4 text-slate-500" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por DNI, cliente, teléfono, marca o modelo de vehículo..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-950 text-xs text-slate-200 border border-slate-800 rounded-xl focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
          <div className="w-full md:w-56">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950 text-xs text-slate-300 border border-slate-800 rounded-xl focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="all">Todas las Sedes</option>
              <option value="lince_arenales">San Isidro</option>
              <option value="surco">Surco</option>
              <option value="san_borja">San Borja</option>
              <option value="lince_leal">Lince</option>
            </select>
          </div>
        </div>

        {/* Lista de vehículos entregados */}
        <div className="space-y-4">
          {filteredDelivered.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-dashed border-slate-850 space-y-3">
              <p className="text-slate-400 font-medium text-xs">No hay registros de vehículos entregados que coincidan con los criterios de búsqueda.</p>
              <p className="text-[11px] text-slate-500 max-w-lg mx-auto leading-relaxed">
                Para registrar una entrega, ve a la pestaña <strong className="text-cyan-400">"Tablet Recepción"</strong> o <strong className="text-cyan-400">"Pantalla Técnico"</strong>, selecciona un vehículo listo y cambia su estado a <strong className="text-emerald-400">"Entregado"</strong>. Esto moverá el registro automáticamente a este historial.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDelivered.map((item) => (
                <div 
                  key={item.id} 
                  className="bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col justify-between gap-4 group"
                >
                  <div className="space-y-3">
                    {/* Header de la tarjeta */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs text-cyan-400">{item.id}</span>
                          <span className="text-slate-700">|</span>
                          <span className="font-bold text-xs text-slate-200">{item.client.name}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono">
                          Telf: {item.client.phone} | Sede: {branchLabels[item.workshopBranch] || item.workshopBranch}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-emerald-400 border-emerald-500/20 font-bold font-mono text-[9px] rounded-md tracking-wider uppercase">
                        Entregado
                      </span>
                    </div>

                    {/* Detalle del vehículo y trabajo realizado */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-slate-900 text-xs">
                      <div className="space-y-1.5">
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vehículo Eléctrico</span>
                        <div className="space-y-1 text-slate-300 font-medium">
                          <p className="flex items-center gap-1.5">
                            <span>{item.vehicle.type === "scooter" ? "🛴" : item.vehicle.type === "moto" ? "🏍️" : item.vehicle.type === "bicimoto" ? "🛵" : item.vehicle.type === "trimoto" ? "🛺" : item.vehicle.type === "bici" ? "🚲" : "🔋"}</span>
                            <span className="text-slate-100 font-semibold">{item.vehicle.brand} {item.vehicle.model}</span>
                          </p>
                          <p className="text-[11px] text-slate-400">Voltaje: <span className="font-mono font-bold">{item.vehicle.voltage}</span></p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Trabajo Realizado</span>
                        <p className="text-[11px] text-slate-400 italic line-clamp-3 leading-relaxed">
                          "{item.technicianNotes || "Servicio técnico integral de mantenimiento sin comentarios específicos."}"
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Footer de la tarjeta con acción PDF */}
                  <div className="pt-3 border-t border-slate-900/60 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-600" />
                      <span>{getDeliveryDateStr(item)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => generateRepairPdf(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950/40 hover:bg-cyan-900/40 text-cyan-400 hover:text-cyan-300 rounded-xl border border-cyan-900/60 hover:border-cyan-500/50 transition-all font-bold font-mono text-xs cursor-pointer shadow-sm shadow-cyan-950/30"
                      title="Imprimir Ficha de Conformidad"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Imprimir Ficha</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
