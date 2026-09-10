import React, { useState } from "react";
import {
  ClipboardList,
  Wrench,
  Clock,
  User,
  UserX,
  Timer,
  Phone,
  Eye,
  Check,
  Package,
  FileText,
  ArrowRightLeft,
  X,
  Loader2,
  ChevronDown,
  ChevronRight,
  History,
  Hash,
  Users
} from "lucide-react";
import { RepairItem, HistoryLog } from "../types";
import { AuthConfig, loadConfig } from "../auth";

interface ControlViewProps {
  repairs: RepairItem[];
  userLocalKey?: string;
  siteConfig?: AuthConfig | null;
  onUpdateRepair?: (id: string, updateData: any) => Promise<void>;
}

const typeLabels: Record<string, string> = {
  scooter: "Scooter",
  bici: "Bicicleta",
  moto: "Moto",
  bicimoto: "Bicimoto",
  trimoto: "Trimoto",
  otro: "Otro"
};

const branchNames: Record<string, string> = {
  lince_arenales: "San Isidro",
  surco: "Surco",
  san_borja: "San Borja",
  lince_leal: "Lince"
};

function stageStart(r: RepairItem): string {
  if (r.status === "receptioned" || r.status === "diagnosing") {
    return r.serviceStartedAt || r.receptionDate || "";
  }
  return r.approvalResponseAt || r.serviceStartedAt || r.receptionDate || "";
}

function elapsed(from?: string): string {
  if (!from) return "—";
  const ms = Date.now() - new Date(from).getTime();
  if (isNaN(ms) || ms < 0) return "Recién ingresado";
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days >= 1) return days === 1 ? "1 día" : `${days} días`;
  if (hours >= 1) return hours === 1 ? "1 hora" : `${hours} horas`;
  return "Menos de 1 hora";
}

function statusBadge(status: string): { label: string; cls: string } {
  switch (status) {
    case "receptioned":
      return { label: "Recibido", cls: "bg-cyan-500/10 border-cyan-500/25 text-cyan-300" };
    case "diagnosing":
      return { label: "En Diagnóstico", cls: "bg-purple-500/10 border-purple-500/25 text-purple-300" };
    case "paid":
      return { label: "Presupuesto aprobado", cls: "bg-amber-500/10 border-amber-500/25 text-amber-300" };
    case "repairing":
      return { label: "En Reparación", cls: "bg-blue-500/10 border-blue-500/25 text-blue-300" };
    case "testing":
      return { label: "En Control de Calidad", cls: "bg-pink-500/10 border-pink-500/25 text-pink-300" };
    default:
      return { label: status, cls: "bg-slate-500/10 border-slate-500/25 text-slate-300" };
  }
}

