import React from "react";
import { CalendarRange } from "lucide-react";
import { PeriodKey, PERIOD_PRESETS } from "../data/metrics";

interface PeriodFilterProps {
  value: PeriodKey;
  onChange: (key: PeriodKey) => void;
  showLabel?: boolean;
}

export default function PeriodFilter({ value, onChange, showLabel = true }: PeriodFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {showLabel && (
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
          <CalendarRange className="w-3.5 h-3.5 text-cyan-400" />
          Período
        </span>
      )}
      {PERIOD_PRESETS.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => onChange(p.key)}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
            value === p.key
              ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
              : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-600 hover:text-slate-300"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}