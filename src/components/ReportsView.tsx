import React, { useMemo, useState } from "react";
import { Printer, Users, FileText, Search, Calendar, MapPin, ShieldCheck, Download, ListChecks } from "lucide-react";
import { RepairItem } from "../types";

interface ReportsViewProps {
  repairs: RepairItem[];
  userBranch?: string;
}

const BRANCH_LABELS: Record<string, string> = {
  lince_arenales: "San Isidro",
  surco: "Surco",
  san_borja: "San Borja",
  lince_leal: "Lince"
};

const STATUS_LABELS: Record<string, string> = {
  receptioned: "En Cola / Recibidos",
  diagnosing: "En Diagnóstico",
  quoted: "Presupuesto",
  paid: "Pagado",
  repairing: "En Reparación",
  testing: "En Pruebas",
  ready: "Listo para Entrega",
  delivered: "Entregado"
};

export default function ReportsView({ repairs, userBranch }: ReportsViewProps) {
  const [activeSection, setActiveSection] = useState<"clients" | "receipts">("clients");
  const [searchTerm, setSearchTerm] = useState("");
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedBranch, setSelectedBranch] = useState(userBranch || "all");
  const [printMode, setPrintMode] = useState(false);

  const branchList = userBranch ? [userBranch] : ["lince_arenales", "surco", "san_borja", "lince_leal"];

  // Clientes por local
  const clientReport = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const map = new Map<string, RepairItem>();
    repairs.forEach((r) => {
      if (selectedBranch !== "all" && r.workshopBranch !== selectedBranch) return;
      const key = r.client?.dni || r.client?.phone || r.client?.name || r.id;
      if (!map.has(key)) map.set(key, r);
    });

    let list = Array.from(map.values());
    if (term) {
      list = list.filter((r) =>
        (r.client?.name || "").toLowerCase().includes(term) ||
        (r.client?.phone || "").toLowerCase().includes(term) ||
        (r.client?.dni || "").toLowerCase().includes(term) ||
        (r.vehicle?.brand || "").toLowerCase().includes(term)
      );
    }
    return list.sort((a, b) => (a.client?.name || "").localeCompare(b.client?.name || ""));
  }, [repairs, selectedBranch, searchTerm]);

  // Recibos emitidos en la fecha seleccionada
  const dailyReceipts = useMemo(() => {
    return repairs
      .filter((r) => {
        const matchesDate = (r.receptionDate || "").slice(0, 10) === reportDate;
        const matchesBranch = selectedBranch === "all" || r.workshopBranch === selectedBranch;
        return matchesDate && matchesBranch;
      })
      .sort((a, b) => (a.id || "").localeCompare(b.id || ""));
  }, [repairs, reportDate, selectedBranch]);

  const totalDaily = dailyReceipts.reduce((sum, r) => sum + (r.actualCost || r.estimatedCost || 0), 0);

  const openPrintWindow = (title: string, content: string) => {
    const w = window.open("", "_blank");
    if (!w) {
      alert("Habilita las ventanas emergentes para imprimir.");
      return;
    }
    w.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>${title} - Litio Energy</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 30px; }
          h1 { font-size: 20px; margin: 0 0 4px; }
          h2 { font-size: 14px; color: #0e7490; margin: 0 0 16px; font-weight: 600; }
          .meta { font-size: 12px; color: #475569; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #0e7490; color: #fff; text-align: left; padding: 8px; }
          td { border: 1px solid #cbd5e1; padding: 7px; vertical-align: top; }
          tr:nth-child(even) td { background: #f8fafc; }
          .total { font-weight: 700; margin-top: 14px; font-size: 13px; }
          .header { display: flex; justify-content: space-between; border-bottom: 3px solid #0e7490; padding-bottom: 10px; margin-bottom: 16px; }
          .brand { font-size: 22px; font-weight: 800; color: #0f172a; }
          .brand span { color: #06b6d4; }
          .footer { margin-top: 24px; font-size: 10px; color: #94a3b8; text-align: center; }
          button { display: none; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">LITIO<span>ENERGY</span></div>
            <div style="font-size:11px; color:#475569;">Taller de Vehículos Eléctricos</div>
          </div>
          <div style="text-align:right; font-size:11px; color:#475569;">
            ${BRANCH_LABELS[selectedBranch] || "Todas las Sedes"}<br>
            ${new Date().toLocaleDateString("es-PE", { year: "numeric", month: "long", day: "numeric" })}
          </div>
        </div>
        ${content}
        <div class="footer">© 2026 Litio Energy S.A.C. - Documento generado por el Sistema Automatizado de Taller</div>
      </body>
      </html>
    `);
    w.document.close();
    w.print();
  };

  const printClients = () => {
    const rows = clientReport.map((r) => `
      <tr>
        <td>${r.client?.name || "—"}</td>
        <td>${r.client?.dni || "—"}</td>
        <td>${r.client?.phone || "—"}</td>
        <td>${r.vehicle?.brand || ""} ${r.vehicle?.model || ""}</td>
        <td>${r.workshopBranch ? BRANCH_LABELS[r.workshopBranch] || r.workshopBranch : "—"}</td>
        <td>${STATUS_LABELS[r.status] || r.status}</td>
      </tr>
    `).join("");
    const content = `
      <h2>Informe de Clientes por Local</h2>
      <div class="meta">Total de clientes: ${clientReport.length}</div>
      <table>
        <thead><tr><th>Cliente</th><th>DNI/RUC</th><th>Teléfono</th><th>Vehículo</th><th>Sede</th><th>Estado</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
    openPrintWindow("Informe de Clientes", content);
  };

  const printReceipts = () => {
    const rows = dailyReceipts.map((r) => `
      <tr>
        <td>${r.id || "—"}</td>
        <td>${r.client?.name || "—"}</td>
        <td>${r.vehicle?.brand || ""} ${r.vehicle?.model || ""}</td>
        <td>${r.workshopBranch ? BRANCH_LABELS[r.workshopBranch] || r.workshopBranch : "—"}</td>
        <td>S/ ${(r.actualCost || r.estimatedCost || 0).toFixed(2)}</td>
        <td>${STATUS_LABELS[r.status] || r.status}</td>
      </tr>
    `).join("");
    const content = `
      <h2>Reporte Diario de Recibos</h2>
      <div class="meta">Fecha: ${reportDate} | Total de recibos: ${dailyReceipts.length} | Monto total: S/ ${totalDaily.toFixed(2)}</div>
      <table>
        <thead><tr><th>N° Orden</th><th>Cliente</th><th>Vehículo</th><th>Sede</th><th>Monto</th><th>Estado</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="total">Total del día: S/ ${totalDaily.toFixed(2)}</div>
    `;
    openPrintWindow("Reporte Diario de Recibos", content);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Encabezado */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="relative">
          <p className="text-cyan-400 text-xs font-mono font-bold tracking-widest uppercase">Reportes y Documentos</p>
          <h1 className="font-display font-black text-2xl mt-1 tracking-tight">Informes por Local y Recibos Diarios</h1>
          <p className="text-slate-300 text-sm mt-1 max-w-xl">
            {userBranch
              ? `Local restringido: ${BRANCH_LABELS[userBranch] || userBranch}`
              : "Acceso administrador: puedes visualizar e imprimir todos los locales."}
          </p>
        </div>
      </div>

      {/* Selector de sección y filtros */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveSection("clients")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSection === "clients"
                ? "bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                : "bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Informe de Clientes</span>
          </button>
          <button
            onClick={() => setActiveSection("receipts")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSection === "receipts"
                ? "bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                : "bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Recibos del Día</span>
          </button>

          <div className="flex-1" />

          {!userBranch && (
            <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="bg-transparent text-slate-200 text-xs font-bold focus:outline-none"
              >
                <option value="all" className="bg-slate-950">Todas las sedes</option>
                <option value="lince_arenales" className="bg-slate-950">San Isidro</option>
                <option value="surco" className="bg-slate-950">Surco</option>
                <option value="san_borja" className="bg-slate-950">San Borja</option>
                <option value="lince_leal" className="bg-slate-950">Lince</option>
              </select>
            </div>
          )}
        </div>

        {activeSection === "clients" ? (
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar cliente por nombre, DNI, teléfono o vehículo..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-950 text-xs text-slate-200 border border-slate-800 rounded-xl focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
            <button
              onClick={printClients}
              className="flex items-center space-x-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-bold transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Informe</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="bg-transparent text-slate-200 text-xs font-bold focus:outline-none [color-scheme:dark]"
              />
            </div>
            <button
              onClick={printReceipts}
              className="flex items-center space-x-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-bold transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Recibos del Día</span>
            </button>
            <span className="text-xs text-slate-400 font-mono">
              {dailyReceipts.length} recibos • S/ {totalDaily.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Contenido */}
      {activeSection === "clients" ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold text-slate-100">Relación de Clientes</span>
            </div>
            <span className="text-xs bg-slate-950 text-slate-400 px-2.5 py-0.5 rounded-full font-mono border border-slate-800">
              {clientReport.length} clientes
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-800 bg-slate-950/60">
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">DNI/RUC</th>
                  <th className="px-4 py-3">Teléfono</th>
                  <th className="px-4 py-3">Vehículo</th>
                  <th className="px-4 py-3">Sede</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientReport.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                      No se encontraron clientes para el local seleccionado.
                    </td>
                  </tr>
                ) : (
                  clientReport.map((r) => (
                    <tr key={r.id} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-100">{r.client?.name || "—"}</td>
                      <td className="px-4 py-3 font-mono text-slate-300">{r.client?.dni || "—"}</td>
                      <td className="px-4 py-3 text-slate-300">{r.client?.phone || "—"}</td>
                      <td className="px-4 py-3 text-slate-300">{r.vehicle?.brand} {r.vehicle?.model}</td>
                      <td className="px-4 py-3 text-slate-300">{r.workshopBranch ? BRANCH_LABELS[r.workshopBranch] || r.workshopBranch : "—"}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950/40 text-cyan-300 border border-cyan-900/60">
                          {STATUS_LABELS[r.status] || r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => { setActiveSection("receipts"); setReportDate((r.receptionDate || "").slice(0, 10)); }}
                          className="flex items-center space-x-1 px-2 py-1 bg-slate-950 hover:bg-slate-800 text-cyan-400 rounded-lg text-[10px] font-bold border border-slate-800 transition-colors"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Recibo</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold text-slate-100">Recibos Emitidos - {reportDate}</span>
            </div>
            <span className="text-xs bg-slate-950 text-slate-400 px-2.5 py-0.5 rounded-full font-mono border border-slate-800">
              {dailyReceipts.length} recibos
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-800 bg-slate-950/60">
                  <th className="px-4 py-3">N° Orden</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Vehículo</th>
                  <th className="px-4 py-3">Sede</th>
                  <th className="px-4 py-3">Monto</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {dailyReceipts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                      No se emitieron recibos en esta fecha.
                    </td>
                  </tr>
                ) : (
                  dailyReceipts.map((r) => (
                    <tr key={r.id} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-cyan-400">{r.id || "—"}</td>
                      <td className="px-4 py-3 font-semibold text-slate-100">{r.client?.name || "—"}</td>
                      <td className="px-4 py-3 text-slate-300">{r.vehicle?.brand} {r.vehicle?.model}</td>
                      <td className="px-4 py-3 text-slate-300">{r.workshopBranch ? BRANCH_LABELS[r.workshopBranch] || r.workshopBranch : "—"}</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-100">S/ {(r.actualCost || r.estimatedCost || 0).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/40 text-emerald-300 border border-emerald-900/60">
                          {STATUS_LABELS[r.status] || r.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {dailyReceipts.length > 0 && (
            <div className="p-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">Total del día</span>
              <span className="text-lg font-mono font-black text-cyan-400">S/ {totalDaily.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
