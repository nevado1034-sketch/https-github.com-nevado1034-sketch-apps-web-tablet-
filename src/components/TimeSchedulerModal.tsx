import React, { useState } from "react";
import { Clock, X } from "lucide-react";

interface TimeSchedulerModalProps {
  serviceType: string;
  onConfirm: (deadline: string) => void;
  onCancel: () => void;
}

const PRESETS = [
  { label: "1 hora", hours: 1 },
  { label: "2 horas", hours: 2 },
  { label: "4 horas", hours: 4 },
  { label: "8 horas (hoy)", hours: 8 },
  { label: "1 día", hours: 24 },
  { label: "2 días", hours: 48 },
];

const SERVICE_LABELS: Record<string, string> = {
  mantenimiento: "Mantenimiento",
  diagnostico: "Diagnóstico",
  garantia: "Garantía",
  cambio: "Cambio / Repuesto",
};

export default function TimeSchedulerModal({ serviceType, onConfirm, onCancel }: TimeSchedulerModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);

  const handlePreset = (hours: number) => {
    const deadline = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    onConfirm(deadline);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold text-white">Programar Tiempo</h2>
          </div>
          <button onClick={onCancel} className="p-1 text-slate-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="text-xs text-slate-400">
            Servicio: <span className="font-bold text-cyan-300">{SERVICE_LABELS[serviceType] || serviceType}</span>
          </p>
          <p className="text-xs text-slate-400">
            ¿Cuándo debe estar listo el vehículo?
          </p>

          {/* Preset buttons */}
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.hours}
                onClick={() => handlePreset(p.hours)}
                className="px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 hover:bg-cyan-500/10 hover:border-cyan-500/50 hover:text-cyan-300 transition-all"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
