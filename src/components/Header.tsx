import React, { useState } from "react";
import { Tablet, Monitor, BarChart3, MessageSquare, RefreshCw, Sparkles, QrCode, X, Copy, Check, ExternalLink, Smartphone, LogOut, UserCircle2, Zap, KeyRound, ClipboardCheck, Calculator, Users } from "lucide-react";
import { AuthSession, sessionLabel } from "../auth";
import litioLogo from "../assets/litio-logo.png";

const TABS = [
  { id: "reception", icon: Tablet, label: "Recepción" },
  { id: "technician", icon: Monitor, label: "Diagnóstico" },
  { id: "presupuesto", icon: Calculator, label: "Presupuesto y Pago" },
  { id: "calidad", icon: ClipboardCheck, label: "Control de Calidad" },
  { id: "express", icon: Zap, label: "Servicios Express" },
  { id: "chat", icon: MessageSquare, label: "Chat Clientes" },
  { id: "clientes", icon: Users, label: "Clientes" },
  { id: "dashboard", icon: BarChart3, label: "Estadísticas" },
  { id: "accesos", icon: KeyRound, label: "Accesos" }
];

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isPolling: boolean;
  onRefresh: () => void;
  allowedTabs: string[];
  currentUser: AuthSession;
  onLogout: () => void;
  qcCount?: number;
  presupuestoCount?: number;
}

