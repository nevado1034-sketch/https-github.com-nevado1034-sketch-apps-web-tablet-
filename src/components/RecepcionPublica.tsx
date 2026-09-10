import React, { useEffect, useState } from "react";
import { db, doc, getDoc } from "../firebase";
import { RepairItem } from "../types";
import litioLogo from "../assets/litio-logo.png";
import {
  Battery,
  Calendar,
  Camera,
  ClipboardList,
  FileText,
  Loader2,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  User,
  Video,
  Wrench,
  Zap,
  ExternalLink
} from "lucide-react";

interface RecepcionPublicaProps {
  orderId: string;
}

const typeLabels: Record<string, string> = {
  scooter: "Scooter Eléctrico",
};

const branchNames: Record<string, string> = {
  lince_arenales: "San Isidro",
  surco: "Surco",
  san_borja: "San Borja",
  lince_leal: "Lince"
};

const sentFromLabels: Record<string, string> = {
  lince_arenales: "Enviado desde SAN ISIDRO",
  surco: "Enviado desde SURCO",
  san_borja: "Enviado desde SAN BORJA",
  lince_leal: "Enviado desde LINCE"
};

const serviceLabels: Record<string, string> = {
  mantenimiento: "Mantenimiento General",
  diagnostico: "Diagnóstico Especializado",
  garantia: "Servicio de Garantía",
  cambio: "Cambio de Componentes",
  express: "Servicio Express"
};

