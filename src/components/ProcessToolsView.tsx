import React, { useState } from "react";
import { Timer, Users, ChevronLeft, ArrowUpRight } from "lucide-react";
import { RepairItem } from "../types";
import TimeMetricsView from "./TimeMetricsView";
import ClientHistoryView from "./ClientHistoryView";

interface ProcessToolsViewProps {
  repairs: RepairItem[];
  onUpdateRepair?: (id: string, updateData: any) => Promise<void>;
  userLocalKey?: string;
  canEdit?: boolean;
  technicians?: string[];
}

type ToolMode = "menu" | "metricas" | "clientes";

export default function ProcessToolsView({
  repairs,
  onUpdateRepair,
  userLocalKey,
  canEdit = false,
  technicians = []
}: ProcessToolsViewProps) {
  const [mode, setMode] = useState<ToolMode>("menu");

  if (mode === "metricas") {
    return (
      <div className="space-y-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <button
            type="button"
            onClick={() => setMode("menu")}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-100 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Volver a Tiempos por Proceso
          </button>
        </div>
        <TimeMetricsView
          repairs={repairs}
          userLocalKey={userLocalKey}
          canEdit={canEdit}
          technicians={technicians}
        />
      </div>
    );
  }

  if (mode === "clientes") {
    return (
      <div className="space-y-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <button
            type="button"
            onClick={() => setMode("menu")}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-100 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Volver a Tiempos por Proceso
          </button>
        </div>
        <ClientHistoryView repairs={repairs} onUpdateRepair={onUpdateRepair} userLocalKey={userLocalKey} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/30 p-6 sm:p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500/5 rounded-full blur-2xl"></div>
        <div className="relative">
          <p className="text-cyan-400 text-[10px] font-mono font-bold tracking-[0.25em] uppercase mb-1">Control de Tiempos</p>
          <h1 className="font-display font-black text-2xl sm:text-3xl tracking-tight">Tiempos por Proceso</h1>
          <p className="text-slate-400 text-xs mt-2 max-w-lg leading-relaxed">
            Elige una herramienta: las métricas de tiempos de cada etapa del taller, o el historial de clientes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <button
          type="button"
          onClick={() => setMode("metricas")}
          className="group text-left bg-slate-900 rounded-3xl border border-slate-800 hover:border-cyan-500/40 p-6 transition-all shadow-xl hover:shadow-[0_0_25px_rgba(6,182,212,0.1)]"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/25 rounded-2xl">
              <Timer className="w-6 h-6 text-cyan-400" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-slate-600 group-hover:text-cyan-400 transition-colors" />
          </div>
          <p className="font-display font-black text-base text-slate-100 tracking-tight uppercase">
            Métricas de Tiempos por Proceso
          </p>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Tiempo promedio de cada etapa del taller comparado contra tu meta, y rendimiento por técnico.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setMode("clientes")}
          className="group text-left bg-slate-900 rounded-3xl border border-slate-800 hover:border-purple-500/40 p-6 transition-all shadow-xl hover:shadow-[0_0_25px_rgba(168,85,247,0.1)]"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500/10 border border-purple-500/25 rounded-2xl">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-slate-600 group-hover:text-purple-400 transition-colors" />
          </div>
          <p className="font-display font-black text-base text-slate-100 tracking-tight uppercase">
            Historial de Clientes
          </p>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Servicios de tu sede por estado (en curso, en pausa, esperando), con su tiempo. Busca un cliente por nombre, celular o documento.
          </p>
        </button>
      </div>
    </div>
  );
}