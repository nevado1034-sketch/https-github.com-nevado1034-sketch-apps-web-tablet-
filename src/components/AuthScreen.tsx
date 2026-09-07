import React, { useState } from "react";
import {
  ShieldCheck,
  UserRound,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  RotateCcw,
  AlertTriangle,
  MapPin,
  ChevronRight
} from "lucide-react";
import {
  AuthConfig,
  AuthSession,
  UserEntry,
  listUsers,
  findUser,
  clearConfig,
  resetRemoteConfig
} from "../auth";
import AccessManager from "./AccessManager";
import litioLogo from "../assets/litio-logo.png";

interface AuthScreenProps {
  config: AuthConfig | null;
  onSetup: (config: AuthConfig) => void;
  onAuthed: (session: AuthSession) => void;
}

const ROLE_ACCENT: Record<string, string> = {
  admin: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  jefa: "text-violet-400 bg-violet-500/10 border-violet-500/30",
  tecnico: "text-amber-400 bg-amber-500/10 border-amber-500/30"
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  jefa: "Asesora de Servicio",
  tecnico: "Técnico"
};

function PasswordInput({
  value,
  onChange,
  placeholder,
  autoFocus
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full pl-9 pr-10 py-2.5 text-slate-100 text-sm rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
        style={{ backgroundColor: "rgba(0,180,216,0.08)", border: "1px solid rgba(0,180,216,0.15)" }}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
        aria-label={show ? "Ocultar clave" : "Mostrar clave"}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

const UserCard: React.FC<{
  user: UserEntry;
  selected: boolean;
  onSelect: () => void;
}> = ({ user, selected, onSelect }) => {
  const accent = ROLE_ACCENT[user.role];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left rounded-xl border p-3.5 bg-slate-950 transition-all w-full ${
        selected
          ? "border-cyan-500 ring-2 ring-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
          : "border-slate-800 hover:border-slate-700"
      }`}
    >
      <div className="flex items-center space-x-2.5">
        <div className={`flex items-center justify-center w-8 h-8 rounded-lg border ${accent}`}>
          <UserRound className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm text-white truncate">{user.name}</p>
          <p className="text-[10px] text-slate-400">
            {ROLE_LABELS[user.role]}
            {user.localName ? <span className="text-slate-500"> · {user.localName}</span> : null}
          </p>
        </div>
      </div>
    </button>
  );
}

export default function AuthScreen({ config, onSetup, onAuthed }: AuthScreenProps) {
  const isSetup = !config;

  const [selectedUser, setSelectedUser] = useState<UserEntry | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const users = config ? listUsers(config) : [];

  const handleLogin = () => {
    if (!config || !username.trim() || !password) return;
    const session = findUser(config, username.trim(), password);
    if (session) {
      onAuthed(session);
    } else {
      setLoginError("Usuario o clave incorrectos. Verifica e intenta nuevamente.");
    }
  };

  return (
    <div className="min-h-screen text-slate-100 flex flex-col font-sans" style={{ backgroundColor: "#0B132B" }}>
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative flex items-center justify-center overflow-hidden mb-5" style={{ filter: "drop-shadow(0 0 30px rgba(0,180,216,0.5))" }}>
              <img
                src={litioLogo}
                alt="Isotipo Litio Energy"
                className="w-[130px] h-[130px] object-contain"
                draggable={false}
              />
            </div>
            <span className="font-display font-black text-3xl tracking-tight text-white leading-none">
              LITIO<span className="text-cyan-400">ENERGY</span>
            </span>
            <span className="text-[10px] tracking-[0.3em] text-slate-500 font-bold mt-2 uppercase">
              Control de Acceso del Taller
            </span>
          </div>

          {isSetup ? (
            /* ================= CONFIGURACIÓN INICIAL ================= */
            <div className="rounded-2xl p-6 sm:p-8 shadow-2xl" style={{ backgroundColor: "rgba(0,180,216,0.06)", border: "1px solid rgba(0,180,216,0.12)" }}>
              <div className="mb-6">
                <h1 className="text-xl font-bold text-white">Configuración inicial del sistema</h1>
                <p className="text-sm text-slate-400 mt-1">
                  Registra al administrador y a las asesoras y técnicos de cada uno de los 4 locales. Una vez
                  guardado, cada persona solo podrá ver la información de su propio local.
                </p>
              </div>

              <AccessManager
                initial={config}
                onSave={(c) => {
                  onSetup(c);
                  onAuthed({ role: "admin", name: c.admin.name.trim() });
                }}
                saveLabel="Guardar configuración y entrar"
              />
            </div>
          ) : (
            /* ================= INICIO DE SESIÓN ================= */
            <div className="rounded-2xl p-6 sm:p-8 shadow-2xl" style={{ backgroundColor: "rgba(0,180,216,0.06)", border: "1px solid rgba(0,180,216,0.12)" }}>
              <div className="mb-6">
                <h1 className="text-xl font-bold text-white text-center">Ingreso al sistema</h1>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Usuario
                  </label>
                  <div className="relative">
                    <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setLoginError("");
                      }}
                      onKeyDown={(e) => { if (e.key === "Enter" && password) handleLogin(); }}
                      placeholder="Ingresa tu usuario"
                      autoFocus
                      className="w-full pl-9 pr-4 py-2.5 text-slate-100 text-sm rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                      style={{ backgroundColor: "rgba(0,180,216,0.08)", border: "1px solid rgba(0,180,216,0.15)" }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Clave
                  </label>
                  <PasswordInput
                    value={password}
                    onChange={(v) => {
                      setPassword(v);
                      setLoginError("");
                    }}
                    placeholder="Ingresa tu clave"
                  />
                </div>

                <button
                  onClick={handleLogin}
                  disabled={!username.trim() || !password}
                  className={`w-full flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    username.trim() && password
                      ? "text-white shadow-[0_4px_20px_rgba(0,180,216,0.3)]"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  }`}
                  style={username.trim() && password ? { background: "linear-gradient(135deg, #06b6d4, #0284c7)" } : {}}
                >
                  <LogIn className="w-4 h-4" />
                  <span>Ingresar</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                {loginError && (
                  <div className="flex items-center space-x-2 text-rose-300 text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="py-4 text-center text-xs text-slate-600 font-medium">
        <p>© 2026 Litio Energy S.A.C. - Sistema de Taller de Vehículos Eléctricos</p>
      </footer>
    </div>
  );
}
