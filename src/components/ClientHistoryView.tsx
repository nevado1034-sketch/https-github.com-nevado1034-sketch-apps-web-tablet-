import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  X,
  Users,
  Phone,
  IdCard,
  Calendar,
  Printer,
  CheckCircle,
  Receipt,
  Play,
  Pause,
  Hourglass,
  Timer,
  Wrench,
  Clock,
  ChevronRight,
  Inbox
} from "lucide-react";
import { RepairItem, RepairStatus } from "../types";
import { generateRepairPdf } from "../utils/pdfGenerator";
import { BRANCHES, fmtMoney } from "../data/metrics";
import { normalizeDocument, detectDocumentType } from "../data/documentValidator";
import { db, isFirebaseConfigured, collection, query, where, getDocs } from "../firebase";
import { ReceiptPaper, printReceipt, openReceipt } from "./ExpressView";
import {
  HistoryRow,
  STATE_FILTERS,
  ServiceStateKind,
  StateFilter,
  buildHistoryRows,
  normalizePhone,
  normalizeText,
  parseSearchQuery,
  serviceState,
  serviceTimes,
  serviceTypeLabel
} from "../data/clientHistory";
import { formatWorkDuration } from "../data/technicianProduction";

interface ClientHistoryViewProps {
  repairs: RepairItem[];
  onUpdateRepair?: (id: string, updateData: any) => Promise<any>;
  userLocalKey?: string;
}

const PAGE_STEP = 10;

const BRANCH_LABELS: Record<string, string> = {
  lince_arenales: "San Isidro",
  surco: "Surco",
  san_borja: "San Borja",
  lince_leal: "Lince"
};

const STATUS_LABELS: Record<RepairStatus, string> = {
  receptioned: "Ingresado",
  diagnosing: "Diagnóstico",
  quoted: "Presupuesto",
  paid: "Pagado",
  repairing: "Mesa de trabajo",
  testing: "Control de Calidad",
  ready: "Listo para entrega",
  delivered: "Entregado",
  cancelled: "Cancelado"
};

const STATE_STYLES: Record<ServiceStateKind, { badge: string; chip: string; icon: typeof Play }> = {
  en_curso: {
    badge: "bg-emerald-500/10 text-emerald-300 border-emerald-500/35",
    chip: "bg-emerald-500 text-slate-950 border-emerald-400",
    icon: Play
  },
  en_pausa: {
    badge: "bg-amber-500/10 text-amber-300 border-amber-500/35",
    chip: "bg-amber-500 text-slate-950 border-amber-400",
    icon: Pause
  },
  esperando: {
    badge: "bg-orange-500/10 text-orange-300 border-orange-500/35",
    chip: "bg-orange-500 text-slate-950 border-orange-400",
    icon: Hourglass
  },
  finalizado: {
    badge: "bg-slate-500/10 text-slate-400 border-slate-500/30",
    chip: "bg-slate-300 text-slate-950 border-slate-200",
    icon: CheckCircle
  }
};

// Identidad del cliente dentro de la sede: documento, si no celular, si no nombre.
function clientIdentity(r: RepairItem): string {
  const doc = normalizeDocument(r.client?.dni || "").toUpperCase();
  if (doc) return `doc:${doc}`;
  const phone = normalizePhone(r.client?.phone);
  if (phone) return `tel:${phone}`;
  return `nom:${normalizeText(r.client?.name)}`;
}

