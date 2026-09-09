import React, { useState } from "react";
import { Lock, User, LogIn, AlertCircle, MapPin, Zap, ShieldCheck } from "lucide-react";
import { findUser, loadConfig, AuthSession } from "../auth";

interface LoginViewProps {
  onLogin: (user: AuthSession) => void;
}

const CREDENTIAL_HINTS = [
  { label: "Administrador", username: "admin" },
  { label: "San Isidro (Arenales)", username: "sanisidro" },
  { label: "Surco", username: "surco" },
  { label: "San Borja", username: "sanborja" },
  { label: "Lince (José Leal)", username: "lincel" }
];

export default function LoginView({ onLogin }: LoginViewProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    setTimeout(() => {
      const config = loadConfig();
      const user = config ? findUser(config, username.trim(), password) : null;
      if (!user) {
        setError("Usuario o contraseña incorrectos. Verifica tus credenciales.");
        setLoading(false);
        return;
      }
      onLogin(user);
    }, 400);
  };

  const handleFill = (u: string) => {
    setUsername(u);
    setPassword("litio2026");
    setError("");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative flex items-center justify-center w-16 h-16 bg-cyan-500 rounded-2xl border border-cyan-400/30 overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.5)]">
            <svg
              viewBox="0 0 100 100"
              className="w-10 h-10 text-slate-950"
              fill="none"
              stroke="currentColor"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <ellipse cx="50" cy="50" rx="35" ry="12" transform="rotate(-30 50 50)" strokeOpacity="0.25" strokeWidth="4" />
              <ellipse cx="50" cy="50" rx="35" ry="12" transform="rotate(30 50 50)" strokeOpacity="0.25" strokeWidth="4" />
              <circle cx="20" cy="33" r="4.5" fill="currentColor" />
              <circle cx="80" cy="33" r="4.5" fill="currentColor" />
              <path d="M55 15 L35 52 H55 L45 85 L70 44 H48 L55 15" fill="currentColor" strokeWidth="4" />
            </svg>
          </div>
          <span className="font-display font-black text-2xl tracking-tight mt-4">
            LITIO<span className="text-cyan-400">ENERGY</span>
          </span>
          <span className="text-[10px] tracking-[0.25em] text-slate-500 font-bold uppercase mt-1">
            Control de Talleres
          </span>
        </div>

        {/* Card de Login */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-6 space-y-4">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Acceso Restringido
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Usuario
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Nombre de usuario"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-colors"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-colors"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 text-rose-200 rounded-xl flex items-start space-x-2 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 rounded-xl text-sm font-bold flex items-center justify-center space-x-2 transition-colors shadow-[0_0_20px_rgba(6,182,212,0.3)]"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Ingresar al Sistema</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Accesos rápidos por local */}
          <div className="border-t border-slate-800 bg-slate-950/50 p-4">
            <div className="flex items-center space-x-1.5 mb-2.5">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Accesos por local (demo)
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CREDENTIAL_HINTS.map((c) => (
                <button
                  key={c.username}
                  onClick={() => handleFill(c.username)}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-[10px] font-semibold text-slate-300 hover:text-cyan-300 transition-colors"
                >
                  {c.label}
                </button>
              ))}
            </div>
            <p className="mt-2.5 text-[10px] text-slate-600 flex items-center space-x-1">
              <Zap className="w-3 h-3 text-amber-500/70" />
              <span>Contraseña demo: <code className="font-mono text-slate-400">litio2026</code></span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
