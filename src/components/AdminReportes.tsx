import React, { useState, useMemo, useEffect } from "react";
import {
  LayoutDashboard, Users, Wrench, CircleDollarSign, GraduationCap,
  Printer, FileSpreadsheet, Search, CalendarRange, Building2,
  ChevronRight, TrendingUp, Receipt, Clock, CheckCircle2, Zap,
  Activity, AlertCircle, Timer, Target, Save, Hourglass
} from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import { RepairItem } from "../types";
import { db, isFirebaseConfigured, collection, getDocs } from "../firebase";
import { loadConfig } from "../auth";
import {
  BRANCH_LABELS, BRANCHES, BRANCH_HEX, fmtMoney, fmtDuration,
  currentLiveStage, LIVE_STAGE_ORDER, STAGE_COLOR, STAGE_LABELS,
  STAGE_KEYS, median, stageTimings, esperaDurationMs, trafficColor,
  inReceptionPeriod, monthlyTrend, Goals, loadGoals, saveGoals
} from "../data/metrics";

type ReporteView = "dashboard" | "clientes" | "servicios" | "finanzas" | "tecnicos";
type RangePreset = "hoy" | "7d" | "30d" | "todo" | "custom";

const SERVICE_LABELS: Record<string, string> = {
  mantenimiento: "Mantenimiento",
  diagnostico: "Diagnóstico",
  garantia: "Garantía",
  cambio: "Cambio / Repuesto",
  express: "Servicio Express"
};
const SERVICE_COLORS: Record<string, string> = {
  mantenimiento: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  diagnostico: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  garantia: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  cambio: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  express: "bg-rose-500/15 text-rose-300 border-rose-500/30"
};

const PRESETS: Array<{ key: RangePreset; label: string }> = [
  { key: "hoy", label: "Hoy" },
  { key: "7d", label: "Semana" },
  { key: "30d", label: "Mes" },
  { key: "todo", label: "Todo" }
];