export default function RecepcionPublica({ orderId }: RecepcionPublicaProps) {
  const [repair, setRepair] = useState<RepairItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoLightbox, setPhotoLightbox] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!db) {
        setError("Servicio no disponible en este momento.");
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "repairs", orderId));
        if (!active) return;
        if (!snap.exists()) {
          setError("No se encontró la orden de servicio.");
        } else {
          setRepair(snap.data() as RepairItem);
        }
      } catch (err) {
        console.error("Error cargando recepción pública:", err);
        setError("Ocurrió un error al cargar la información. Inténtalo de nuevo.");
      }
      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-3 px-6">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <p className="text-sm text-slate-400">Cargando la información de tu vehículo...</p>
      </div>
    );
  }

  if (error || !repair) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-3 px-6 text-center">
        <FileText className="w-12 h-12 text-slate-700" />
        <p className="text-base font-semibold text-slate-300">{error || "Orden no disponible"}</p>
        <a
          href="https://wa.me/51999999999"
          className="text-sm text-cyan-400 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          Contáctanos por WhatsApp
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Barra superior */}
      <header className="bg-slate-900 border-b border-slate-800 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center overflow-hidden drop-shadow-[0_0_12px_rgba(6,182,212,0.4)] shrink-0">
            <img src={litioLogo} alt="Isotipo Litio Energy" className="w-16 h-16 object-contain" draggable={false} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white">
              LITIO <span className="text-cyan-400">ENERGY</span>
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
              Especialistas en Vehículos Eléctricos
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-950 border border-slate-700 text-cyan-400">
          Orden {orderId.toUpperCase()}
        </span>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6 pb-20 space-y-4">
        {/* Saludo */}
        <div className="text-center pt-2">
          <h2 className="text-xl font-bold text-white">
            Hola <span className="text-cyan-400">{repair.client.name.split(" ")[0]}</span> 👋
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Tu vehículo ha sido ingresado a nuestro taller. A continuación encontrarás el resumen de tu ingreso.
          </p>
        </div>

        {/* Datos de la orden */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <h3 className="text-[10px] font-black uppercase tracking-wider text-cyan-400 mb-3 flex items-center space-x-1.5">
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Datos de tu orden</span>
          </h3>
          <div className="space-y-1.5 text-sm">
            <p className="text-slate-200 flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span><span className="text-slate-500">Cliente:</span> {repair.client.name}</span>
            </p>
            <p className="text-slate-200 flex items-center space-x-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              <span><span className="text-slate-500">Teléfono:</span> {repair.client.phone || "—"}</span>
            </p>
            <p className="text-slate-200">
              <span className="text-slate-500">DNI / C.E:</span> {repair.client.dni || "—"}
            </p>
            <p className="text-slate-200 flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span><span className="text-slate-500">Ingreso:</span> {new Date(repair.receptionDate).toLocaleString("es-PE", { dateStyle: "long", timeStyle: "short" })}</span>
            </p>
            <p className="text-slate-200">
              <span className="text-slate-500">Servicio:</span> {serviceLabels[repair.serviceType] || repair.serviceType}
              {repair.serviceTypeDetail ? ` (${repair.serviceTypeDetail})` : ""}
            </p>
            <p className="text-slate-200">
              <span className="text-slate-500">Orden:</span> {repair.id.toUpperCase()}
            </p>
          </div>
        </section>

        {/* Datos del vehículo */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-3 flex items-center space-x-1.5">
            <Wrench className="w-3.5 h-3.5" />
            <span>Tu vehículo</span>
          </h3>
          <div className="space-y-1.5 text-sm">
            <p className="text-slate-200"><span className="text-slate-500">Equipo:</span> {typeLabels[repair.vehicle.type] || repair.vehicle.type}</p>
            <p className="text-slate-200"><span className="text-slate-500">Marca / Modelo:</span> {repair.vehicle.brand} {repair.vehicle.model}</p>
            <p className="text-slate-200 flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span><span className="text-slate-500">Voltaje:</span> {repair.vehicle.voltage}</span>
            </p>
            <p className="text-slate-200 flex items-center space-x-1.5">
              <Battery className="w-3.5 h-3.5 text-cyan-400" />
              <span><span className="text-slate-500">Batería:</span> {repair.vehicle.batteryCondition}</span>
            </p>
            <p className="text-slate-200 flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span><span className="text-slate-500">Sede:</span> {branchNames[repair.workshopBranch] || repair.workshopBranch}</span>
            </p>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center space-x-1.5">
              <Package className="w-3.5 h-3.5" />
              <span>Accesorios recibidos</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { v: repair.accessories.charger, l: "Cargador" },
                { v: repair.accessories.key, l: "Llaves" },
                { v: repair.accessories.battery, l: "Batería extra" },
                { v: repair.accessories.helmet, l: "Casco" },
                { v: repair.accessories.padlock, l: "Candado" }
              ].map((acc) => (
                <span key={acc.l} className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                  acc.v
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-slate-950 text-slate-600 border-slate-800"
                }`}>
                  {acc.v ? "✓" : "✕"} {acc.l}
                </span>
              ))}
              {repair.accessories.others && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-bold">
                  {repair.accessories.others}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Falla reportada */}
        {repair.vehicle.reportedFailure && (
          <section className="bg-rose-950/30 border border-rose-800/50 rounded-2xl p-4">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-rose-400 mb-1">Falla reportada</h3>
            <p className="text-sm italic text-rose-200">"{repair.vehicle.reportedFailure}"</p>
          </section>
        )}

        {/* Fotos de evidencia */}
        {(repair.visualState.photos || []).length > 0 && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-cyan-400 mb-3 flex items-center space-x-1.5">
              <Camera className="w-3.5 h-3.5" />
              <span>Evidencia fotográfica de tu vehículo ({repair.visualState.photos!.length})</span>
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {(repair.visualState.photos || []).map((photo, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPhotoLightbox(photo)}
                  className="block w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950 cursor-pointer text-left group"
                >
                  <img src={photo} alt={`Evidencia ${idx + 1}`} className="w-full h-28 object-cover group-hover:opacity-80 transition-opacity" loading="lazy" />
                  <p className="text-[9px] text-slate-500 font-mono text-center py-1">Foto #{idx + 1}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Videos de evidencia */}
        {(repair.visualState.videoEvidence || []).length > 0 && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-cyan-400 mb-3 flex items-center space-x-1.5">
              <Video className="w-3.5 h-3.5" />
              <span>Videos de evidencia ({repair.visualState.videoEvidence!.length})</span>
            </h3>
            <div className="space-y-2">
              {(repair.visualState.videoEvidence || []).map((v, idx) => (
                <div key={idx} className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                  <video src={v.url} controls className="w-full aspect-video bg-black" />
                  <p className="text-[9px] text-slate-500 font-mono text-center py-1">
                    Video #{idx + 1}
                    {v.recordedAt ? ` · ${new Date(v.recordedAt).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Link a Términos y Condiciones */}
        <section className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-4">
          <h3 className="text-[10px] font-black uppercase tracking-wider text-cyan-400 mb-2 flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Términos y Condiciones</span>
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            Bienvenido a la familia LITIO ENERGY, te recomendamos revisar nuestros Términos y Condiciones del servicio.
          </p>
          <a
            href={`${window.location.origin}${window.location.pathname.replace(/recepcion\/.+$/, '')}terminos`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 rounded-xl text-xs font-bold transition-all"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Consultar Términos y Condiciones</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </section>

        {/* Pie */}
        <footer className="text-center text-[10px] text-slate-600 pt-4 space-y-1">
          <p className="flex items-center justify-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Documento generado por el Sistema Litio Energy</span>
          </p>
          <p>{(sentFromLabels[repair.workshopBranch] || "ENVIADO DESDE LITIO ENERGY") + " — LIMA, PERÚ"}</p>
        </footer>
      </main>

      {/* Lightbox de foto */}
      {photoLightbox && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/95 p-4"
          onClick={() => setPhotoLightbox(null)}
        >
          <div className="relative w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPhotoLightbox(null)}
              className="absolute -top-10 right-0 text-slate-400 hover:text-white text-sm font-bold px-3 py-1"
            >
              ✕ Cerrar
            </button>
            <img src={photoLightbox} alt="Evidencia" className="w-full max-h-[85vh] object-contain rounded-xl border border-slate-800 bg-black" />
          </div>
        </div>
      )}
    </div>
  );
}
