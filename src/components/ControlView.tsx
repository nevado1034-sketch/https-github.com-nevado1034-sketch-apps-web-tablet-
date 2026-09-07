import React, { useState } from "react";
import {
  ClipboardList,
  Wrench,
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
  Loader2
} from "lucide-react";
import { RepairItem } from "../types";
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
  lince_arenales: "San Isidro (Arenales)",
  surco: "Surco",
  san_borja: "San Borja",
  lince_leal: "Lince (José Leal)"
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

function OrderCard({ r, onReassign }: { r: RepairItem; onReassign: (r: RepairItem) => void }) {
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

  const localRepairs = userLocalKey
    ? repairs.filter((r) => r.workshopBranch === userLocalKey)
    : repairs;

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
    .filter((r) => r.status === "receptioned" || r.status === "diagnosing")
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