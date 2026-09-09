import React, { useState } from "react";
import { UserPlus, Users, Search, Clock, Wrench, Phone, CheckCircle, ChevronRight, AlertTriangle } from "lucide-react";
import { RepairItem, ServiceType } from "../types";
import { AuthConfig, loadConfig } from "../auth";

interface AssignTechViewProps {
  repairs: RepairItem[];
  onUpdateRepair?: (id: string, updateData: any) => Promise<void>;
  userLocalKey?: string;
  userName?: string;
  siteConfig?: AuthConfig | null;
}

const SERVICE_LABELS: Record<ServiceType, string> = {
  mantenimiento: "Mantenimiento",
  diagnostico: "Diagnóstico",
  garantia: "Garantía",
  cambio: "Cambio / Repuesto",
  express: "Servicio Express"
};

const norm = (s?: string) => (s || "").trim().toLowerCase();

export default function AssignTechView({ repairs, onUpdateRepair, userLocalKey, userName, siteConfig }: AssignTechViewProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [derivingId, setDerivingId] = useState<string | null>(null);
  const [justAssigned, setJustAssigned] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  const config = siteConfig || loadConfig();
  const local = config.locales.find((l) => l.key === userLocalKey);
  const tecnicos = local ? local.tecnicos.map((t) => t.name.trim()).filter(Boolean) : [];

  const matchTech = (typed: string): string | null => {
    const q = norm(typed);
    if (!q) return null;
    return tecnicos.find((tn) => norm(tn) === q || norm(tn).includes(q) || q.includes(norm(tn))) || null;
  };

  const pending = repairs
    .filter((r) => r.workshopBranch === userLocalKey)
    .filter((r) => r.status === "receptioned" || r.status === "diagnosing")
    .filter((r) => !r.assignedTech || !r.assignedTech.trim())
    .sort((a, b) => a.receptionDate.localeCompare(b.receptionDate));

  const derive = async (r: RepairItem, matched: string, target: "diagnosing" | "repairing") => {
    setDerivingId(r.id);
    try {
      const patch: any = {
        assignedTech: matched,
        technicianName: "Téc. " + matched,
        assignedByName: userName || "Asesora de Servicio"
      };
      if (target === "repairing") {
        patch.status = "repairing";
      }
      await onUpdateRepair?.(r.id, patch);
      setJustAssigned((prev) => [...prev, r.id]);
      setDrafts((prev) => ({ ...prev, [r.id]: "" }));
    } finally {
      setDerivingId(null);
    }
  };

  const filtered = query.trim()
    ? pending.filter((r) => {
        const q = query.trim().toLowerCase();
        return (
          r.client.name.toLowerCase().includes(q) ||
          r.client.dni?.toLowerCase().includes(q) ||
          (r.vehicle.brand || "").toLowerCase().includes(q) ||
          (r.vehicle.model || "").toLowerCase().includes(q)
        );
      })
    : pending;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Cabecera */}
      <div className="bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 rounded-2xl p-5 shadow-[0_0_25px_rgba(6,182,212,0.3)]">
        <div className="flex items-center space-x-3 text-white mb-1">
          <UserPlus className="w-6 h-6" />
          <h1 className="font-display font-black text-2xl tracking-tight">Clientes en Espera</h1>
        </div>
        <p className="text-cyan-50 text-xs">
          Asigna cada vehículo recién ingresado al técnico que realizará su diagnóstico y reparación.
          El técnico solo verá en su mesa de trabajo los clientes que le asignes.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center space-x-1.5 bg-white/15 text-white text-xs font-black px-3 py-1.5 rounded-full">
            <Users className="w-3.5 h-3.5" />
            <span>{pending.length} en espera</span>
          </span>
          {tecnicos.length > 0 && (
            <span className="inline-flex items-center space-x-1.5 bg-white/10 text-cyan-50 text-xs font-semibold px-3 py-1.5 rounded-full">
              Técnicos: {tecnicos.join(" · ")}
            </span>
          )}
        </div>
      </div>

      {tecnicos.length === 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-amber-300 text-xs">
          No hay técnicos registrados para esta sede. Regístralos en la pestaña "Accesos" para poder derivar clientes.
          También puedes escribir el nombre del técnico abajo: si no está registrado, el sistema te lo advertirá.
        </div>
      )}

      {/* Buscador */}
      <div className="flex items-center space-x-2 bg-slate-900 rounded-xl border border-slate-800 px-3.5 py-2.5">
        <Search className="w-4 h-4 text-slate-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por cliente, DNI, marca o modelo..."
          className="w-full bg-transparent focus:outline-none text-sm text-slate-100 placeholder:text-slate-600"
        />
      </div>

      {/* Lista de clientes por derivar */}
      {filtered.length === 0 ? (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-10 text-center text-slate-500 space-y-2">
          <CheckCircle className="w-8 h-8 mx-auto text-emerald-500" />
          <p className="text-sm font-bold text-slate-200">Todo al día</p>
          <p className="text-xs">No hay clientes en espera. Los nuevos ingresos aparecerán aquí.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const assigned = r.assignedTech?.trim();
            const isDone = justAssigned.includes(r.id) && assigned;
            const typed = drafts[r.id] || "";
            const matched = matchTech(typed);
            const notRegistered = typed.trim().length > 0 && !matched;
            const canDerive = matched !== null && derivingId !== r.id && !assigned;
            return (
              <div
                key={r.id}
                className={`bg-slate-900 rounded-2xl border p-4 shadow-lg transition-all ${
                  isDone ? "border-emerald-500/40 bg-emerald-500/5" : "border-slate-800"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center space-x-1.5 bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0">
                        <Clock className="w-3 h-3" />
                        <span>En espera</span>
                      </span>
                      <p className="text-sm font-black text-white truncate">{r.client.name}</p>
                      {isDone && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {r.client.dni ? `DNI ${r.client.dni} · ` : ""}
                      {r.vehicle.brand} {r.vehicle.model} · {r.vehicle.type}
                    </p>
                  </div>
                  <span className="inline-flex items-center space-x-1.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0">
                    <Wrench className="w-3 h-3" />
                    <span>{SERVICE_LABELS[r.serviceType] || r.serviceType}</span>
                  </span>
                </div>

                <div className="mt-2 flex items-center space-x-2 text-[11px] text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Ingresado: {new Date(r.receptionDate).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}</span>
                  {r.client.phone && (
                    <>
                      <span className="text-slate-700">|</span>
                      <Phone className="w-3 h-3" />
                      <span>{r.client.phone}</span>
                    </>
                  )}
                </div>

                {assigned ? (
                  <div className="mt-3 flex items-center space-x-2 text-xs font-bold text-emerald-300">
                    <CheckCircle className="w-4 h-4" />
                    <span>Derivado a {assigned}</span>
                  </div>
                ) : (
                  <div className="mt-3">
                    <div className="flex items-center space-x-2">
                      <input
                        list="assign-tecnicos"
                        value={typed}
                        onChange={(e) => setDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        placeholder={tecnicos.length ? "Escribe o elige técnico..." : "Escribe el nombre del técnico..."}
                        className={`w-full bg-slate-950 border rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 transition-all ${
                          notRegistered
                            ? "border-rose-500/60 focus:ring-rose-500/20"
                            : "border-slate-800 focus:ring-indigo-500/20"
                        }`}
                      />
                      <button
                        type="button"
                        disabled={!canDerive}
                        onClick={() => matched && derive(r, matched, "diagnosing")}
                        className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
                          canDerive
                            ? "bg-indigo-500 hover:bg-indigo-400 text-slate-950 shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                            : "bg-slate-950 border border-slate-800 text-slate-600 cursor-not-allowed"
                        }`}
                      >
                        <ChevronRight className="w-4 h-4" />
                        <span>{derivingId === r.id ? "Derivando..." : "Diagnóstico"}</span>
                      </button>
                      <button
                        type="button"
                        disabled={!canDerive}
                        onClick={() => matched && derive(r, matched, "repairing")}
                        className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
                          canDerive
                            ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                            : "bg-slate-950 border border-slate-800 text-slate-600 cursor-not-allowed"
                        }`}
                      >
                        <ChevronRight className="w-4 h-4" />
                        <span>{derivingId === r.id ? "Derivando..." : "Mesa de Trabajo"}</span>
                      </button>
                    </div>

                    {tecnicos.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {tecnicos.map((tn) => {
                          const active = matched && norm(tn) === norm(matched);
                          return (
                            <button
                              key={tn}
                              type="button"
                              onClick={() => setDrafts((prev) => ({ ...prev, [r.id]: tn }))}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                                active
                                  ? "bg-cyan-500 text-slate-950"
                                  : "bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 hover:bg-cyan-500/20"
                              }`}
                            >
                              {tn}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {notRegistered && (
                      <div className="mt-2 flex items-center space-x-1.5 text-[11px] font-bold text-rose-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Técnico no registrado. Regístralo en Accesos o verifica el nombre.</span>
                      </div>
                    )}
                    {!notRegistered && matched && (
                      <div className="mt-2 text-[11px] font-bold text-emerald-400">Será derivado a: {matched}</div>
                    )}
                    {typed.trim().length === 0 && tecnicos.length > 0 && (
                      <div className="mt-2 text-[11px] text-slate-600">Selecciona de la lista o escribe el nombre exacto del técnico registrado.</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <datalist id="assign-tecnicos">
        {tecnicos.map((tn) => (
          <option key={tn} value={tn} />
        ))}
      </datalist>
    </div>
  );
}