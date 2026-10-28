import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  LayoutDashboard, Users, Wrench, CircleDollarSign, GraduationCap,
  Printer, FileSpreadsheet, Search, CalendarRange, Building2,
  ChevronRight, TrendingUp, Receipt, Clock, CheckCircle2, Zap,
  Activity, AlertCircle, Timer, Target, Save, Hourglass,
  FileText, X, History, ChevronLeft
} from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import { RepairItem } from "../types";
import { db, isFirebaseConfigured, collection, query as fbQuery, where, orderBy as fbOrderBy, limit as fbLimit, startAfter, getDocs, getCountFromServer } from "../firebase";
import { loadConfig } from "../auth";
import { buildBranchAdvisorStats, buildTechnicianStats, isActiveOrder, paymentMethodOf, UNREGISTERED_METHOD } from "../data/adminMetrics";
import type { BranchAdvisorStat, TechnicianStat } from "../data/adminMetrics";
import type { MonthBucket } from "../data/metrics";

// Recharts solo se descarga al abrir el panel del admin (no pesa en las tablets).
const RevenueTrendChart = React.lazy(() => import("./RevenueTrendChart"));
const DonutChart = React.lazy(() => import("./DonutChart"));

const SERVICE_HEX: Record<string, string> = {
  mantenimiento: "#34d399",
  diagnostico: "#22d3ee",
  garantia: "#a78bfa",
  cambio: "#fbbf24",
  express: "#fb7185"
};
import { generateRepairPdf } from "../utils/pdfGenerator";
import { openReceipt } from "./ExpressView";
import {
  BRANCH_LABELS, BRANCHES, BRANCH_HEX, fmtMoney, fmtDuration,
  currentLiveStage, LIVE_STAGE_ORDER, STAGE_LABELS,
  STAGE_KEYS, median, stageTimings, esperaDurationMs, trafficColor,
  inReceptionPeriod, monthlyTrend, Goals, loadGoals, saveGoals
} from "../data/metrics";

type ReporteView = "dashboard" | "clientes" | "servicios" | "finanzas" | "tecnicos" | "bitacora";
type RangePreset = "hoy" | "7d" | "30d" | "todo" | "custom";

const SERVICE_LABELS: Record<string, string> = {
  mantenimiento: "Mantenimiento",
  diagnostico: "Diagnóstico",
  garantia: "Garantía",
  cambio: "Cambio / Repuesto",
  express: "Servicio Express"
};

const PRESETS: Array<{ key: RangePreset; label: string }> = [
  { key: "hoy", label: "Hoy" },
  { key: "7d", label: "Semana" },
  { key: "30d", label: "Mes" },
  { key: "todo", label: "Todo" }
];

const NAV: Array<{ key: ReporteView; label: string; desc: string; icon: React.ElementType }> = [
  { key: "dashboard", label: "Dashboard", desc: "Resumen general", icon: LayoutDashboard },
  { key: "clientes", label: "Lista de Clientes", desc: "Clientes registrados", icon: Users },
  { key: "servicios", label: "Tipos de Servicio", desc: "Conteo por servicio", icon: Wrench },
  { key: "finanzas", label: "Finanzas", desc: "Ingresos y recibos", icon: CircleDollarSign },
  { key: "tecnicos", label: "Personal", desc: "Técnicos y asesoras", icon: GraduationCap },
  { key: "bitacora", label: "Bitácora de Cambios", desc: "Ediciones de recepción por asesora", icon: History }
];

const BAR_COLOR: Record<string, string> = {
  cyan: "bg-cyan-500", rose: "bg-rose-500", purple: "bg-purple-500", amber: "bg-amber-500",
  emerald: "bg-emerald-500", blue: "bg-blue-500", pink: "bg-pink-500", teal: "bg-teal-500"
};

const PROCCESS_STAGES: Array<{ key: string; label: string; icon: React.ElementType; color: string }> = [
  { key: "receptioned", label: "Recepción", icon: Clock, color: "cyan" },
  { key: "espera", label: "En Espera", icon: Hourglass, color: "rose" },
  { key: "diagnosing", label: "Diagnóstico", icon: Wrench, color: "purple" },
  { key: "quoted", label: "Presupuesto", icon: CircleDollarSign, color: "amber" },
  { key: "paid", label: "Pagado", icon: Receipt, color: "emerald" },
  { key: "repairing", label: "Reparación", icon: Wrench, color: "blue" },
  { key: "testing", label: "Control Calidad", icon: CheckCircle2, color: "pink" },
  { key: "ready", label: "Listo / Entrega", icon: CheckCircle2, color: "teal" }
];

