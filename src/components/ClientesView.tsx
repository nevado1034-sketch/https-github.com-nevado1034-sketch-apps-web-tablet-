import React, { useEffect, useState } from "react";
import {
  Users,
  Search,
  Phone,
  IdCard,
  Mail,
  Printer,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  MapPin,
  Ban,
  Receipt,
  X
} from "lucide-react";
import { RepairItem, RepairStatus } from "../types";
import { generateRepairPdf } from "../utils/pdfGenerator";
import { detectDocumentType, normalizeDocument } from "../data/documentValidator";
import { BRANCHES, fmtMoney } from "../data/metrics";
import { db, isFirebaseConfigured, collection, query, where, getDocs } from "../firebase";
import { ReceiptPaper, printReceipt, openReceipt } from "./ExpressView";

interface ClientesViewProps {
  repairs: RepairItem[];
  onUpdateRepair?: (id: string, updateData: any) => Promise<void>;
  userLocalKey?: string;
  searchRequired?: boolean;
}

const STATUS_LABELS: Record<RepairStatus, string> = {
  receptioned: "Ingresado",
  diagnosing: "En Diagnóstico",
  quoted: "Presupuesto",
  paid: "Pagado",
  repairing: "En Reparación",
  testing: "En Pruebas",
  ready: "Listo para Entrega",
  delivered: "Entregado",
  cancelled: "Cancelado"
};

const STATUS_BADGES: Record<RepairStatus, string> = {
  receptioned: "bg-slate-500/10 text-slate-400 border-slate-500/25",
  diagnosing: "bg-cyan-500/10 text-cyan-400 border-cyan-500/25",
  quoted: "bg-amber-500/10 text-amber-400 border-amber-500/25",
  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
  repairing: "bg-blue-500/10 text-blue-400 border-blue-500/25",
  testing: "bg-purple-500/10 text-purple-400 border-purple-500/25",
  ready: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
  delivered: "bg-slate-500/10 text-slate-400 border-slate-500/25",
  cancelled: "bg-rose-500/10 text-rose-400 border-rose-500/30"
};

const BRANCH_LABELS: Record<string, string> = {
  lince_arenales: "San Isidro",
  surco: "Surco",
  san_borja: "San Borja",
  lince_leal: "Lince"
};

const PAGE_SIZE = 25;

function getPageNumbers(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set<number>([1, total, current - 1, current, current + 1]);
  return Array.from(set).filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
}

interface ClientGroup {
  key: string;
  name: string;
  dni: string;
  phone: string;
  email: string;
  orders: RepairItem[];
}

function clientKey(r: RepairItem): string {
  const dni = (r.client?.dni || "").trim().toLowerCase();
  const phone = (r.client?.phone || "").trim().toLowerCase();
  const name = (r.client?.name || "").trim().toLowerCase();
  return dni || phone || name || `anonimo-${r.id}`;
}

function buildGroups(repairs: RepairItem[]): ClientGroup[] {
  const map = new Map<string, ClientGroup>();
  for (const r of repairs) {
    const key = clientKey(r);
    if (!map.has(key)) {
      map.set(key, {
        key,
        name: r.client?.name || "Cliente sin nombre",
        dni: r.client?.dni || "",
        phone: r.client?.phone || "",
        email: r.client?.email || "",
        orders: []
      });
    }
    map.get(key)!.orders.push(r);
  }
  const groups = Array.from(map.values());
  for (const g of groups) {
    g.orders.sort((a, b) => new Date(b.receptionDate).getTime() - new Date(a.receptionDate).getTime());
    const latest = g.orders[0];
    if (latest) {
      g.name = latest.client?.name || g.name;
      g.dni = latest.client?.dni || g.dni;
      g.phone = latest.client?.phone || g.phone;
      g.email = latest.client?.email || g.email;
    }
  }
  groups.sort((a, b) => {
    const ta = a.orders[0]?.receptionDate || "";
    const tb = b.orders[0]?.receptionDate || "";
    return new Date(tb).getTime() - new Date(ta).getTime();
  });
  return groups;
}