const NAV: Array<{ key: ReporteView; label: string; desc: string; icon: React.ElementType }> = [
  { key: "dashboard", label: "Dashboard", desc: "Operación en vivo · resumen", icon: LayoutDashboard },
  { key: "clientes", label: "Lista de Clientes", desc: "Clientes registrados", icon: Users },
  { key: "servicios", label: "Tipos de Servicio", desc: "Conteo por servicio", icon: Wrench },
  { key: "finanzas", label: "Finanzas", desc: "Ingresos y recibos", icon: CircleDollarSign },
  { key: "tecnicos", label: "Técnicos", desc: "Horas de trabajo", icon: GraduationCap }
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
      const d = new Date(Number(m[3] >= 100 ? m[3] : "20" + m[3]), Number(m[2]) - 1, Number(m[1]));
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
  const [clientes, setClientes] = useState<any[]>([]);
  const [clientesOk, setClientesOk] = useState(false);
  const [now, setNow] = useState<number>(() => Date.now());
  const [editingGoals, setEditingGoals] = useState(false);
  const [draftGoals, setDraftGoals] = useState<Goals>(() => loadGoals());
  const [goals, setGoals] = useState<Goals>(() => loadGoals());

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
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, "clientes"));
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
        if (mounted) { setClientes(data); setClientesOk(true); }
      } catch { if (mounted) setClientesOk(false); }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // ── DATOS SEGÚN SEDE ──
  const scopedRepairs = useMemo(
    () => repairs.filter((r) => sede === "__all__" || r.workshopBranch === sede),
    [repairs, sede]
  );
  const scopedExpress = useMemo(
    () => expressReceipts.filter((e) => sede === "__all__" || e.localKey === sede),
    [expressReceipts, sede]
  );

  // Órdenes activas con su etapa en vivo
  const liveRows = useMemo(() => {
    const out: any[] = [];
    scopedRepairs.forEach((r) => {
      if (r.status === "delivered") return;
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
    const activas = scopedRepairs.filter((r) => r.status !== "delivered").length;
    const enEspera = byStage["espera"]?.length || 0;
    const enTrabajo = (byStage["repairing"]?.length || 0) + (byStage["testing"]?.length || 0) + (byStage["diagnosing"]?.length || 0) + (byStage["quoted"]?.length || 0) + (byStage["paid"]?.length || 0);
    const listos = byStage["ready"]?.length || 0;
    return { activas, enEspera, enTrabajo, listos, alertas: alerts.length };
  }, [scopedRepairs, byStage, alerts]);

  const clientesFiltered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const list = clientes.slice().sort((a, b) => {
      const ia = String(a.internalId || ""); const ib = String(b.internalId || "");
      return ia.localeCompare(ib, "en", { numeric: true });
    });
    if (!ql) return list;
    return list.filter((c) =>
      String(c.name || "").toLowerCase().includes(ql) ||
      String(c.dni || "").toLowerCase().includes(ql) ||
      String(c.phone || "").toLowerCase().includes(ql) ||
      String(c.internalId || "").toLowerCase().includes(ql)
    );
  }, [clientes, q]);

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
  const tecnicos = useMemo(() => {
    const cfg = loadConfig();
    const map: Record<string, { name: string; sede: string }> = {};
    (cfg?.locales || []).forEach((l: any) => {
      (l?.tecnicos || []).forEach((t: any) => {
        map[String(t?.name || "").trim().toLowerCase()] = { name: String(t?.name || "").trim(), sede: l.key };
      });
    });
    const agg: Record<string, { name: string; sede: string; ot: number; express: number; ms: number }> = {};
    const upsert = (raw: string, sedeHint: string) => {
      const n = String(raw || "").replace(/^T[eé]c\.\s*/i, "").trim();
      if (!n) return null;
      const key = n.toLowerCase();
      const found = map[key] ||
        (/(carlos yucra|erick urbano|luis soto|jose rivero)/i.test(key) ? { name: n, sede: "lince_arenales" } :
        /^(elmer|cristian ojeda|diego|fernando luque)/i.test(key) ? { name: n, sede: "surco" } :
        /^(jesus)$/i.test(key) ? { name: n, sede: "san_borja" } :
        /^(cristian)$/i.test(key) ? { name: n, sede: "lince_leal" } : null);
      if (!agg[key]) agg[key] = { name: found ? found.name : n, sede: found ? found.sede : sedeHint, ot: 0, express: 0, ms: 0 };
      return agg[key];
    };
    scopedRepairs.forEach((r) => {
      const t = tsOf(r.deliveredAt || r.receptionDate);
      if (!inRange(t, range)) return;
      const a = upsert(r.technicianName || r.assignedTech || r.diagnosisTech || "", r.workshopBranch);
      if (!a) return;
      a.ot++;
      const start = tsOf(r.serviceStartedAt || r.receptionDate);
      const end = tsOf(r.deliveredAt);
      if (isFinite(start) && isFinite(end) && end > start) a.ms += end - start;
    });
    scopedExpress.forEach((e) => {
      const t = expressTs(e);
      if (!inRange(t, range)) return;
      const a = upsert(e.technicianName || e.createdBy || "", e.localKey);
      if (!a) return;
      a.express++;
    });
    return Object.values(agg).sort((a, b) => b.ms - a.ms);
  }, [scopedRepairs, scopedExpress, range]);

  // ── FINANZAS ──
  const finanzas = useMemo(() => {
    const otRows = scopedRepairs
      .filter((r) => r.status === "delivered")
      .map((r) => {
        const t = tsOf(r.deliveredAt || r.deliveryDate || r.receptionDate);
        return {
          fecha: t, tipo: r.serviceType, cliente: r.client?.name || "", id: r.id,
          sede: r.workshopBranch, metodo: r.payment?.paymentMethod || "efectivo", monto: r.actualCost || r.estimatedCost || 0, origen: "OT"
        };
      })
      .filter((x) => inRange(x.fecha, range));
    const exRows = scopedExpress
      .map((e) => ({
        fecha: expressTs(e), tipo: "express", cliente: e.clientName || "",
        id: e.correlative || e.id || "", sede: e.localKey, metodo: e.paymentMethod || "efectivo",
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
    finanzas.all.forEach((r: any) => { map[r.metodo || "efectivo"] = (map[r.metodo || "efectivo"] || 0) + r.monto; });
    const order: Record<string, number> = { efectivo: 0, transferencia: 1, yape_plin: 2, tarjeta: 3 };
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
    () => monthlyTrend(sede === "__all__" ? repairs : scopedRepairs),
    [repairs, scopedRepairs, sede]
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
      clientes: clientes.length,
      tecnicos: tecnicos.length,
      ...operacionStats
    };
  }, [scopedRepairs, scopedExpress, range, clientes, tecnicos, operacionStats]);

  // ── Exportaciones ──
  const clientesRows: unknown[][] = [
    ["ID", "Nombre", "DNI", "Teléfono", "Tipo de Vehículo", "Última actualización"],
    ...clientesFiltered.map((c) => [
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
  const tecnicosRows: unknown[][] = [
    ["Técnico", "Sede", "Órdenes Atendidas", "Express", "Horas de Trabajo"],
    ...tecnicos.map((t) => [t.name, BRANCH_LABELS[t.sede] || t.sede || "—", t.ot, t.express, fmtDuration(t.ms)])
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
        drawHeader("Lista de Clientes");
        sectionTitle("1. Lista de Clientes");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(`Total de clientes: ${clientesFiltered.length}`, margin, y);
        y += 14;
        const rows = clientesFiltered.map((c) => [
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
      } else {
        drawHeader("Técnicos · Horas de Trabajo");
        sectionTitle("4. Técnicos · Horas de Trabajo");
        const rows = tecnicos.map((t) => [t.name, BRANCH_LABELS[t.sede] || t.sede || "—", t.ot, t.express, fmtDuration(t.ms)]);
        drawTable(["Técnico", "Sede", "Órdenes Atendidas", "Express", "Horas de Trabajo"], rows, [1.5, 1.3, 1.1, 0.9, 1.2]);
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
              Operación en vivo, finanzas, servicios, clientes y técnicos en una sola vista. Todo exportable a PDF y Excel.
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
                  onClick={() => exportExcel(currentExportRows(), `reporte_${view}`)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black transition-all"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
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
              <input
                type="date"
                value={customFrom}
                onChange={(e) => { setCustomFrom(e.target.value); setPreset("custom"); }}
                className="px-2 py-1.5 bg-slate-950 text-slate-200 text-xs border border-slate-800 rounded-lg focus:outline-none focus:border-cyan-500/50"
              />
              <span className="text-slate-500 text-xs">→</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => { setCustomTo(e.target.value); setPreset("custom"); }}
                className="px-2 py-1.5 bg-slate-950 text-slate-200 text-xs border border-slate-800 rounded-lg focus:outline-none focus:border-cyan-500/50"
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

      {/* KPIs GENERALES */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <KpiSmall label="Activas" value={kpis.activas} sub="En el taller" icon={Activity} color="cyan" />
        <KpiSmall label="En Espera" value={kpis.enEspera} sub="Sin técnico" icon={Clock} color="rose" />
        <KpiSmall label="En Trabajo" value={kpis.enTrabajo} sub="Presup./Repar." icon={Wrench} color="blue" />
        <KpiSmall label="Listos" value={kpis.listos} sub="Para entrega" icon={CheckCircle2} color="teal" />
        <KpiSmall label="Alertas" value={kpis.alertas} sub="Sobre la meta" icon={AlertCircle} color={kpis.alertas ? "red" : "emerald"} />
        <KpiSmall label="Entregados" value={kpis.entregadas} sub={`Ticket ${fmtMoney(kpis.ticket)}`} icon={TrendingUp} color="emerald" />
        <KpiSmall label="Ingresos Taller" value={fmtMoney(kpis.ingresosOT)} sub="OT entregadas" icon={CircleDollarSign} color="purple" />
        <KpiSmall label="Express" value={fmtMoney(kpis.ingresosEx)} sub="Recibos express" icon={Zap} color="amber" />
        <KpiSmall label="Ingresos Totales" value={fmtMoney(kpis.total)} sub="Taller + Express" icon={Receipt} color="pink" />
        <KpiSmall label="Clientes" value={clientesOk ? kpis.clientes : "…"} sub="Registrados" icon={Users} color="orange" />
        <KpiSmall label="Técnicos" value={kpis.tecnicos} sub="Con actividad" icon={GraduationCap} color="slate" />
        <KpiSmall label="Rango" value={fmtFecha(range.from > 0 ? range.from : Date.now())} sub={`→ ${fmtFecha(range.to)}`} icon={CalendarRange} color="cyan" />
      </div>

      {/* ALERTAS DE TIEMPO */}
      {alerts.length > 0 && (
        <div className="bg-rose-950/40 border border-rose-800/60 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-3 px-4 border-b border-rose-800/50 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span className="text-xs font-black text-rose-200 uppercase tracking-wider">Tiempos vencidos</span>
            <span className="ml-auto text-[10px] font-mono text-rose-300/80">{alerts.length} alertas · por retraso</span>
          </div>
          <div className="p-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {alerts.slice(0, 9).map((a) => (
              <div key={a.repair.id} className="bg-slate-950/60 rounded-xl border border-rose-900/40 px-3 py-2 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-slate-100 truncate">
                    {a.repair.client?.name || "Sin nombre"}
                    <span className="text-slate-500 font-mono ml-1.5">#{a.repair.id.slice(0, 6)}</span>
                  </p>
                  <p className="text-[9px] text-rose-300/80 font-medium truncate">
                    {a.repair.vehicle?.type || "vehículo"} · {STAGE_LABELS[a.stage] || a.stage}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-mono font-black text-sm ${a.level === "critical" ? "text-rose-400" : "text-amber-400"}`}>{fmtDuration(a.elapsedMs)}</p>
                  <p className="text-[9px] text-slate-500 font-mono">meta {fmtDuration(a.goalMs)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
              operacion={operacionStats}
              liveRows={liveRows}
              byStage={byStage}
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
            <ClientesTab rows={clientesFiltered} q={q} setQ={setQ} loading={!clientesOk && clientes.length === 0} />
          )}
          {view === "servicios" && (
            <ServiciosTab rows={serviciosRows} total={servicesSummary.total} />
          )}
          {view === "finanzas" && (
            <FinanzasTab finanzas={finanzas} byMethod={finanzasByMethod} />
          )}
          {view === "tecnicos" && (
            <TecnicosTab rows={tecnicos} />
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
function DashboardView({ operacion, liveRows, byStage, goals, services, porSede, maxSede, trend, maxTrend, editingGoals, draftGoals, setEditingGoals, setDraftGoals, applyGoals, draftSet, filteredRepairs, technicianNames }: {
  operacion: { activas: number; enEspera: number; enTrabajo: number; listos: number; alertas: number };
  liveRows: any[]; byStage: Record<string, any[]>; goals: Goals;
  services: { counts: Record<string, number>; total: number };
  porSede: Array<{ branch: string; label: string; taller: number; count: number; express: number }>;
  maxSede: number; trend: Array<{ key: string; label: string; revenue: number }>; maxTrend: number;
  editingGoals: boolean; draftGoals: Goals; setEditingGoals: (v: boolean) => void;
  setDraftGoals: (g: Goals) => void; applyGoals: () => void; draftSet: (k: string, h: string) => void;
  filteredRepairs: RepairItem[]; technicianNames: Set<string>;
}) {
  const nivelStyle: Record<string, { text: string; bar: string; glow: string }> = {
    ok: { text: "text-slate-200", bar: "bg-slate-600", glow: "" },
    warn: { text: "text-amber-400", bar: "bg-amber-500", glow: "shadow-[0_0_12px_rgba(245,158,11,0.3)]" },
    critical: { text: "text-rose-400", bar: "bg-rose-500", glow: "shadow-[0_0_12px_rgba(244,63,94,0.4)]" }
  };

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
          Promedio real de cada etapa vs tu meta (semáforo verde / ámbar / rojo). Ajusta las metas para activarlo en la operación en vivo.
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

      {/* Operación en vivo por etapa */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h2 className="font-display font-black text-sm text-slate-100 uppercase tracking-wider">Operación en Vivo</h2>
          <span className="ml-auto text-[10px] font-mono text-slate-500">{liveRows.length} órdenes activas · actualiza cada 30s</span>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-3 gap-3">
          {LIVE_STAGE_ORDER.map((stage) => {
            const items = byStage[stage] || [];
            const overCount = items.filter((i) => i.over).length;
            const color = STAGE_COLOR[stage] || "cyan";
            return (
              <div key={stage} className="bg-slate-950/60 rounded-xl border border-slate-800/70 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full ${BAR_COLOR[color]}`}></span>
                    <span className="text-[11px] font-black text-slate-200 uppercase tracking-wider truncate">{STAGE_LABELS[stage] || stage}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {overCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[9px] font-black">
                        {overCount} ⚠
                      </span>
                    )}
                    <span className="px-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 text-[9px] font-mono font-black">{items.length}</span>
                  </div>
                </div>
                {items.length === 0 ? (
                  <p className="text-[10px] text-slate-600 text-center py-3">Sin órdenes</p>
                ) : (
                  <div className="space-y-2">
                    {items.slice(0, 3).map((r) => {
                      const st = nivelStyle[r.level];
                      const pct = r.goalMs > 0 ? Math.min((r.elapsedMs / r.goalMs) * 100, 100) : 0;
                      return (
                        <div key={r.repair.id} className={`bg-slate-900/60 rounded-lg border border-slate-800/70 p-2 ${r.over ? st.glow : ""}`}>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-bold text-slate-100 truncate">{r.repair.client?.name || "Sin nombre"}</p>
                            <span className={`font-mono font-black text-xs ${st.text}`}>{fmtDuration(r.elapsedMs)}</span>
                          </div>
                          <p className="text-[9px] text-slate-500 truncate">
                            {r.repair.vehicle?.brand || ""} {r.repair.vehicle?.type || ""} · meta {fmtDuration(r.goalMs)}
                          </p>
                          <div className="mt-1">
                            <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden">
                              <div className={`${st.bar} h-full rounded-full transition-all`} style={{ width: `${pct}%` }}></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {items.length > 3 && (
                      <p className="text-[9px] text-slate-500 font-mono text-center">+{items.length - 3} más</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Servicios del período */}
      <Card>
        <h2 className="text-sm font-black text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-cyan-400" /> Servicios en el período
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {["mantenimiento", "diagnostico", "garantia", "cambio", "express"].map((k) => (
            <div key={k} className={`rounded-2xl border p-4 ${SERVICE_COLORS[k] || "border-slate-700"}`}>
              <p className="text-[10px] uppercase font-bold tracking-wider opacity-80">{SERVICE_LABELS[k]}</p>
              <p className="text-3xl font-black font-mono mt-1">{services.counts[k] || 0}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Ingresos por sede + tendencia */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <h2 className="text-sm font-black text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
            <CircleDollarSign className="w-4 h-4 text-emerald-400" /> Ingresos por Sede
          </h2>
          <div className="space-y-3.5">
            {porSede.map((b) => (
              <div key={b.branch} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">{b.label}</span>
                  <span className="text-xs font-black font-mono" style={{ color: BRANCH_HEX[b.branch] }}>{fmtMoney(b.taller + b.express)}</span>
                </div>
                <div className="w-full bg-slate-950/80 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${((b.taller + b.express) / maxSede) * 100}%`, backgroundColor: BRANCH_HEX[b.branch] }}></div>
                </div>
                <p className="text-[9px] text-slate-500 font-mono">{b.count} OT · {fmtMoney(b.express)} express</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="text-sm font-black text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" /> Ingresos · Últimos 6 meses
          </h2>
          <div className="grid grid-cols-6 gap-2 items-end h-36">
            {trend.map((t) => (
              <div key={t.key} className="flex flex-col items-center justify-end h-full gap-1.5">
                <span className="text-[8px] font-mono font-bold text-slate-400">{fmtMoney(t.revenue)}</span>
                <div className="w-full rounded-t-lg bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all duration-700" style={{ height: `${Math.max((t.revenue / maxTrend) * 100, 2)}%` }} title={`${t.label}: ${fmtMoney(t.revenue)}`}></div>
                <span className="text-[9px] font-bold uppercase text-slate-500">{t.label}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── View: CLIENTES ──
function ClientesTab({ rows, q, setQ, loading }: {
  rows: any[]; q: string; setQ: (v: string) => void; loading: boolean;
}) {
  return (
    <Card className="print:border-0 print:shadow-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <Users className="w-4 h-4 text-cyan-400" /> Lista de Clientes
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-slate-300">{rows.length}</span>
        </h2>
        <div className="relative print:hidden">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, DNI, ID..."
            className="w-full sm:w-64 pl-9 pr-3 py-2 bg-slate-950 text-slate-100 text-xs border border-slate-800 rounded-xl focus:outline-none focus:border-cyan-500/50"
          />
        </div>
      </div>
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
                <th className="py-2">Últ. actualización</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c, i) => {
                const updated = c.updatedAt ? fmtFechaHora(new Date(c.updatedAt).getTime()) : c.createdAt ? fmtFechaHora(new Date(Number(c.createdAt)).getTime()) : "—";
                const vehicle = [c.vehicleType, c.vehicleBrand, c.vehicleModel].filter(Boolean).join(" ") || "—";
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
                  </tr>
                );
              })}
            </tbody>
          </table>
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
              {BRANCHES.map((j) => {
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

// ── View: FINANZAS ──
function FinanzasTab({ finanzas, byMethod }: { finanzas: any; byMethod: Array<[string, number]> }) {
  const maxMethod = Math.max(...byMethod.map(([, v]) => v), 1);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiSmall label="Ingresos OT" value={fmtMoney(finanzas.totalOT)} sub="Órdenes entregadas" icon={TrendingUp} color="emerald" />
        <KpiSmall label="Ingresos Express" value={fmtMoney(finanzas.totalEx)} sub="Recibos express" icon={Zap} color="rose" />
        <KpiSmall label="Total" value={fmtMoney(finanzas.total)} sub={`${finanzas.count} registros`} icon={CircleDollarSign} color="cyan" />
        <KpiSmall label="Método principal" value={byMethod[0]?.[0] || "—"} sub={byMethod[0] ? fmtMoney(byMethod[0][1]) : ""} icon={Receipt} color="amber" />
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
                <span className="w-28 shrink-0 text-[11px] font-bold text-slate-300 capitalize">{m}</span>
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
function TecnicosTab({ rows }: { rows: any[] }) {
  return (
    <Card className="print:border-0 print:shadow-none">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" /> Técnicos · Horas de Trabajo
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-slate-300">{rows.length}</span>
        </h2>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500 py-8 text-center">Sin actividad de técnicos en el período.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <th className="py-2 pr-3">Técnico</th>
                <th className="py-2 pr-3">Sede</th>
                <th className="py-2 pr-3 text-right">Órdenes Atendidas</th>
                <th className="py-2 pr-3 text-right">Express</th>
                <th className="py-2 text-right">Horas de Trabajo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t, i) => (
                <tr key={i} className="border-b border-slate-800/70 hover:bg-slate-800/30">
                  <td className="py-2.5 pr-3 font-bold text-slate-100">{t.name}</td>
                  <td className="py-2.5 pr-3">
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-bold text-slate-300">{BRANCH_LABELS[t.sede] || t.sede || "—"}</span>
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono text-slate-300">{t.ot}</td>
                  <td className="py-2.5 pr-3 text-right font-mono text-slate-300">{t.express}</td>
                  <td className="py-2.5 text-right font-mono font-bold text-cyan-300">{fmtDuration(t.ms)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}