import React, { useMemo, useState } from "react";
import {
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  Phone,
  User,
  Wrench,
  Gauge,
  Check,
  X,
  BadgeCheck,
  RotateCcw,
  Sparkles
} from "lucide-react";
import { RepairItem, QualityChecklist, QcCheckItem } from "../types";

interface QualityControlViewProps {
  repairs: RepairItem[];
  onUpdateRepair: (id: string, updateData: any) => Promise<void>;
  userLocalKey?: string;
  userName?: string;
}

const defaultQc = (): QualityChecklist => ({
  batteryLevel: "regular",
  mileageKm: 0,
  minSpeedKmh: 0,
  maxSpeedKmh: 0,
  faultResolved: true,
  cleanliness: "buena",
  frontBrake: { good: true, replace: false },
  rearBrake: { good: true, replace: false },
  electricHarness: { good: true, replace: false },
  motorHarness: { good: true, replace: false },
  headlights: { good: true, replace: false },
  rearLight: { good: true, replace: false },
  horn: { good: true, replace: false },
  mirrors: { good: true, replace: false },
  suspension: { good: true, replace: false },
  turnSignals: true,
  rightTurnLight: { good: true, replace: false },
  leftTurnLight: { good: true, replace: false },
  frontTires: { good: true, replace: false },
  rearTires: { good: true, replace: false },
  chargingTimeMin: 0,
  finalVoltage: "",
  notes: "",
  result: "draft",
  reviewedBy: "",
  reviewedAt: ""
});

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

function getTestingSince(rep: RepairItem): number {
  const logs = rep.historyLog || [];
  for (let i = logs.length - 1; i >= 0; i--) {
    if (logs[i].status === "testing") {
      const t = new Date(logs[i].date).getTime();
      if (!isNaN(t)) return t;
    }
  }
  return new Date(rep.receptionDate).getTime();
}