const TRAFFIC_STYLES: Record<string, { chip: string; dot: string; label: string }> = {
  emerald: { chip: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400", dot: "bg-emerald-400", label: "Dentro de meta" },
  amber: { chip: "bg-amber-500/15 border-amber-500/30 text-amber-400", dot: "bg-amber-400", label: "Por encima de meta" },
  rose: { chip: "bg-rose-500/15 border-rose-500/30 text-rose-400", dot: "bg-rose-400", label: "Crítico" }
};

const COLOR_SETS: Record<string, { chip: string; bar: string }> = {
  cyan: { chip: "bg-cyan-500/10 border-cyan-500/25 text-cyan-400", bar: "bg-cyan-500" },
  purple: { chip: "bg-purple-500/10 border-purple-500/25 text-purple-400", bar: "bg-purple-500" },
  amber: { chip: "bg-amber-500/10 border-amber-500/25 text-amber-400", bar: "bg-amber-500" },
  emerald: { chip: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400", bar: "bg-emerald-500" },
  blue: { chip: "bg-blue-500/10 border-blue-500/25 text-blue-400", bar: "bg-blue-500" },
  pink: { chip: "bg-pink-500/10 border-pink-500/25 text-pink-400", bar: "bg-pink-500" },
  teal: { chip: "bg-teal-500/10 border-teal-500/25 text-teal-400", bar: "bg-teal-500" },
  rose: { chip: "bg-rose-500/10 border-rose-500/25 text-rose-400", bar: "bg-rose-500" }
};

function rangeOf(preset: RangePreset, customFrom: string, customTo: string): { from: number; to: number } {
  const now = Date.now();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const DAY = 86400000;
  switch (preset) {
    case "hoy": return { from: startOfDay.getTime(), to: now };
    case "7d": return { from: startOfDay.getTime() - 6 * DAY, to: now };
    case "30d": return { from: startOfDay.getTime() - 29 * DAY, to: now };
    case "custom": {
      const f = customFrom ? new Date(customFrom + "T00:00:00").getTime() : 0;
      const t = customTo ? new Date(customTo + "T23:59:59").getTime() : now;
      return { from: f, to: t };
    }
    default: return { from: 0, to: now };
  }
}

function inRange(ts: number, range: { from: number; to: number }): boolean {
  if (!isFinite(ts) || ts <= 0) return false;
  if (range.from > 0 && ts < range.from) return false;
  if (range.to > 0 && ts > range.to) return false;
  return true;
}

function tsOf(v: string | undefined): number {
  if (!v) return NaN;
  const t = new Date(v).getTime();
  return isFinite(t) ? t : NaN;
}

function clientTs(c: any): number {
  const v = c?.createdAt;
  if (v == null) return NaN;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const t = new Date(v).getTime();
    return isFinite(t) ? t : NaN;
  }
  if (typeof v.toDate === "function") { try { return v.toDate().getTime(); } catch { /* noop */ } }
  if (typeof v.seconds === "number" && isFinite(v.seconds)) return v.seconds * 1000;
  return NaN;
}

function fmtFecha(ts: number): string {
  if (!isFinite(ts) || ts <= 0) return "—";
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function fmtFechaHora(ts: number): string {
  if (!isFinite(ts) || ts <= 0) return "—";
  const d = new Date(ts);
  return `${fmtFecha(ts)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const CLIENTES_PAGE_SIZE = 50;

function getClientesPageNumbers(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set<number>([1, total, current - 1, current, current + 1]);
  return Array.from(set).filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
}

function expressTs(e: any): number {
  if (!e) return NaN;
  const v = e.createdAt;
  if (v && typeof v?.toDate === "function") return v.toDate().getTime();
  if (typeof v === "string" || typeof v === "number") {
    const t = new Date(v as any).getTime();
    if (isFinite(t)) return t;
  }
  if (e.date) {
    const m = String(e.date).match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (m) {
      const year = Number(m[3]);
      const d = new Date(year >= 100 ? year : Number("20" + m[3]), Number(m[2]) - 1, Number(m[1]));
      if (isFinite(d.getTime())) return d.getTime();
    }
  }
  return NaN;
}

// ─────────────────────── HELPERS DE EXPORTACIÓN ─────────────────────────────
function exportExcel(rows: unknown[][], name: string) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Reporte");
  XLSX.writeFile(wb, `${name}.xlsx`);
}

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MESES_GRID = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DIAS_SEM = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

function CalendarPicker({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => {
    const v = value ? new Date(value + "T00:00:00") : new Date();
    return isNaN(v.getTime()) ? new Date().getFullYear() : v.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const v = value ? new Date(value + "T00:00:00") : new Date();
    return isNaN(v.getTime()) ? new Date().getMonth() : v.getMonth();
  });
  const [mode, setMode] = useState<"days" | "months" | "years">("days");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = value ? new Date(value + "T00:00:00") : null;
  const today = new Date();

  const firstDow = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const fmt = (d: Date) => {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  };

  const pick = (d: Date) => {
    onChange(fmt(d));
    setOpen(false);
    setMode("days");
  };

  const years = useMemo(() => {
    const y = viewYear;
    const start = Math.floor(y / 20) * 20;
    return Array.from({ length: 20 }, (_, i) => start + i);
  }, [viewYear]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setMode("days"); setViewYear(selected ? selected.getFullYear() : today.getFullYear()); setViewMonth(selected ? selected.getMonth() : today.getMonth()); }}
        className={`px-2.5 py-1.5 bg-slate-950 text-slate-200 text-xs border rounded-lg focus:outline-none focus:border-cyan-500/50 transition-all font-mono min-w-[6.5rem] ${
          open ? "border-cyan-500/60" : "border-slate-800 hover:border-slate-600"
        }`}
        title="Elegir fecha"
      >
        {selected ? `${String(selected.getDate()).padStart(2, "0")}/${String(selected.getMonth() + 1).padStart(2, "0")}/${selected.getFullYear()}` : placeholder || "dd/mm/aaaa"}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 z-50 w-72 bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl p-3 pointer-events-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => mode === "days" ? setViewMonth((m) => (m === 0 ? (setViewYear((y) => y - 1), 11) : m - 1)) : mode === "months" ? setViewYear((y) => y - 1) : setViewYear((y) => y - 10)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
              title={mode === "days" ? "Mes anterior" : mode === "months" ? "Año anterior" : "Década anterior"}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setMode(mode === "days" ? "months" : mode === "months" ? "years" : "days")}
              className="px-2 py-1 rounded-lg hover:bg-slate-800 text-slate-100 text-sm font-bold uppercase tracking-wide transition-colors cursor-pointer"
            >
              {mode === "days" && `${MESES[viewMonth]} ${viewYear}`}
              {mode === "months" && `${viewYear}`}
              {mode === "years" && `${years[0]} – ${years[years.length - 1]}`}
            </button>
            <button
              type="button"
              onClick={() => mode === "days" ? setViewMonth((m) => (m === 11 ? (setViewYear((y) => y + 1), 0) : m + 1)) : mode === "months" ? setViewYear((y) => y + 1) : setViewYear((y) => y + 10)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
              title={mode === "days" ? "Mes siguiente" : mode === "months" ? "Año siguiente" : "Década siguiente"}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {mode === "days" && (
            <>
              {/* Weekday header */}
              <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-500 uppercase mb-1">
                {DIAS_SEM.map((d) => <span key={d} className="py-1">{d}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: firstDow }).map((_, i) => <span key={`e${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const d = i + 1;
                  const date = new Date(viewYear, viewMonth, d);
                  const isSel = selected && selected.getFullYear() === viewYear && selected.getMonth() === viewMonth && selected.getDate() === d;
                  const isToday = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => pick(date)}
                      className={`h-8 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                        isSel
                          ? "bg-cyan-500 text-slate-950 font-black shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                          : isToday
                          ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                          : "text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => pick(new Date())}
                  className="px-2 py-1 text-[10px] font-bold text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Hoy
                </button>
                {selected && (
                  <button
                    type="button"
                    onClick={() => { onChange(""); setOpen(false); }}
                    className="px-2 py-1 text-[10px] font-bold text-slate-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </>
          )}

          {mode === "months" && (
            <div className="grid grid-cols-3 gap-1.5">
              {MESES_GRID.map((m, i) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setViewMonth(i); setMode("days"); }}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selected && selected.getFullYear() === viewYear && selected.getMonth() === i
                      ? "bg-cyan-500 text-slate-950 font-black"
                      : i === viewMonth
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          )}

          {mode === "years" && (
            <div className="grid grid-cols-5 gap-1.5">
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => { if (y !== viewYear) setViewYear(y); setMode("months"); }}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selected && selected.getFullYear() === y
                      ? "bg-cyan-500 text-slate-950 font-black"
                      : y === today.getFullYear()
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────── COMPONENTE PRINCIPAL ───────────────────────────────
interface AdminReportesProps {
  repairs: RepairItem[];
  expressReceipts: any[];
}

export default function AdminReportes({ repairs, expressReceipts }: AdminReportesProps) {
  const [view, setView] = useState<ReporteView>("dashboard");
  const [preset, setPreset] = useState<RangePreset>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [sede, setSede] = useState<string>("__all__");
  const [q, setQ] = useState("");
  const [clientesTotal, setClientesTotal] = useState(0);
  const [clientesPages, setClientesPages] = useState<Record<number, any[]>>({});
  const [clientesCursors, setClientesCursors] = useState<Record<number, any>>({});
  const [clientesPage, setClientesPage] = useState(1);
  const [clientesLoading, setClientesLoading] = useState(false);
  const [clientesOk, setClientesOk] = useState(false);
  const [clientesSearch, setClientesSearch] = useState<null | { term: string; results: any[]; fromServer: boolean }>(null);
  const [clientesExporting, setClientesExporting] = useState(false);
  const [clientesAll, setClientesAll] = useState<any[] | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [editingGoals, setEditingGoals] = useState(false);
  const [draftGoals, setDraftGoals] = useState<Goals>(() => loadGoals());
  const [goals, setGoals] = useState<Goals>(() => loadGoals());

  const fetchClientesSnapshot = async (upToPage: number, filt: { from: number; to: number } | null): Promise<void> => {
    const want = Math.max(1, upToPage);
    const cursors = { ...clientesCursors };
    for (let p = 1; p <= want; p++) {
      if (clientesPages[p]) continue;
      const conds: any[] = filt
        ? [where("createdAt", ">=", filt.from), where("createdAt", "<=", filt.to)]
        : [];
      const q = fbQuery(
        collection(db, "clientes"),
        ...conds,
        filt ? fbOrderBy("createdAt", "desc") : fbOrderBy("internalId", "asc"),
        fbLimit(CLIENTES_PAGE_SIZE),
        ...(p > 1 && cursors[p - 1] ? [startAfter(cursors[p - 1])] : [])
      );
      const snap = await getDocs(q);
      const data = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }))
        .filter((c) => c.archived !== true && !c.mergedInto)
        .sort((a, b) => filt ? (clientTs(b) - clientTs(a)) : (Number(a.internalId?.replace(/\D/g, "")) || 0) - (Number(b.internalId?.replace(/\D/g, "")) || 0));
      setClientesPages((prev) => ({ ...prev, [p]: data }));
      const last = snap.docs[snap.docs.length - 1];
      cursors[p] = last || cursors[p - 1];
      setClientesCursors((prev) => ({ ...prev, [p]: last || prev[p - 1] }));
    }
  };

  const loadClientesPage = async (target: number) => {
    if (!isFirebaseConfigured || !db) return;
    if (preset !== "todo") {
      setClientesPage(Math.max(1, target));
      setClientesOk(true);
      return;
    }
    setClientesLoading(true);
    try {
      await fetchClientesSnapshot(target, null);
      setClientesPage(target);
      setClientesOk(true);
    } catch {
      setClientesOk(false);
    } finally {
      setClientesLoading(false);
    }
  };

  const searchClientes = async (term: string) => {
    const ql = term.trim().toLowerCase();
    if (!ql) {
      setClientesSearch(null);
      if (preset === "todo") {
        setClientesLoading(true);
        try { await fetchClientesSnapshot(1, null); } finally { setClientesLoading(false); }
      }
      setClientesPage(1);
      return;
    }
    if (preset !== "todo") {
      const list = clientesPeriodo || [];
      const results = list
        .filter((c) =>
          String(c.name || "").toLowerCase().includes(ql) ||
          String(c.dni || "").toLowerCase().includes(ql) ||
          String(c.phone || "").toLowerCase().includes(ql) ||
          String(c.id || "").toLowerCase().includes(ql)
        )
        .slice(0, 200);
      setClientesSearch({ term: ql, results, fromServer: false });
      return;
    }
    setClientesLoading(true);
    try {
      const LIM = 40;
      const fields = ["internalId", "name", "dni", "phone"];
      const prefixes: any[] = [];
      for (const field of fields) {
        try {
          const lo = ql;
          const hi = ql + "\uf8ff";
          const qry = fbQuery(
            collection(db, "clientes"),
            where(field, ">=", lo),
            where(field, "<=", hi),
            fbLimit(LIM)
          );
          const snap = await getDocs(qry);
          prefixes.push(...snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        } catch { /* consulta sin índice compuesto: se ignora */ }
      }
      const seen = new Map<string, any>();
      prefixes.forEach((c) => { if (c.archived !== true && !c.mergedInto) seen.set(c.id || c.internalId || JSON.stringify(c), c); });
      const results = Array.from(seen.values())
        .filter((c) =>
          String(c.name || "").toLowerCase().includes(ql) ||
          String(c.dni || "").toLowerCase().includes(ql) ||
          String(c.phone || "").toLowerCase().includes(ql) ||
          String(c.internalId || "").toLowerCase().includes(ql)
        )
        .sort((a, b) => String(a.internalId || "").localeCompare(String(b.internalId || ""), "en", { numeric: true }))
        .slice(0, 200);
      setClientesSearch({ term: ql, results, fromServer: results.length > 0 });
    } catch {
      setClientesSearch({ term: ql, results: [], fromServer: true });
    } finally {
      setClientesLoading(false);
    }
  };

  const loadAllClientesForExport = async (filt: { from: number; to: number } | null): Promise<any[]> => {
    if (preset !== "todo") return (clientesPeriodo || []).slice();
    if (!isFirebaseConfigured || !db) return [];
    setClientesExporting(true);
    try {
      const out: any[] = [];
      let cursor: any = null;
      let guard = 0;
      while (guard++ < 200) {
        const q = fbQuery(
          collection(db, "clientes"),
          fbOrderBy("internalId", "asc"),
          fbLimit(CLIENTES_PAGE_SIZE),
          ...(cursor ? [startAfter(cursor)] : [])
        );
        const snap = await getDocs(q);
        if (snap.empty) break;
        out.push(...snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })).filter((c) => c.archived !== true && !c.mergedInto));
        cursor = snap.docs[snap.docs.length - 1];
        if (snap.docs.length < CLIENTES_PAGE_SIZE) break;
      }
      return out.sort((a, b) => (Number(a.internalId?.replace(/\D/g, "")) || 0) - (Number(b.internalId?.replace(/\D/g, "")) || 0));
    } finally {
      setClientesExporting(false);
    }
  };

  const range = useMemo(() => rangeOf(preset, customFrom, customTo), [preset, customFrom, customTo]);

  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
      if (!editingGoals) { setGoals(loadGoals()); setDraftGoals(loadGoals()); }
    }, 30000);
    return () => clearInterval(id);
  }, [editingGoals]);

  useEffect(() => {
    if (!isFirebaseConfigured || !db) return;
    let mounted = true;
    const init = async () => {
      try {
        setClientesPages({});
        setClientesCursors({});
        setClientesPage(1);
        setClientesSearch(null);
        setClientesAll(null);
        if (preset === "todo") {
          const countQ = fbQuery(collection(db, "clientes"));
          const countSnap = await getCountFromServer(countQ);
          if (mounted) setClientesTotal(countSnap.data().count);
          await loadClientesPage(1);
        }
        if (mounted) setClientesOk(true);
      } catch {
        if (mounted) { setClientesOk(false); setClientesTotal(0); }
      }
    };
    init();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, customFrom, customTo, range.from, range.to]);

  // ── DATOS SEGÚN SEDE ──
  const scopedRepairs = useMemo(
    () => repairs.filter((r) => sede === "__all__" || r.workshopBranch === sede),
    [repairs, sede]
  );
  // Los recibos Express anulados no cuentan como ingreso ni como servicio.
  const scopedExpress = useMemo(
    () => expressReceipts.filter((e) => e.annulled !== true && (sede === "__all__" || e.localKey === sede)),
    [expressReceipts, sede]
  );

  // Clientes con actividad en el período (derivados de OTs y recibos Express),
  // usados cuando el filtro NO es "Todo" (Hoy / 7d / 30d / personalizado).
  const clientesPeriodo = useMemo(() => {
    if (preset === "todo") return null;
    const map = new Map<string, any>();
    const add = (c: any, ts: number) => {
      if (c.archived === true || c.mergedInto) return;
      const key = String(c.dni || "").trim() || String(c.phone || "").trim() || c.id || "";
      if (!key) return;
      const prev = map.get(key);
      if (!prev || ts > prev._ts) {
        map.set(key, { ...c, _ts: ts });
      }
    };
    scopedRepairs.forEach((r) => {
      const t = tsOf(r.receptionDate);
      if (!inRange(t, range)) return;
      add({
        id: r.id,
        internalId: r.client?.internalId || "",
        name: r.client?.name || "",
        dni: r.client?.dni || "",
        phone: r.client?.phone || "",
        email: r.client?.email || "",
        vehicleType: r.vehicle?.type || "",
        vehicleBrand: r.vehicle?.brand || "",
        vehicleModel: r.vehicle?.model || "",
        updatedAt: r.receptionDate
      }, t);
    });
    scopedExpress.forEach((e) => {
      const t = expressTs(e);
      if (!inRange(t, range)) return;
      add({
        id: e.correlative || "",
        internalId: e.clientInternalId || "",
        name: e.clientName || "",
        dni: e.clientDni || "",
        phone: e.clientPhone || "",
        email: "",
        vehicleType: e.vehicleType || "",
        vehicleBrand: "",
        vehicleModel: "",
        updatedAt: t
      }, t);
    });
    return Array.from(map.values())
      .sort((a, b) => (b._ts || 0) - (a._ts || 0))
      .map(({ _ts, ...rest }) => rest);
     
  }, [preset, range, scopedRepairs, scopedExpress]);

  // Órdenes activas con su etapa en vivo
  const liveRows = useMemo(() => {
    const out: any[] = [];
    scopedRepairs.forEach((r) => {
      if (!isActiveOrder(r)) return;
      const live = currentLiveStage(r, now);
      if (!live) return;
      const goalMs = goals[live.stage] || 0;
      const over = goalMs > 0 && live.elapsedMs > goalMs;
      const level = !over ? "ok" : live.elapsedMs > goalMs * 2 ? "critical" : "warn";
      out.push({ repair: r, stage: live.stage, elapsedMs: live.elapsedMs, goalMs, over, level, overMs: Math.max(0, live.elapsedMs - goalMs) });
    });
    return out;
  }, [scopedRepairs, now, goals]);

  const alerts = useMemo(
    () => liveRows.filter((r) => r.over).sort((a, b) => b.overMs - a.overMs),
    [liveRows]
  );

  const byStage = useMemo(() => {
    const map: Record<string, any[]> = {};
    LIVE_STAGE_ORDER.forEach((k) => { map[k] = []; });
    liveRows.forEach((r) => { if (!map[r.stage]) map[r.stage] = []; map[r.stage].push(r); });
    return map;
  }, [liveRows]);

  const operacionStats = useMemo(() => {
    const activas = scopedRepairs.filter(isActiveOrder).length;
    const enEspera = byStage["espera"]?.length || 0;
    const enTrabajo = (byStage["repairing"]?.length || 0) + (byStage["testing"]?.length || 0) + (byStage["diagnosing"]?.length || 0) + (byStage["quoted"]?.length || 0) + (byStage["paid"]?.length || 0);
    const listos = byStage["ready"]?.length || 0;
    return { activas, enEspera, enTrabajo, listos, alertas: alerts.length };
  }, [scopedRepairs, byStage, alerts]);

  const clientesFiltered = useMemo(() => {
    if (clientesSearch) return clientesSearch.results;
    if (preset !== "todo") {
      const list = clientesPeriodo || [];
      const start = (clientesPage - 1) * CLIENTES_PAGE_SIZE;
      return list.slice(start, start + CLIENTES_PAGE_SIZE);
    }
    const page = clientesPages[clientesPage] || [];
    return page.slice().sort((a, b) => {
      const ia = String(a.internalId || ""); const ib = String(b.internalId || "");
      return ia.localeCompare(ib, "en", { numeric: true });
    });
     
  }, [clientesSearch, clientesPeriodo, clientesPages, clientesPage, preset]);

  const clientesFilteredTotal = preset !== "todo" ? (clientesPeriodo || []).length : clientesTotal;

  // ── BITÁCORA DE CAMBIOS (ediciones de recepción por asesora)
  const bitacora = useMemo(() => {
    const out: any[] = [];
    scopedRepairs.forEach((r) => {
      (r.historyLog || []).forEach((log: any) => {
        if (log.category !== "reception_edit") return;
        const t = log.date ? new Date(log.date).getTime() : 0;
        if (!inRange(t, range)) return;
        out.push({
          date: t,
          user: log.user || "—",
          orderId: r.id,
          status: log.status || r.status,
          branch: r.workshopBranch,
          clientName: r.client?.name || "—",
          details: log.details || log.description || "—"
        });
      });
    });
    return out.sort((a, b) => b.date - a.date);
  }, [scopedRepairs, range]);

  const bitacoraRows = useMemo(
    () => bitacora.map((b) => [fmtFechaHora(b.date), b.user, b.orderId, b.clientName, BRANCH_LABELS[b.branch] || b.branch || "—", b.details]),
    [bitacora]
  );

  // ── SERVICIOS (por fecha)
  const servicesSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    let total = 0;
    scopedRepairs.forEach((r) => {
      const t = tsOf(r.deliveredAt || r.receptionDate);
      if (!inRange(t, range)) return;
      const key = r.serviceType || "otro";
      counts[key] = (counts[key] || 0) + 1;
      total++;
    });
    scopedExpress.forEach((e) => {
      const t = expressTs(e);
      if (!inRange(t, range)) return;
      counts["express"] = (counts["express"] || 0) + 1;
      total++;
    });
    return { counts, total };
  }, [scopedRepairs, scopedExpress, range]);

  const serviciosRows = useMemo(() => {
    const out: any[] = [];
    out.push(["Mantenimiento", BRANCHES.map((b) => 0), 0]);
    out.push(["Diagnóstico", BRANCHES.map((b) => 0), 0]);
    out.push(["Garantía", BRANCHES.map((b) => 0), 0]);
    out.push(["Cambio / Repuesto", BRANCHES.map((b) => 0), 0]);
    out.push(["Servicio Express", BRANCHES.map((b) => 0), 0]);
    scopedRepairs.forEach((r) => {
      const t = tsOf(r.deliveredAt || r.receptionDate);
      if (!inRange(t, range)) return;
      const key = r.serviceType || "otro";
      const idx = key === "mantenimiento" ? 0 : key === "diagnostico" ? 1 : key === "garantia" ? 2 : key === "cambio" ? 3 : 4;
      const row = out[idx];
      if (!row) return;
      const j = BRANCHES.indexOf(r.workshopBranch);
      if (j >= 0) row[1][j]++;
      row[2]++;
    });
    scopedExpress.forEach((e) => {
      const t = expressTs(e);
      if (!inRange(t, range)) return;
      const row = out[4];
      const j = BRANCHES.indexOf(e.localKey);
      if (j >= 0) row[1][j]++;
      row[2]++;
    });
    return out;
  }, [scopedRepairs, scopedExpress, range]);

  // ── TÉCNICOS ──
  // Horas = tiempo NETO del cronómetro del técnico; sede según la configuración de accesos.
  const tecnicos = useMemo(
    () =>
      buildTechnicianStats(
        scopedRepairs,
        scopedExpress.map((e) => ({ technicianName: e.technicianName, localKey: e.localKey, ts: expressTs(e) })),
        { range, config: loadConfig(), orderTs: (r) => tsOf(r.deliveredAt || r.receptionDate) }
      ),
    [scopedRepairs, scopedExpress, range]
  );

  // ── ASESORAS (por sede) ──
  const asesoras = useMemo(
    () =>
      buildBranchAdvisorStats(
        scopedRepairs,
        scopedExpress.map((e) => ({ localKey: e.localKey, ts: expressTs(e), total: Number(e.total || 0) })),
        { branches: sede === "__all__" ? BRANCHES : [sede], range }
      ),
    [scopedRepairs, scopedExpress, range, sede]
  );

  // ── FINANZAS ──
  const finanzas = useMemo(() => {
    const otRows = scopedRepairs
      .filter((r) => r.status === "delivered")
      .map((r) => {
        const t = tsOf(r.deliveredAt || r.receptionDate);
        return {
          fecha: t, tipo: r.serviceType, cliente: r.client?.name || "", id: r.id,
          sede: r.workshopBranch, metodo: paymentMethodOf(r.payment?.paymentMethod), monto: r.actualCost || r.estimatedCost || 0, origen: "OT"
        };
      })
      .filter((x) => inRange(x.fecha, range));
    const exRows = scopedExpress
      .map((e) => ({
        fecha: expressTs(e), tipo: "express", cliente: e.clientName || "",
        id: e.correlative || e.id || "", sede: e.localKey, metodo: paymentMethodOf(e.paymentMethod),
        monto: Number(e.total || 0), origen: "Express"
      }))
      .filter((x) => inRange(x.fecha, range));
    const all = [...otRows, ...exRows].sort((a, b) => b.fecha - a.fecha);
    const total = all.reduce((s, r) => s + r.monto, 0);
    const totalOT = otRows.reduce((s, r) => s + r.monto, 0);
    const totalEx = exRows.reduce((s, r) => s + r.monto, 0);
    return { all, total, totalOT, totalEx, count: all.length };
  }, [scopedRepairs, scopedExpress, range]);

  const finanzasByMethod = useMemo(() => {
    const map: Record<string, number> = {};
    finanzas.all.forEach((r: any) => { const m = paymentMethodOf(r.metodo); map[m] = (map[m] || 0) + r.monto; });
    const order: Record<string, number> = { efectivo: 0, transferencia: 1, yape_plin: 2, tarjeta: 3, [UNREGISTERED_METHOD]: 98 };
    return Object.entries(map)
      .map(([m, v]) => [m, v] as [string, number])
      .sort((a, b) => (order[a[0]] ?? 99) - (order[b[0]] ?? 99) || b[1] - a[1])
      .filter(([m]) => m !== "otro");
  }, [finanzas]);

  // ── NEGOCIO: ingresos por sede + tendencia ──
  const porSede = useMemo(() => {
    const rows = BRANCHES.map((b) => {
      const br = scopedRepairs.filter((r) => r.workshopBranch === b && inDeliveryOut(r, range));
      const ex = scopedExpress
        .filter((e) => e.localKey === b && inRange(expressTs(e), range))
        .reduce((s, e) => s + Number(e.total || 0), 0);
      const taller = br.reduce((s, r) => s + (r.actualCost || r.estimatedCost || 0), 0);
      return { branch: b, label: BRANCH_LABELS[b], taller, count: br.length, express: ex };
    });
    return rows;
  }, [scopedRepairs, scopedExpress, range]);

  const maxSede = Math.max(...porSede.map((r) => r.taller + r.express), 1);

  const trend = useMemo(
    () =>
      monthlyTrend(
        sede === "__all__" ? repairs : scopedRepairs,
        12,
        Date.now(),
        scopedExpress.map((e) => ({ ts: expressTs(e), amount: Number(e.total || 0) }))
      ),
    [repairs, scopedRepairs, scopedExpress, sede]
  );
  const maxTrend = Math.max(...trend.map((t) => t.revenue), 1);

  // ── KPIs generales ──
  const kpis = useMemo(() => {
    const entregadas = scopedRepairs.filter((r) => {
      const t = tsOf(r.deliveredAt || r.receptionDate);
      return r.status === "delivered" && inRange(t, range);
    });
    const ingresosOT = entregadas.reduce((s, r) => s + (r.actualCost || r.estimatedCost || 0), 0);
    const ingresosEx = scopedExpress.filter((e) => inRange(expressTs(e), range)).reduce((s, e) => s + Number(e.total || 0), 0);
    const ticket = entregadas.length ? Math.round(ingresosOT / entregadas.length) : 0;
    return {
      entregadas: entregadas.length,
      ingresosOT,
      ingresosEx,
      total: ingresosOT + ingresosEx,
      ticket,
      clientes: preset !== "todo" ? clientesFilteredTotal : (clientesOk ? clientesTotal : 0),
      tecnicos: tecnicos.length,
      ...operacionStats
    };
  }, [scopedRepairs, scopedExpress, range, clientesTotal, clientesOk, clientesFilteredTotal, preset, tecnicos, operacionStats]);

  // ── Exportaciones ──
  const clientesExportBase = clientesAll || (preset !== "todo" ? (clientesPeriodo || []) : clientesFiltered);
  const clientesSorted = preset !== "todo"
    ? clientesExportBase.slice().sort((a, b) => clientTs(b) - clientTs(a))
    : clientesExportBase.slice().sort((a, b) => String(a.internalId || "").localeCompare(String(b.internalId || ""), "en", { numeric: true }));
  const clientesRows: unknown[][] = [
    ["ID", "Nombre", "DNI", "Teléfono", "Tipo de Vehículo", "Última actualización"],
    ...clientesSorted.map((c) => [
      c.internalId || c.id || "—", c.name || "", c.dni || "", c.phone || "",
      [c.vehicleType, c.vehicleBrand, c.vehicleModel].filter(Boolean).join(" ") || "—",
      c.updatedAt ? fmtFechaHora(new Date(c.updatedAt).getTime()) : (c.createdAt ? fmtFechaHora(new Date(Number(c.createdAt)).getTime()) : "—")
    ])
  ];
  const serviciosExportRows: unknown[][] = [
    ["Tipo de Servicio", ...BRANCHES.map((b) => BRANCH_LABELS[b]), "Total"],
    ...serviciosRows.map((r) => [r[0], ...r[1], r[2]])
  ];
  const finanzasRows: unknown[][] = [
    ["Fecha", "Origen", "Tipo", "ID", "Cliente", "Sede", "Monto"],
    ...finanzas.all.map((r) => [fmtFecha(r.fecha), r.origen, SERVICE_LABELS[r.tipo] || r.tipo, r.id, r.cliente, BRANCH_LABELS[r.sede] || r.sede, `S/ ${Math.round(r.monto).toLocaleString()}`])
  ];
  const tecnicoPdfRow = (t: TechnicianStat) => [
    t.name, BRANCH_LABELS[t.sede] || t.sede || "—", t.ot, t.terminadas, t.express, `${t.conCronometro}/${t.ot}`,
    t.conCronometro ? fmtDuration(t.netMs) : "—",
    t.conCronometro ? fmtDuration(t.netMs / t.conCronometro) : "—",
    t.retrabajos, t.sospechosos
  ];
  const asesoraRow = (a: BranchAdvisorStat) => [
    BRANCH_LABELS[a.branch] || a.branch, a.recepciones, a.presupuestos, a.aprobados,
    a.tasaAprobacion === null ? "—" : `${Math.round(a.tasaAprobacion * 100)}%`,
    a.entregas, a.cancelaciones, a.expressCount, fmtMoney(a.expressTotal), a.avisosRecojo, a.listosSinAviso, a.listosConAlmacenaje
  ];
  const TECNICOS_HEAD = ["Técnico", "Sede", "Órdenes", "Terminadas", "Express", "Con cronómetro", "Horas netas", "Promedio/trabajo", "Retrabajos", "Cronómetros sospechosos"];
  const ASESORAS_HEAD = ["Sede", "Recepciones", "Presupuestos", "Aprobados", "Tasa aprob.", "Entregas", "Cancelaciones", "Express", "Express S/", "Avisos recojo", "Listos sin aviso", "Con almacenaje"];
  const tecnicosRows: unknown[][] = [
    ["TÉCNICOS (por persona)"],
    TECNICOS_HEAD,
    ...tecnicos.map(tecnicoPdfRow),
    [],
    ["ASESORAS (por sede)"],
    ASESORAS_HEAD,
    ...asesoras.map(asesoraRow)
  ];
  const operacionRows: unknown[][] = [
    ["Métrica", "Valor"],
    ["Órdenes Activas", kpis.activas],
    ["En Espera", kpis.enEspera],
    ["En Trabajo", kpis.enTrabajo],
    ["Listos para Entrega", kpis.listos],
    ["Alertas de Tiempo", kpis.alertas],
    ["Entregadas", kpis.entregadas],
    ["Ingresos Taller", fmtMoney(kpis.ingresosOT)],
    ["Ingresos Express", fmtMoney(kpis.ingresosEx)],
    ["Ingresos Totales", fmtMoney(kpis.total)],
    ["Clientes", kpis.clientes],
    ["Técnicos", kpis.tecnicos]
  ];

  const applyGoals = () => {
    setGoals({ ...draftGoals });
    saveGoals(draftGoals);
    setEditingGoals(false);
  };

  const draftSet = (key: string, hours: string) => {
    const v = parseFloat(hours);
    setDraftGoals((g) => ({ ...g, [key]: isFinite(v) && v >= 0 ? v * 3600000 : 0 }));
  };

  const [pdfGenerando, setPdfGenerando] = useState(false);

  const exportarPDF = async () => {
    if (pdfGenerando) return;
    setPdfGenerando(true);

    const rango = `${fmtFecha(range.from > 0 ? range.from : Date.now())} → ${fmtFecha(range.to)}`;
    const hoy = new Date().toLocaleDateString("es-PE", { year: "numeric", month: "long", day: "numeric" });

    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });

      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 36;
      let y = margin;

      const ensure = (h: number) => {
        if (y + h > pageH - margin) {
          doc.addPage();
          y = margin;
          return true;
        }
        return false;
      };

      const drawHeader = (titulo: string) => {
        ensure(70);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.setTextColor(15, 23, 42);
        doc.text("LITIO", margin, y);
        doc.setTextColor(6, 182, 212);
        doc.text("ENERGY", margin + doc.getTextWidth("LITIO"), y);
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(`Taller de Vehículos Eléctricos · ${titulo}`, margin, y + 12);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.text(`Período: ${rango}   ·   Emitido: ${hoy}`, pageW - margin, y, { align: "right" });
        doc.setDrawColor(14, 116, 144);
        doc.setLineWidth(2.5);
        doc.line(margin, y + 20, pageW - margin, y + 20);
        y += 36;
      };

      const sectionTitle = (txt: string) => {
        ensure(30);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(14, 116, 144);
        doc.text(txt, margin, y);
        y += 18;
      };

      const drawTable = (headers: string[], rows: (string | number)[][], widths: number[]) => {
        const totalW = widths.reduce((a, b) => a + b, 0);
        const colW = widths.map((w) => (w / totalW) * (pageW - margin * 2));
        const cellPad = 5;
        const lineH = 12;
        const rowH = (cells: (string | number)[]) => {
          let h = 0;
          cells.forEach((c, i) => {
            const lines = String(c).split("\n");
            h = Math.max(h, lines.length * lineH + cellPad * 2);
          });
          return h;
        };
        const maxLines = (c: string | number, i: number) => {
          const str = String(c);
          const chars = Math.max(1, Math.floor(colW[i] / 6.5));
          const lines: string[] = [];
          str.split("\n").forEach((ln) => { for (let k = 0; k < ln.length; k += chars) lines.push(ln.slice(k, k + chars)); });
          return lines.length || 1;
        };
        const heights: number[] = [];
        rows.forEach((cells) => {
          let h = 0;
          cells.forEach((c, i) => { h = Math.max(h, maxLines(c, i) * lineH + cellPad * 2); });
          heights.push(h);
        });
        const headerH = rowH(headers);

        // header
        ensure(headerH + 8);
        doc.setFillColor(14, 116, 144);
        doc.rect(margin, y, pageW - margin * 2, headerH, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        let hx = margin;
        headers.forEach((h, i) => {
          doc.text(h, hx + cellPad, y + headerH / 2 + 3, { align: "left" });
          hx += colW[i];
        });
        y += headerH;

        // rows
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        rows.forEach((cells, ri) => {
          const h = heights[ri];
          ensure(h);
          if (ri % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(margin, y, pageW - margin * 2, h, "F"); }
          doc.setDrawColor(203, 213, 225);
          doc.setLineWidth(0.5);
          doc.rect(margin, y, pageW - margin * 2, h, "S");
          let cx = margin;
          cells.forEach((c, i) => {
            const lines: string[] = [];
            const str = String(c);
            const chars = Math.max(1, Math.floor(colW[i] / 6.5));
            str.split("\n").forEach((ln) => { for (let k = 0; k < ln.length; k += chars) lines.push(ln.slice(k, k + chars)); });
            doc.setTextColor(15, 23, 42);
            if (/^S\/|^\d|Operado/.test(str) && i === headers.length - 1) doc.setTextColor(15, 23, 42);
            lines.forEach((ln, li) => doc.text(ln, cx + cellPad, y + cellPad + (li + 1) * (lineH * 0.9) + 2));
            cx += colW[i];
          });
          y += h;
        });
        y += 14;
      };

      const title = NAV.find((n) => n.key === view)?.label || "Reporte";

      if (view === "clientes" || view === "dashboard") {
        const filt = preset !== "todo" ? { from: range.from, to: range.to } : null;
        let clientesPdf = clientesAll;
        if (!clientesPdf) clientesPdf = await loadAllClientesForExport(filt);
        drawHeader("Lista de Clientes");
        sectionTitle("1. Lista de Clientes");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(`Total de clientes: ${clientesPdf.length}`, margin, y);
        y += 14;
        const rows = clientesPdf
          .slice()
          .sort((a, b) => String(a.internalId || "").localeCompare(String(b.internalId || ""), "en", { numeric: true }))
          .map((c) => [
            c.internalId || c.id || "—",
            c.name || "—",
            c.dni || "—",
            c.phone || "—",
            [c.vehicleType, c.vehicleBrand, c.vehicleModel].filter(Boolean).join(" ") || "—",
            c.updatedAt ? fmtFechaHora(new Date(c.updatedAt).getTime()) : c.createdAt ? fmtFechaHora(new Date(Number(c.createdAt)).getTime()) : "—"
          ]);
        drawTable(["ID", "Nombre", "DNI", "Teléfono", "Tipo de Vehículo", "Últ. Actualización"], rows, [0.9, 1.7, 1, 1.1, 1.7, 1.6]);
      } else if (view === "servicios") {
        drawHeader("Tipos de Servicio");
        sectionTitle("2. Tipos de Servicio");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(`Total de servicios: ${servicesSummary.total}`, margin, y);
        y += 14;
        const w = [2, ...BRANCHES.map(() => 1.2), 1];
        const rows = serviciosRows.map((r) => [r[0], ...BRANCHES.map((b, j) => r[1][j]), r[2]]);
        drawTable(["Tipo de Servicio", ...BRANCHES.map((b) => BRANCH_LABELS[b]), "Total"], rows, w);
      } else if (view === "finanzas") {
        drawHeader("Finanzas");
        sectionTitle("3. Finanzas");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(`OT: ${fmtMoney(finanzas.totalOT)}    Express: ${fmtMoney(finanzas.totalEx)}    TOTAL: ${fmtMoney(finanzas.total)}`, margin, y);
        y += 16;
        drawTable(["Método de Pago", "Monto"], finanzasByMethod.map(([m, v]) => [m, fmtMoney(v)]), [3, 1]);
        sectionTitle("Registros financieros");
        const rows = finanzas.all.map((r: any) => [
          fmtFecha(r.fecha), r.origen, SERVICE_LABELS[r.tipo] || r.tipo, r.id,
          r.cliente || "—", BRANCH_LABELS[r.sede] || r.sede || "—", fmtMoney(r.monto)
        ]);
        drawTable(["Fecha", "Origen", "Tipo", "ID", "Cliente", "Sede", "Monto"], rows, [1, 0.8, 1.2, 0.9, 1.4, 1.2, 1]);
      } else if (view === "bitacora") {
        drawHeader("Bitácora de Cambios · Ediciones de Recepción");
        sectionTitle("5. Bitácora de Cambios · Ediciones de Recepción");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(`Total de ediciones: ${bitacora.length}`, margin, y);
        y += 14;
        const rows = bitacora.map((b) => [fmtFechaHora(b.date), b.user, b.orderId, b.clientName, BRANCH_LABELS[b.branch] || b.branch || "—", b.details]);
        drawTable(["Fecha/Hora", "Asesora", "OT", "Cliente", "Sede", "Detalle de cambios"], rows, [1.2, 1.1, 0.9, 1.3, 1.1, 2.4]);
      } else {
        drawHeader("Personal · Técnicos y Asesoras");
        sectionTitle("4. Técnicos · por persona");
        drawTable(
          ["Técnico", "Sede", "Órd.", "Term.", "Expr.", "Crono", "Horas netas", "Prom.", "Retrab.", "Sosp."],
          tecnicos.map((t) => tecnicoPdfRow(t).map((v) => (typeof v === "number" ? v : String(v)))),
          [1.5, 1.1, 0.6, 0.6, 0.6, 0.7, 1.0, 0.9, 0.7, 0.6]
        );
        y += 10;
        sectionTitle("5. Asesoras · por sede");
        drawTable(
          ["Sede", "Recep.", "Presup.", "Aprob.", "Tasa", "Entreg.", "Cancel.", "Expr.", "Expr. S/", "Avisos", "Sin aviso", "Almac."],
          asesoras.map((a) => asesoraRow(a).map((v) => (typeof v === "number" ? v : String(v)))),
          [1.2, 0.7, 0.7, 0.7, 0.6, 0.7, 0.7, 0.6, 0.9, 0.7, 0.8, 0.7]
        );
      }

      // footer
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`© 2026 Litio Energy S.A.C.  ·  Documento generado por el Sistema Automatizado de Taller  ·  ${title}`, pageW / 2, pageH - 18, { align: "center" });

      const fn = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${range.from > 0 ? new Date(range.from).toISOString().slice(0, 10) : "inicio"}_a_${new Date(range.to).toISOString().slice(0, 10)}.pdf`;
      doc.save(fn);
    } catch (e) {
      console.error("PDF error:", e);
      alert("Error al generar el PDF.");
    } finally {
      setPdfGenerando(false);
    }
  };

  function currentExportRows(): unknown[][] {
    switch (view) {
      case "clientes": return clientesRows;
      case "servicios": return serviciosExportRows;
      case "finanzas": return finanzasRows;
      case "tecnicos": return tecnicosRows;
      case "bitacora": return bitacoraRows;
      default: return operacionRows;
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6" id="reporte-print">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/30 p-6 sm:p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden border border-slate-800 print:hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500/5 rounded-full blur-2xl"></div>
        <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-cyan-400 text-[10px] font-mono font-bold tracking-[0.25em] uppercase mb-1">Panel de Control · Solo Admin</p>
            <h1 className="font-display font-black text-2xl sm:text-3xl tracking-tight">Consola Litio Energy</h1>
            <p className="text-slate-400 text-xs mt-2 max-w-lg leading-relaxed">
              Finanzas, servicios, clientes y técnicos en una sola vista. Todo exportable a PDF y Excel.
            </p>
          </div>
          <div className="flex space-x-2 print:hidden">
            {view !== "dashboard" && (
              <>
                <button
                  onClick={exportarPDF}
                  disabled={pdfGenerando}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-200 rounded-xl text-xs font-black transition-all disabled:opacity-60"
                >
                  <Printer className="w-3.5 h-3.5" /> {pdfGenerando ? "Generando…" : "PDF"}
                </button>
                <button
                  onClick={async () => {
                    if (view === "clientes") {
                      const filt = preset !== "todo" ? { from: range.from, to: range.to } : null;
                      const all = clientesAll || (await loadAllClientesForExport(filt));
                      const rows: unknown[][] = [
                        ["ID", "Nombre", "DNI", "Teléfono", "Tipo de Vehículo", "Última actualización"],
                        ...all.slice().sort((a, b) => String(a.internalId || "").localeCompare(String(b.internalId || ""), "en", { numeric: true })).map((c) => [
                          c.internalId || c.id || "—", c.name || "", c.dni || "", c.phone || "",
                          [c.vehicleType, c.vehicleBrand, c.vehicleModel].filter(Boolean).join(" ") || "—",
                          c.updatedAt ? fmtFechaHora(new Date(c.updatedAt).getTime()) : (c.createdAt ? fmtFechaHora(new Date(Number(c.createdAt)).getTime()) : "—")
                        ])
                      ];
                      if (all.length) setClientesAll(all);
                      exportExcel(rows, "reporte_clientes");
                    } else {
                      exportExcel(currentExportRows(), `reporte_${view}`);
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black transition-all"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> {clientesExporting ? "Cargando…" : "Excel"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* FILTROS: FECHAS + SEDE */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 shadow-xl print:hidden">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fechas</span>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPreset(p.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    preset === p.key && preset !== "custom"
                      ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                      : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-600"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-700">
              <CalendarPicker
                value={customFrom}
                onChange={(v) => { setCustomFrom(v); setPreset("custom"); }}
                placeholder="Desde"
              />
              <span className="text-slate-500 text-xs">→</span>
              <CalendarPicker
                value={customTo}
                onChange={(v) => { setCustomTo(v); setPreset("custom"); }}
                placeholder="Hasta"
              />
              <button
                onClick={() => setPreset("custom")}
                className="p-2 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 rounded-lg text-cyan-300 transition-colors"
                title="Aplicar rango"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Local</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSede("__all__")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  sede === "__all__" ? "bg-cyan-500 text-slate-950 border-cyan-400" : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-600"
                }`}
              >
                Todas
              </button>
              {BRANCHES.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setSede(b)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    sede === b ? "text-slate-950 border-white/40" : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-600"
                  }`}
                  style={sede === b ? { backgroundColor: BRANCH_HEX[b] } : {}}
                >
                  {BRANCH_LABELS[b]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* LAYOUT: SIDEBAR + CONTENIDO */}
      <div className="grid lg:grid-cols-[230px_1fr] gap-5 items-start">
        <aside className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden print:hidden">
          <div className="p-3 bg-slate-950/60 border-b border-slate-800">
            <p className="text-[10px] font-mono font-black uppercase tracking-[0.25em] text-cyan-400">Secciones</p>
          </div>
          <nav className="p-2 space-y-1">
            {NAV.map((n) => {
              const Icon = n.icon;
              const active = view === n.key;
              return (
                <button
                  key={n.key}
                  onClick={() => setView(n.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                    active
                      ? "bg-cyan-500/10 border border-cyan-500/40 text-cyan-300"
                      : "border border-transparent text-slate-400 hover:bg-slate-950 hover:text-slate-200"
                  }`}
                >
                  <div className={`p-1.5 rounded-lg shrink-0 ${active ? "bg-cyan-500/20 text-cyan-300" : "bg-slate-800 text-slate-400"}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black truncate">{n.label}</p>
                    <p className="text-[10px] text-slate-500 truncate">{n.desc}</p>
                  </div>
                  {active && <ChevronRight className="w-3.5 h-3.5 ml-auto shrink-0 text-cyan-400" />}
                </button>
              );
            })}
          </nav>
          <div className="p-3 border-t border-slate-800 bg-slate-950/40">
            <p className="text-[10px] text-slate-600 font-mono">
              {fmtFecha(range.from > 0 ? range.from : Date.now())} → {fmtFecha(range.to)}
            </p>
          </div>
        </aside>

        <main className="min-w-0 space-y-5">
          {view === "dashboard" && (
            <DashboardView
              kpis={kpis}
              alerts={alerts}
              clientesOk={clientesOk}
              range={range}
              operacion={operacionStats}
              goals={goals}
              services={servicesSummary}
              porSede={porSede}
              maxSede={maxSede}
              trend={trend}
              maxTrend={maxTrend}
              editingGoals={editingGoals}
              draftGoals={draftGoals}
              setEditingGoals={setEditingGoals}
              setDraftGoals={setDraftGoals}
              applyGoals={applyGoals}
              draftSet={draftSet}
              filteredRepairs={scopedRepairs}
              technicianNames={(() => {
                const cfg = loadConfig();
                const set = new Set<string>();
                (cfg?.locales || []).forEach((l: any) => (l?.tecnicos || []).forEach((t: any) => set.add(String(t?.name || "").trim())));
                return set;
              })()}
            />
          )}
          {view === "clientes" && (
            <ClientesTab
              rows={clientesFiltered}
              repairs={scopedRepairs}
              express={scopedExpress}
              q={q}
              setQ={setQ}
              loading={!clientesOk && clientesLoading}
              total={clientesFilteredTotal}
              page={clientesPage}
              totalPages={Math.max(1, Math.ceil((clientesFilteredTotal || clientesFiltered.length) / CLIENTES_PAGE_SIZE))}
              onPageChange={loadClientesPage}
              onSearch={searchClientes}
              searchResult={clientesSearch}
              scopeLabel={preset === "todo" ? "Todo el historial" : `${fmtFecha(range.from)} → ${fmtFecha(range.to)}`}
            />
          )}
          {view === "servicios" && (
            <ServiciosTab rows={serviciosRows} total={servicesSummary.total} />
          )}
          {view === "finanzas" && (
            <FinanzasTab finanzas={finanzas} byMethod={finanzasByMethod} />
          )}
          {view === "tecnicos" && (
            <PersonalTab tecnicos={tecnicos} asesoras={asesoras} />
          )}
          {view === "bitacora" && (
            <BitacoraTab rows={bitacoraRows} />
          )}
        </main>
      </div>
    </div>
  );
}

// Para ingresos por sede: entregadas dentro del rango
function inDeliveryOut(r: RepairItem, range: { from: number; to: number }): boolean {
  if (r.status !== "delivered") return false;
  return inRange(tsOf(r.deliveredAt || r.receptionDate), range);
}

// ─────────────────────────────── COMPONENTES ────────────────────────────────
function KpiSmall({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string; icon: React.ElementType; color: string;
}) {
  const bgMap: Record<string, string> = {
    cyan: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    purple: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    rose: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    blue: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    teal: "bg-teal-500/15 text-teal-300 border-teal-500/30",
    pink: "bg-pink-500/15 text-pink-300 border-pink-500/30",
    red: "bg-red-500/15 text-red-300 border-red-500/30",
    orange: "bg-orange-500/15 text-orange-300 border-orange-500/30",
    slate: "bg-slate-500/15 text-slate-300 border-slate-500/30"
  };
  return (
    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between gap-2">
      <div className="space-y-1 min-w-0">
        <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider truncate">{label}</span>
        <p className="text-lg font-black font-mono text-slate-100 truncate">{value}</p>
        {sub && <p className="text-[9px] font-semibold text-slate-500 truncate">{sub}</p>}
      </div>
      <div className={`p-2 rounded-xl border shrink-0 ${bgMap[color] || bgMap.cyan}`}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-slate-900 rounded-2xl border border-slate-800 shadow-xl p-5 ${className}`}>{children}</div>;
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full bg-slate-950/80 h-1.5 rounded-full overflow-hidden border border-slate-800/50">
      <div className={`${BAR_COLOR[color] || "bg-cyan-500"} h-full rounded-full transition-all duration-700 ease-out`} style={{ width: `${pct}%` }}></div>
    </div>
  );
}

// ── View: DASHBOARD (operación en vivo + tiempos + negocio) ──
function DashboardView({ kpis, alerts, clientesOk, operacion, goals, services, porSede, trend, editingGoals, draftGoals, setEditingGoals, setDraftGoals, applyGoals, draftSet, filteredRepairs, technicianNames }: {
  kpis: any;
  alerts: any[];
  clientesOk: boolean;
  range: { from: number; to: number };
  operacion: { activas: number; enEspera: number; enTrabajo: number; listos: number; alertas: number };
  goals: Goals;
  services: { counts: Record<string, number>; total: number };
  porSede: Array<{ branch: string; label: string; taller: number; count: number; express: number }>;
  maxSede: number; trend: MonthBucket[]; maxTrend: number;
  editingGoals: boolean; draftGoals: Goals; setEditingGoals: (v: boolean) => void;
  setDraftGoals: (g: Goals) => void; applyGoals: () => void; draftSet: (k: string, h: string) => void;
  filteredRepairs: RepairItem[]; technicianNames: Set<string>;
}) {
  // "Tiempos vencidos" se muestra plegado por defecto para no alargar el panel.
  const [showAlerts, setShowAlerts] = useState(false);
  const criticalCount = alerts.filter((a) => a.level === "critical").length;
  const worstAlert = alerts[0];
  const activeTotal = Math.max(kpis.activas || 0, 1);
  const liveCells = [
    { label: "Activas", value: kpis.activas, sub: "en el taller", color: "text-cyan-300", bar: null as string | null },
    { label: "En espera", value: kpis.enEspera, sub: "sin técnico", color: "text-rose-300", bar: "bg-rose-500" },
    { label: "En trabajo", value: kpis.enTrabajo, sub: "diag. / presup. / repar.", color: "text-blue-300", bar: "bg-blue-500" },
    { label: "Listos", value: kpis.listos, sub: "para entrega", color: "text-teal-300", bar: "bg-teal-500" },
    { label: "Alertas", value: kpis.alertas, sub: "sobre la meta", color: kpis.alertas ? "text-red-400" : "text-emerald-300", bar: null }
  ];

  const processData = useMemo(() => {
    const HOUR90 = 90 * 24 * 3600 * 1000;
    const byStage: Record<string, number[]> = {};
    PROCCESS_STAGES.forEach((s) => { byStage[s.key] = []; });
    filteredRepairs.forEach((r) => {
      stageTimings(r).forEach((s) => {
        if (!byStage[s.stage]) byStage[s.stage] = [];
        byStage[s.stage].push(s.durationMs);
      });
      const espera = esperaDurationMs(r);
      if (espera && isFinite(espera.ms) && espera.ms >= 0 && espera.ms < HOUR90) {
        byStage["espera"].push(espera.ms);
      }
    });
    const maxAvg = PROCCESS_STAGES.reduce((mx, s) => {
      const arr = byStage[s.key] || [];
      if (!arr.length) return mx;
      const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
      return Math.max(mx, avg);
    }, 1);
    return { byStage, maxAvg };
  }, [filteredRepairs]);

  return (
    <div className="space-y-5">
      {/* INDICADORES: 2 bloques compactos */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Operación en vivo */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
          <div className="px-4 pt-3 pb-2 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Operación en vivo</span>
          </div>
          <div className="grid grid-cols-5 divide-x divide-slate-800">
            {liveCells.map((c) => (
              <div key={c.label} className="px-3 pb-3 min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 truncate">{c.label}</p>
                <p className={`text-2xl font-black font-mono leading-tight ${c.color}`}>{c.value}</p>
                <p className="text-[9px] text-slate-600 truncate">{c.sub}</p>
              </div>
            ))}
          </div>
          {/* Reparto de las órdenes activas */}
          <div className="flex h-1.5 w-full bg-slate-950" title="Reparto de órdenes activas: en espera / en trabajo / listos">
            {liveCells.filter((c) => c.bar).map((c) => (
              <div key={c.label} className={c.bar!} style={{ width: `${((Number(c.value) || 0) / activeTotal) * 100}%` }} />
            ))}
          </div>
        </div>

        {/* Resultados del período */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
          <div className="px-4 pt-3 pb-2 flex items-center gap-2">
            <CircleDollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Resultados del período</span>
            <span className="ml-auto text-[10px] text-slate-500 font-mono">
              {clientesOk ? kpis.clientes : "…"} clientes · {kpis.tecnicos} técnicos
            </span>
          </div>
          <div className="grid grid-cols-4 divide-x divide-slate-800">
            <div className="px-3 pb-3 min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 truncate">Entregados</p>
              <p className="text-2xl font-black font-mono leading-tight text-slate-100">{kpis.entregadas}</p>
              <p className="text-[9px] text-slate-600 truncate">ticket {fmtMoney(kpis.ticket)}</p>
            </div>
            <div className="px-3 pb-3 min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 truncate">Taller</p>
              <p className="text-lg font-black font-mono leading-tight text-cyan-300 truncate">{fmtMoney(kpis.ingresosOT)}</p>
              <p className="text-[9px] text-slate-600 truncate">OT entregadas</p>
            </div>
            <div className="px-3 pb-3 min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 truncate">Express</p>
              <p className="text-lg font-black font-mono leading-tight text-amber-300 truncate">{fmtMoney(kpis.ingresosEx)}</p>
              <p className="text-[9px] text-slate-600 truncate">recibos</p>
            </div>
            <div className="px-3 pb-3 min-w-0 bg-emerald-500/5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 truncate">Total</p>
              <p className="text-lg font-black font-mono leading-tight text-emerald-300 truncate">{fmtMoney(kpis.total)}</p>
              <p className="text-[9px] text-slate-600 truncate">taller + express</p>
            </div>
          </div>
        </div>
      </div>

      {/* TIEMPOS VENCIDOS (desplegable) */}
      {alerts.length > 0 && (
        <div className="bg-rose-950/30 border border-rose-800/50 rounded-2xl shadow-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAlerts((v) => !v)}
            className="w-full p-3 px-4 flex items-center gap-3 text-left hover:bg-rose-900/10 transition-colors"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="text-xs font-black text-rose-200 uppercase tracking-wider">Tiempos vencidos</span>
            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-[10px] font-mono font-black text-rose-200">{alerts.length}</span>
            <span className="hidden sm:inline text-[10px] text-rose-300/80 font-mono">
              {criticalCount} críticas · {alerts.length - criticalCount} atrasadas
            </span>
            {worstAlert && !showAlerts && (
              <span className="hidden lg:inline text-[10px] text-slate-400 truncate">
                · más grave: <strong className="text-slate-200">{worstAlert.repair.client?.name || "Sin nombre"}</strong> ({STAGE_LABELS[worstAlert.stage] || worstAlert.stage}, {fmtDuration(worstAlert.elapsedMs)})
              </span>
            )}
            <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-rose-300 uppercase tracking-wider shrink-0">
              {showAlerts ? "Ocultar" : "Ver"}
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showAlerts ? "rotate-90" : ""}`} />
            </span>
          </button>
          {showAlerts && (
          <div className="p-3 pt-0 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 max-h-80 overflow-y-auto border-t border-rose-800/40">
            <p className="md:col-span-2 xl:col-span-3 text-[10px] text-slate-500 pt-2">Ordenadas por retraso. Rojo = más del doble de la meta.</p>
            {alerts.map((a) => (
              <div key={a.repair.id} className="bg-slate-950/60 rounded-xl border border-rose-900/40 px-3 py-2 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-slate-100 truncate">
                    {a.repair.client?.name || "Sin nombre"}
                    <span className="text-slate-500 font-mono ml-1.5">{a.repair.id}</span>
                  </p>
                  <p className="text-[9px] text-rose-300/80 font-medium truncate">
                    {BRANCH_LABELS[a.repair.workshopBranch] || a.repair.workshopBranch} · {a.repair.vehicle?.type || "vehículo"} · {STAGE_LABELS[a.stage] || a.stage}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-mono font-black text-sm ${a.level === "critical" ? "text-rose-400" : "text-amber-400"}`}>{fmtDuration(a.elapsedMs)}</p>
                  <p className="text-[9px] text-slate-500 font-mono">meta {fmtDuration(a.goalMs)}</p>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {/* Gráfico de líneas principal: ingresos mensuales */}
      <Card>
        <h2 className="text-sm font-black text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" /> Evolución de Ingresos · Taller + Express
        </h2>
        <React.Suspense fallback={<div className="h-72 flex items-center justify-center text-xs text-slate-500">Cargando gráfico…</div>}>
          <RevenueTrendChart data={trend} />
        </React.Suspense>
      </Card>

      {/* Gráficos de dona: tipos de servicio e ingresos por sede */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card>
          <h2 className="text-sm font-black text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-cyan-400" /> Tipos de Servicio · Período
          </h2>
          <React.Suspense fallback={<div className="h-48 flex items-center justify-center text-xs text-slate-500">Cargando gráfico…</div>}>
            <DonutChart
              centerLabel="servicios"
              data={["mantenimiento", "diagnostico", "garantia", "cambio", "express"].map((k) => ({
                key: k,
                label: SERVICE_LABELS[k] || k,
                value: services.counts[k] || 0,
                color: SERVICE_HEX[k] || "#64748b"
              }))}
            />
          </React.Suspense>
        </Card>
        <Card>
          <h2 className="text-sm font-black text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
            <CircleDollarSign className="w-4 h-4 text-emerald-400" /> Ingresos por Sede · Período
          </h2>
          <React.Suspense fallback={<div className="h-48 flex items-center justify-center text-xs text-slate-500">Cargando gráfico…</div>}>
            <DonutChart
              centerLabel="ingresos"
              format={fmtMoney}
              data={porSede.map((b) => ({ key: b.branch, label: b.label, value: b.taller + b.express, color: BRANCH_HEX[b.branch] }))}
            />
          </React.Suspense>
          <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 gap-x-4 gap-y-1">
            {porSede.map((b) => (
              <p key={b.branch} className="text-[10px] text-slate-500 font-mono truncate">
                <span className="font-bold" style={{ color: BRANCH_HEX[b.branch] }}>{b.label}</span>: {b.count} OT · {fmtMoney(b.express)} express
              </p>
            ))}
          </div>
        </Card>
      </div>

      {/* Metas por Etapa (semáforo) + Tiempos por Proceso */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-cyan-400" />
            <h2 className="font-display font-black text-sm text-slate-100 uppercase tracking-wider">Tiempos por Proceso · Metas de Etapa</h2>
          </div>
          {!editingGoals ? (
            <button
              onClick={() => { setDraftGoals({ ...goals }); setEditingGoals(true); }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 transition-all"
            >
              Ajustar metas
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditingGoals(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 border border-slate-700 hover:text-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={applyGoals}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                Guardar
              </button>
            </div>
          )}
        </div>
        <div className="p-4 text-[11px] text-slate-500 leading-relaxed border-b border-slate-800/60">
          Promedio real de cada etapa vs tu meta (semáforo verde / ámbar / rojo). Ajusta las metas para activarlo.
        </div>
        {!editingGoals ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 p-4">
            {PROCCESS_STAGES.map((s) => {
              const arr = processData.byStage[s.key] || [];
              const avg = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
              const med = median(arr);
              const color = COLOR_SETS[s.color] || COLOR_SETS.cyan;
              const traffic = arr.length ? trafficColor(avg, goals[s.key] || 0) : null;
              const trafficStyle = traffic ? TRAFFIC_STYLES[traffic] : null;
              const pct = (avg / processData.maxAvg) * 100;
              const Icon = s.icon;
              return (
                <div key={s.key} className="bg-slate-950/60 rounded-xl border border-slate-800/70 p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg border ${color.chip}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[11px] font-black text-slate-200 uppercase tracking-wider">{s.label}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 text-[9px] font-mono font-black">
                      {arr.length} dato{arr.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    <p>
                      <span className="text-xl font-black font-mono text-slate-50">{fmtDuration(avg)}</span>
                      <span className="text-[9px] text-slate-500 ml-1 uppercase font-bold">promedio</span>
                    </p>
                    <span className="text-[9px] font-mono text-slate-500">meta {fmtDuration(goals[s.key] || 0)}</span>
                  </div>
                  <div className="my-2">
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                      <div className={`${color.bar} h-full rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }}></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono text-slate-500">mediana {fmtDuration(med)}</span>
                    {trafficStyle && (
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold border ${trafficStyle.chip}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${trafficStyle.dot}`}></span>
                        {trafficStyle.label}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 p-4">
            {PROCCESS_STAGES.map((s) => (
              <label key={s.key} className="bg-slate-950/60 rounded-xl border border-slate-800/80 px-3 py-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-slate-300">{s.label}</span>
                <span className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    defaultValue={(draftGoals[s.key] || 0) / 3600000}
                    onChange={(e) => draftSet(s.key, e.target.value)}
                    className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-[9px] text-slate-500 font-bold">h</span>
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

// ── View: CLIENTES ──
function ClientesTab({ rows, repairs, express, q, setQ, loading, total, page, totalPages, onPageChange, onSearch, searchResult, scopeLabel }: {
  rows: any[]; repairs: RepairItem[]; express: any[]; q: string; setQ: (v: string) => void; loading: boolean;
  total: number; page: number; totalPages: number;
  onPageChange: (p: number) => void; onSearch: (term: string) => void;
  searchResult: null | { term: string; results: any[]; fromServer: boolean };
  scopeLabel?: string;
}) {
  const [openDni, setOpenDni] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => onSearch(q), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const pageIndex = Math.max(1, Math.min(page, totalPages));
  const shownTotal = searchResult ? searchResult.results.length : total;
  const visibleRows = rows;

  const clientRepairs = (c: any): RepairItem[] => {
    const dni = String(c.dni || "").trim().toLowerCase();
    const phone = String(c.phone || "").trim().toLowerCase();
    if (!dni && !phone) return [];
    return repairs
      .filter((r) =>
        (dni && String(r.client?.dni || "").trim().toLowerCase() === dni) ||
        (phone && String(r.client?.phone || "").trim().toLowerCase() === phone)
      )
      .sort((a, b) => new Date(b.receptionDate).getTime() - new Date(a.receptionDate).getTime());
  };

  // Recibos Express del cliente. Prioridad de enlace: internalId (nuevo),
  // luego DNI y teléfonos (principal y phone2) para los registros antiguos.
  const clientExpress = (c: any): any[] => {
    const iid = String(c.internalId || "").trim();
    const dni = String(c.dni || "").trim().toLowerCase();
    const phones = [c.phone, c.phone2]
      .map((p) => String(p || "").trim().toLowerCase())
      .filter(Boolean);
    if (!iid && !dni && !phones.length) return [];
    return express
      .filter((e) => e.annulled !== true)
      .filter((e) =>
        (iid && String(e.clientInternalId || "").trim() === iid) ||
        (dni && String(e.clientDni || "").trim().toLowerCase() === dni) ||
        (phones.length > 0 && phones.includes(String(e.clientPhone || "").trim().toLowerCase()))
      )
      .sort((a, b) => expressTs(b) - expressTs(a));
  };

  const openClient = rows.find((c) => (c.dni || c.id) === openDni);
  const openOt = openClient ? clientRepairs(openClient) : [];
  const openExpress = openClient ? clientExpress(openClient) : [];

  return (
    <Card className="print:border-0 print:shadow-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <Users className="w-4 h-4 text-cyan-400" /> Lista de Clientes
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-slate-300">{shownTotal}</span>
        </h2>
        {scopeLabel && !searchResult && (
          <span className="text-[10px] font-mono text-cyan-400/80">{scopeLabel}</span>
        )}
        <div className="flex items-center gap-2 print:hidden">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, DNI, ID..."
              className="w-full sm:w-64 pl-9 pr-3 py-2 bg-slate-950 text-slate-100 text-xs border border-slate-800 rounded-xl focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          {q && (
            <button
              type="button"
              onClick={() => { setQ(""); onSearch(""); }}
              className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-bold transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      {searchResult && searchResult.term && (
        <p className="text-[11px] text-slate-500 mb-4">
          {searchResult.results.length > 0
            ? `${searchResult.results.length} coincidencia${searchResult.results.length === 1 ? "" : "s"} para "${q}" (búsqueda en el servidor por prefijo de ID, DNI, teléfono o nombre).`
            : `Sin coincidencias para "${q}" en el servidor.`}
        </p>
      )}
      {loading ? (
        <p className="text-sm text-slate-500 py-8 text-center">Cargando clientes…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500 py-8 text-center">No se encontraron clientes.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <th className="py-2 pr-3">ID</th>
                <th className="py-2 pr-3">Nombre</th>
                <th className="py-2 pr-3">DNI</th>
                <th className="py-2 pr-3">Teléfono</th>
                <th className="py-2 pr-3">Tipo de Vehículo</th>
                <th className="py-2 pr-3">Últ. actualización</th>
                <th className="py-2 text-right print:hidden">OT</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((c, i) => {
                const updated = c.updatedAt ? fmtFechaHora(new Date(c.updatedAt).getTime()) : c.createdAt ? fmtFechaHora(new Date(Number(c.createdAt)).getTime()) : "—";
                const vehicle = [c.vehicleType, c.vehicleBrand, c.vehicleModel].filter(Boolean).join(" ") || "—";
                const dniKey = c.dni || c.id || `idx-${i}`;
                const otCount = clientRepairs(c).length;
                const expCount = clientExpress(c).length;
                return (
                  <tr key={i} className="border-b border-slate-800/70 hover:bg-slate-800/30">
                    <td className="py-2.5 pr-3 font-mono font-bold text-cyan-300">{c.internalId || c.id || "—"}</td>
                    <td className="py-2.5 pr-3 text-slate-100 capitalize">{c.name || "—"}</td>
                    <td className="py-2.5 pr-3 font-mono text-slate-300">{c.dni || "—"}</td>
                    <td className="py-2.5 pr-3 font-mono text-slate-300">{c.phone || "—"}</td>
                    <td className="py-2.5 pr-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-bold text-slate-300 capitalize">
                        {c.vehicleType || "—"}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-400">{updated}</td>
                    <td className="py-2.5 text-right print:hidden">
                      <button
                        type="button"
                        onClick={() => setOpenDni(dniKey)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold transition-colors cursor-pointer"
                        title={`Ver historial de ${c.name || "este cliente"}`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {otCount} OT{expCount > 0 ? ` · ${expCount} EXP` : ""}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!searchResult && total > CLIENTES_PAGE_SIZE && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 print:hidden">
          <span className="text-[11px] font-mono text-slate-500">
            Página {pageIndex} de {totalPages} · Mostrando {(pageIndex - 1) * CLIENTES_PAGE_SIZE + 1}–{Math.min(pageIndex * CLIENTES_PAGE_SIZE, total)} de {total} clientes
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={pageIndex === 1}
              onClick={() => onPageChange(Math.max(1, pageIndex - 1))}
              className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 rounded-xl text-[11px] font-bold transition-colors cursor-pointer disabled:cursor-default"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Anterior
            </button>
            {getClientesPageNumbers(pageIndex, totalPages).map((p, i, arr) => (
              <React.Fragment key={p}>
                {i > 0 && p !== arr[i - 1] + 1 && <span className="px-0.5 text-slate-600 text-xs">…</span>}
                <button
                  type="button"
                  onClick={() => onPageChange(p)}
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
              onClick={() => onPageChange(Math.min(totalPages, pageIndex + 1))}
              className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 rounded-xl text-[11px] font-bold transition-colors cursor-pointer disabled:cursor-default"
            >
              Siguiente <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Modal de órdenes del cliente */}
      {openClient && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setOpenDni(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[80vh] flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div>
                <h3 className="font-black text-slate-100 text-sm uppercase tracking-wider flex items-center gap-2">
                  <History className="w-4 h-4 text-cyan-400" /> Historial del Cliente
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5 capitalize">
                  {openClient.name || "—"} <span className="font-mono text-slate-500">({openClient.dni || "sin DNI"})</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenDni(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-5 space-y-5">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">
                  Órdenes de Trabajo · {openOt.length}
                </p>
                {openOt.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-6">Sin órdenes registradas.</p>
                ) : (
                  <div className="space-y-3">
                    {openOt.map((r) => {
                      const badge = {
                        receptioned: "bg-slate-500/10 text-slate-300 border-slate-500/30",
                        diagnosing: "bg-amber-500/10 text-amber-300 border-amber-500/30",
                        quoted: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
                        paid: "bg-blue-500/10 text-blue-300 border-blue-500/30",
                        repairing: "bg-violet-500/10 text-violet-300 border-violet-500/30",
                        testing: "bg-purple-500/10 text-purple-300 border-purple-500/30",
                        ready: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
                        delivered: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40",
                        cancelled: "bg-rose-500/10 text-rose-300 border-rose-500/30"
                      }[r.status] || "bg-slate-500/10 text-slate-300 border-slate-500/30";
                      const label = {
                        receptioned: "Recibido", diagnosing: "Diagnóstico", quoted: "Presupuesto",
                        paid: "Pagado", repairing: "Reparando", testing: "Control Calidad",
                        ready: "Listo", delivered: "Entregado", cancelled: "Cancelado"
                      }[r.status] || r.status;
                      const venue = BRANCH_LABELS[r.workshopBranch || "lince_arenales"] || r.workshopBranch || "—";
                      return (
                        <div key={r.id} className="bg-slate-950 rounded-xl border border-slate-800 p-3.5 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-black text-cyan-300">{r.id}</span>
                              <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${badge}`}>{label}</span>
                              <span className="text-slate-400">{venue}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1">
                              {r.vehicle?.type || "otro"} {r.vehicle?.brand || ""} {r.vehicle?.model || ""}
                            </p>
                            <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                              Ingreso: {fmtFechaHora(new Date(r.receptionDate).getTime())}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => generateRepairPdf(r)}
                            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 bg-cyan-950/40 hover:bg-cyan-900/40 text-cyan-400 hover:text-cyan-300 rounded-xl border border-cyan-900/60 hover:border-cyan-500/50 transition-all font-bold font-mono text-xs cursor-pointer"
                            title={`Imprimir Ficha PDF de ${r.id}`}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Ficha PDF
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">
                  Recibos Express · {openExpress.length}
                </p>
                {openExpress.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-6">Sin recibos Express registrados.</p>
                ) : (
                  <div className="space-y-3">
                    {openExpress.map((e) => (
                      <div key={e.correlative} className="bg-slate-950 rounded-xl border border-slate-800 p-3.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-black text-emerald-300">{e.correlative}</span>
                            <span className="px-2 py-0.5 rounded-full border text-[9px] font-bold bg-emerald-500/10 text-emerald-300 border-emerald-500/30">Express</span>
                            <span className="text-slate-400">{BRANCH_LABELS[e.localKey] || e.localName || e.localKey || "—"}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            {(e.items || []).length} servicio{(e.items || []).length === 1 ? "" : "s"} · {e.vehicleType || "—"}
                          </p>
                          <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                            {e.date || (isFinite(expressTs(e)) ? fmtFechaHora(expressTs(e)) : "—")}
                          </p>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-200">{fmtMoney(Number(e.total) || 0)}</span>
                          <button
                            type="button"
                            onClick={() => openReceipt(e)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400 hover:text-emerald-300 rounded-xl border border-emerald-900/60 hover:border-emerald-500/50 transition-all font-bold font-mono text-xs cursor-pointer"
                            title={`Ver recibo ${e.correlative}`}
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            Recibo
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// ── View: SERVICIOS ──
function ServiciosTab({ rows, total }: { rows: any[][]; total: number }) {
  return (
    <Card className="print:border-0 print:shadow-none">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <Wrench className="w-4 h-4 text-cyan-400" /> Tipos de Servicio
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-slate-300">{total}</span>
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
              <th className="py-2 pr-3">Tipo de Servicio</th>
              {BRANCHES.map((b) => <th key={b} className="py-2 pr-3 text-right">{BRANCH_LABELS[b]}</th>)}
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-slate-800/70 hover:bg-slate-800/30">
                <td className="py-2.5 pr-3 font-bold text-slate-100">{r[0]}</td>
                {(r[1] as number[]).map((v, j) => <td key={j} className="py-2.5 pr-3 text-right font-mono text-slate-300">{v}</td>)}
                <td className="py-2.5 text-right font-mono font-bold text-cyan-300">{r[2]}</td>
              </tr>
            ))}
            <tr className="border-t border-slate-700">
              <td className="py-2.5 pr-3 font-black text-slate-100">Total</td>
              {BRANCHES.map((_, j) => {
                const sum = rows.reduce((s, r) => s + (r[1] as number[])[j], 0);
                return <td key={j} className="py-2.5 pr-3 text-right font-black font-mono text-slate-100">{sum}</td>;
              })}
              <td className="py-2.5 text-right font-black font-mono text-cyan-300">{total}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}

const METHOD_LABELS: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  yape_plin: "Yape / Plin",
  tarjeta: "Tarjeta",
  [UNREGISTERED_METHOD]: "Sin registrar"
};

// ── View: FINANZAS ──
function FinanzasTab({ finanzas, byMethod }: { finanzas: any; byMethod: Array<[string, number]> }) {
  const maxMethod = Math.max(...byMethod.map(([, v]) => v), 1);
  // Método con más ingresos (sin contar los pagos sin método registrado).
  const topMethod = byMethod
    .filter(([m]) => m !== UNREGISTERED_METHOD)
    .reduce<[string, number] | null>((best, cur) => (!best || cur[1] > best[1] ? cur : best), null);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiSmall label="Ingresos OT" value={fmtMoney(finanzas.totalOT)} sub="Órdenes entregadas" icon={TrendingUp} color="emerald" />
        <KpiSmall label="Ingresos Express" value={fmtMoney(finanzas.totalEx)} sub="Recibos express" icon={Zap} color="rose" />
        <KpiSmall label="Total" value={fmtMoney(finanzas.total)} sub={`${finanzas.count} registros`} icon={CircleDollarSign} color="cyan" />
        <KpiSmall label="Método principal" value={topMethod ? METHOD_LABELS[topMethod[0]] || topMethod[0] : "—"} sub={topMethod ? fmtMoney(topMethod[1]) : ""} icon={Receipt} color="amber" />
      </div>
      <Card className="print:border-0 print:shadow-none">
        <h2 className="text-sm font-black text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-cyan-400" /> Registros financieros
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-slate-300">{finanzas.count}</span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <th className="py-2 pr-3">Fecha</th>
                <th className="py-2 pr-3">Origen</th>
                <th className="py-2 pr-3">Tipo</th>
                <th className="py-2 pr-3">ID</th>
                <th className="py-2 pr-3">Cliente</th>
                <th className="py-2 pr-3">Sede</th>
                <th className="py-2 text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {finanzas.all.map((r: any, i: number) => (
                <tr key={i} className="border-b border-slate-800/70 hover:bg-slate-800/30">
                  <td className="py-2.5 pr-3 text-slate-400">{fmtFecha(r.fecha)}</td>
                  <td className="py-2.5 pr-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.origen === "Express" ? "bg-rose-500/15 text-rose-300" : "bg-cyan-500/15 text-cyan-300"}`}>{r.origen}</span>
                  </td>
                  <td className="py-2.5 pr-3 text-slate-200">{SERVICE_LABELS[r.tipo] || r.tipo}</td>
                  <td className="py-2.5 pr-3 font-mono text-cyan-300">{r.id}</td>
                  <td className="py-2.5 pr-3 text-slate-100 capitalize">{r.cliente || "—"}</td>
                  <td className="py-2.5 pr-3 text-slate-300">{BRANCH_LABELS[r.sede] || r.sede || "—"}</td>
                  <td className="py-2.5 text-right font-mono font-bold text-emerald-300">{fmtMoney(r.monto)}</td>
                </tr>
              ))}
              {finanzas.all.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-slate-500">Sin registros en el período.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <h2 className="text-sm font-black text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-cyan-400" /> Métodos de Pago
        </h2>
        {byMethod.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">Sin pagos en el período.</p>
        ) : (
          <div className="space-y-3">
            {byMethod.map(([m, v]) => (
              <div key={m} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-[11px] font-bold text-slate-300 capitalize">{METHOD_LABELS[m] || m}</span>
                <div className="flex-1"><MiniBar value={v} max={maxMethod} color="cyan" /></div>
                <span className="w-24 shrink-0 text-right text-[11px] font-mono font-black text-slate-200">{fmtMoney(v)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── View: TÉCNICOS ──
function PersonalTab({ tecnicos, asesoras }: { tecnicos: TechnicianStat[]; asesoras: BranchAdvisorStat[] }) {
  const rows = tecnicos;
  const maxNet = Math.max(...rows.map((t) => t.netMs), 1);
  const totals = asesoras.reduce(
    (s, a) => ({
      recepciones: s.recepciones + a.recepciones,
      presupuestos: s.presupuestos + a.presupuestos,
      aprobados: s.aprobados + a.aprobados,
      entregas: s.entregas + a.entregas,
      sinAviso: s.sinAviso + a.listosSinAviso,
      almacenaje: s.almacenaje + a.listosConAlmacenaje
    }),
    { recepciones: 0, presupuestos: 0, aprobados: 0, entregas: 0, sinAviso: 0, almacenaje: 0 }
  );
  return (
    <div className="space-y-5">
    {/* ── TÉCNICOS (por persona) ── */}
    <Card className="print:border-0 print:shadow-none">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" /> Técnicos · por persona
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-slate-300">{rows.length}</span>
        </h2>
      </div>
      <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
        Horas netas = cronómetro de la Mesa de Trabajo, sin pausas ni esperas. <strong className="text-slate-400">Retrabajos</strong> = veces que
        Control de Calidad devolvió el trabajo. <strong className="text-amber-300">⚠ Sospechosos</strong> = cronómetros con más de 12 h seguidas
        (probable olvido de pausar); solo se señalan, los datos no se modifican.
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500 py-8 text-center">Sin actividad de técnicos en el período.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <th className="py-2 pr-3">Técnico</th>
                <th className="py-2 pr-3">Sede</th>
                <th className="py-2 pr-3 text-right">Órdenes</th>
                <th className="py-2 pr-3 text-right">Terminadas</th>
                <th className="py-2 pr-3 text-right">Express</th>
                <th className="py-2 pr-3 text-right">Con cronómetro</th>
                <th className="py-2 pr-3 text-right">Horas netas</th>
                <th className="py-2 pr-3 text-right">Promedio</th>
                <th className="py-2 pr-3 text-right">Retrabajos</th>
                <th className="py-2 text-right">Sospechosos</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t, i) => (
                <tr key={i} className="border-b border-slate-800/70 hover:bg-slate-800/30">
                  <td className="py-2.5 pr-3 font-bold text-slate-100">
                    {t.name}
                    {t.conCronometro > 0 && (
                      <div className="mt-1 w-24"><MiniBar value={t.netMs} max={maxNet} color="cyan" /></div>
                    )}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-bold text-slate-300">{BRANCH_LABELS[t.sede] || t.sede || "—"}</span>
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono text-slate-300">{t.ot}</td>
                  <td className="py-2.5 pr-3 text-right font-mono text-slate-300">{t.terminadas}</td>
                  <td className="py-2.5 pr-3 text-right font-mono text-slate-300">{t.express}</td>
                  <td className={`py-2.5 pr-3 text-right font-mono ${t.conCronometro < t.ot ? "text-amber-300" : "text-slate-300"}`}>{t.conCronometro}/{t.ot}</td>
                  <td className="py-2.5 pr-3 text-right font-mono font-bold text-cyan-300">{t.conCronometro ? fmtDuration(t.netMs) : "—"}</td>
                  <td className="py-2.5 pr-3 text-right font-mono text-slate-300">{t.conCronometro ? fmtDuration(t.netMs / t.conCronometro) : "—"}</td>
                  <td className={`py-2.5 pr-3 text-right font-mono ${t.retrabajos ? "text-rose-300 font-bold" : "text-slate-500"}`}>{t.retrabajos}</td>
                  <td className={`py-2.5 text-right font-mono ${t.sospechosos ? "text-amber-300 font-bold" : "text-slate-500"}`}>{t.sospechosos ? `⚠ ${t.sospechosos}` : "0"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>

    {/* ── ASESORAS (por sede) ── */}
    <Card className="print:border-0 print:shadow-none">
      <h2 className="text-sm font-black text-slate-100 uppercase tracking-wider flex items-center gap-2 mb-2">
        <Users className="w-4 h-4 text-purple-400" /> Asesoras · por sede
      </h2>
      <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
        Gestión de cada sede en el período. <strong className="text-slate-400">Tasa de aprobación</strong> = presupuestos aprobados (pagados) / presupuestos enviados.
        "Listos sin aviso" y "Con almacenaje" son la situación actual.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
        {[
          { l: "Recepciones", v: totals.recepciones, c: "text-cyan-300" },
          { l: "Presupuestos", v: totals.presupuestos, c: "text-amber-300" },
          { l: "Aprobados", v: totals.aprobados, c: "text-emerald-300" },
          { l: "Tasa aprob.", v: totals.presupuestos ? `${Math.round((Math.min(totals.aprobados, totals.presupuestos) / totals.presupuestos) * 100)}%` : "—", c: "text-emerald-300" },
          { l: "Entregas", v: totals.entregas, c: "text-slate-100" },
          { l: "Listos sin aviso", v: totals.sinAviso, c: totals.sinAviso ? "text-rose-300" : "text-slate-100" }
        ].map((k) => (
          <div key={k.l} className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2">
            <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">{k.l}</p>
            <p className={`text-lg font-black font-mono ${k.c}`}>{k.v}</p>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
              <th className="py-2 pr-3">Sede</th>
              <th className="py-2 pr-3 text-right">Recepciones</th>
              <th className="py-2 pr-3 text-right">Presupuestos</th>
              <th className="py-2 pr-3 text-right">Aprobados</th>
              <th className="py-2 pr-3 text-right">Tasa</th>
              <th className="py-2 pr-3 text-right">Entregas</th>
              <th className="py-2 pr-3 text-right">Cancel.</th>
              <th className="py-2 pr-3 text-right">Express</th>
              <th className="py-2 pr-3 text-right">Avisos recojo</th>
              <th className="py-2 pr-3 text-right">Listos sin aviso</th>
              <th className="py-2 text-right">Con almacenaje</th>
            </tr>
          </thead>
          <tbody>
            {asesoras.map((a) => (
              <tr key={a.branch} className="border-b border-slate-800/70 hover:bg-slate-800/30">
                <td className="py-2.5 pr-3 font-bold" style={{ color: BRANCH_HEX[a.branch] }}>{BRANCH_LABELS[a.branch] || a.branch}</td>
                <td className="py-2.5 pr-3 text-right font-mono text-slate-300">{a.recepciones}</td>
                <td className="py-2.5 pr-3 text-right font-mono text-slate-300">{a.presupuestos}</td>
                <td className="py-2.5 pr-3 text-right font-mono text-slate-300">{a.aprobados}</td>
                <td className="py-2.5 pr-3 text-right font-mono font-bold text-emerald-300">
                  {a.tasaAprobacion === null ? "—" : `${Math.round(a.tasaAprobacion * 100)}%`}
                </td>
                <td className="py-2.5 pr-3 text-right font-mono text-slate-300">{a.entregas}</td>
                <td className="py-2.5 pr-3 text-right font-mono text-slate-400">{a.cancelaciones}</td>
                <td className="py-2.5 pr-3 text-right font-mono text-slate-300">
                  {a.expressCount} <span className="text-slate-500">· {fmtMoney(a.expressTotal)}</span>
                </td>
                <td className="py-2.5 pr-3 text-right font-mono text-slate-300">{a.avisosRecojo}</td>
                <td className={`py-2.5 pr-3 text-right font-mono ${a.listosSinAviso ? "text-rose-300 font-bold" : "text-slate-500"}`}>{a.listosSinAviso}</td>
                <td className={`py-2.5 text-right font-mono ${a.listosConAlmacenaje ? "text-amber-300 font-bold" : "text-slate-500"}`}>{a.listosConAlmacenaje}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
    </div>
  );
}

// ── View: BITÁCORA DE CAMBIOS ──
function BitacoraTab({ rows }: { rows: any[] }) {
  return (
    <Card className="print:border-0 print:shadow-none">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <History className="w-4 h-4 text-amber-400" /> Bitácora de Cambios · Ediciones de Recepción
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-slate-300">{rows.length}</span>
        </h2>
      </div>
      <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
        Registro de quién (asesora), cuándo y qué datos de recepción editó en cada OT. Sirve para auditoría de cambios.
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500 py-8 text-center">Sin ediciones de recepción en el período.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <th className="py-2 pr-3">Fecha / Hora</th>
                <th className="py-2 pr-3">Asesora</th>
                <th className="py-2 pr-3">OT</th>
                <th className="py-2 pr-3">Cliente</th>
                <th className="py-2 pr-3">Sede</th>
                <th className="py-2">Detalle de cambios</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c, i) => (
                <tr key={i} className="border-b border-slate-800/70 hover:bg-slate-800/30">
                  <td className="py-2.5 pr-3 text-slate-400 whitespace-nowrap">{c[0]}</td>
                  <td className="py-2.5 pr-3 font-bold text-amber-300 whitespace-nowrap">{c[1]}</td>
                  <td className="py-2.5 pr-3 font-mono text-cyan-300 whitespace-nowrap">{c[2]}</td>
                  <td className="py-2.5 pr-3 text-slate-100 capitalize">{c[3]}</td>
                  <td className="py-2.5 pr-3 text-slate-300 whitespace-nowrap">{c[4]}</td>
                  <td className="py-2.5 text-slate-200">{c[5]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}