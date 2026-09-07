import React, { useEffect, useState } from "react";
import { db, doc, getDoc, updateDoc } from "../firebase";
import { RepairItem } from "../types";
import litioLogo from "../assets/litio-logo.png";
import {
  Battery,
  Camera,
  Calendar,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  Maximize2,
  Package,
  Phone,
  ShieldCheck,
  User,
  Video,
  Wrench,
  X,
  XCircle,
  Zap
} from "lucide-react";

interface OrdenPublicaProps {
  orderId: string;
}

const typeLabels: Record<string, string> = {
  scooter: "Scooter Eléctrico",
  bici: "Bicicleta Eléctrica",
  moto: "Moto Eléctrica",
  bicimoto: "Bicimoto Eléctrica",
  trimoto: "Trimoto / Moto-Taxi Eléctrico",
  otro: "Vehículo Eléctrico Especial"
};

const branchNames: Record<string, string> = {
  lince_arenales: "San Isidro (Arenales)",
  surco: "Surco",
  san_borja: "San Borja",
  lince_leal: "Lince (José Leal)"
};

const sentFromLabels: Record<string, string> = {
  lince_arenales: "Enviado desde SAN ISIDRO (ARENALES)",
  surco: "Enviado desde SURCO",
  san_borja: "Enviado desde SAN BORJA",
  lince_leal: "Enviado desde LINCE (JOSÉ LEAL)"
};

const serviceLabels: Record<string, string> = {
  mantenimiento: "Mantenimiento General",
  diagnostico: "Diagnóstico Especializado",
  garantia: "Servicio de Garantía",
  cambio: "Cambio de Componentes",
  express: "Servicio Express"
};

const methodLabels: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  yape_plin: "Yape/Plin",
  tarjeta: "Tarjeta"
};

const fmt = (n?: number): string =>
  `S/ ${(Number(n) || 0).toFixed(2)}`;