function formatElapsed(ms: number): string {
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${Math.max(min, 1)} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ${min % 60} min`;
  const d = Math.floor(h / 24);
  return `${d} d ${h % 24} h`;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2 mt-5 first:mt-0 border-b border-slate-800 pb-1.5">
      {children}
    </h4>
  );
}

function CheckItemRow({
  label,
  value,
  onChange
}: {
  label: string;
  value: QcCheckItem;
  onChange: (v: QcCheckItem) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0 gap-2">
      <span className="text-xs text-slate-300 flex-1">{label}</span>
      <div className="flex rounded-lg overflow-hidden border border-slate-800 shrink-0">
        <button
          type="button"
          onClick={() => onChange({ good: true, replace: false })}
          className={`px-2.5 py-1 text-[10px] font-bold transition-colors cursor-pointer ${
            value.good ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-950 text-slate-500 hover:text-slate-300"
          }`}
        >
          ✓ Buen estado
        </button>
        <button
          type="button"
          onClick={() => onChange({ good: false, replace: true })}
          className={`px-2.5 py-1 text-[10px] font-bold transition-colors cursor-pointer ${
            value.replace ? "bg-rose-500/20 text-rose-400" : "bg-slate-950 text-slate-500 hover:text-slate-300"
          }`}
        >
          ✗ Para cambio
        </button>
      </div>
    </div>
  );
}

function YesNoRow({
  label,
  value,
  onChange,
  extra
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0 gap-2">
      <span className="text-xs text-slate-300 flex-1">{label}</span>
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex rounded-lg overflow-hidden border border-slate-800">
          <button
            type="button"
            onClick={() => onChange(true)}
            className={`px-2.5 py-1 text-[10px] font-bold transition-colors cursor-pointer ${
              value ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-950 text-slate-500 hover:text-slate-300"
            }`}
          >
            Sí
          </button>
          <button
            type="button"
            onClick={() => onChange(false)}
            className={`px-2.5 py-1 text-[10px] font-bold transition-colors cursor-pointer ${
              !value ? "bg-rose-500/20 text-rose-400" : "bg-slate-950 text-slate-500 hover:text-slate-300"
            }`}
          >
            No
          </button>
        </div>
        {extra}
      </div>
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  suffix,
  placeholder
}: {
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min={0}
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value))}
        placeholder={placeholder || "0"}
        className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-100 text-xs text-right font-mono"
      />
      {suffix && <span className="text-[10px] text-slate-500">{suffix}</span>}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0 gap-2">
      <span className="text-xs text-slate-300 flex-1">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-100 text-xs font-mono"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function QualityControlView({
  repairs,
  onUpdateRepair,
  userLocalKey,
  userName
}: QualityControlViewProps) {
  const queue = useMemo(
    () =>
      repairs
        .filter((r) => r.status === "testing")
        .sort((a, b) => getTestingSince(a) - getTestingSince(b)),
    [repairs]
  );

  const [openId, setOpenId] = useState<string | null>(null);
  const [qcDraft, setQcDraft] = useState<QualityChecklist>(defaultQc);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState<string | null>(null);

  const openRepair = queue.find((r) => r.id === openId) || null;

  const toggleOpen = (id: string) => {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    const rep = queue.find((r) => r.id === id);
    setOpenId(id);
    setQcDraft(rep?.qcReport ? { ...defaultQc(), ...rep.qcReport } : defaultQc());
  };

  const setItem = (key: keyof QualityChecklist) => (v: QcCheckItem) =>
    setQcDraft((d) => ({ ...d, [key]: v }));

  const save = async (result: "approved" | "rejected") => {
    if (!openRepair) return;
    setSaving(true);
    try {
      const qcReport: QualityChecklist = {
        ...qcDraft,
        result,
        reviewedBy: userName || "Control de Calidad",
        reviewedAt: new Date().toISOString()
      };
      await onUpdateRepair(openRepair.id, {
        status: result === "approved" ? "ready" : "repairing",
        technicianName: userName || "Control de Calidad",
        qcReport
      });
      setJustSaved(openRepair.id);
      setOpenId(null);
      setTimeout(() => setJustSaved(null), 4000);
    } catch (err) {
      console.error(err);
      alert("Error al guardar el control de calidad.");
    } finally {
      setSaving(false);
    }
  };

  const hasPendingChanges = Object.keys(qcDraft).some(
    (k) => JSON.stringify((qcDraft as any)[k]) !== JSON.stringify((defaultQc() as any)[k])
  );

  const waitingMinutes = queue.length === 0 ? 0 : getTestingSince(queue[0]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      {/* Encabezado con contador */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl text-slate-950 shadow-[0_4px_25px_rgba(6,182,212,0.3)]">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Control de Calidad
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Revisión técnica final</span>
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Vehículos en espera de revisión de calidad antes de la entrega.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-5 py-3 bg-slate-900 rounded-2xl border border-cyan-500/20 text-center">
            <div className="text-3xl font-black text-cyan-400 leading-none">{queue.length}</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">En espera</div>
          </div>
          <div className="px-5 py-3 bg-slate-900 rounded-2xl border border-slate-800 text-center hidden sm:block">
            <div className="text-3xl font-black text-amber-400 leading-none">
              {queue.length > 0 ? formatElapsed(Date.now() - waitingMinutes) : "—"}
            </div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Mayor espera</div>
          </div>
        </div>
      </div>

      {/* Cola de espera */}
      {queue.length === 0 ? (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-10 text-center">
          <div className="text-5xl mb-3">✅</div>
          <p className="text-slate-300 font-semibold">No hay vehículos en espera de control de calidad.</p>
          <p className="text-xs text-slate-500 mt-1">
            Los vehículos en estado "En Pruebas" aparecerán aquí para su revisión.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((rep) => {
            const isOpen = openId === rep.id;
            const lastQc = rep.qcReport;
            const hasReport = lastQc && lastQc.result !== "draft";
            return (
              <div
                key={rep.id}
                className={`bg-slate-900 rounded-2xl border overflow-hidden transition-all ${
                  isOpen ? "border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.15)]" : "border-slate-800"
                }`}
              >
                {/* Botón del cliente: expande toda la información */}
                <button
                  type="button"
                  onClick={() => toggleOpen(rep.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-slate-800/50 transition-colors text-left cursor-pointer"
                >
                  <div className="flex flex-col items-center justify-center w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
                    <User className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-100">{rep.client.name}</span>
                      <span className="text-[10px] font-mono text-cyan-500 bg-cyan-500/10 px-1.5 py-0.5 rounded">{rep.id}</span>
                      {hasReport && (
                        <span
                          className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            lastQc.result === "approved"
                              ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                              : "text-rose-400 border-rose-500/30 bg-rose-500/10"
                          }`}
                        >
                          {lastQc.result === "approved" ? <BadgeCheck className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          {lastQc.result === "approved" ? "Aprobado" : "Rechazado"} (revisado otra vez)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {typeLabels[rep.vehicle.type] || rep.vehicle.type} • {rep.vehicle.brand} {rep.vehicle.model} •{" "}
                      {branchNames[rep.workshopBranch] || rep.workshopBranch}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300">
                      <Phone className="w-3 h-3 text-slate-500" /> {rep.client.phone}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                      ⏳ {formatElapsed(Date.now() - getTestingSince(rep))}
                    </span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-cyan-400" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </div>
                </button>

                {/* Panel expandido: toda la información + checklist */}
                {isOpen && openRepair && (
                  <div className="border-t border-slate-800 bg-slate-950/50 p-5">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Información del vehículo */}
                      <div>
                        <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Wrench className="w-4 h-4 text-cyan-400" /> Información del vehículo
                        </h3>
                        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 text-xs space-y-2">
                          <p className="flex justify-between"><span className="text-slate-500">Cliente</span><span className="text-slate-100 font-semibold">{openRepair.client.name}</span></p>
                          <p className="flex justify-between"><span className="text-slate-500">DNI / C.E</span><span className="text-slate-100 font-semibold font-mono">{openRepair.client.dni}</span></p>
                          <p className="flex justify-between"><span className="text-slate-500">Teléfono</span><span className="text-slate-100 font-semibold">{openRepair.client.phone}</span></p>
                          <p className="flex justify-between"><span className="text-slate-500">Vehículo</span><span className="text-slate-100 font-semibold">{typeLabels[openRepair.vehicle.type] || openRepair.vehicle.type} {openRepair.vehicle.brand} {openRepair.vehicle.model}</span></p>
                          <p className="flex justify-between"><span className="text-slate-500">Voltaje</span><span className="text-slate-100 font-semibold">{openRepair.vehicle.voltage}</span></p>
                          <p className="flex justify-between"><span className="text-slate-500">Avería reportada</span><span className="text-slate-100 font-semibold text-right max-w-[60%]">{openRepair.vehicle.reportedFailure}</span></p>
                          <p className="flex justify-between"><span className="text-slate-500">Técnico</span><span className="text-slate-100 font-semibold">{openRepair.technicianName || "Sin asignar"}</span></p>
                          <p className="flex justify-between"><span className="text-slate-500">Costo</span><span className="text-emerald-400 font-bold">S/ {openRepair.actualCost || openRepair.estimatedCost || 0}</span></p>
                          {openRepair.technicianNotes && (
                            <p className="pt-2 border-t border-slate-800"><span className="text-slate-500 block mb-1">Notas</span><span className="text-slate-300">{openRepair.technicianNotes}</span></p>
                          )}
                        </div>

                        {/* Fotos y videos */}
                        {(openRepair.visualState.photos?.length || openRepair.visualState.videoEvidence?.length) ? (
                          <div className="mt-4">
                            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider mb-2 flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-cyan-400" /> Evidencia (fotos / videos)
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              {(openRepair.visualState.photos || []).map((p, i) => (
                                <a key={i} href={p} target="_blank" rel="noreferrer" className="block w-16 h-16 rounded-lg overflow-hidden border border-slate-800 bg-slate-900">
                                  <img src={p} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                                </a>
                              ))}
                              {(openRepair.visualState.videoEvidence || []).map((v, i) => (
                                <a
                                  key={`v${i}`}
                                  href={v.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="w-16 h-16 rounded-lg border border-cyan-500/30 bg-slate-900 flex flex-col items-center justify-center text-center text-cyan-400 hover:bg-slate-800 transition-colors"
                                >
                                  <span className="text-lg">▶️</span>
                                  <span className="text-[8px] font-mono mt-0.5">{Math.round(v.durationSec)}s</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {/* Checklist de calidad */}
                      <div>
                        <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <ClipboardCheck className="w-4 h-4 text-cyan-400" /> Checklist de revisión
                        </h3>
                        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                          <SectionTitle>⚡ Batería y rendimiento</SectionTitle>
                          <SelectField
                            label="Nivel de batería"
                            value={qcDraft.batteryLevel}
                            onChange={(v) => setQcDraft((d) => ({ ...d, batteryLevel: v as QualityChecklist["batteryLevel"] }))}
                            options={[
                              { value: "optimo", label: "Óptimo" },
                              { value: "regular", label: "Regular" },
                              { value: "bajo", label: "Bajo" },
                              { value: "no_carga", label: "No carga" }
                            ]}
                          />
                          <div className="flex items-center justify-between py-2 border-b border-slate-800/60 gap-2">
                            <span className="text-xs text-slate-300">Kilometraje</span>
                            <NumberInput value={qcDraft.mileageKm} onChange={(n) => setQcDraft((d) => ({ ...d, mileageKm: n }))} suffix="km" />
                          </div>
                          <div className="flex items-center justify-between py-2 border-b border-slate-800/60 gap-2">
                            <span className="text-xs text-slate-300 flex items-center gap-1"><Gauge className="w-3.5 h-3.5 text-cyan-400" /> Aceleración</span>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] text-slate-500 font-bold uppercase">Mín</span>
                                <NumberInput value={qcDraft.minSpeedKmh} onChange={(n) => setQcDraft((d) => ({ ...d, minSpeedKmh: n }))} suffix="km/h" />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] text-slate-500 font-bold uppercase">Máx</span>
                                <NumberInput value={qcDraft.maxSpeedKmh} onChange={(n) => setQcDraft((d) => ({ ...d, maxSpeedKmh: n }))} suffix="km/h" />
                              </div>
                            </div>
                          </div>
                          <YesNoRow
                            label="Problema de la avería resuelto"
                            value={qcDraft.faultResolved}
                            onChange={(v) => setQcDraft((d) => ({ ...d, faultResolved: v }))}
                          />
                          <SelectField
                            label="Limpieza del vehículo"
                            value={qcDraft.cleanliness}
                            onChange={(v) => setQcDraft((d) => ({ ...d, cleanliness: v as QualityChecklist["cleanliness"] }))}
                            options={[
                              { value: "excelente", label: "Excelente" },
                              { value: "buena", label: "Buena" },
                              { value: "regular", label: "Regular" },
                              { value: "pendiente", label: "Pendiente" }
                            ]}
                          />

                          <SectionTitle>🛞 Frenos y llantas</SectionTitle>
                          <CheckItemRow label="Freno delantero" value={qcDraft.frontBrake} onChange={setItem("frontBrake")} />
                          <CheckItemRow label="Freno posterior" value={qcDraft.rearBrake} onChange={setItem("rearBrake")} />
                          <CheckItemRow label="Llantas delanteras" value={qcDraft.frontTires} onChange={setItem("frontTires")} />
                          <CheckItemRow label="Llantas traseras" value={qcDraft.rearTires} onChange={setItem("rearTires")} />
                          <CheckItemRow label="Suspensión" value={qcDraft.suspension} onChange={setItem("suspension")} />

                          <SectionTitle>🔌 Ramal y sistema eléctrico</SectionTitle>
                          <CheckItemRow label="Ramal eléctrico" value={qcDraft.electricHarness} onChange={setItem("electricHarness")} />
                          <CheckItemRow label="Ramal del motor" value={qcDraft.motorHarness} onChange={setItem("motorHarness")} />
                          <CheckItemRow label="Faros delanteros" value={qcDraft.headlights} onChange={setItem("headlights")} />
                          <CheckItemRow label="Luz de freno posterior" value={qcDraft.rearLight} onChange={setItem("rearLight")} />
                          <CheckItemRow label="Bocina" value={qcDraft.horn} onChange={setItem("horn")} />
                          <CheckItemRow label="Espejos" value={qcDraft.mirrors} onChange={setItem("mirrors")} />

                          <SectionTitle>💡 Direccionales</SectionTitle>
                          <YesNoRow
                            label="¿El vehículo tiene direccionales?"
                            value={qcDraft.turnSignals}
                            onChange={(v) => setQcDraft((d) => ({ ...d, turnSignals: v }))}
                          />
                          {qcDraft.turnSignals && (
                            <>
                              <CheckItemRow label="Luces derecha" value={qcDraft.rightTurnLight} onChange={setItem("rightTurnLight")} />
                              <CheckItemRow label="Luces izquierda" value={qcDraft.leftTurnLight} onChange={setItem("leftTurnLight")} />
                            </>
                          )}

                          <SectionTitle>📝 Observaciones</SectionTitle>
                          <textarea
                            value={qcDraft.notes}
                            onChange={(e) => setQcDraft((d) => ({ ...d, notes: e.target.value }))}
                            placeholder="Detalles adicionales de la revisión (opcional)..."
                            className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-100 text-xs placeholder:text-slate-600 min-h-[70px] resize-y"
                          />
                        </div>

                        {/* Acciones */}
                        <div className="mt-4 flex flex-col sm:flex-row gap-2">
                          <button
                            type="button"
                            onClick={() => save("approved")}
                            disabled={saving}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 rounded-xl font-bold text-sm transition-all shadow-[0_4px_20px_rgba(16,185,129,0.25)] disabled:opacity-50 cursor-pointer"
                          >
                            <BadgeCheck className="w-4 h-4" />
                            Aprobar y pasar a entrega
                          </button>
                          <button
                            type="button"
                            onClick={() => save("rejected")}
                            disabled={saving}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white rounded-xl font-bold text-sm transition-all shadow-[0_4px_20px_rgba(225,29,72,0.2)] disabled:opacity-50 cursor-pointer"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Rechazar (volver a reparación)
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2 text-center">
                          {hasPendingChanges ? "Checklist listo para guardar." : "Revisa cada ítem y guarda el resultado."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Notificación de guardado */}
      {justSaved && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-500 text-slate-950 rounded-xl shadow-2xl text-sm font-bold animate-fade-in">
          <Check className="w-4 h-4" />
          Control de calidad guardado correctamente
        </div>
      )}
    </div>
  );
}
