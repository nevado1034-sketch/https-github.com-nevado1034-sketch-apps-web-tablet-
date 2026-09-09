import React, { useState } from "react";
import {
  Calculator,
  ChevronDown,
  ChevronUp,
  Phone,
  User,
  Wrench,
  Package,
  Check,
  BadgeDollarSign,
  FileText,
  Save,
  CreditCard,
  MessageCircle,
  Plus,
  Trash2,
  Menu
} from "lucide-react";
import { RepairItem, SparePart, PaymentMethod } from "../types";
import { AuthConfig, loadConfig } from "../auth";

interface PresupuestoViewProps {
  repairs: RepairItem[];
  onUpdateRepair: (id: string, updateData: any) => Promise<void>;
  userLocalKey?: string;
  userName?: string;
  siteConfig?: AuthConfig | null;
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

const statusLabels: Record<string, string> = {
  receptioned: "Recibido",
  diagnosing: "En Diagnóstico",
  quoted: "Presupuesto",
  paid: "Presupuesto",
  repairing: "En Reparación",
  testing: "En Pruebas",
  ready: "Listo para Entrega",
  delivered: "Entregado"
};

const fmt = (n?: number): string => {
  if (n === undefined || n === null || isNaN(n)) return "S/ 0.00";
  return `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const norm = (s?: string) => (s || "").trim().toLowerCase();

export default function PresupuestoView({ repairs, onUpdateRepair, userLocalKey, userName, siteConfig }: PresupuestoViewProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, { partPrice: string; laborPrice: string }>>({});

  // Asignación del técnico responsable de reparación (presupuesto aprobado)
  const [assignMenuId, setAssignMenuId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const config = siteConfig || loadConfig();
  const local = config?.locales?.find((l) => l.key === userLocalKey);
  const tecnicos = local ? local.tecnicos.map((t) => t.name.trim()).filter(Boolean) : [];

  const assignTech = async (r: RepairItem, matched: string) => {
    setAssignMenuId(null);
    setAssigningId(r.id);
    try {
      await onUpdateRepair(r.id, {
        assignedTech: matched,
        technicianName: "Téc. " + matched,
        assignedByName: userName || "Asesora de Servicio",
        status: "repairing"
      });
      alert(`Asignado a ${matched}. El vehículo pasó a su mesa de Reparación.`);
    } catch (err) {
      console.error(err);
      alert("Error al asignar el técnico.");
    } finally {
      setAssigningId(null);
    }
  };

  // Agregar repuesto/servicio desde presupuesto
  const [newPartDesc, setNewPartDesc] = useState("");
  const [newPartType, setNewPartType] = useState<"cambio" | "reparacion">("cambio");
  const [newPartSource, setNewPartSource] = useState<"tecnico" | "cliente">("cliente");

  // Pago del presupuesto (adelanto, método y observaciones) que define la jefa
  const [advanceInput, setAdvanceInput] = useState("0");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("efectivo");
  const [payNotes, setPayNotes] = useState("");
  const [sendingWa, setSendingWa] = useState<string | null>(null);

  const diagnosed = repairs
    .filter((r) => r.status === "quoted" || r.status === "paid")
    .filter((r) => !(r.serviceType === "garantia" && r.warrantyCovered))
    .sort((a, b) => new Date(b.receptionDate).getTime() - new Date(a.receptionDate).getTime());

  const totalOf = (r: RepairItem): number => {
    return (r.spareParts || []).reduce(
      (sum, p) => sum + (Number(p.partPrice) || 0) + (Number(p.laborPrice) || 0),
      0
    );
  };

  const open = (id: string) => {
    setOpenId(openId === id ? null : id);
    setSavedId(null);
    const rep = repairs.find((r) => r.id === id);
    if (rep) {
      setAdvanceInput(String(rep.payment?.advancePayment || 0));
      setPayMethod(rep.payment?.paymentMethod || "efectivo");
      const rawNotes = rep.payment?.paymentNotes || "";
      setPayNotes(rawNotes === "Pendiente de presupuesto (lo define la asesora de servicio)." ? "" : rawNotes);
    }
  };

  const buildCurrentParts = (r: RepairItem): SparePart[] =>
    (r.spareParts || []).map((p) => {
      const v = prices[p.id];
      return {
        ...p,
        partPrice: v?.partPrice !== undefined && v.partPrice !== "" ? Number(v.partPrice) : p.partPrice,
        laborPrice: v?.laborPrice !== undefined && v.laborPrice !== "" ? Number(v.laborPrice) : p.laborPrice
      };
    });

  const savePrices = async (r: RepairItem, forceReset = false) => {
    const parts = buildCurrentParts(r);
    const total = parts.reduce(
      (sum, p) => sum + (Number(p.partPrice) || 0) + (Number(p.laborPrice) || 0),
      0
    );
    const advance = Number(advanceInput) || 0;
    setSaving(true);
    try {
      await onUpdateRepair(r.id, {
        spareParts: parts,
        estimatedCost: total,
        approvalStatus: forceReset ? "pendiente" : r.approvalStatus || "pendiente",
        approvalResponseAt: forceReset ? "" : (r.approvalResponseAt || ""),
        serviceAuthorized: forceReset ? false : r.approvalStatus === "aprobado",
        payment: {
          estimatedCost: total,
          advancePayment: advance,
          remainingBalance: Math.max(0, total - advance),
          paymentMethod: payMethod,
          paymentNotes: payNotes
        }
      });
      setSavedId(r.id);
      setTimeout(() => setSavedId(null), 3000);
    } catch (err) {
      console.error(err);
      alert("Error al guardar el presupuesto.");
    } finally {
      setSaving(false);
    }
  };

  const buildWaMessage = (r: RepairItem, link: string): string => {
    const lines: string[] = [
      `Hola *${r.client.name}* 👋`,
      "",
      "Somos *Litio Energy*, taller especialista en vehiculos electricos.",
      "",
      `Te saludamos y queremos informarte que tu *${r.vehicle.brand} ${r.vehicle.model}* ya fue diagnosticado en nuestra sede ${branchNames[r.workshopBranch] || r.workshopBranch}.`,
      "",
      "Ingresa al siguiente enlace para ver *toda la informacion* de tu vehiculo electrico y tu detalle de repuestos y costos:",
      link,
      "",
      "Cualquier consulta, responde este mensaje.",
      "",
      "Gracias por confiar en *Litio Energy*."
    ];
    return lines.join("\n");
  };

  const shareWhatsApp = async (r: RepairItem) => {
    if (!r.client.phone) {
      alert("El cliente no tiene telefono registrado.");
      return;
    }
    setSendingWa(r.id);
    try {
      await savePrices(r, true);
      const link = `${window.location.origin}${window.location.pathname}#/orden/${r.id}`;
      const message = buildWaMessage(r, link);
      const digits = (r.client.phone || "").replace(/[^\d]/g, "");
      const waPhone = digits.startsWith("51") ? digits : digits.length === 9 ? "51" + digits : digits;
      window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`, "_blank");
    } finally {
      setSendingWa(null);
    }
  };

  const setPrice = (partId: string, key: "partPrice" | "laborPrice", value: string) => {
    setPrices((prev) => ({ ...prev, [partId]: { ...prev[partId], [key]: value } }));
  };

  const hasPriceChanges = (r: RepairItem): boolean =>
    (r.spareParts || []).some((p) => {
      const v = prices[p.id];
      if (!v) return false;
      const partNum = v.partPrice !== undefined && v.partPrice !== "" ? Number(v.partPrice) : p.partPrice;
      const laborNum = v.laborPrice !== undefined && v.laborPrice !== "" ? Number(v.laborPrice) : p.laborPrice;
      return partNum !== Number(p.partPrice) || laborNum !== Number(p.laborPrice);
    });

  const priceValue = (p: SparePart, key: "partPrice" | "laborPrice"): string => {
    const v = prices[p.id];
    if (v && v[key] !== undefined) return v[key];
    const saved = p[key];
    return saved !== undefined && saved !== null ? String(saved) : "";
  };

  const addNewPart = async (r: RepairItem) => {
    const desc = newPartDesc.trim();
    if (!desc) return;
    const part: SparePart = {
      id: `part_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      description: desc,
      type: newPartType,
      source: newPartSource
    };
    const updated = [...(r.spareParts || []), part];
    try {
      await onUpdateRepair(r.id, { spareParts: updated });
      setNewPartDesc("");
      setNewPartType("cambio");
    } catch (err) {
      console.error(err);
      alert("Error al agregar repuesto.");
    }
  };

  const removeNewPart = async (r: SparePart, rep: RepairItem) => {
    if (!confirm("¿Eliminar este repuesto/servicio?")) return;
    const updated = (rep.spareParts || []).filter(p => p.id !== r.id);
    try {
      await onUpdateRepair(rep.id, { spareParts: updated });
    } catch (err) {
      console.error(err);
      alert("Error al eliminar repuesto.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
          <Calculator className="w-6 h-6 text-amber-400" />
          <span>Presupuesto y Pago</span>
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Clientes diagnosticados por el técnico. Haz clic en el nombre para colocar el precio de repuestos y mano de obra.
        </p>
      </div>

      {diagnosed.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 space-y-3">
          <Package className="w-12 h-12 text-slate-700 mx-auto" />
          <p className="text-sm">
            Aún no hay clientes diagnosticados con repuestos. Cuando el técnico registre los repuestos o trabajos detectados en el Diagnóstico, aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {diagnosed.map((rep) => {
            const isOpen = openId === rep.id;
            const parts = rep.spareParts || [];
            const total = parts.reduce(
              (sum, p) => sum + (Number(priceValue(p, "partPrice")) || 0) + (Number(priceValue(p, "laborPrice")) || 0),
              0
            );
            const partsSum = parts.reduce((sum, p) => sum + (Number(priceValue(p, "partPrice")) || 0), 0);
            const laborSum = parts.reduce((sum, p) => sum + (Number(priceValue(p, "laborPrice")) || 0), 0);
            return (
              <div key={rep.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl animate-fade-in">
                {/* Cabecera clicable */}
                <button
                  type="button"
                  onClick={() => open(rep.id)}
                  className="w-full text-left px-4 sm:px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-850 transition-colors"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-100 truncate">{rep.client.name}</p>
                      <p className="text-xs text-slate-500 flex items-center space-x-1">
                        <span>{rep.id}</span>
                        <span>·</span>
                        <Wrench className="w-3 h-3" />
                        <span>{rep.vehicle.brand} {rep.vehicle.model} ({typeLabels[rep.vehicle.type] || rep.vehicle.type})</span>
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-950 text-cyan-400 border border-slate-800 font-mono">
                          {statusLabels[rep.status] || rep.status}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-800 font-mono">
                          {branchNames[rep.workshopBranch] || rep.workshopBranch}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-950 text-amber-400 border border-slate-800 font-mono">
                          {parts.length} repuesto(s)/trabajo(s)
                        </span>
                        {rep.technicianName && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-950 text-violet-400 border border-slate-800 font-mono">
                            {rep.technicianName}
                          </span>
                        )}
                        {rep.approvalStatus && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                            rep.approvalStatus === "aprobado"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/40"
                              : rep.approvalStatus === "rechazado"
                              ? "bg-rose-500/15 text-rose-400 border border-rose-500/40"
                              : "bg-slate-950 text-slate-400 border border-slate-700"
                          }`}>
                            {rep.approvalStatus === "aprobado"
                              ? "✓ APROBADO"
                              : rep.approvalStatus === "rechazado"
                              ? "✕ RECHAZADO"
                              : "· PENDIENTE"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Presupuesto</p>
                      <p className="text-sm font-black text-amber-400">{fmt(total || totalOf(rep))}</p>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-500" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 sm:px-6 pb-6 pt-2 border-t border-slate-800/60 bg-slate-950/40">
                    {/* Detalle del cliente */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <p className="text-slate-300 flex items-center space-x-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span><strong className="text-slate-100">Teléfono:</strong> {rep.client.phone || "—"}</span>
                      </p>
                      <p className="text-slate-300">
                        <strong className="text-slate-100">DNI:</strong> {rep.client.dni || "—"}
                      </p>
                      <p className="text-slate-300">
                        <strong className="text-slate-100">Falla reportada:</strong>{" "}
                        <span className="italic text-slate-400">"{rep.vehicle.reportedFailure || "—"}"</span>
                      </p>
                      {rep.approvalStatus && (
                        <p className={`md:col-span-3 flex items-center space-x-1.5 ${
                          rep.approvalStatus === "aprobado"
                            ? "text-emerald-400"
                            : rep.approvalStatus === "rechazado"
                            ? "text-rose-400"
                            : "text-slate-400"
                        }`}>
                          <strong className="text-slate-100">
                            {rep.approvalStatus === "aprobado" ? "Aprobado por el cliente" : rep.approvalStatus === "rechazado" ? "Rechazado por el cliente" : "Esperando respuesta del cliente"}:
                          </strong>
                          <span className="italic">
                            {rep.approvalStatus === "pendiente"
                              ? "Se envió el enlace por WhatsApp. El cliente debe ingresar y confirmar."
                              : rep.approvalResponseAt
                              ? new Date(rep.approvalResponseAt).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })
                              : "—"}
                          </span>
                        </p>
                      )}
                    </div>

                    {/* Recomendaciones del técnico */}
                    {(rep.recommendations || rep.technicianNotes) && (
                      <div className="mb-4 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-1">
                          Recomendaciones del técnico
                        </p>
                        <p className="text-xs text-slate-200">{rep.recommendations || rep.technicianNotes}</p>
                      </div>
                    )}

                    {/* Lista de repuestos con precios */}
                    <div className="mb-4">
                      <p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                        <Package className="w-4 h-4 text-amber-400" />
                        <span>Repuestos / Trabajos de mantenimiento</span>
                      </p>
                      <div className="space-y-2">
                        {parts.map((p) => (
                          <div key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800">
                            <div className="flex items-center space-x-2 min-w-0 flex-1">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide shrink-0 ${p.type === "cambio" ? "bg-amber-500/15 text-amber-400 border border-amber-500/25" : p.type === "mantenimiento" ? "bg-violet-500/15 text-violet-400 border border-violet-500/25" : "bg-blue-500/15 text-blue-400 border border-blue-500/25"}`}>
                                {p.type === "cambio" ? "Cambiar" : p.type === "mantenimiento" ? "Mant." : "Reparar"}
                              </span>
                              {p.source && (
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wide shrink-0 ${p.source === "cliente" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" : "bg-violet-500/15 text-violet-400 border border-violet-500/25"}`}>
                                  {p.source === "cliente" ? "Cliente" : "Mant."}
                                </span>
                              )}
                              <span className="text-xs text-slate-100 font-medium truncate">{p.description}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div>
                                <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Repuesto (S/)</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={priceValue(p, "partPrice")}
                                  onChange={(e) => setPrice(p.id, "partPrice", e.target.value)}
                                  placeholder="0.00"
                                  className="w-28 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Mano de Obra (S/)</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={priceValue(p, "laborPrice")}
                                  onChange={(e) => setPrice(p.id, "laborPrice", e.target.value)}
                                  placeholder="0.00"
                                  className="w-28 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeNewPart(p, rep)}
                                className="mt-4 p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Agregar repuesto/servicio adicional */}
                    <div className="mb-4 bg-slate-950 rounded-xl border border-slate-800 p-4">
                      <p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
                        <Plus className="w-4 h-4 text-amber-400" />
                        <span>Agregar repuesto / servicio</span>
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="flex gap-1.5 shrink-0">
                          {[
                            { value: "cambio", label: "Cambiar" },
                            { value: "reparacion", label: "Reparar" },
                            { value: "mantenimiento", label: "Mant." }
                          ].map(opt => (
                            <button
                              type="button"
                              key={opt.value}
                              onClick={() => setNewPartType(opt.value as "cambio" | "reparacion" | "mantenimiento")}
                              className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase border transition-all ${
                                newPartType === opt.value
                                  ? opt.value === "cambio"
                                    ? "bg-amber-500/15 text-amber-400 border-amber-500/40"
                                    : opt.value === "reparacion"
                                    ? "bg-blue-500/15 text-blue-400 border-blue-500/40"
                                    : "bg-violet-500/15 text-violet-400 border-violet-500/40"
                                  : "bg-slate-950 text-slate-500 border-slate-800 hover:bg-slate-900"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          value={newPartDesc}
                          onChange={(e) => setNewPartDesc(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") addNewPart(rep); }}
                          placeholder="Ej. Cambiar acelerador, reparación de frenos..."
                          className="flex-1 px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-slate-100 text-xs placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => addNewPart(rep)}
                          disabled={!newPartDesc.trim()}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black uppercase disabled:opacity-40 transition-all shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5 inline mr-1" />
                          Agregar
                        </button>
                      </div>
                    </div>

                    {/* Resumen */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-center">
                      <div className="bg-slate-950 rounded-xl border border-slate-800 p-3">
                        <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Repuestos</p>
                        <p className="text-sm font-black text-amber-400">{fmt(partsSum)}</p>
                      </div>
                      <div className="bg-slate-950 rounded-xl border border-slate-800 p-3">
                        <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Mano de Obra</p>
                        <p className="text-sm font-black text-blue-400">{fmt(laborSum)}</p>
                      </div>
                      <div className="bg-slate-950 rounded-xl border border-amber-500/30 p-3">
                        <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Total Presupuesto</p>
                        <p className="text-base font-black text-amber-400">{fmt(total)}</p>
                      </div>
                      <div className="bg-slate-950 rounded-xl border border-slate-800 p-3">
                        <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Adelanto Recibido</p>
                        <p className="text-sm font-black text-emerald-400">{fmt(Number(advanceInput) || 0)}</p>
                      </div>
                    </div>

                    {/* SECCIÓN DE PAGO (antes era parte de la Recepción; ahora la define la jefa) */}
                    <div className="mb-4 bg-slate-950 rounded-xl border border-slate-800 p-4">
                      <p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
                        <CreditCard className="w-4 h-4 text-emerald-400" />
                        <span>Pago del presupuesto</span>
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                        <div>
                          <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1">Adelanto a recibir (S/)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-slate-500 font-bold text-sm">S/.</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={advanceInput}
                              onChange={e => setAdvanceInput(e.target.value)}
                              placeholder="0"
                              className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-slate-100 text-sm font-black focus:outline-none focus:border-emerald-500 text-emerald-400 font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1">Método de Pago</label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {[
                              { value: "efectivo", label: "Efectivo" },
                              { value: "transferencia", label: "Transf." },
                              { value: "yape_plin", label: "Yape/Plin" },
                              { value: "tarjeta", label: "Tarjeta" }
                            ].map(opt => (
                              <button
                                type="button"
                                key={opt.value}
                                onClick={() => setPayMethod(opt.value as PaymentMethod)}
                                className={`py-1.5 text-[10px] rounded-lg border font-bold transition-all ${
                                  payMethod === opt.value
                                    ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                                    : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1">Saldo Pendiente</label>
                          <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm font-black text-rose-400 flex items-center h-[46px]">
                            {fmt(Math.max(0, total - (Number(advanceInput) || 0)))}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1">Observaciones de Pago</label>
                        <input
                          type="text"
                          value={payNotes}
                          onChange={e => setPayNotes(e.target.value)}
                          placeholder=""
                          className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3">
                      {savedId === rep.id && (
                        <span className="flex items-center space-x-1.5 text-emerald-400 text-xs font-bold">
                          <Check className="w-4 h-4" />
                          <span>Presupuesto y pago guardado</span>
                        </span>
                      )}

                      {rep.status === "paid" && rep.approvalStatus === "aprobado" && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setAssignMenuId(assignMenuId === rep.id ? null : rep.id)}
                            disabled={assigningId === rep.id}
                            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                          >
                            <Menu className="w-4 h-4" />
                            <span>Técnico por asignar</span>
                            <ChevronDown className="w-4 h-4" />
                          </button>

                          {assignMenuId === rep.id && (
                            <div className="absolute right-0 bottom-full mb-2 w-64 z-30 bg-slate-950 border border-amber-500/30 rounded-xl p-2 shadow-2xl">
                              <p className="px-2 py-1 text-[9px] uppercase tracking-wider text-amber-400 font-black">
                                Elige el técnico que hará la reparación
                              </p>
                              {tecnicos.length === 0 && (
                                <p className="px-2 py-2 text-[11px] text-amber-300">
                                  No hay técnicos registrados para esta sede. Regístralos en la pestaña Accesos.
                                </p>
                              )}
                              <div className="max-h-48 overflow-y-auto">
                                {tecnicos.map((tn) => {
                                  const isDiag = norm(tn) === norm(rep.assignedTech);
                                  return (
                                    <button
                                      key={tn}
                                      type="button"
                                      onClick={() => assignTech(rep, tn)}
                                      disabled={assigningId === rep.id}
                                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold transition-colors flex items-center space-x-2 ${
                                        isDiag
                                          ? "bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                                          : "text-slate-200 hover:bg-slate-800"
                                      }`}
                                    >
                                      <User className="w-3.5 h-3.5 shrink-0" />
                                      <span className="truncate">{tn}</span>
                                      {isDiag && (
                                        <span className="ml-auto text-[9px] font-black text-amber-400 uppercase shrink-0">Diagnóstico</span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                              {assigningId === rep.id && (
                                <p className="px-2 py-1.5 text-[10px] text-cyan-400 font-bold animate-pulse">Asignando técnico...</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => shareWhatsApp(rep)}
                        disabled={sendingWa === rep.id || (rep.approvalStatus === "aprobado" && !hasPriceChanges(rep))}
                        className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center space-x-2 disabled:opacity-50 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>{sendingWa === rep.id ? "Generando enlace..." : "Enviar por WhatsApp"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => savePrices(rep)}
                        disabled={saving}
                        className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center space-x-2 disabled:opacity-50 shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                      >
                        <Save className="w-4 h-4" />
                        <span>{saving ? "Guardando..." : "Guardar Presupuesto"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
