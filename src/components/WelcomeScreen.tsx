import React, { useState } from "react";
import { LogOut, CheckCircle, Clock, FileText, Plus, MapPin, ClipboardList, Users, Calendar, Wrench, ArrowRight, ChevronDown } from "lucide-react";
import { AuthSession } from "../auth";
import { RepairItem } from "../types";
import litioLogo from "../assets/litio-logo.png";

function getHoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos dias";
  if (h < 18) return "Buenas tardes";
  return "Buenas noches";
}

function getSedeName(key?: string): string {
  if (!key) return "Todas";
  const map: Record<string, string> = {
    lince_arenales: "San Isidro",
    surco: "Surco",
    san_borja: "San Borja",
    lince_leal: "Lince",
  };
  return map[key] || key;
}

function getTypeIcon(type?: string): string {
  if (type === "scooter") return "Scooter";
  if (type === "moto") return "Moto";
  if (type === "bicimoto") return "Bicimoto";
  if (type === "trimoto") return "Trimoto";
  if (type === "bici") return "Bici";
  return "Otro";
}

function getStatusInfo(status: string): { label: string; color: string; bg: string } {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    receptioned: { label: "Ingresado", color: "text-sky-400", bg: "bg-sky-500/10" },
    diagnosing: { label: "Diagnosticando", color: "text-amber-400", bg: "bg-amber-500/10" },
    quoted: { label: "Presupuesto", color: "text-orange-400", bg: "bg-orange-500/10" },
    paid: { label: "Pagado", color: "text-emerald-400", bg: "bg-emerald-500/10" },
    repairing: { label: "Reparando", color: "text-violet-400", bg: "bg-violet-500/10" },
    testing: { label: "Control Calidad", color: "text-yellow-400", bg: "bg-yellow-500/10" },
    ready: { label: "Listo para Entregar", color: "text-emerald-400", bg: "bg-emerald-500/10" },
    delivered: { label: "Entregado", color: "text-cyan-400", bg: "bg-cyan-500/10" },
  };
  return map[status] || { label: status, color: "text-slate-400", bg: "bg-slate-500/10" };
}

interface WelcomeScreenProps {
  session: AuthSession;
  repairs: RepairItem[];
  onNewOrder: () => void;
  onClients: () => void;
  onLogout: () => void;
}

