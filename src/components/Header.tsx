import React, { useState } from "react";
import { Tablet, Monitor, BarChart3, MessageSquare, RefreshCw, Sparkles, QrCode, X, Copy, Check, ExternalLink, Smartphone, LogOut, ShieldCheck, MapPin, FileBarChart2 } from "lucide-react";
import { SessionUser } from "../auth";

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isPolling: boolean;
  onRefresh: () => void;
  session: SessionUser | null;
  onLogout: () => void;
}

export default function Header({ currentTab, setCurrentTab, isPolling, onRefresh, session, onLogout }: HeaderProps) {
  const [showTabletModal, setShowTabletModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const branchLabels: Record<string, string> = {
    lince_arenales: "San Isidro (Arenales)",
    surco: "Surco",
    san_borja: "San Borja",
    lince_leal: "Lince (José Leal)"
  };

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
          <div className="flex items-center justify-between h-16">
            {/* Logo Corporativo de Litio Energy */}
            <div className="flex items-center space-x-3">
              <div className="relative flex items-center justify-center w-10 h-10 bg-cyan-500 rounded-xl border border-cyan-400/30 overflow-hidden shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                {/* Isotipo de Litio Energy (Átomo de Litio + Rayo de Energía) */}
                <svg
                  viewBox="0 0 100 100"
                  className="w-7 h-7 text-slate-950 drop-shadow-[0_0_2px_rgba(0,0,0,0.5)]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {/* Orbitas de átomo de litio */}
                  <ellipse cx="50" cy="50" rx="35" ry="12" transform="rotate(-30 50 50)" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25" />
                  <ellipse cx="50" cy="50" rx="35" ry="12" transform="rotate(30 50 50)" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25" />
                  {/* Electrón en órbita */}
                  <circle cx="20" cy="33" r="4.5" fill="currentColor" />
                  <circle cx="80" cy="33" r="4.5" fill="currentColor" />
                  
                  {/* Rayo de energía central */}
                  <path
                    d="M55 15 L35 52 H55 L45 85 L70 44 H48 L55 15"
                    fill="currentColor"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                </svg>
              </div>
              
              <div className="flex flex-col">
                <span className="font-display font-black text-xl tracking-tight text-white leading-none">
                  LITIO<span className="text-cyan-400">ENERGY</span>
                </span>
                <span className="text-[9px] tracking-[0.25em] text-slate-500 font-bold leading-none mt-1 uppercase">
                  E-Mobility Systems
                </span>
              </div>
            </div>
            
            {/* Selector de Modos / Plataformas */}
            <div className="flex space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                id="nav-btn-reception"
                onClick={() => setCurrentTab("reception")}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  currentTab === "reception"
                    ? "bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                }`}
              >
                <Tablet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tablet Recepción</span>
              </button>
              
              <button
                id="nav-btn-technician"
                onClick={() => setCurrentTab("technician")}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  currentTab === "technician"
                    ? "bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pantalla Técnico</span>
              </button>
              
              <button
                id="nav-btn-dashboard"
                onClick={() => setCurrentTab("dashboard")}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  currentTab === "dashboard"
                    ? "bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Estadísticas</span>
              </button>

              <button
                id="nav-btn-chat"
                onClick={() => setCurrentTab("chat")}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  currentTab === "chat"
                    ? "bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Chat Clientes</span>
              </button>

              <button
                id="nav-btn-reports"
                onClick={() => setCurrentTab("reports")}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  currentTab === "reports"
                    ? "bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                }`}
              >
                <FileBarChart2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reportes</span>
              </button>
            </div>

            {/* Control de Sincronización y Tablet Connect */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Botón Escanear Tablet */}
              <button
                onClick={() => setShowTabletModal(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-900 text-cyan-400 hover:text-cyan-300 border border-slate-800 rounded-xl text-xs font-bold transition-all shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                title="Abrir en tu Tablet o Celular"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Abrir en Tablet</span>
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

              <div className="hidden xs:flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded-full border border-cyan-500/20">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500"></span>
                </span>
                <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">Taller Online</span>
              </div>

              {/* Usuario actual */}
              {session && (
                <div className="hidden lg:flex flex-col items-end px-2">
                  <span className="flex items-center space-x-1 text-[10px] font-bold text-slate-300 uppercase tracking-wide">
                    {session.role === "admin" ? (
                      <ShieldCheck className="w-3 h-3 text-amber-400" />
                    ) : (
                      <MapPin className="w-3 h-3 text-cyan-400" />
                    )}
                    <span>{session.role === "admin" ? "Administrador" : branchLabels[session.branch || ""] || session.name}</span>
                  </span>
                  <span className="text-[9px] text-slate-500 font-medium">{session.name}</span>
                </div>
              )}

              <button
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-rose-300 hover:bg-slate-900 rounded-lg transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
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