export default function OrdenPublica({ orderId }: OrdenPublicaProps) {
  const [repair, setRepair] = useState<RepairItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);
  const [preview, setPreview] = useState<{ type: "photo" | "video"; url: string; label?: string } | null>(null);

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
        console.error("Error cargando orden pública:", err);
        setError("Ocurrió un error al cargar la información. Inténtalo de nuevo.");
      }
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [orderId]);

  const respond = async (status: "aprobado" | "rechazado") => {
    if (!repair || responding || repair.approvalStatus === "aprobado" || repair.approvalStatus === "rechazado") return;
    setResponding(true);
    try {
      await updateDoc(doc(db, "repairs", orderId), {
        approvalStatus: status,
        approvalResponseAt: new Date().toISOString(),
        ...(status === "aprobado" ? { status: "paid" } : {})
      });
      setRepair((r) =>
        r
          ? { ...r, approvalStatus: status, approvalResponseAt: new Date().toISOString() }
          : r
      );
    } catch (err) {
      console.error("Error guardando respuesta del cliente:", err);
      setError("No se pudo registrar tu respuesta. Revisa tu conexión e inténtalo de nuevo.");
    }
    setResponding(false);
  };

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

  const status = repair.approvalStatus;
  const responded = status === "aprobado" || status === "rechazado";
  const total = (repair.spareParts || []).reduce(
    (s, p) => s + (Number(p.partPrice) || 0) + (Number(p.laborPrice) || 0),
    0
  );
  const advance = repair.payment?.advancePayment || 0;
  const balance = Math.max(0, total - advance);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Barra superior */}
      <header className="bg-slate-900 border-b border-slate-800 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center overflow-hidden drop-shadow-[0_0_12px_rgba(6,182,212,0.4)] shrink-0">
            <img
              src={litioLogo}
              alt="Isotipo Litio Energy"
              className="w-16 h-16 object-contain"
              draggable={false}
            />
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
            Aquí tienes toda la información de tu vehículo y el presupuesto de tu reparación.
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

        {/* Recomendaciones del técnico */}
        {repair.recommendations && (
          <section className="bg-amber-950/30 border border-amber-700/40 rounded-2xl p-4">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-1">Recomendaciones del técnico</h3>
            <p className="text-sm text-amber-100">{repair.recommendations}</p>
          </section>
        )}

        {/* Observaciones */}
        {(repair.visualState.notes || repair.technicianNotes) && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-3">
              Observaciones y estado del vehículo
            </h3>
            {repair.visualState.notes && (
              <div className="mb-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Estado de ingreso</p>
                <p className="text-sm text-slate-300">{repair.visualState.notes}</p>
              </div>
            )}
            {repair.technicianNotes && repair.technicianNotes !== "Vehículo recién ingresado por recepción." && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Notas del técnico</p>
                <p className="text-sm text-slate-300">{repair.technicianNotes}</p>
              </div>
            )}
          </section>
        )}

        {/* Repuestos / trabajos */}
        {(repair.spareParts || []).length > 0 && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-3">
              Repuestos / Trabajos a realizar
            </h3>
            <div className="space-y-2">
              {(repair.spareParts || []).map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="text-slate-200 font-medium truncate">{p.description}</p>
                    <span className={`text-sm px-1.5 py-0.5 rounded-full border font-semibold ${
                      p.type === "cambio"
                        ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
                        : "bg-blue-500/15 text-blue-400 border-blue-500/25"
                    }`}>
                      {p.type === "cambio" ? "Mano de Obra" : "Reparar"}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-slate-100 font-bold">{fmt(p.partPrice)}</p>
                    <p className="text-sm text-slate-100">{fmt(p.laborPrice)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Total */}
        <section className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Total presupuesto</p>
              <p className="text-2xl font-black text-amber-400">{fmt(total)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Adelanto</p>
              <p className="text-sm font-black text-emerald-400">{fmt(advance)}</p>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mt-1">Saldo</p>
              <p className="text-sm font-black text-rose-400">{fmt(balance)}</p>
            </div>
          </div>
          {repair.payment && (repair.payment.paymentNotes || repair.payment.paymentMethod) && (
            <div className="mt-3 pt-3 border-t border-slate-800 text-sm text-slate-300 space-y-1">
              {repair.payment.paymentMethod && (
                <p className="flex items-center space-x-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                  <span><span className="text-slate-500">Método de pago:</span> {methodLabels[repair.payment.paymentMethod] || repair.payment.paymentMethod}</span>
                </p>
              )}
              {repair.payment.paymentNotes && (
                <p className="text-sm text-slate-400 italic">"{repair.payment.paymentNotes}"</p>
              )}
            </div>
          )}
        </section>

        {/* Fotos */}
        {(repair.visualState.photos || []).length > 0 && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-cyan-400 mb-3 flex items-center space-x-1.5">
              <Camera className="w-3.5 h-3.5" />
              <span>Evidencia fotográfica ({repair.visualState.photos!.length})</span>
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {(repair.visualState.photos || []).map((photo, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPreview({ type: "photo", url: photo, label: `Evidencia ${idx + 1}` })}
                  className="block rounded-xl overflow-hidden border border-slate-800 bg-slate-950 cursor-zoom-in text-left"
                >
                  <img src={photo} alt={`Evidencia ${idx + 1}`} className="w-full h-28 object-cover" loading="lazy" />
                  <p className="text-[9px] text-slate-500 font-mono text-center py-1">Evidencia #{idx + 1}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Videos */}
        {(repair.visualState.videoEvidence || []).length > 0 && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-cyan-400 mb-3 flex items-center space-x-1.5">
              <Video className="w-3.5 h-3.5" />
              <span>Videos de evidencia ({repair.visualState.videoEvidence!.length})</span>
            </h3>
            <div className="space-y-2">
              {(repair.visualState.videoEvidence || []).map((v, idx) => (
                <div key={idx} className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                  <div className="relative">
                    <video src={v.url} controls className="w-full aspect-video bg-black" />
                    <button
                      type="button"
                      onClick={() => setPreview({ type: "video", url: v.url, label: `Video ${idx + 1}` })}
                      className="absolute top-2 right-2 flex items-center space-x-1 px-2 py-1.5 rounded-lg bg-slate-950/85 hover:bg-slate-900 border border-slate-700 text-slate-200 font-bold text-[10px] uppercase tracking-wider transition-colors"
                      aria-label="Ampliar video"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Ampliar</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between px-3 py-1">
                    <p className="text-[9px] text-slate-500 font-mono">
                      Video #{idx + 1}
                      {v.recordedAt ? ` · ${new Date(v.recordedAt).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}` : ""}
                      {v.recordedBy ? ` · ${v.recordedBy}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Condiciones de Garantía */}
        {(
          <section className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-4">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-cyan-400 mb-2 flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Condiciones de Garantía</span>
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Antes de aprobar tu presupuesto, te recomendamos revisar nuestras Condiciones de Garantía.
            </p>
            <a
              href={`${window.location.origin}${window.location.pathname.replace(/\/app\/.+$/, "")}garantia`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center space-x-2 w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Consultar Condiciones de Garantía</span>
              <ExternalLink className="w-3 h-3" />
              </a>
            </section>
          )}

        {/* Estado de respuesta / Botones */}
        {responded ? (
          <section className={`rounded-2xl p-5 text-center border ${
            status === "aprobado"
              ? "bg-emerald-950/40 border-emerald-700/50"
              : "bg-rose-950/40 border-rose-700/50"
          }`}>
            {status === "aprobado" ? (
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
            ) : (
              <XCircle className="w-12 h-12 text-rose-400 mx-auto mb-2" />
            )}
            <p className="font-black text-white text-lg">
              {status === "aprobado" ? "¡Presupuesto aprobado!" : "Presupuesto rechazado"}
            </p>
            <p className="text-sm text-slate-300 mt-1">
              {status === "aprobado"
                ? "Gracias por tu confirmación. Nuestro taller ya fue notificado y te asignaremos un técnico para comenzar tu reparación."
                : "Gracias por avisarnos. Nuestro taller se comunicará contigo para resolver cualquier duda."}
            </p>
            <p className="text-xs text-slate-500 mt-3">
              Respondiste el {repair.approvalResponseAt
                ? new Date(repair.approvalResponseAt).toLocaleString("es-PE", { dateStyle: "long", timeStyle: "short" })
                : ""}
            </p>
          </section>
        ) : (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center">
            <p className="text-sm font-bold text-white mb-1">¿Apruebas tu presupuesto?</p>
            <p className="text-xs text-slate-400 mb-4">Tu respuesta llega directamente a la asesora de nuestro taller.</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => respond("aprobado")}
                disabled={responding}
                className="flex flex-col items-center gap-1.5 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-emerald-950 font-black text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)]"
              >
                <CheckCircle2 className="w-7 h-7" />
                APROBAR
              </button>
              <button
                type="button"
                onClick={() => respond("rechazado")}
                disabled={responding}
                className="flex flex-col items-center gap-1.5 py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-black text-sm transition-all"
              >
                <XCircle className="w-7 h-7" />
                RECHAZAR
              </button>
            </div>
            {responding && (
              <p className="flex items-center justify-center space-x-2 text-xs text-cyan-400 mt-3">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Enviando tu respuesta...</span>
              </p>
            )}
          </section>
        )}

        {/* Pie */}
        <footer className="text-center text-[10px] text-slate-600 pt-4 space-y-1">
          <p className="flex items-center justify-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Documento generado por el Sistema Litio Energy</span>
          </p>
          <p>{(sentFromLabels[repair.workshopBranch] || "ENVIADO DESDE LITIO ENERGY") + " — LIMA, PERÚ"}</p>
        </footer>
      </main>

      {/* Visor de evidencia ampliada (fotos y videos) */}
      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setPreview(null); }}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>

          {preview.type === "photo" ? (
            <img
              src={preview.url}
              alt={preview.label || "Evidencia"}
              className="max-h-[92vh] max-w-full object-contain rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <video
              src={preview.url}
              controls
              autoPlay
              className="max-h-[92vh] w-full max-w-5xl object-contain rounded-xl bg-black"
              onClick={(e) => e.stopPropagation()}
            />
          )}

          {preview.label && (
            <p className="absolute bottom-6 left-0 right-0 text-center text-xs text-slate-300 font-mono">{preview.label}</p>
          )}
        </div>
      )}
    </div>
  );
}