export default function WelcomeScreen({ session, repairs, onNewOrder, onClients, onLogout }: WelcomeScreenProps) {
  const [showOverdue, setShowOverdue] = useState(false);
  const active = repairs.filter((r) => r.status !== "delivered");

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayReceived = active.filter((r) => (r.receptionDate || "").startsWith(todayStr));
  const awaitingApproval = active.filter(
    (r) => r.status === "quoted" || (r.status === "paid" && r.approvalStatus !== "aprobado")
  );
  const approved = active.filter(
    (r) => r.approvalStatus === "aprobado"
  );
  const inRepair = active.filter(
    (r) => r.status === "repairing" || r.status === "diagnosing"
  );
  const readyToDeliver = active.filter((r) => r.status === "ready");
  const inQC = active.filter((r) => r.status === "testing");
  const overdueVehicles = active
    .filter((r) => r.scheduledDeadline)
    .filter((r) => new Date(r.scheduledDeadline!).getTime() < Date.now())
    .sort((a, b) => new Date(a.scheduledDeadline!).getTime() - new Date(b.scheduledDeadline!).getTime());
  const delivered = repairs.filter((r) => r.status === "delivered");
  const todayDelivered = delivered.filter((r) => {
    const log = r.historyLog?.find((l) => l.status === "delivered");
    return log && (log.date || "").startsWith(todayStr);
  });

  const todayDate = new Date().toLocaleDateString("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-2 sm:p-4" style={{ backgroundColor: "#0B132B" }}>
      <div className="w-full max-w-[420px] min-h-[90vh] rounded-[2rem] overflow-hidden flex flex-col relative shadow-2xl" style={{ backgroundColor: "#0B132B", boxShadow: "0 0 60px rgba(0,180,216,0.15)" }}>
        <div className="flex-1 overflow-y-auto pb-6">

          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2.5">
              <img src={litioLogo} alt="Litio" className="w-12 h-12 object-contain drop-shadow-[0_0_12px_rgba(0,180,216,0.5)]" />
              <span className="font-black text-xl text-white tracking-tight">LITIO<span className="text-cyan-400">ENERGY</span></span>
            </div>
            {session.localKey ? (
              <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span className="text-[11px] font-semibold text-slate-300">{getSedeName(session.localKey)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-3 py-1.5">
                <MapPin className="w-3 h-3 text-cyan-400" />
                <span className="text-[11px] font-semibold text-cyan-300">Todas las sedes</span>
              </div>
            )}
          </div>

          <div className="px-5 mb-4">
            <h1 className="text-xl font-bold text-white">{getGreeting()}, {session.name}</h1>
            <p className="text-sm text-cyan-200/50 mt-0.5">Estado operativo del taller para hoy, {todayDate}.</p>
          </div>

          {overdueVehicles.length > 0 && (
            <div className="mx-5 mb-4 rounded-2xl overflow-hidden animate-fade-in" style={{ backgroundColor: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)" }}>
              <button type="button" onClick={() => setShowOverdue(!showOverdue)} className="w-full flex items-center gap-2.5 px-4 py-3.5 text-left">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(239,68,68,0.2)" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h2 className="text-sm font-bold text-red-300 flex-1">
                  {overdueVehicles.length} vehículo{overdueVehicles.length > 1 ? "s" : ""} con tiempo vencido
                </h2>
                <ChevronDown className={`w-4 h-4 text-red-400 transition-transform ${showOverdue ? "rotate-180" : ""}`} />
              </button>
              {showOverdue && (
                <div className="px-4 pb-4 space-y-2 max-h-56 overflow-y-auto pr-2.5">
                  {overdueVehicles.map(r => {
                    const mins = Math.round((Date.now() - new Date(r.scheduledDeadline!).getTime()) / 60000);
                    const hrs = Math.floor(mins / 60);
                    const rest = mins % 60;
                    const st = getStatusInfo(r.status);
                    return (
                      <div key={r.id} className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
                        <span className="font-mono text-[11px] font-bold text-red-400 shrink-0">{r.id}</span>
                        <span className="text-[10px] text-slate-500 truncate hidden sm:block">{r.vehicle?.brand} {r.vehicle?.model}</span>
                        <span className="text-[10px] text-slate-500 truncate sm:hidden">{r.vehicle?.brand}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${st.bg} ${st.color}`}>{st.label}</span>
                        <span className="ml-auto text-[10px] font-bold text-red-400 shrink-0 font-mono">{hrs > 0 ? `${hrs}h ${rest}m` : `${rest}m`} vencido</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="px-5 mb-4 flex gap-2">
            <button
              onClick={onNewOrder}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all shadow-[0_4px_20px_rgba(0,180,216,0.3)]"
              style={{ background: "linear-gradient(135deg, #06b6d4, #0284c7)" }}
            >
              <Plus className="w-4 h-4" />
              <span>Ingresar nuevo</span>
            </button>
          </div>

          <div className="px-5 mb-5">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Recibidos hoy", value: todayReceived.length, icon: ClipboardList, sub: todayReceived.length > 0 ? `${todayReceived.length} activos` : "Sin ingresos", accent: "#00B4D8" },
                { label: "Aprobados", value: approved.length, icon: Clock, sub: approved.length > 0 ? `${awaitingApproval.length} esperando` : `${awaitingApproval.length} pendientes`, accent: "#00B4D8" },
                { label: "En reparacion", value: inRepair.length, icon: Wrench, sub: inRepair.length > 0 ? `${inRepair.length} en proceso` : "Ninguno", accent: "#3B82F6" },
                { label: "Entregados", value: todayDelivered.length, icon: CheckCircle, sub: todayDelivered.length > 0 ? `${todayDelivered.length} completados` : "Sin entregas", accent: "#06B6D4" },
                { label: "Control de calidad", value: inQC.length, icon: CheckCircle, sub: inQC.length > 0 ? `${inQC.length} en revision` : "Sin revisiones", accent: "#A855F7" },
                { label: "Listos para entregar", value: readyToDeliver.length, icon: CheckCircle, sub: readyToDeliver.length > 0 ? `${readyToDeliver.length} esperando` : "Ninguno listo", accent: "#10B981" },
              ].map((m, i) => (
                <div key={i} className={`rounded-2xl px-4 py-4 ${(m as any).fullWidth ? "col-span-2" : ""}`} style={{ backgroundColor: "rgba(0,180,216,0.06)", border: "1px solid rgba(0,180,216,0.1)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: `${m.accent}15` }}>
                    <m.icon className="w-4 h-4" style={{ color: m.accent }} />
                  </div>
                  <p className="text-[11px] font-medium text-slate-400 mb-1">{m.label}</p>
                  <p className="text-3xl font-black text-white leading-none mb-1">{m.value}</p>
                  <p className="text-[10px] text-slate-500">{m.sub}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="px-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vehiculos en taller</h2>
              <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full">{active.length} activos</span>
            </div>
            {active.length === 0 ? (
              <div className="text-center py-6" style={{ backgroundColor: "#1C2541", borderRadius: "1rem" }}>
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-white">Todo al dia</p>
                <p className="text-xs text-slate-400 mt-0.5">No hay vehiculos en taller</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {active.sort((a, b) => new Date(b.receptionDate || "").getTime() - new Date(a.receptionDate || "").getTime()).map((r) => {
                  const st = getStatusInfo(r.status);
                  const hours = getHoursSince(r.receptionDate);
                  const timeColor = hours > 48 ? "text-red-400" : hours > 24 ? "text-amber-400" : "text-slate-500";
                  return (
                    <div key={r.id} className="rounded-xl px-3.5 py-3 flex items-center justify-between" style={{ backgroundColor: "rgba(0,180,216,0.04)", border: "1px solid rgba(0,180,216,0.08)" }}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(0,180,216,0.1)" }}>
                          <span className="text-[10px] font-bold text-slate-400">{getTypeIcon(r.vehicle?.type).slice(0, 3)}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] text-cyan-400">{r.id}</span>
                          </div>
                          <p className="text-xs font-semibold text-white truncate">{r.client?.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{r.vehicle?.brand} {r.vehicle?.model}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${st.bg} ${st.color}`}>{st.label}</span>
                        <span className={`text-[10px] font-bold ${timeColor}`}>{Math.round(hours)}h</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

      <button onClick={onLogout} className="fixed top-3 right-3 text-[10px] text-slate-600 hover:text-slate-400 transition-colors flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg">
        <LogOut className="w-3 h-3" />
        Salir
      </button>
    </div>
  );
}