function SummaryCard({ icon: Icon, title, count, list, groupCls, subgroupCls, empty, onReassign }: {
  icon: React.ElementType;
  title: string;
  count: number;
  list: RepairItem[];
  groupCls: string;
  subgroupCls: string;
  empty: string;
  onReassign: (r: RepairItem) => void;
}) {
  const assigned = list.filter((r) => r.assignedTech && r.assignedTech.trim());
  const unassigned = list.filter((r) => !(r.assignedTech && r.assignedTech.trim()));
  return (
    <section className={`rounded-2xl overflow-hidden border ${groupCls}`}>
      <header className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <Icon className="w-5 h-5" />
          <h2 className="font-display font-black text-base tracking-tight uppercase">{title}</h2>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-950 border border-slate-700 text-slate-300">
            {count}
          </span>
        </div>
      </header>

      <div className="p-3 space-y-2.5 bg-slate-950/40">
        {list.length === 0 && (
          <div className="py-6 text-center text-sm text-slate-600 font-medium">{empty}</div>
        )}

        {assigned.length > 0 && (
          <div className="space-y-2.5">
            <p className={`text-[10px] font-black uppercase tracking-widest ${subgroupCls} px-1`}>
              Con técnico asignado ({assigned.length})
            </p>
            {assigned.map((r) => (
              <OrderCard key={r.id} r={r} onReassign={onReassign} />
            ))}
          </div>
        )}

        {unassigned.length > 0 && (
          <div className="space-y-2.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-400/80 px-1">
              Sin técnico asignado ({unassigned.length})
            </p>
            {unassigned.map((r) => (
              <OrderCard key={r.id} r={r} onReassign={onReassign} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

interface OrderCardProps {
  key?: React.Key;
  r: RepairItem;
  onReassign: (r: RepairItem) => void;
}

function OrderCard({ r, onReassign }: OrderCardProps) {
  const badge = statusBadge(r.status);
  const tech = r.assignedTech && r.assignedTech.trim();
  const total = (r.spareParts || []).reduce(
    (sum, p) => sum + (Number(p.partPrice) || 0) + (Number(p.laborPrice) || 0),
    0
  );
  const evCount =
    (r.visualState?.photos?.length || 0) + (r.visualState?.videoEvidence?.length || 0);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-black text-white truncate">{r.client?.name || "Cliente"}</p>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
            {r.id} · {typeLabels[r.vehicle?.type || ""] || r.vehicle?.type || ""}{" "}
            {r.vehicle?.brand ? `${r.vehicle.brand} ${r.vehicle.model || ""}`.trim() : r.vehicle?.model || ""}
          </p>
          {r.vehicle?.reportedFailure && (
            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
              Falla: {r.vehicle.reportedFailure}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-1.5 shrink-0">
          {evCount > 0 && (
            <span
              className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-cyan-300 text-[10px] font-bold"
              title={`${evCount} foto(s)/video(s) de evidencia`}
            >
              <Eye className="w-3 h-3" />
              <span>{evCount}</span>
            </span>
          )}
          {r.status !== "testing" && (
            <button
              type="button"
              onClick={() => onReassign(r)}
              title={tech ? "Cambiar técnico" : "Asignar técnico"}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-[10px] font-black hover:bg-cyan-500/20 transition-all"
            >
              <ArrowRightLeft className="w-3 h-3" />
              {tech ? "Cambiar" : "Asignar"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
        {tech ? (
          <span className="inline-flex items-center space-x-1.5 bg-slate-950 border border-slate-700 text-slate-200 px-2 py-1 rounded-full font-bold">
            <User className="w-3 h-3 text-cyan-400" />
            <span>{tech}</span>
          </span>
        ) : (
          <span className="inline-flex items-center space-x-1.5 bg-amber-500/10 border border-amber-500/25 text-amber-300 px-2 py-1 rounded-full font-bold">
            <UserX className="w-3 h-3" />
            <span>Por asignar técnico</span>
          </span>
        )}
        <span className="inline-flex items-center space-x-1 bg-slate-950 border border-slate-800 text-slate-400 px-2 py-1 rounded-full font-bold">
          <Timer className="w-3 h-3" />
          <span>{elapsed(stageStart(r))}</span>
        </span>
        {total > 0 && (
          <span className="inline-flex items-center space-x-1 bg-slate-950 border border-slate-800 text-amber-400 px-2 py-1 rounded-full font-bold">
            <FileText className="w-3 h-3" />
            <span>
              S/ {total.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </span>
        )}
        {r.client?.phone && (
          <span className="inline-flex items-center space-x-1 bg-slate-950 border border-slate-800 text-slate-400 px-2 py-1 rounded-full font-bold">
            <Phone className="w-3 h-3" />
            <span>{r.client.phone}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function ReassignModal({ repair, tecnicos, current, saving, onSelect, onClose }: {
  repair: RepairItem;
  tecnicos: string[];
  current: string;
  saving: boolean;
  onSelect: (tech: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ backgroundColor: "rgba(2,6,23,0.8)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-800">
          <div className="min-w-0">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-cyan-400 shrink-0" />
              {current ? "Cambiar técnico" : "Asignar técnico"}
            </h3>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {repair.id} · {repair.client?.name || "Cliente"} ·{" "}
              {repair.vehicle?.brand || ""} {repair.vehicle?.model || ""}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-2 max-h-[55vh] overflow-y-auto">
          {tecnicos.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-6">
              No hay técnicos configurados en esta sede. Agrégalos desde Accesos.
            </p>
          )}

          {tecnicos.map((t) => {
            const isCurrent = current && t === current;
            return (
              <button
                key={t}
                type="button"
                disabled={saving || isCurrent}
                onClick={() => onSelect(t)}
                className={`w-full flex items-center justify-between gap-2 px-3.5 py-3 rounded-xl border transition-all ${
                  isCurrent
                    ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300 cursor-default"
                    : "bg-slate-950 border-slate-800 text-slate-200 hover:border-cyan-500/40 hover:bg-cyan-500/5"
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-bold">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {t}
                </span>
                {isCurrent && (
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                    Actual
                  </span>
                )}
              </button>
            );
          })}

          {current && (
            <button
              type="button"
              disabled={saving}
              onClick={() => onSelect("")}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-dashed border-rose-500/40 text-rose-300 text-xs font-black hover:bg-rose-500/10 transition-all"
            >
              <UserX className="w-3.5 h-3.5" />
              Quitar técnico (dejar sin asignar)
            </button>
          )}
        </div>

        {saving && (
          <div className="px-4 pb-4 flex items-center gap-2 text-[11px] text-cyan-400 font-bold">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Guardando cambio...
          </div>
        )}
      </div>
    </div>
  );
}

export default function ControlView({ repairs, userLocalKey, siteConfig, onUpdateRepair }: ControlViewProps) {
  const config = siteConfig || loadConfig();
  const [reassignId, setReassignId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"etapas" | "clientes">("etapas");
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  const localRepairs = userLocalKey
    ? repairs.filter((r) => r.workshopBranch === userLocalKey)
    : repairs;

  // Agrupa las órdenes por cliente (por DNI o nombre+teléfono)
  const clientGroups = (() => {
    const map = new Map<string, RepairItem[]>();
    for (const r of localRepairs) {
      const dni = (r.client?.dni || "").trim();
      const key = dni || `${(r.client?.name || "").trim()}|${(r.client?.phone || "").trim()}`;
      const arr = map.get(key) || [];
      arr.push(r);
      map.set(key, arr);
    }
    return [...map.entries()]
      .map(([key, list]) => ({ key, list: list.sort((a, b) => new Date(a.receptionDate).getTime() - new Date(b.receptionDate).getTime()) }))
      .sort((a, b) => (a.list[0]?.client?.name || "").localeCompare(b.list[0]?.client?.name || ""));
  })();

  const toggleClient = (key: string) => {
    setExpandedClients((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const reassigning = localRepairs.find((r) => r.id === reassignId) || null;

  const reassignBranch = reassigning?.workshopBranch || userLocalKey;
  const locale = config.locales.find((l) => l.key === reassignBranch);
  const tecnicos = locale ? locale.tecnicos.map((t) => t.name.trim()).filter(Boolean) : [];

  const handleSelectTech = async (techName: string) => {
    if (!reassigning || !onUpdateRepair) return;
    setSaving(true);
    try {
      await onUpdateRepair(reassigning.id, {
        assignedTech: techName,
        technicianName: techName ? "Téc. " + techName : "",
        assignedByName: "Asesora de Servicio",
        reassignedAt: new Date().toISOString()
      });
      setReassignId(null);
    } finally {
      setSaving(false);
    }
  };

  const diagnostico = localRepairs
    .filter((r) => r.status === "diagnosing")
    .sort((a, b) => new Date(stageStart(a)).getTime() - new Date(stageStart(b)).getTime());

  const espera = localRepairs
    .filter((r) => r.status === "receptioned")
    .sort((a, b) => new Date(stageStart(a)).getTime() - new Date(stageStart(b)).getTime());

  const aprobados = localRepairs
    .filter((r) => r.status === "paid")
    .sort((a, b) => new Date(stageStart(a)).getTime() - new Date(stageStart(b)).getTime());

  const presupuestos = localRepairs
    .filter((r) => r.status === "quoted")
    .sort((a, b) => new Date(stageStart(a)).getTime() - new Date(stageStart(b)).getTime());

  const reparacion = localRepairs
    .filter((r) => r.status === "repairing" || r.status === "testing")
    .sort((a, b) => new Date(stageStart(a)).getTime() - new Date(stageStart(b)).getTime());

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <ClipboardList className="w-5 h-5 text-cyan-400" />
            <span>Control de Procesos</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Solo lectura ·{" "}
            <span className="font-bold text-slate-300">
              {branchNames[userLocalKey || ""] || userLocalKey || "Todos los locales"}
            </span>{" "}
            · El diagnóstico y la reparación los realizan los técnicos asignados.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-[11px] font-black">
            {espera.length} en espera
          </span>
          <span className="px-2.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-300 text-[11px] font-black">
            {diagnostico.length} en diagnóstico
          </span>
          <span className="px-2.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] font-black">
            {presupuestos.length} por confirmar
          </span>
          <span className="px-2.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[11px] font-black">
            {aprobados.length} por asignar
          </span>
          <span className="px-2.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-300 text-[11px] font-black">
            {reparacion.length} en reparación
          </span>
        </div>
      </div>

      {/* Pestañas de vista */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setViewMode("etapas")}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            viewMode === "etapas"
              ? "bg-cyan-500 text-slate-950 shadow-[0_0_16px_rgba(6,182,212,0.25)]"
              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
          }`}
        >
          Por Etapas
        </button>
        <button
          type="button"
          onClick={() => setViewMode("clientes")}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            viewMode === "clientes"
              ? "bg-cyan-500 text-slate-950 shadow-[0_0_16px_rgba(6,182,212,0.25)]"
              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Por Cliente ({clientGroups.length})
          </span>
        </button>
      </div>

      {viewMode === "etapas" ? (
      <>
      <SummaryCard
        icon={Clock}
        title="En Espera"
        count={espera.length}
        list={espera}
        groupCls="border-cyan-500/25 shadow-[0_0_20px_rgba(6,182,212,0.06)]"
        subgroupCls="text-cyan-400/80"
        empty="No hay vehículos en espera de derivación."
        onReassign={(r) => setReassignId(r.id)}
      />

      <SummaryCard
        icon={Wrench}
        title="En Diagnóstico"
        count={diagnostico.length}
        list={diagnostico}
        groupCls="border-purple-500/25 shadow-[0_0_20px_rgba(168,85,247,0.06)]"
        subgroupCls="text-cyan-400/80"
        empty="No hay vehículos en etapa de diagnóstico. Los clientes ingresados se derivan al técnico desde 'Clientes en Espera'."
        onReassign={(r) => setReassignId(r.id)}
      />

      <SummaryCard
        icon={FileText}
        title="Presupuesto Enviado · Por Confirmar Cliente"
        count={presupuestos.length}
        list={presupuestos}
        groupCls="border-amber-500/25 shadow-[0_0_20px_rgba(245,158,11,0.06)]"
        subgroupCls="text-amber-400/80"
        empty="No hay presupuestos esperando confirmación del cliente."
        onReassign={(r) => setReassignId(r.id)}
      />

      <SummaryCard
        icon={Check}
        title="Presupuesto Aprobado · Por Asignar Técnico"
        count={aprobados.length}
        list={aprobados}
        groupCls="border-emerald-500/25 shadow-[0_0_20px_rgba(16,185,129,0.06)]"
        subgroupCls="text-emerald-400/80"
        empty="No hay presupuestos aprobados pendientes de técnico."
        onReassign={(r) => setReassignId(r.id)}
      />

      <SummaryCard
        icon={Package}
        title="En Reparación"
        count={reparacion.length}
        list={reparacion}
        groupCls="border-blue-500/25 shadow-[0_0_20px_rgba(59,130,246,0.06)]"
        subgroupCls="text-blue-400/80"
        empty="No hay vehículos en reparación."
        onReassign={(r) => setReassignId(r.id)}
      />
      </>

      ) : (

      /* VISTA POR CLIENTE: ACORDEONES CON TODO EL PROCESO DE CADA CLIENTE */
      <div className="space-y-4">
        {clientGroups.length === 0 && (
          <div className="py-10 text-center text-sm text-slate-500">
            No hay órdenes registradas para este local.
          </div>
        )}

        {clientGroups.map(({ key, list }) => {
          const client = list[0]?.client;
          const isOpen = expandedClients.has(key);
          const totalSpend = list.reduce(
            (sum, r) => sum + (r.spareParts || []).reduce(
              (s2, p) => s2 + (Number(p.partPrice) || 0) + (Number(p.laborPrice) || 0),
              0
            ),
            0
          );
          return (
            <section key={key} className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/60">
              <button
                type="button"
                onClick={() => toggleClient(key)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3.5 bg-slate-900 hover:bg-slate-850 transition-colors text-left"
              >
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-cyan-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                    <span className="font-display font-black text-sm text-white truncate">
                      {client?.name || "Cliente"}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${list.length > 1 ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30" : "bg-slate-800 text-slate-400 border border-slate-700"}`}>
                      {list.length} {list.length === 1 ? "orden" : "órdenes"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10px]">
                    {client?.dni && (
                      <span className="inline-flex items-center space-x-1 bg-slate-950 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">
                        <Hash className="w-3 h-3" />
                        <span>{client.dni}</span>
                      </span>
                    )}
                    {client?.phone && (
                      <span className="inline-flex items-center space-x-1 bg-slate-950 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">
                        <Phone className="w-3 h-3" />
                        <span>{client.phone}</span>
                      </span>
                    )}
                    <span className="inline-flex items-center space-x-1 bg-slate-950 border border-slate-800 text-amber-400 px-2 py-0.5 rounded-full font-black">
                      <FileText className="w-3 h-3" />
                      <span>S/ {totalSpend.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </span>
                  </div>
                </div>
              </button>

              {isOpen && (
                <div className="p-3 pt-0 space-y-3 bg-slate-950/40">
                  {list.map((r) => {
                    const badge = statusBadge(r.status);
                    return (
                      <div key={r.id} className="bg-slate-900 rounded-xl border border-slate-800 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-xs text-white bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">{r.id}</span>
                            <span className="text-[11px] text-slate-300 font-bold">
                              {typeLabels[r.vehicle?.type || ""] || r.vehicle?.type || ""} {r.vehicle?.brand || ""} {r.vehicle?.model || ""}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${badge.cls}`}>{badge.label}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(r.receptionDate).toLocaleDateString()}
                          </span>
                        </div>

                        {r.vehicle?.reportedFailure && (
                          <p className="text-[11px] text-slate-400 mt-1.5 italic bg-slate-950/40 border border-slate-850/40 rounded-lg px-2.5 py-1.5">
                            Falla: {r.vehicle.reportedFailure}
                          </p>
                        )}

                        <div className="mt-2.5 flex items-center space-x-2 text-[10px] font-black uppercase tracking-wider text-slate-400 border-t border-slate-800 pt-2.5">
                          <History className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Historial de Transiciones</span>
                        </div>

                        <div className="mt-2.5 space-y-2.5">
                          {(r.historyLog || []).slice().reverse().map((log: HistoryLog) => (
                            <div key={log.id} className="flex items-start space-x-2.5 text-xs leading-relaxed">
                              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)] shrink-0 mt-1.5 animate-pulse"></div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-semibold text-slate-200">{log.description}</span>
                                  <span className="text-[10px] text-slate-500 font-mono shrink-0">
                                    {new Date(log.date).toLocaleDateString()} {new Date(log.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-400">Operador: <strong className="text-slate-300">{log.user}</strong></p>
                              </div>
                            </div>
                          ))}
                          {(!r.historyLog || r.historyLog.length === 0) && (
                            <p className="text-[10px] text-slate-500 italic">Sin transiciones registradas.</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
      )}

      {reassigning && (
        <ReassignModal
          repair={reassigning}
          tecnicos={tecnicos}
          current={reassigning.assignedTech?.trim() || ""}
          saving={saving}
          onSelect={handleSelectTech}
          onClose={() => setReassignId(null)}
        />
      )}
    </div>
  );
}