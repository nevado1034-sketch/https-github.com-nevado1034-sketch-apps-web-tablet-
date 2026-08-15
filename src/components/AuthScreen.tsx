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
  jefa: "Jefa de Local",
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
        className="w-full pl-9 pr-10 py-2.5 bg-slate-950 text-slate-100 text-sm border border-slate-800 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
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
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const users = config ? listUsers(config) : [];

  const handleLogin = () => {
    if (!selectedUser || !config) return;
    const session = findUser(config, selectedUser.name, password);
    if (session) {
      onAuthed(session);
    } else {
      setLoginError("Clave incorrecta. Verifica e intenta nuevamente.");
    }
  };

  const handleReset = () => {
    if (
      window.confirm(
        "¿Restablecer la configuración de accesos? Se perderán los nombres y claves actuales y deberás configurar de nuevo."
      )
    ) {
      clearConfig();
      resetRemoteConfig().then(() => window.location.reload());
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-3xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative flex items-center justify-center overflow-hidden drop-shadow-[0_0_20px_rgba(6,182,212,0.45)] mb-4">
              <img
                src={litioLogo}
                alt="Isotipo Litio Energy"
                className="w-[104px] h-[104px] object-contain"
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
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
              <div className="mb-6">
                <h1 className="text-xl font-bold text-white">Configuración inicial del sistema</h1>
                <p className="text-sm text-slate-400 mt-1">
                  Registra al administrador y a las jefas y técnicos de cada uno de los 4 locales. Una vez
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
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
              <div className="mb-5">
                <h1 className="text-xl font-bold text-white">Ingreso al sistema</h1>
                <p className="text-sm text-slate-400 mt-1">
                  Selecciona tu nombre e ingresa tu clave de acceso.
                </p>
              </div>

              <div className="space-y-4">
                {/* Administrador */}
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-2 flex items-center space-x-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Administrador</span>
                  </p>
                  {users.some((u) => u.role === "admin") ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {users
                        .filter((u) => u.role === "admin")
                        .map((u) => (
                          <UserCard
                            key={`admin-${u.name}`}
                            user={u}
                            selected={selectedUser?.name === u.name && selectedUser?.role === "admin"}
                            onSelect={() => {
                              setSelectedUser(u);
                              setPassword("");
                              setLoginError("");
                            }}
                          />
                        ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-600 italic">Sin configurar</p>
                  )}
                </div>

                {/* Locales */}
                {config.locales.map((loc) => {
                  const localUsers = users.filter((u) => u.localKey === loc.key);
                  return (
                    <div key={loc.key}>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-2 flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-violet-400" />
                        <span>{loc.name}</span>
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {localUsers.map((u) => (
                          <UserCard
                            key={`${u.localKey}-${u.role}-${u.name}`}
                            user={u}
                            selected={selectedUser?.name === u.name && selectedUser?.role === u.role}
                            onSelect={() => {
                              setSelectedUser(u);
                              setPassword("");
                              setLoginError("");
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedUser && (
                <div className="mt-6 p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                  <div className="flex flex-col sm:flex-row gap-4 items-stretch">
                    <div className="flex-1">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Clave de {selectedUser.name}
                      </label>
                      <PasswordInput
                        value={password}
                        onChange={(v) => {
                          setPassword(v);
                          setLoginError("");
                        }}
                        placeholder="Ingresa tu clave"
                        autoFocus
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={handleLogin}
                        disabled={!password}
                        className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                          password
                            ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                            : "bg-slate-800 text-slate-500 cursor-not-allowed"
                        }`}
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Ingresar</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {loginError && (
                    <div className="mt-3 flex items-center space-x-2 text-rose-300 text-sm">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{loginError}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleReset}
                  className="flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restablecer configuración de accesos</span>
                </button>
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
