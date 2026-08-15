import React, { useState } from "react";
import { ShieldCheck, UserRound, MapPin, Save, Plus, Trash2, Lock, Store } from "lucide-react";
import { AuthConfig, LocalAccess, defaultConfig } from "../auth";

interface AccessManagerProps {
  initial: AuthConfig;
  onSave: (config: AuthConfig) => void;
  saveLabel?: string;
}

function cleanConfig(config: AuthConfig): AuthConfig {
  const clean: AuthConfig = {
    admin: { name: config.admin.name.trim(), clave: config.admin.clave },
    locales: config.locales.map((loc) => ({
      key: loc.key,
      name: loc.name,
      jefa: { name: loc.jefa.name.trim(), clave: loc.jefa.clave },
      tecnicos: loc.tecnicos
        .filter((t) => t.name.trim() !== "" || t.clave !== "")
        .map((t) => ({ name: t.name.trim(), clave: t.clave }))
    }))
  };
  return clean;
}

export default function AccessManager({ initial, onSave, saveLabel }: AccessManagerProps) {
  const [config, setConfig] = useState<AuthConfig>(() => defaultConfig());

  React.useEffect(() => {
    if (initial && Array.isArray(initial.locales)) {
      setConfig(JSON.parse(JSON.stringify(initial)));
    }
  }, [initial]);

  const updateAdmin = (field: "name" | "clave", value: string) =>
    setConfig((c) => ({ ...c, admin: { ...c.admin, [field]: value } }));

  const updateJefa = (idx: number, field: "name" | "clave", value: string) =>
    setConfig((c) => {
      const locales = [...c.locales];
      locales[idx] = { ...locales[idx], jefa: { ...locales[idx].jefa, [field]: value } };
      return { ...c, locales };
    });

  const updateTecnico = (locIdx: number, techIdx: number, field: "name" | "clave", value: string) =>
    setConfig((c) => {
      const locales = [...c.locales];
      const tecnicos = [...locales[locIdx].tecnicos];
      tecnicos[techIdx] = { ...tecnicos[techIdx], [field]: value };
      locales[locIdx] = { ...locales[locIdx], tecnicos };
      return { ...c, locales };
    });

  const addTecnico = (locIdx: number) =>
    setConfig((c) => {
      const locales = [...c.locales];
      locales[locIdx] = { ...locales[locIdx], tecnicos: [...locales[locIdx].tecnicos, { name: "", clave: "" }] };
      return { ...c, locales };
    });

  const removeTecnico = (locIdx: number, techIdx: number) =>
    setConfig((c) => {
      const locales = [...c.locales];
      const tecnicos = locales[locIdx].tecnicos.filter((_, i) => i !== techIdx);
      locales[locIdx] = { ...locales[locIdx], tecnicos };
      return { ...c, locales };
    });

  const adminOk = config.admin.name.trim() !== "" && config.admin.clave !== "";
  const localesOk = config.locales.every(
    (loc) => loc.jefa.name.trim() !== "" && loc.jefa.clave !== ""
  );
  const complete = adminOk && localesOk;

  return (
    <div className="space-y-6">
      {/* Admin */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl border bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold text-sm text-white">Administrador</p>
            <p className="text-[10px] text-slate-400 leading-tight mt-0.5">Ve y controla todos los locales</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={config.admin.name}
              onChange={(e) => updateAdmin("name", e.target.value)}
              placeholder="Nombre del administrador"
              className="w-full pl-9 pr-3 py-2.5 bg-slate-950 text-slate-100 text-sm border border-slate-800 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={config.admin.clave}
              onChange={(e) => updateAdmin("clave", e.target.value)}
              placeholder="Clave de acceso"
              className="w-full pl-9 pr-3 py-2.5 bg-slate-950 text-slate-100 text-sm border border-slate-800 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>
        </div>
      </div>

      {/* Locales */}
      <div className="space-y-4">
        {config.locales.map((loc: LocalAccess, locIdx: number) => (
          <div key={loc.key} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center space-x-2.5 mb-4">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl border bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
                <Store className="w-4.5 h-4.5" />
              </div>
              <h3 className="font-bold text-sm text-white flex items-center space-x-1.5">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span>{loc.name}</span>
              </h3>
            </div>

            {/* Jefa */}
            <p className="text-[10px] uppercase font-bold tracking-wider text-violet-400 mb-2 flex items-center space-x-1.5">
              <UserRound className="w-3.5 h-3.5" />
              <span>Jefa del local (nombre y clave)</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              <div className="relative">
                <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={loc.jefa.name}
                  onChange={(e) => updateJefa(locIdx, "name", e.target.value)}
                  placeholder="Nombre de la jefa"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 text-slate-100 text-sm border border-slate-800 rounded-xl focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={loc.jefa.clave}
                  onChange={(e) => updateJefa(locIdx, "clave", e.target.value)}
                  placeholder="Clave de acceso"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 text-slate-100 text-sm border border-slate-800 rounded-xl focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20"
                />
              </div>
            </div>

            {/* Técnicos */}
            <p className="text-[10px] uppercase font-bold tracking-wider text-amber-400 mb-2 flex items-center space-x-1.5">
              <UserRound className="w-3.5 h-3.5" />
              <span>Técnicos de este local</span>
            </p>
            {loc.tecnicos.length === 0 && (
              <p className="text-xs text-slate-500 italic mb-3">
                Aún no hay técnicos registrados en este local.
              </p>
            )}
            <div className="space-y-3 mb-3">
              {loc.tecnicos.map((t, techIdx) => (
                <div key={techIdx} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-center">
                  <div className="relative">
                    <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={t.name}
                      onChange={(e) => updateTecnico(locIdx, techIdx, "name", e.target.value)}
                      placeholder="Nombre del técnico"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-950 text-slate-100 text-sm border border-slate-800 rounded-xl focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={t.clave}
                      onChange={(e) => updateTecnico(locIdx, techIdx, "clave", e.target.value)}
                      placeholder="Clave de acceso"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-950 text-slate-100 text-sm border border-slate-800 rounded-xl focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTecnico(locIdx, techIdx)}
                    className="p-2.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition-colors"
                    title="Eliminar técnico"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => addTecnico(locIdx)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-slate-950 hover:bg-slate-800 text-amber-400 border border-amber-500/25 rounded-lg text-xs font-bold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar técnico</span>
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-[11px] text-slate-500">
          Cada persona ingresa con su <b>nombre</b> y <b>clave</b>. Las jefas y técnicos solo verán la
          información de su local; el administrador ve todos los locales.
        </p>
        <button
          type="button"
          onClick={() => onSave(cleanConfig(config))}
          disabled={!complete}
          className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
            complete
              ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
              : "bg-slate-800 text-slate-500 cursor-not-allowed"
          }`}
        >
          <Save className="w-4 h-4" />
          <span>{saveLabel || "Guardar configuración"}</span>
        </button>
      </div>
    </div>
  );
}