export default function ClientesView({ repairs, onUpdateRepair, userLocalKey, searchRequired = false }: ClientesViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [page, setPage] = useState(1);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [historyKey, setHistoryKey] = useState<string | null>(null);
  const [cancelOrder, setCancelOrder] = useState<RepairItem | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [receiptView, setReceiptView] = useState<any | null>(null);

  // La jefa de sede solo ve y administra los archivos de su propia sede.
  const effectiveBranch = userLocalKey || selectedBranch;

  const groups = buildGroups(repairs);

  // Modo "Historial": la lista empieza vacía y solo se muestra el cliente cuyo documento completo se busca.
  const term = searchTerm.trim();
  const docTerm = searchRequired ? normalizeDocument(term) : "";
  const isQueryReady = searchRequired && !!detectDocumentType(docTerm);

  // Recibos Express del documento buscado (modo Historial): se consultan por sede.
  const [expressMatches, setExpressMatches] = useState<any[]>([]);
  const [expressLoading, setExpressLoading] = useState(false);

  useEffect(() => {
    if (!searchRequired || !isQueryReady || !isFirebaseConfigured || !db) {
      setExpressMatches([]);
      return;
    }
    let cancelled = false;
    setExpressLoading(true);
    const run = async () => {
      try {
        const variants = Array.from(new Set([docTerm, docTerm.toUpperCase(), docTerm.toLowerCase()]));
        const jobs: Promise<any[]>[] = [];
        for (const b of BRANCHES) {
          for (const v of variants) {
            jobs.push(
              getDocs(query(collection(db, "recibos_express", b, "recibos"), where("clientDni", "==", v))).then(
                (snap: any) => snap.docs.map((d: any) => ({ ...d.data(), localKey: b }))
              )
            );
          }
        }
        const results = await Promise.all(jobs);
        const seen = new Set<string>();
        const merged = results
          .flat()
          .filter((e: any) => {
            if (e.annulled) return false;
            const k = `${e.localKey || ""}|${e.correlative || ""}`;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          })
          .sort((a: any, b: any) => (Number(b.seq) || 0) - (Number(a.seq) || 0));
        if (!cancelled) setExpressMatches(merged);
      } catch {
        if (!cancelled) setExpressMatches([]);
      } finally {
        if (!cancelled) setExpressLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [searchRequired, isQueryReady, docTerm]);

  const baseFiltered = searchRequired
    ? isQueryReady
      ? groups.filter((g) => normalizeDocument(g.dni) === docTerm)
      : []
    : groups.filter((g) => {
        const t = term.toLowerCase();
        const matchesSearch =
          !t ||
          g.name.toLowerCase().includes(t) ||
          (g.dni && g.dni.includes(t)) ||
          (g.phone && g.phone.includes(t)) ||
          g.orders.some(
            (r) =>
              r.id.toLowerCase().includes(t) ||
              (r.vehicle.brand || "").toLowerCase().includes(t) ||
              (r.vehicle.model || "").toLowerCase().includes(t)
          );

        const matchesBranch =
          effectiveBranch === "all" || g.orders.some((r) => r.workshopBranch === effectiveBranch);

        return matchesSearch && matchesBranch;
      });

  // Si el cliente solo tiene recibos Express (sin OT), se sintetiza su ficha para mostrarla.
  const expressGroupKey = `express-${docTerm}`;
  const expressClientGroup: ClientGroup | null =
    searchRequired && isQueryReady && expressMatches.length > 0
      ? baseFiltered[0] || {
          key: expressGroupKey,
          name: expressMatches[0]?.clientName || "Cliente sin nombre",
          dni: expressMatches[0]?.clientDni || docTerm,
          phone: expressMatches[0]?.clientPhone || "",
          email: "",
          orders: []
        }
      : null;

  const filteredGroups = searchRequired
    ? expressClientGroup
      ? [expressClientGroup]
      : baseFiltered
    : baseFiltered;

  // En modo "Historial", al completar un documento válido se despliega automáticamente el historial.
  React.useEffect(() => {
    if (!searchRequired) {
      setExpandedKey(null);
      setHistoryKey(null);
      return;
    }
    if (isQueryReady) {
      const match = groups.find((g) => normalizeDocument(g.dni) === docTerm);
      const key = match ? match.key : expressMatches.length > 0 ? expressGroupKey : null;
      setExpandedKey(key);
      setHistoryKey(key);
    } else {
      setExpandedKey(null);
      setHistoryKey(null);
    }
  }, [searchRequired, isQueryReady, docTerm, expressMatches]);

  const totalOrders = filteredGroups.reduce((sum, g) => sum + g.orders.length, 0);
  const totalExpress = searchRequired ? expressMatches.length : 0;

  // Paginación: al cambiar búsqueda o sede volvemos a la primera página.
  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedBranch, searchRequired]);

  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / PAGE_SIZE));
  const pageIndex = Math.min(page, totalPages);
  const visibleGroups = filteredGroups.slice((pageIndex - 1) * PAGE_SIZE, pageIndex * PAGE_SIZE);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden border border-slate-850">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="relative">
          <p className="text-cyan-400 text-xs font-mono font-bold tracking-widest uppercase">Archivo de Clientes</p>
          <h1 className="font-display font-black text-2xl mt-1 tracking-tight">{searchRequired ? "Historial de Clientes" : "Clientes"}</h1>
          <p className="text-slate-300 text-sm mt-1 max-w-xl">
            {searchRequired
              ? "Pon el DNI, C.E o RUC del cliente y se mostrará todo su historial: órdenes de servicio y recibos Express."
              : "Busca a un cliente por DNI, C.E, teléfono o nombre y revisa todas sus órdenes de servicio y su ficha PDF."}
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="w-4 h-4 text-slate-500" />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(searchRequired ? e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) : e.target.value)
            }
            placeholder={searchRequired ? "Escribe el DNI, C.E o RUC del cliente..." : "Buscar por DNI, C.E, teléfono, nombre, orden o vehículo..."}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900 text-xs text-slate-200 border border-slate-800 rounded-xl focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
        {userLocalKey ? (
          <div className="w-full md:w-64">
            <div className="w-full px-3 py-2.5 bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 rounded-xl text-xs font-bold flex items-center gap-2">
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span>Sede: {BRANCH_LABELS[userLocalKey] || userLocalKey}</span>
            </div>
          </div>
        ) : (
          <div className="w-full md:w-56">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-900 text-xs text-slate-300 border border-slate-800 rounded-xl focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="all">Todas las Sedes</option>
              <option value="lince_arenales">San Isidro</option>
              <option value="surco">Surco</option>
              <option value="san_borja">San Borja</option>
              <option value="lince_leal">Lince</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-full border border-cyan-500/20 font-mono">
          {searchRequired && !isQueryReady
            ? "Esperando documento..."
            : `${filteredGroups.length} Clientes · ${totalOrders} Órdenes${totalExpress > 0 ? ` · ${totalExpress} Recibos Express` : ""}`}
        </span>
      </div>

      {searchRequired && !isQueryReady ? (
        <div className="p-8 text-center bg-slate-900 rounded-2xl border border-dashed border-slate-800 space-y-3">
          <Search className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-slate-400 font-medium text-xs">
            Escribe el DNI, C.E o RUC completo del cliente para ver su historial.
          </p>
        </div>
      ) : searchRequired && isQueryReady && expressLoading && filteredGroups.length === 0 ? (
        <div className="p-8 text-center bg-slate-900 rounded-2xl border border-dashed border-slate-800 space-y-3">
          <Search className="w-10 h-10 text-slate-600 mx-auto animate-pulse" />
          <p className="text-slate-400 font-medium text-xs">Buscando historial del cliente...</p>
        </div>
      ) : searchRequired && filteredGroups.length === 0 ? (
        <div className="p-8 text-center bg-slate-900 rounded-2xl border border-dashed border-slate-800 space-y-3">
          <Users className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-slate-400 font-medium text-xs">No se encontró ningún cliente con el documento {term}.</p>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="p-8 text-center bg-slate-900 rounded-2xl border border-dashed border-slate-800 space-y-3">
          <Users className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-slate-400 font-medium text-xs">No se encontraron clientes que coincidan con la búsqueda.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleGroups.map((g) => (
            <div key={g.key} className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setExpandedKey(expandedKey === g.key ? null : g.key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setExpandedKey(expandedKey === g.key ? null : g.key);
                  }
                }}
                className="w-full flex items-center justify-between gap-4 p-4 text-left hover:bg-slate-900/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 shrink-0 bg-cyan-500/10 border border-cyan-500/25 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-100 truncate">{g.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono truncate">
                      {g.orders.length > 0
                        ? `${g.orders.length} ${g.orders.length === 1 ? "orden" : "órdenes"} · Última: ${new Date(g.orders[0].receptionDate).toLocaleDateString("es-PE")}`
                        : `${expressMatches.length} ${expressMatches.length === 1 ? "recibo express" : "recibos express"}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  {g.orders[0] && (
                    <span className={`inline-block px-2 py-0.5 rounded-full border text-[9px] font-bold ${STATUS_BADGES[g.orders[0].status]}`}>
                      {STATUS_LABELS[g.orders[0].status]}
                    </span>
                  )}
                  {g.orders.length >= 1 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setHistoryKey(historyKey === g.key ? null : g.key); }}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${historyKey === g.key ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-slate-200"}`}
                      title="Ver historial completo de este cliente en todas las sedes"
                    >
                      <Clock className="w-3 h-3" />
                      <span className="hidden sm:inline">Historial</span>
                    </button>
                  )}
                  <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${expandedKey === g.key ? "rotate-90" : ""}`} />
                </div>
              </div>

              {expandedKey === g.key && (
                <div className="border-t border-slate-800">
                  <div className="px-4 py-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[11px] text-slate-400 bg-slate-950/50">
                    <span className="flex items-center gap-1.5">
                      <IdCard className="w-3.5 h-3.5 text-slate-500" />
                      DNI / C.E: <strong className="text-slate-200 font-mono">{g.dni || "—"}</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <strong className="text-slate-200 font-mono">{g.phone || "—"}</strong>
                    </span>
                    {g.email && (
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <strong className="text-slate-200">{g.email}</strong>
                      </span>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    {g.orders.map((r) => (
                      <div key={r.id} className="bg-slate-950 rounded-xl border border-slate-800 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs text-cyan-400">{r.id}</span>
                            <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${STATUS_BADGES[r.status]}`}>
                              {STATUS_LABELS[r.status]}
                            </span>
                            <span className="text-[10px] text-slate-500">{BRANCH_LABELS[r.workshopBranch] || r.workshopBranch}</span>
                          </div>
                          <p className="text-xs text-slate-300 font-medium">
                            {r.vehicle.type === "scooter" ? "🛴" : r.vehicle.type === "moto" ? "🏍️" : r.vehicle.type === "bicimoto" ? "🛵" : r.vehicle.type === "trimoto" ? "🛺" : r.vehicle.type === "bici" ? "🚲" : "🔋"}{" "}
                            {r.vehicle.brand} {r.vehicle.model} <span className="text-slate-500 font-mono">({r.vehicle.voltage})</span>
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {r.vehicle.reportedFailure || "Sin síntoma registrado"}
                          </p>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                          <div className="text-right space-y-0.5">
                            <p className="flex items-center gap-1.5 text-[10px] text-slate-500">
                              <Calendar className="w-3 h-3 text-slate-600" />
                              {new Date(r.receptionDate).toLocaleDateString("es-PE")}
                            </p>
                            <p className="text-[11px] font-mono font-bold text-emerald-400">
                              ${r.actualCost || r.estimatedCost || 0}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => generateRepairPdf(r)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-cyan-950/40 hover:bg-cyan-900/40 text-cyan-400 hover:text-cyan-300 rounded-xl border border-cyan-900/60 hover:border-cyan-500/50 transition-all font-bold font-mono text-xs cursor-pointer shadow-sm shadow-cyan-950/30"
                            title="Imprimir Ficha PDF de esta orden"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Ficha PDF</span>
                          </button>
                          {r.status === "ready" && onUpdateRepair && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (!confirm(`¿Confirmar entrega del vehículo ${r.vehicle.brand} ${r.vehicle.model} a ${r.client.name}?`)) return;
                                try {
                                  await onUpdateRepair(r.id, { status: "delivered", deliveredAt: new Date().toISOString() });
                                  alert("Vehículo marcado como Entregado.");
                                } catch (err) {
                                  alert("Error al entregar vehículo.");
                                }
                              }}
                              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 hover:text-emerald-300 rounded-xl border border-emerald-500/30 hover:border-emerald-400/50 transition-all font-bold text-xs cursor-pointer"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Entregado</span>
                            </button>
                          )}
                          {!searchRequired && r.status !== "delivered" && r.status !== "cancelled" && onUpdateRepair && (
                            <button
                              type="button"
                              onClick={() => { setCancelReason(""); setCancelOrder(r); }}
                              className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-xl border border-rose-500/25 hover:border-rose-400/50 transition-all font-bold text-xs cursor-pointer"
                              title="Cancelar orden y registrar el motivo"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>Cancelar</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {g.orders.length === 0 && (
                      <p className="text-[11px] text-slate-500 text-center py-2">Sin órdenes de servicio registradas.</p>
                    )}
                  </div>

                  {searchRequired && (expressLoading || expressMatches.length > 0) && (
                    <div className="border-t border-slate-800 p-4 space-y-3">
                      <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5" /> Recibos Express · {expressMatches.length}
                      </p>
                      {expressLoading && expressMatches.length === 0 ? (
                        <p className="text-[11px] text-slate-500 text-center py-2">Buscando recibos Express...</p>
                      ) : (
                        expressMatches.map((e) => (
                          <div
                            key={`${e.localKey}-${e.correlative}`}
                            className="bg-slate-950 rounded-xl border border-slate-800 p-3 flex flex-col sm:flex-row sm:items-center gap-3"
                          >
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-xs text-emerald-400">{e.correlative}</span>
                                <span className="px-2 py-0.5 rounded-full border text-[9px] font-bold bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
                                  Express
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  {BRANCH_LABELS[e.localKey] || e.localName || e.localKey || "—"}
                                </span>
                              </div>
                              <p className="text-xs text-slate-300 font-medium">
                                {(e.items || []).length} servicio{(e.items || []).length === 1 ? "" : "s"} · {e.vehicleType || "—"}
                              </p>
                              <p className="text-[10px] text-slate-500">{e.date || "Sin fecha"}</p>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                              <span className="text-[11px] font-mono font-bold text-emerald-400">{fmtMoney(Number(e.total) || 0)}</span>
                              <button
                                type="button"
                                onClick={() => setReceiptView(e)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400 hover:text-emerald-300 rounded-xl border border-emerald-900/60 hover:border-emerald-500/50 transition-all font-bold font-mono text-xs cursor-pointer"
                                title={`Ver recibo ${e.correlative}`}
                              >
                                <Receipt className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Recibo</span>
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {historyKey === g.key && (
                <div className="border-t border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Historial completo · Todas las sedes
                  </p>
                  <div className="relative ml-2 border-l-2 border-slate-800 space-y-0">
                    {g.orders
                      .slice()
                      .sort((a, b) => new Date(b.receptionDate).getTime() - new Date(a.receptionDate).getTime())
                      .map((r) => (
                        <div key={r.id} className="relative pl-5 pb-4 last:pb-0">
                          <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 ${r.status === "delivered" ? "bg-emerald-500 border-emerald-400" : r.status === "ready" ? "bg-cyan-500 border-cyan-400" : "bg-slate-700 border-slate-600"}`} />
                          <div className="flex items-start gap-3 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-mono font-bold text-xs text-cyan-400">{r.id}</span>
                                <span className={`px-1.5 py-0.5 rounded border text-[8px] font-bold ${STATUS_BADGES[r.status]}`}>
                                  {STATUS_LABELS[r.status]}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-0.5">
                                <MapPin className="w-3 h-3 text-slate-500" />
                                <span className="font-semibold">{BRANCH_LABELS[r.workshopBranch] || r.workshopBranch}</span>
                                <span className="text-slate-600">·</span>
                                <Calendar className="w-3 h-3 text-slate-600" />
                                <span>{new Date(r.receptionDate).toLocaleDateString("es-PE")}</span>
                                {r.deliveredAt && (
                                  <>
                                    <span className="text-slate-600">→</span>
                                    <span className="text-emerald-500 font-semibold">Entregado {new Date(r.deliveredAt).toLocaleDateString("es-PE")}</span>
                                  </>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500">
                                {r.vehicle.type === "scooter" ? "Scooter" : r.vehicle.type === "moto" ? "Moto" : r.vehicle.type === "bicimoto" ? "Bicimoto" : r.vehicle.type === "trimoto" ? "Trimoto" : r.vehicle.type === "bici" ? "Bici" : "Otro"}{" "}
                                {r.vehicle.brand} {r.vehicle.model}
                                {(r.actualCost || r.estimatedCost) ? (
                                  <span className="ml-2 font-mono font-bold text-emerald-400">${r.actualCost || r.estimatedCost}</span>
                                ) : null}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!searchRequired && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[11px] font-mono text-slate-500">
            Página {pageIndex} de {totalPages} · Mostrando {(pageIndex - 1) * PAGE_SIZE + 1}–{Math.min(pageIndex * PAGE_SIZE, filteredGroups.length)} de {filteredGroups.length} clientes
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={pageIndex === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 rounded-xl text-[11px] font-bold transition-colors cursor-pointer disabled:cursor-default"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Anterior
            </button>
            {getPageNumbers(pageIndex, totalPages).map((p, i, arr) => (
              <React.Fragment key={p}>
                {i > 0 && p !== arr[i - 1] + 1 && <span className="px-0.5 text-slate-600 text-xs">…</span>}
                <button
                  type="button"
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                    p === pageIndex
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-400 border border-transparent"
                  }`}
                >
                  {p}
                </button>
              </React.Fragment>
            ))}
            <button
              type="button"
              disabled={pageIndex === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 rounded-xl text-[11px] font-bold transition-colors cursor-pointer disabled:cursor-default"
            >
              Siguiente <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Cancelar orden */}
      {cancelOrder && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-rose-800/60 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">Cancelar Orden</h3>
                <p className="text-[11px] text-slate-500">
                  {cancelOrder.id} · {cancelOrder.client?.name || "Cliente"} · {BRANCH_LABELS[cancelOrder.workshopBranch] || cancelOrder.workshopBranch}
                </p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-950 rounded-xl border border-slate-800 p-3">
                {cancelOrder.vehicle.type === "scooter" ? "🛴" : cancelOrder.vehicle.type === "moto" ? "🏍️" : cancelOrder.vehicle.type === "bicimoto" ? "🛵" : cancelOrder.vehicle.type === "trimoto" ? "🛺" : cancelOrder.vehicle.type === "bici" ? "🚲" : "🔋"}{" "}
                <strong className="text-slate-200">{cancelOrder.vehicle.brand} {cancelOrder.vehicle.model}</strong>{" "}
                <span className="text-slate-600 font-mono">({cancelOrder.vehicle.voltage})</span>
                <br />
                La orden quedará registrada como <strong className="text-rose-400">Cancelada</strong> con el motivo. No se elimina ni se pierde el historial del cliente.
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Motivo de cancelación *
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  placeholder="Ej. El cliente desiste de la reparación, decisión de la dirección, etc."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:border-rose-500/60 focus:outline-none transition-colors resize-none"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setCancelOrder(null)}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Volver
              </button>
              <button
                type="button"
                disabled={!cancelReason.trim()}
                onClick={async () => {
                  if (!cancelReason.trim()) return;
                  if (!confirm(`¿Confirmar la cancelación de la orden ${cancelOrder.id}? Esta acción no se puede deshacer.`)) return;
                  try {
                    await onUpdateRepair?.(cancelOrder.id, {
                      status: "cancelled",
                      cancelReason: cancelReason.trim(),
                      cancelledAt: new Date().toISOString()
                    });
                    setCancelOrder(null);
                    alert(`Orden ${cancelOrder.id} cancelada. Motivo registrado: "${cancelReason.trim()}"`);
                  } catch (err) {
                    alert("Error al cancelar la orden.");
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-rose-600/20"
              >
                <Ban className="w-3.5 h-3.5" />
                Cancelar Orden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Ver recibo Express (mismo formato que Servicio Express) */}
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
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
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
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400 hover:text-emerald-300 rounded-xl border border-emerald-900/60 hover:border-emerald-500/50 transition-all font-bold text-xs cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5" />
                Descargar
              </button>
              <button
                type="button"
                onClick={() => printReceipt(receiptView)}
                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer"
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