function StateBadge({ kind, label }: { kind: ServiceStateKind; label: string }) {
  const style = STATE_STYLES[kind];
  const Icon = style.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wide whitespace-nowrap ${style.badge}`}>
      <Icon className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}

// Recibos Express del cliente en la sede (por documento o celular).
function useExpressReceipts(target: { field: "clientDni" | "clientPhone"; values: string[] } | null, branches: string[]) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const key = target ? `${target.field}:${target.values.join("|")}@${branches.join("|")}` : "";

  useEffect(() => {
    if (!target || !isFirebaseConfigured || !db) {
      setItems([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const jobs: Promise<any[]>[] = [];
        for (const b of branches) {
          for (const v of Array.from(new Set(target.values))) {
            jobs.push(
              getDocs(query(collection(db, "recibos_express", b, "recibos"), where(target.field, "==", v))).then(
                (snap: any) => snap.docs.map((d: any) => ({ ...d.data(), localKey: b }))
              )
            );
          }
        }
        const seen = new Set<string>();
        const merged = (await Promise.all(jobs))
          .flat()
          .filter((e: any) => {
            if (e.annulled) return false;
            const k = `${e.localKey || ""}|${e.correlative || ""}`;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          })
          .sort((a: any, b: any) => (Number(b.seq) || 0) - (Number(a.seq) || 0));
        if (!cancelled) setItems(merged);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  return { items, loading };
}

function docTarget(doc: string) {
  return { field: "clientDni" as const, values: [doc, doc.toUpperCase(), doc.toLowerCase()] };
}

function phoneTarget(phone: string) {
  return { field: "clientPhone" as const, values: [phone, `+51${phone}`, `51${phone}`, `+51 ${phone}`] };
}

function ExpressList({ items, loading, onOpen }: { items: any[]; loading: boolean; onOpen: (e: any) => void }) {
  if (!loading && items.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
        <Receipt className="w-3.5 h-3.5" /> Recibos Express · {items.length}
      </p>
      {loading && items.length === 0 ? (
        <p className="text-[11px] text-slate-500">Buscando recibos Express...</p>
      ) : (
        items.map((e) => (
          <button
            key={`${e.localKey}-${e.correlative}`}
            type="button"
            onClick={() => onOpen(e)}
            className="w-full flex items-center justify-between gap-3 bg-slate-950 rounded-xl border border-slate-800 hover:border-emerald-500/40 px-3 py-2 text-left transition-colors"
          >
            <span className="min-w-0">
              <span className="font-mono font-bold text-xs text-emerald-400">{e.correlative}</span>
              <span className="text-[10px] text-slate-500 ml-2">
                {(e.items || []).length} servicio{(e.items || []).length === 1 ? "" : "s"} · {e.date || "Sin fecha"}
              </span>
            </span>
            <span className="text-[11px] font-mono font-bold text-emerald-400 shrink-0">{fmtMoney(Number(e.total) || 0)}</span>
          </button>
        ))
      )}
    </div>
  );
}

export default function ClientHistoryView({ repairs, onUpdateRepair, userLocalKey }: ClientHistoryViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<StateFilter>("todos");
  const [limit, setLimit] = useState(PAGE_STEP);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [receiptView, setReceiptView] = useState<any | null>(null);

  // Reloj para los tiempos en vivo.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const branchLabel = userLocalKey ? BRANCH_LABELS[userLocalKey] || userLocalKey : "";
  const expressBranches: string[] = userLocalKey ? [userLocalKey] : [...BRANCHES];

  const q = useMemo(() => parseSearchQuery(searchTerm), [searchTerm]);
  const typedSomething = searchTerm.trim().length > 0;

  const result = useMemo(
    () => buildHistoryRows(repairs, { branch: userLocalKey, query: q, filter, now }),
    [repairs, userLocalKey, q, filter, now]
  );

  // Al cambiar la búsqueda o el filtro se vuelve a la lista corta.
  useEffect(() => {
    setLimit(PAGE_STEP);
    setSelectedId(null);
  }, [searchTerm, filter]);

  const visibleRows = result.rows.slice(0, limit);
  const selected = selectedId ? repairs.find((r) => r.id === selectedId) || null : null;

  // Otras órdenes del mismo cliente en esta sede.
  const clientOrders = useMemo(() => {
    if (!selected) return [];
    const id = clientIdentity(selected);
    return repairs
      .filter((r) => (!userLocalKey || r.workshopBranch === userLocalKey) && clientIdentity(r) === id)
      .sort((a, b) => new Date(b.receptionDate).getTime() - new Date(a.receptionDate).getTime());
  }, [selected, repairs, userLocalKey]);

  // Recibos Express: del cliente abierto, o del documento/celular buscado.
  const selectedDoc = selected ? normalizeDocument(selected.client?.dni || "") : "";
  const selectedPhone = selected ? normalizePhone(selected.client?.phone) : "";
  const expressTarget = selected
    ? selectedDoc && detectDocumentType(selectedDoc)
      ? docTarget(selectedDoc)
      : selectedPhone.length === 9
        ? phoneTarget(selectedPhone)
        : null
    : q.doc
      ? docTarget(q.doc)
      : q.phone
        ? phoneTarget(q.phone)
        : null;
  const express = useExpressReceipts(expressTarget, expressBranches);

  const searchLabel = q.empty
    ? ""
    : q.name
      ? `nombre "${searchTerm.trim()}"`
      : q.phone && q.doc
        ? `celular o documento ${q.phone}`
        : q.phone
          ? `celular ${q.phone}`
          : `documento ${q.doc}`;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-5">
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden border border-slate-850">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="relative">
          <p className="text-cyan-400 text-xs font-mono font-bold tracking-widest uppercase">Archivo de Clientes</p>
          <h1 className="font-display font-black text-2xl mt-1 tracking-tight">Historial de Clientes</h1>
          <p className="text-slate-300 text-sm mt-1 max-w-xl">
            Servicios de {branchLabel ? `la sede ${branchLabel}` : "tu sede"}. Filtra por estado o busca a un cliente por nombre, celular, DNI, C.E o RUC.
          </p>
        </div>
      </div>

      {/* Lupa de búsqueda única */}
      <div className="space-y-1.5">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
            <Search className="w-5 h-5 text-cyan-400" />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value.slice(0, 60))}
            placeholder="Buscar cliente: nombre, celular, DNI, C.E o RUC..."
            className="w-full pl-11 pr-10 py-3 bg-slate-900 text-sm text-slate-100 border border-slate-800 rounded-2xl focus:outline-none focus:border-cyan-500 transition-colors"
          />
          {typedSomething && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-slate-200"
              title="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-[10px] text-slate-500 pl-1">
          {typedSomething && q.empty
            ? "Escribe al menos 3 letras del nombre, los 9 dígitos del celular o el documento completo."
            : searchLabel
              ? `Buscando por ${searchLabel}${branchLabel ? ` en ${branchLabel}` : ""}.`
              : "Sin búsqueda se muestran los servicios abiertos. Busca a un cliente para ver también sus servicios finalizados."}
        </p>
      </div>

      {/* Filtro por estado */}
      <div className="flex flex-wrap gap-2">
        {STATE_FILTERS.map((f) => {
          const active = filter === f.key;
          const activeClass = f.key === "todos" ? "bg-cyan-500 text-slate-950 border-cyan-400" : STATE_STYLES[f.key as ServiceStateKind].chip;
          const disabled = f.key === "finalizado" && result.finishedHidden;
          return (
            <button
              key={f.key}
              type="button"
              disabled={disabled}
              onClick={() => setFilter(f.key)}
              title={disabled ? "Busca a un cliente para ver sus servicios finalizados" : undefined}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                active ? activeClass : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700"
              }`}
            >
              {f.label}
              {!disabled && <span className="ml-1.5 font-mono opacity-80">{result.counts[f.key]}</span>}
            </button>
          );
        })}
      </div>

      {/* Orden abierta desde "Otras órdenes del cliente" que no está en la lista actual */}
      {selected && !visibleRows.some((row) => row.repair.id === selected.id) && (
        <div className="bg-slate-900 rounded-2xl border border-cyan-500/30 overflow-hidden">
          <HistoryRowItem
            row={{ repair: selected, state: serviceState(selected), times: serviceTimes(selected, now) }}
            open
            onToggle={() => setSelectedId(null)}
          >
            <ServiceDetail
              r={selected}
              now={now}
              clientOrders={clientOrders}
              onSelectOrder={(id) => setSelectedId(id)}
              onUpdateRepair={onUpdateRepair}
              express={express}
              onOpenReceipt={setReceiptView}
            />
          </HistoryRowItem>
        </div>
      )}

      {/* Lista compacta */}
      {visibleRows.length === 0 ? (
        <div className="p-8 text-center bg-slate-900 rounded-2xl border border-dashed border-slate-800 space-y-3">
          <Inbox className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-slate-400 font-medium text-xs">
            {typedSomething && q.empty
              ? "Completa la búsqueda para ver resultados."
              : q.empty
                ? "No hay servicios en este estado."
                : `No se encontraron servicios para ${searchLabel}${branchLabel ? ` en ${branchLabel}` : ""}.`}
          </p>
          {!q.empty && selected === null && (
            <div className="max-w-md mx-auto text-left">
              <ExpressList items={express.items} loading={express.loading} onOpen={setReceiptView} />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden divide-y divide-slate-800">
          {visibleRows.map((row) => (
            <HistoryRowItem
              key={row.repair.id}
              row={row}
              open={selectedId === row.repair.id}
              onToggle={() => setSelectedId(selectedId === row.repair.id ? null : row.repair.id)}
            >
              {selected && selected.id === row.repair.id && (
                <ServiceDetail
                  r={selected}
                  now={now}
                  clientOrders={clientOrders}
                  onSelectOrder={(id) => setSelectedId(id)}
                  onUpdateRepair={onUpdateRepair}
                  express={express}
                  onOpenReceipt={setReceiptView}
                />
              )}
            </HistoryRowItem>
          ))}
        </div>
      )}

      {result.rows.length > limit && (
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => setLimit((l) => l + PAGE_STEP)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors"
          >
            Ver más
          </button>
          <span className="text-[10px] text-slate-500 font-mono">
            Mostrando {visibleRows.length} de {result.rows.length}
          </span>
        </div>
      )}

      {/* MODAL: Ver recibo Express */}
      {receiptView && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                <Receipt className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">Recibo Express</h3>
                <p className="text-[11px] text-slate-500">{receiptView.correlative}</p>
              </div>
              <button
                type="button"
                onClick={() => setReceiptView(null)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-slate-950/60 flex justify-center">
              <ReceiptPaper receipt={receiptView} />
            </div>
            <div className="p-4 border-t border-slate-800 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => openReceipt(receiptView)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400 rounded-xl border border-emerald-900/60 font-bold text-xs"
              >
                <Receipt className="w-3.5 h-3.5" />
                Descargar
              </button>
              <button
                type="button"
                onClick={() => printReceipt(receiptView)}
                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-black"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Fila compacta: OT · cliente · servicio · estado · tiempo.
function HistoryRowItem({
  row,
  open,
  onToggle,
  children
}: {
  row: HistoryRow;
  open: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  const { repair: r, state, times } = row;
  return (
    <div className={open ? "bg-slate-950/40" : ""}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-xs text-cyan-400">{r.id}</span>
            <span className="text-sm font-bold text-slate-100 truncate max-w-[220px]">{r.client?.name || "Cliente sin nombre"}</span>
            <StateBadge kind={state.kind} label={state.label} />
          </div>
          <p className="text-[11px] text-slate-500 truncate mt-0.5">
            <span className="text-cyan-300/90 font-semibold">{serviceTypeLabel(r)}</span>
            {" · "}
            {r.vehicle?.brand} {r.vehicle?.model}
            {" · "}
            {state.detail}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-mono font-black text-sm text-slate-100">
            {times.workshopMs === null ? "—" : formatWorkDuration(times.workshopMs)}
          </p>
          <p className="text-[9px] uppercase tracking-wider text-slate-500">{times.finished ? "duró" : "en taller"}</p>
        </div>
        <ChevronRight className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && children}
    </div>
  );
}

function ServiceDetail({
  r,
  now,
  clientOrders,
  onSelectOrder,
  onUpdateRepair,
  express,
  onOpenReceipt
}: {
  r: RepairItem;
  now: number;
  clientOrders: RepairItem[];
  onSelectOrder: (id: string) => void;
  onUpdateRepair?: (id: string, updateData: any) => Promise<any>;
  express: { items: any[]; loading: boolean };
  onOpenReceipt: (e: any) => void;
}) {
  const state = serviceState(r);
  const times = serviceTimes(r, now);
  const others = clientOrders.filter((o) => o.id !== r.id);

  return (
    <div className="px-4 pb-4 space-y-3">
      {/* Cliente */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-slate-400 bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2">
        <span className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-slate-500" />
          <strong className="text-slate-200">{r.client?.name || "—"}</strong>
        </span>
        <span className="flex items-center gap-1.5">
          <IdCard className="w-3.5 h-3.5 text-slate-500" />
          <strong className="text-slate-200 font-mono">{r.client?.dni || "—"}</strong>
        </span>
        <span className="flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5 text-slate-500" />
          <strong className="text-slate-200 font-mono">{r.client?.phone || "—"}</strong>
        </span>
      </div>

      {/* Servicio */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 rounded-full border text-[9px] font-bold bg-cyan-500/10 text-cyan-300 border-cyan-500/30">
            {serviceTypeLabel(r)}
            {r.serviceTypeDetail ? ` · ${r.serviceTypeDetail}` : ""}
          </span>
          <StateBadge kind={state.kind} label={state.label} />
          <span className="text-[11px] text-slate-300">{state.detail}</span>
        </div>
        <p className="text-xs text-slate-300">
          {r.vehicle?.brand} {r.vehicle?.model} <span className="text-slate-500 font-mono">({r.vehicle?.voltage})</span>
          <span className="text-slate-500"> · {r.vehicle?.reportedFailure || "Sin síntoma registrado"}</span>
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
            <p className="text-[9px] uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Timer className="w-3 h-3" /> {times.finished ? "Duró en taller" : "En taller"}
            </p>
            <p className="font-mono font-black text-sm text-slate-100">
              {times.workshopMs === null ? "—" : formatWorkDuration(times.workshopMs)}
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
            <p className="text-[9px] uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Wrench className="w-3 h-3" /> Trabajo del técnico
            </p>
            <p className={`font-mono font-black text-sm ${times.technicianHasTime ? "text-slate-100" : "text-amber-400 text-xs"}`}>
              {times.technicianHasTime ? formatWorkDuration(times.technicianMs) : "Sin tiempo registrado"}
            </p>
          </div>
          {times.stageMs !== null && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
              <p className="text-[9px] uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3" /> En {STATUS_LABELS[r.status]}
              </p>
              <p className="font-mono font-black text-sm text-slate-100">{formatWorkDuration(times.stageMs)}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
          <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <Calendar className="w-3 h-3" />
            Ingresó {new Date(r.receptionDate).toLocaleDateString("es-PE")}
            {r.deliveredAt && <> · Entregado {new Date(r.deliveredAt).toLocaleDateString("es-PE")}</>}
            {(r.actualCost || r.estimatedCost) ? (
              <span className="ml-1 font-mono font-bold text-emerald-400">{fmtMoney(r.actualCost || r.estimatedCost || 0)}</span>
            ) : null}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => generateRepairPdf(r)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950/40 hover:bg-cyan-900/40 text-cyan-400 rounded-lg border border-cyan-900/60 font-bold text-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Ficha PDF
            </button>
            {r.status === "ready" && onUpdateRepair && (
              <button
                type="button"
                onClick={async () => {
                  if (!confirm(`¿Confirmar entrega del vehículo ${r.vehicle.brand} ${r.vehicle.model} a ${r.client.name}?`)) return;
                  const ok = await onUpdateRepair(r.id, { status: "delivered", deliveredAt: new Date().toISOString() });
                  if (ok !== false) alert("Vehículo marcado como Entregado.");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 rounded-lg border border-emerald-500/30 font-bold text-xs"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Entregado
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Otras órdenes del cliente en la sede */}
      {others.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Otras órdenes del cliente · {others.length}
          </p>
          {others.map((o) => {
            const st = serviceState(o);
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => onSelectOrder(o.id)}
                className="w-full flex items-center justify-between gap-3 bg-slate-950 rounded-xl border border-slate-800 hover:border-cyan-500/40 px-3 py-2 text-left transition-colors"
              >
                <span className="min-w-0 truncate text-[11px] text-slate-400">
                  <span className="font-mono font-bold text-cyan-400 mr-2">{o.id}</span>
                  {serviceTypeLabel(o)} · {new Date(o.receptionDate).toLocaleDateString("es-PE")}
                </span>
                <StateBadge kind={st.kind} label={st.label} />
              </button>
            );
          })}
        </div>
      )}

      <ExpressList items={express.items} loading={express.loading} onOpen={onOpenReceipt} />
    </div>
  );
}