export default function Header({ currentTab, setCurrentTab, isPolling, onRefresh, allowedTabs, currentUser, onLogout, qcCount = 0, presupuestoCount = 0 }: HeaderProps) {
  const [showTabletModal, setShowTabletModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Get current app URL to generate the QR code
  const currentUrl = typeof window !== "undefined" ? window.location.href : "https://litio-energy.com";
  const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&color=06b6d4&bgcolor=020617&data=${encodeURIComponent(currentUrl)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-slate-900/95 border-b border-slate-800 text-white backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Fila superior: logo + controles */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2">
            {/* Logo Corporativo de Litio Energy */}
            <div className="flex items-center space-x-3 shrink-0">
              <div className="relative flex items-center justify-center overflow-hidden drop-shadow-[0_0_12px_rgba(6,182,212,0.35)]">
                {/* Isotipo de Litio Energy */}
                <img
                  src={litioLogo}
                  alt="Isotipo Litio Energy"
                  className="w-16 h-16 object-contain"
                  draggable={false}
                />
              </div>

              <div className="flex flex-col">
                <span className="font-display font-black text-xl tracking-tight text-white leading-none">
                  LITIO<span className="text-cyan-400">ENERGY</span>
                </span>
                <span className="hidden sm:block text-[9px] tracking-[0.25em] text-slate-500 font-bold leading-none mt-1 uppercase">
                  Moviendo el Futuro
                </span>
              </div>
            </div>

            {/* Control de Sincronización y Tablet Connect */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Usuario actual y cierre de sesión */}
              <div className="flex items-center space-x-1.5">
                <div className="hidden lg:flex items-center space-x-1.5 bg-slate-950 px-3 py-1.5 rounded-full border border-cyan-500/20">
                  <UserCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-200 max-w-[110px] truncate">
                    {currentUser.name}
                  </span>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 shrink-0">
                    {sessionLabel(currentUser)}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  title="Salir y volver a la pantalla de ingreso"
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-950 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-800 hover:border-rose-500/40 rounded-xl text-xs font-bold transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Salir</span>
                </button>
              </div>

              {/* Botón Escanear Tablet */}
              <button
                onClick={() => setShowTabletModal(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-900 text-cyan-400 hover:text-cyan-300 border border-slate-800 rounded-xl text-xs font-bold transition-all shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                title="Abrir en tu Tablet o Celular"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Abrir en Tablet</span>
              </button>

              <button
                onClick={onRefresh}
                disabled={isPolling}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition-colors flex items-center space-x-1.5 text-xs font-medium"
                title="Sincronizar Datos"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPolling ? "animate-spin text-cyan-400" : ""}`} />
                <span className="hidden md:inline">Sincronizado</span>
              </button>

              <div className="hidden lg:flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded-full border border-cyan-500/20">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500"></span>
                </span>
                <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">Taller Online</span>
              </div>
            </div>
          </div>

          {/* Fila de navegación / pestañas (con scroll horizontal si no caben) */}
          <div className="flex space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto mb-2">
            {TABS.filter((t) => allowedTabs.includes(t.id)).map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  id={`nav-btn-${tab.id}`}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    currentTab === tab.id
                      ? "bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                      : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.id === "calidad" && qcCount > 0 && (
                    <span
                      className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold leading-none ${
                        currentTab === tab.id ? "bg-slate-950 text-cyan-400" : "bg-amber-500 text-slate-950"
                      }`}
                    >
                      {qcCount}
                    </span>
                  )}
                  {tab.id === "presupuesto" && presupuestoCount > 0 && (
                    <span
                      className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold leading-none ${
                        currentTab === tab.id ? "bg-slate-950 text-amber-400" : "bg-amber-500 text-slate-950"
                      }`}
                    >
                      {presupuestoCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Modal interactivo de Conexión Tablet */}
      {showTabletModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-5 h-5 text-cyan-400 animate-pulse" />
                <span className="font-semibold text-sm text-slate-100 uppercase tracking-wider">📱 ¿Cómo probar en tu Tablet?</span>
              </div>
              <button
                onClick={() => setShowTabletModal(false)}
                className="p-1 text-slate-400 hover:text-slate-100 bg-slate-850 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Alerta de no requerir cables */}
              <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-start space-x-3">
                <div className="p-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="text-xs text-slate-300 leading-relaxed">
                  <span className="font-bold text-cyan-300 block mb-1">¡No necesitas conectar ningún cable USB!</span>
                  Esta aplicación es una **Plataforma Web en la Nube**. No se instala con cables ni se compila localmente en tu tablet. Se ejecuta directamente desde su navegador de internet.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* QR Code */}
                <div className="flex flex-col items-center justify-center bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2">
                  <div className="p-2 bg-slate-950 rounded-lg border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                    <img 
                      src={qrCodeApiUrl} 
                      alt="Código QR de la Aplicación" 
                      className="w-44 h-44 rounded-md object-contain"
                    />
                  </div>
                  <span className="text-[10px] text-cyan-400 font-bold font-mono tracking-widest uppercase text-center">
                    Escanea con tu tablet
                  </span>
                </div>

                {/* Paso a paso */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Paso 1: Abrir la Cámara</span>
                    <p className="text-xs text-slate-400 leading-normal">Abre la cámara de fotos de tu tablet o teléfono celular.</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Paso 2: Escanear</span>
                    <p className="text-xs text-slate-400 leading-normal">Apunta la cámara al código QR de la izquierda hasta que aparezca el enlace amarillo o azul en la pantalla, y presiónalo.</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Paso 3: ¡Listo! Sincronización</span>
                    <p className="text-xs text-slate-400 leading-normal">La app se abrirá en el navegador de tu tablet. Cualquier cambio o firma que realices allí se reflejará en tiempo real.</p>
                  </div>
                </div>
              </div>

              {/* URL Manual */}
              <div className="pt-4 border-t border-slate-800 space-y-2">
                <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Enlace directo (si prefieres escribirlo o enviarlo):
                </span>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={currentUrl}
                    className="w-full px-3 py-2 bg-slate-950 text-cyan-400 font-mono text-xs border border-slate-850 rounded-lg focus:outline-none select-all"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shrink-0 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                  <a
                    href={currentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                    title="Abrir en pestaña nueva"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end p-4 bg-slate-950 border-t border-slate-800">
              <button
                onClick={() => setShowTabletModal(false)}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-bold transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
