import React, { useState, useEffect } from "react";
import { Printer, Plus, Minus, Store, User, Hash, Receipt, RotateCcw, ChevronDown, ChevronUp, Settings, Trash, Zap, Wrench, XCircle, Check, Ban, X } from "lucide-react";
import { db, isFirebaseConfigured, collection, doc, getDocs, getDoc, setDoc, query, where, orderBy, limit, serverTimestamp, runTransaction } from "../firebase";
import { nextClientId } from "../data/idGenerator";
import { normalizeDocument, detectDocumentType, canUseAsCanonicalDocId } from "../data/documentValidator";

interface ExpressService {
  id: string;
  name: string;
  price: number;
  qty: number;
}

interface ExpressConfig {
  businessName: string;
  ruc: string;
  address: string;
}

interface ReceiptItem {
  name: string;
  price: number;
  qty: number;
  subtotal: number;
}

interface ExpressReceipt {
  correlative: string;
  date: string;
  localKey: string;
  localName: string;
  localAddress: string;
  businessName: string;
  ruc: string;
  clientName: string;
  clientDni: string;
  clientPhone: string;
  clientInternalId?: string;
  vehicleType: string;
  technicianName: string;
  createdBy?: string;
  seq?: number;
  items: ReceiptItem[];
  total: number;
  paymentMethod?: string; // efectivo | yape_plin | transferencia | tarjeta (vacío en recibos antiguos)
  annulled?: boolean;
  annulledAt?: string;
  annulReason?: string;
}

export const EXPRESS_PAYMENT_METHODS: Array<{ key: string; label: string }> = [
  { key: "efectivo", label: "Efectivo" },
  { key: "yape_plin", label: "Yape / Plin" },
  { key: "transferencia", label: "Transferencia" },
  { key: "tarjeta", label: "Tarjeta" }
];

export function paymentMethodLabel(key?: string): string {
  return EXPRESS_PAYMENT_METHODS.find((m) => m.key === key)?.label || "";
}

const LOCALES = [
  { key: "lince_arenales", name: "Litio San Isidro", address: "Av. Arenales 2584, San Isidro", short: "San Isidro" },
  { key: "surco", name: "Litio Surco", address: "Av. Santiago de Surco 4352, Surco", short: "Surco" },
  { key: "san_borja", name: "Litio San Borja", address: "Av. Aviación 2410 – Stand 17, San Borja", short: "San Borja" },
  { key: "lince_leal", name: "Litio Lince Leal", address: "Av. Jose Leal 571, Lince", short: "Lince" }
];

const DEFAULT_SERVICES: ExpressService[] = [
  { id: "frenos", name: "Regulación de frenos", price: 30, qty: 1 },
  { id: "acelerador", name: "Cambio de acelerador", price: 40, qty: 1 },
  { id: "cambio_freno", name: "Cambio de freno", price: 40, qty: 1 },
  { id: "camara", name: "Cambio de cámara", price: 35, qty: 1 },
  { id: "llanta", name: "Cambio de llanta", price: 50, qty: 1 },
  { id: "acople", name: "Ajuste de acople", price: 30, qty: 1 },
  { id: "pastillas", name: "Cambio de pastillas de freno", price: 25, qty: 1 },
  { id: "linea", name: "Cambio de línea de freno", price: 10, qty: 1 }
];

const DEFAULT_CONFIG: ExpressConfig = {
  businessName: "GRUPO PERU CREARTE S.A.C.",
  ruc: "",
  address: ""
};

const localName = (key: string) => (LOCALES.find((l) => l.key === key) || LOCALES[0]).name;
const localShort = (key: string) => (LOCALES.find((l) => l.key === key) || LOCALES[0]).short;
const isCustomService = (id: string) => !DEFAULT_SERVICES.some((d) => d.id === id);
const serviceKey = (k: string) => `litio_express_services_${k}`;
const configKey = (k: string) => `litio_express_config_${k}`;
const countKey = (k: string) => `litio_express_count_${k}`;
const historyKey = (k: string) => `litio_express_history_${k}`;

const money = (n: any) => {
  const num = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return `S/ ${num.toFixed(2)}`;
};

const esc = (s: any) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );

function sanitizeServices(list: unknown): ExpressService[] {
  if (!Array.isArray(list)) return DEFAULT_SERVICES.map((s) => ({ ...s }));
  const defaults = new Map(DEFAULT_SERVICES.map((s) => [s.id, s]));
  const out = list
    .filter((s): s is Partial<ExpressService> => !!s && typeof s === "object")
    .map((s) => {
      const base = defaults.get(s.id || "") || { id: s.id || "servicio", name: "Servicio", price: 0 };
      const qty = typeof s.qty === "number" && Number.isFinite(s.qty) ? s.qty : 1;
      return {
        id: base.id,
        name: typeof s.name === "string" && s.name ? s.name : base.name,
        price: typeof s.price === "number" && Number.isFinite(s.price) ? s.price : base.price,
        qty: qty >= 0 ? Math.floor(qty) : 0
      };
    });
  return out.length ? out : DEFAULT_SERVICES.map((s) => ({ ...s }));
}

function loadServices(key: string): ExpressService[] {
  try {
    const raw = localStorage.getItem(serviceKey(key));
    if (!raw) return DEFAULT_SERVICES.map((s) => ({ ...s }));
    const list = sanitizeServices(JSON.parse(raw));
    // Conserva solo los servicios por defecto; descarta productos personalizados
    // (custom_...) que se hayan creado y guardado previamente en esta sede.
    const defaultsOnly = list.filter((s) => DEFAULT_SERVICES.some((d) => d.id === s.id));
    return defaultsOnly.length ? defaultsOnly : DEFAULT_SERVICES.map((s) => ({ ...s }));
  } catch {
    return DEFAULT_SERVICES.map((s) => ({ ...s }));
  }
}

function sanitizeReceipt(raw: unknown): ExpressReceipt {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;
  const num = (v: any, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);
  const str = (v: any, d = "") => (typeof v === "string" ? v : d);
  const items: ReceiptItem[] = Array.isArray(r.items)
    ? r.items
        .map((i) => {
          const it = (i && typeof i === "object" ? i : {}) as Record<string, any>;
          const price = num(it.price);
          const qty = num(it.qty, 1);
          return { name: str(it.name, "Servicio"), price, qty, subtotal: num(it.subtotal, price * qty) };
        })
        .filter((i) => i.name && i.subtotal >= 0)
    : [];
  return {
    correlative: str(r.correlative, "E-N/A"),
    date: str(r.date),
    localKey: str(r.localKey),
    localName: str(r.localName),
    localAddress: str(r.localAddress),
    businessName: str(r.businessName, DEFAULT_CONFIG.businessName),
    ruc: str(r.ruc),
    clientName: str(r.clientName),
    clientDni: str(r.clientDni),
    clientPhone: str(r.clientPhone),
    vehicleType: str(r.vehicleType),
    technicianName: str(r.technicianName),
    createdBy: str(r.createdBy),
    seq: num(r.seq),
    items,
    total: num(r.total, items.reduce((s, i) => s + i.subtotal, 0)),
    paymentMethod: str(r.paymentMethod),
    annulled: r.annulled === true,
    annulledAt: str(r.annulledAt),
    annulReason: str(r.annulReason)
  };
}

function loadHistory(key: string): ExpressReceipt[] {
  try {
    const raw = localStorage.getItem(historyKey(key));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((r) => sanitizeReceipt(r)) : [];
  } catch {
    return [];
  }
}

function sanitizeConfig(raw: unknown): ExpressConfig {
  const c = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    businessName: typeof c.businessName === "string" ? c.businessName : DEFAULT_CONFIG.businessName,
    ruc: typeof c.ruc === "string" ? c.ruc : "",
    address: typeof c.address === "string" ? c.address : ""
  };
}

function loadConfig(key: string): ExpressConfig {
  try {
    const raw = localStorage.getItem(configKey(key));
    if (!raw) return { ...DEFAULT_CONFIG };
    return sanitizeConfig(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function loadCount(key: string): number {
  try {
    return parseInt(localStorage.getItem(countKey(key)) || "0", 10) || 0;
  } catch {
    return 0;
  }
}

function receiptToFirestore(r: ExpressReceipt, seq: number) {
  const { createdBy, seq: _oldSeq, ...rest } = r;
  return { ...rest, createdBy, seq, createdAt: serverTimestamp() };
}

function buildReceiptHtml(receipt: ExpressReceipt, withToolbar = false): string {
  const itemsHtml = receipt.items
    .map(
      (i) => `
        <div class="item">
          <p class="name">${esc(i.name)} &times; ${esc(i.qty)}</p>
          <p class="amt">${money(i.subtotal)}</p>
        </div>`
    )
    .join("");
  const doc = `<!doctype html>
<html><head><meta charset="utf-8" /><title>Recibo ${esc(receipt.correlative)}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Courier New", monospace; font-size: 11px; color: #000; background: #fff; padding: 4mm 5mm; width: 100%; max-width: 80mm; margin: 0 auto; }
  .center { text-align: center; }
  h1 { font-size: 13px; letter-spacing: -0.5px; }
  .muted { font-size: 9px; }
  .bold { font-weight: bold; }
  .dashed { border-top: 1px dashed #000; margin: 6px 0; }
  .big { font-size: 10px; font-weight: bold; text-align: center; margin: 4px 0; }
  .item { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 9px; font-weight: 600; }
  .total { display: flex; justify-content: space-between; font-size: 11px; font-weight: 900; }
  .thanks { text-align: center; font-size: 9px; font-weight: 600; }
  .small { text-align: center; font-size: 8px; }
  .anulado { text-align: center; font-size: 14px; font-weight: 900; color: #dc2626; border: 3px solid #dc2626; border-radius: 4px; padding: 2px 8px; margin: 6px auto; display: inline-block; letter-spacing: 3px; }
  .watermark { position: relative; }
  @media print { .no-print { display: none !important; } }
  .toolbar { position: fixed; bottom: 16px; left: 0; right: 0; display: flex; justify-content: center; gap: 12px; z-index: 9999; }
  .btn { border: none; border-radius: 50px; padding: 10px 18px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; letter-spacing: 0.3px; }
  .btn-print { background: #0284c7; color: #fff; box-shadow: 0 4px 12px rgba(2,132,199,0.4); }
  .btn-download { background: #16a34a; color: #fff; box-shadow: 0 4px 12px rgba(22,163,74,0.4); }
</style></head><body>
  ${withToolbar ? `<div class="toolbar no-print">
    <button class="btn btn-download" onclick="window.print()">&#128229; Descargar</button>
    <button class="btn btn-print" onclick="window.print()">&#128424;&#65039; Imprimir</button>
  </div>` : ""}
  <div class="center watermark">
    <h1>LITIO<span style="color:#06b6d4">ENERGY</span></h1>
    <p class="muted bold">${esc(receipt.businessName)}</p>
    ${receipt.ruc ? `<p class="muted">RUC: ${esc(receipt.ruc)}</p>` : ""}
  </div>
  <div class="dashed"></div>
  <div class="center">
    <p class="muted bold">${esc(receipt.localName)}</p>
    ${receipt.localAddress ? `<p class="muted">${esc(receipt.localAddress)}</p>` : ""}
  </div>
  <div class="dashed"></div>
  <p class="big">RECIBO N&deg; ${esc(receipt.correlative)}</p>
  <p class="muted">Fecha: ${esc(receipt.date)}</p>
  ${receipt.technicianName ? `<p class="muted">Atendido por: ${esc(receipt.technicianName)}</p>` : ""}
  ${receipt.createdBy && receipt.createdBy !== receipt.technicianName ? `<p class="muted">Registrado por: ${esc(receipt.createdBy)}</p>` : ""}
  <p class="muted">Cliente: ${esc(receipt.clientName) || "&mdash;"}</p>
  <p class="muted">DNI/RUC: ${esc(receipt.clientDni) || "&mdash;"}</p>
  ${receipt.vehicleType ? `<p class="muted">Vehículo: ${esc(receipt.vehicleType)}</p>` : ""}
  ${receipt.clientPhone ? `<p class="muted">Celular: ${esc(receipt.clientPhone)}</p>` : ""}
  ${receipt.annulled ? `<div class="center"><span class="anulado">ANULADO</span></div>` : ""}
  ${receipt.annulled && receipt.annulReason ? `<p class="muted center" style="margin-top:4px;">Motivo: ${esc(receipt.annulReason)}</p>` : ""}
  <div class="dashed"></div>
  ${itemsHtml}
  <div class="dashed"></div>
  <div class="total"><span>TOTAL</span><span>${money(receipt.total)}</span></div>
  ${paymentMethodLabel(receipt.paymentMethod) ? `<p class="muted" style="margin-top:3px;">Pago: ${esc(paymentMethodLabel(receipt.paymentMethod))}</p>` : ""}
  <div class="dashed"></div>
  ${receipt.annulled ? `<div class="center"><div class="anulado">ANULADO</div></div><div class="dashed"></div>` : ""}
  <p class="thanks">&iexcl;Gracias por su visita!</p>
  <p class="small">Servicio Express &middot; Litio Energy</p>
</body></html>`;

  return doc;
}

// Abre el recibo en una pestaña nueva (URL propia) con opciones de descargar / imprimir.
// Se usa un Blob URL con rel="noopener" para que la pestaña corra en su propio contexto
// y al imprimir NO bloquee la aplicación de Litio Energy.
export function openReceipt(receipt: ExpressReceipt) {
  const blob = new Blob([buildReceiptHtml(receipt, true)], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// Envía el recibo directo a la impresora (sin pestaña intermedia).
export function printReceipt(receipt: ExpressReceipt) {
  const doc = buildReceiptHtml(receipt);
  const iframe = document.createElement("iframe");
  iframe.setAttribute("style", "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;pointer-events:none;");
  document.body.appendChild(iframe);
  const idoc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
  if (idoc) {
    idoc.open();
    idoc.write(doc);
    idoc.close();
  }
  const cleanup = () => {
    setTimeout(() => {
      try {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      } catch {}
    }, 1000);
  };
  try {
    const cw = iframe.contentWindow;
    if (cw) {
      cw.focus();
      cw.onafterprint = cleanup;
      cw.print();
    }
  } catch {
    cleanup();
  }
  setTimeout(cleanup, 30000);
}

export default function ExpressView({ userLocalKey, userName }: { userLocalKey?: string; userName?: string }) {
  const [localKey, setLocalKey] = useState<string>(() => {
    if (userLocalKey) return userLocalKey;
    try {
      return localStorage.getItem("litio_express_local") || "lince_arenales";
    } catch {
      return "lince_arenales";
    }
  });
  const [services, setServices] = useState<ExpressService[]>(() => loadServices(localKey || "lince_arenales"));
  const [config, setConfig] = useState<ExpressConfig>(() => loadConfig(localKey || "lince_arenales"));
  const [history, setHistory] = useState<ExpressReceipt[]>(() => loadHistory(localKey || "lince_arenales"));
  const [hydrating, setHydrating] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientDni, setClientDni] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [technicianName, setTechnicianName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [searchStatus, setSearchStatus] = useState<string | null>(null);
  const [preview, setPreview] = useState<ExpressReceipt | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [annulTarget, setAnnulTarget] = useState<ExpressReceipt | null>(null);
  const [annulReasonInput, setAnnulReasonInput] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem("litio_express_local", localKey);
    } catch {}
    setServices(loadServices(localKey));
    setConfig(loadConfig(localKey));
    const ls = loadHistory(localKey);
    setHistory(ls);
    setPreview(null);
    setHydrating(true);
    let cancelled = false;
    if (isFirebaseConfigured && db) {
      const q = query(collection(db, "recibos_express", localKey, "recibos"), orderBy("seq", "desc"), limit(200));
      getDocs(q)
        .then(async (snap) => {
          if (cancelled) return;
          const docs = snap.docs.map((d) => sanitizeReceipt(d.data()));
          if (docs.length) setHistory(docs);
          const existing = new Set(docs.map((r) => r.correlative));
          const toMigrate = ls.filter((r) => !existing.has(r.correlative));
          if (toMigrate.length) {
            const startSeq = docs.reduce((m, r) => Math.max(m, r.seq || 0), 0);
            await Promise.all(
              toMigrate.map((r, idx) =>
                setDoc(doc(db, "recibos_express", localKey, "recibos", r.correlative), receiptToFirestore(r, startSeq + idx + 1))
              )
            );
            setHistory((prev) => (prev.length ? prev : toMigrate));
          }
        })
        .catch((e) => console.error("Error cargando recibos:", e))
        .finally(() => {
          if (!cancelled) setHydrating(false);
        });
    } else {
      setHydrating(false);
    }
    return () => {
      cancelled = true;
    };
  }, [localKey]);

  useEffect(() => {
    try {
      localStorage.setItem(serviceKey(localKey), JSON.stringify(services));
    } catch {}
  }, [services, localKey]);

  useEffect(() => {
    try {
      localStorage.setItem(configKey(localKey), JSON.stringify(config));
    } catch {}
  }, [config, localKey]);

  useEffect(() => {
    if (searchStatus === "found" || searchStatus === "busy") return;
    const doc = clientDni.trim();
    if (doc.length >= 8 && detectDocumentType(doc)) {
      const t = setTimeout(() => {
        handleSearchClient();
      }, 350);
      return () => clearTimeout(t);
    }
  }, [clientDni]);

  const selectedTotal = services.reduce((sum, s) => sum + s.price * s.qty, 0);
  const selectedCount = services.reduce((sum, s) => sum + (s.qty > 0 ? 1 : 0), 0);

  const setPrice = (id: string, value: string) => {
    const num = parseFloat(value) || 0;
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, price: num } : s)));
  };

  const setQty = (id: string, qty: number) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, qty: Math.max(0, qty) } : s)));
  };

  const resetQuantities = () => {
    setServices((prev) => prev.map((s) => ({ ...s, qty: 0 })));
  };

  const resetPrices = () => {
    setServices(DEFAULT_SERVICES.map((s) => ({ ...s, qty: 0 })));
  };

  const addProduct = () => {
    const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setServices((prev) => [...prev, { id, name: "", price: 0, qty: 1 }]);
  };

  const updateServiceName = (id: string, name: string) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  };

  const removeService = (id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSearchClient = async () => {
    const input = clientDni.trim();
    if (!input) {
      alert("Ingresa el DNI, C.E o RUC del cliente para buscar.");
      return;
    }
    setSearchStatus("busy");
    try {
      let match: any = null;
      if (isFirebaseConfigured && db) {
        try {
          const localQ = query(collection(db, "clientes", localKey, "clientes"), where("dni", "==", input));
          const localSnap = await getDocs(localQ);
          if (!localSnap.empty) match = localSnap.docs[0].data();
        } catch (e) {
          console.error("Error buscando cliente del local:", e);
        }
        if (!match) {
          try {
            // Acepta clientes de CUALQUIER sede: un DNI es único por persona
            const q = query(collection(db, "clientes"), where("dni", "==", input));
            const snap = await getDocs(q);
            for (const d of snap.docs) {
              match = d.data() as any;
              break;
            }
          } catch (e) {
            console.error("Error buscando cliente global:", e);
          }
        }
      }
      if (match && (match.name || match.phone)) {
        setClientName(match.name || "");
        setClientPhone(match.phone || "");
        setSearchStatus("found");
      } else {
        setSearchStatus("empty");
      }
    } finally {
      setSearchStatus((s) => (s === "busy" ? null : s));
    }
  };

  const generateReceipt = async () => {
    const items: ReceiptItem[] = services
      .filter((s) => s.qty > 0 && s.price > 0 && s.name.trim())
      .map((s) => ({ name: s.name, price: s.price, qty: s.qty, subtotal: s.price * s.qty }));
    if (!items.length) {
      alert("Selecciona al menos un servicio (cantidad mayor a 0) para generar el recibo.");
      return;
    }
    if (!clientDni.trim()) {
      alert("El documento del cliente es obligatorio. Ingrese un DNI (8 dígitos), un Carnet de Extranjería (C.E) o un RUC (11 dígitos).");
      return;
    }
    if (!detectDocumentType(clientDni.trim())) {
      alert("El documento ingresado no es válido. Ingrese un DNI (8 dígitos), un Carnet de Extranjería (C.E) o un RUC (11 dígitos).");
      return;
    }
    if (!clientPhone.trim()) {
      alert("El teléfono del cliente es obligatorio para generar el recibo.");
      return;
    }
    if (!technicianName.trim()) {
      alert("El técnico asignado es obligatorio para generar el recibo.");
      return;
    }
    if (!paymentMethod) {
      alert("Selecciona el método de pago (Efectivo, Yape / Plin, Transferencia o Tarjeta) para generar el recibo.");
      return;
    }

    const count = loadCount(localKey);
    const maxSeq = history.reduce((m, r) => Math.max(m, r.seq || 0), 0);
    let nextCount = count + 1;
    if (isFirebaseConfigured && db) {
      // Asignación atómica del correlativo con transacción Firestore: dos asesoras
      // en el mismo local nunca obtienen el mismo número, aunque generen a la vez.
      const metaRef = doc(db, "recibos_express", localKey, "meta", "count");
      try {
        nextCount = await runTransaction(db, async (transaction) => {
          const metaSnap = await transaction.get(metaRef);
          const metaCount = metaSnap.exists() && typeof metaSnap.data().count === "number" ? metaSnap.data().count : 0;
          const next = Math.max(metaCount, count, maxSeq) + 1;
          transaction.set(metaRef, { count: next, lastUpdated: new Date().toISOString() }, { merge: true });
          return next;
        });
      } catch {
        nextCount = Math.max(count, maxSeq) + 1;
      }
    }
    const correlative = `E-${new Date().getFullYear()}-${String(nextCount).padStart(4, "0")}`;

    // Sincronizar cliente del Express: dar ID interno CLI-XXXXXX si es nuevo.
    // Se resuelve ANTES de guardar el recibo para poder dejar el recibo enlazado
    // por internalId (misma identidad que las OT).
    let clientInternalId = "";
    if (isFirebaseConfigured && db) {
      try {
        const dniSync = normalizeDocument(clientDni || "");
        const phoneSync = clientPhone.trim();
        // Solo un documento bien formado (DNI/RUC o Carné de Extranjería con letra)
        // puede usarse como id del doc canónico; un DNI mal tecleado nunca crea un
        // documento "clientes/{dniRoto}".
        const dniSyncEsIdValido = canUseAsCanonicalDocId(dniSync);
        let clientRef = doc(db, "clientes", dniSyncEsIdValido ? dniSync : (phoneSync || correlative));
        let existing = await getDoc(clientRef);
        // Dedupe: si el doc con id = DNI/teléfono no existe, buscar por campo dni, phone o phone2
        // para no crear duplicados del mismo cliente.
        if (!existing.exists() && dniSync) {
          const byDni = await getDocs(query(collection(db, "clientes"), where("dni", "==", dniSync), limit(5)));
          const candidato = byDni.docs.find((d) => (d.data() as any)?.archived !== true && !(d.data() as any)?.mergedInto);
          if (candidato) {
            clientRef = candidato.ref;
            existing = await getDoc(clientRef);
          } else if (!byDni.empty) {
            clientRef = byDni.docs[0].ref;
            existing = await getDoc(clientRef);
          }
        } else if (!existing.exists() && phoneSync && (existing as any)) {
          const byPhone = await getDocs(query(collection(db, "clientes"), where("phone", "==", phoneSync), limit(5)));
          let candidato = byPhone.docs.find((d) => (d.data() as any)?.archived !== true && !(d.data() as any)?.mergedInto);
          if (!candidato) {
            const byPhone2 = await getDocs(query(collection(db, "clientes"), where("phone2", "==", phoneSync), limit(5)));
            candidato = byPhone2.docs.find((d) => (d.data() as any)?.archived !== true && !(d.data() as any)?.mergedInto);
            if (candidato) {
              clientRef = candidato.ref;
              existing = await getDoc(clientRef);
            }
          } else {
            clientRef = candidato.ref;
            existing = await getDoc(clientRef);
          }
        }
        const existingData = existing.exists() ? (existing.data() as any) : null;
        const internalId = existingData?.internalId || await nextClientId();
        clientInternalId = internalId;
        // Consolidación de teléfonos: conservar el principal original y guardar el
        // número nuevo como phone2 en el mismo documento (sin crear otro ID).
        let phoneMain = phoneSync;
        let phoneExtra = existingData?.phone2 || "";
        if (existingData?.phone) {
          phoneMain = String(existingData.phone).trim();
          if (phoneSync && phoneSync !== phoneMain && phoneSync !== String(existingData.phone2 || "").trim()) {
            phoneExtra = phoneSync;
          }
        }
        const clientDoc: any = {
          internalId,
          name: clientName.trim(),
          phone: phoneMain,
          dni: dniSync,
          docType: detectDocumentType(dniSync),
          vehicleType: vehicleType.trim(),
          source: existingData?.source === "tablet" ? "tablet" : "express",
          createdAt: existingData?.createdAt || Date.now(),
          updatedAt: Date.now()
        };
        if (phoneExtra) clientDoc.phone2 = phoneExtra;
        await setDoc(clientRef, clientDoc, { merge: true });
      } catch (e) {
        console.error("Error sincronizando cliente Express:", e);
      }
    }

    const receipt: ExpressReceipt = {
      correlative,
      date: new Date().toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" }),
      localKey,
      localName: localName(localKey),
      localAddress: config.address || LOCALES.find((l) => l.key === localKey)?.address || "",
      businessName: config.businessName || "GRUPO PERU CREARTE S.A.C.",
      ruc: config.ruc,
      clientName: clientName.trim(),
      clientDni: clientDni.trim(),
      clientPhone: clientPhone.trim(),
      clientInternalId,
      vehicleType: vehicleType.trim(),
      technicianName: technicianName.trim(),
      createdBy: userName || "",
      seq: nextCount,
      items,
      total: items.reduce((sum, i) => sum + i.subtotal, 0),
      paymentMethod
    };
    setPreview(receipt);

    if (isFirebaseConfigured && db) {
      try {
        // El contador ya se actualizó de forma atómica en la transacción; solo guardamos el recibo.
        await setDoc(doc(db, "recibos_express", localKey, "recibos", correlative), receiptToFirestore(receipt, nextCount));
      } catch (e) {
        console.error("Error guardando recibo en Firestore:", e);
      }
    }

    try {
      localStorage.setItem(countKey(localKey), String(nextCount));
    } catch {}
    const updated = [receipt, ...history].slice(0, 50);
    setHistory(updated);
    try {
      localStorage.setItem(historyKey(localKey), JSON.stringify(updated));
    } catch {}
    setServices((prev) => prev.map((s) => ({ ...s, qty: 0 })));
    // El siguiente cliente debe elegir su propio método de pago.
    setPaymentMethod("");
  };

  const handlePrint = () => {
    if (!preview) {
      alert("Genera primero el recibo.");
      return;
    }
    printReceipt(preview);
  };

  const toggleAnnulled = (corr: string, reason?: string) => {
    const target = history.find((x) => x.correlative === corr);
    if (!target) return;
    const annulled = !target.annulled;
    const reasonClean = annulled ? (reason || "").trim() : "";
    const updated = history.map((x) =>
      x.correlative === corr
        ? { ...x, annulled, annulledAt: annulled ? new Date().toISOString() : "", annulReason: reasonClean || "" }
        : x
    );
    setHistory(updated);
    try {
      localStorage.setItem(historyKey(localKey), JSON.stringify(updated));
    } catch {}
    if (isFirebaseConfigured && db) {
      const docRef = doc(db, "recibos_express", localKey, "recibos", corr);
      setDoc(
        docRef,
        {
          annulled,
          annulledAt: annulled ? new Date().toISOString() : null,
          annulReason: annulled ? reasonClean : ""
        },
        { merge: true }
      ).catch(() => {});
    }
    if (preview?.correlative === corr) setPreview(updated.find((x) => x.correlative === corr) || null);
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-2">
              <span className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                <Zap className="w-5 h-5 text-cyan-400" />
              </span>
              <span>Servicio <span className="text-cyan-400">Express</span></span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Ventas rápidas y recibo térmico por local
            </p>
          </div>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center space-x-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Datos del local</span>
            {showConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Selector de local */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
          {LOCALES.map((loc) => (
            <button
              key={loc.key}
              onClick={() => setLocalKey(loc.key)}
              disabled={!!userLocalKey}
              className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border text-xs font-bold transition-all ${
                localKey === loc.key
                  ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                  : userLocalKey
                    ? "bg-slate-900 border-slate-800 text-slate-500 opacity-50 cursor-not-allowed"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <Store className="w-4 h-4" />
              <span>{loc.short}</span>
            </button>
          ))}
        </div>

        {showConfig && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-900/70 border border-slate-800 rounded-2xl mb-5">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Razón Social</label>
              <input
                type="text"
                autoComplete="off"
                value={config.businessName}
                onChange={(e) => setConfig({ ...config, businessName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">RUC</label>
              <input
                type="text"
                autoComplete="off"
                value={config.ruc}
                onChange={(e) => setConfig({ ...config, ruc: e.target.value })}
                placeholder="2060XXXXXXX"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Dirección</label>
              <input
                type="text"
                autoComplete="off"
                value={config.address}
                onChange={(e) => setConfig({ ...config, address: e.target.value })}
                placeholder="Dirección del local"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Panel de selección */}
          <div className="space-y-4">
            {/* Datos del cliente */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <h2 className="text-sm font-bold text-slate-200 mb-3 flex items-center space-x-2">
                <User className="w-4 h-4 text-cyan-400" />
                <span>Datos del cliente</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">DNI / C.E / RUC <span className="text-rose-400">*</span></label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      autoComplete="off"
                      value={clientDni}
                      onChange={(e) => {
                        setClientDni(e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12));
                        setSearchStatus(null);
                      }}
                      placeholder="DNI (8), C.E (9) o RUC (11)"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500/50"
                    />
                    <button
                      onClick={handleSearchClient}
                      disabled={searchStatus === "busy"}
                      className="shrink-0 px-3 py-2 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 rounded-lg text-xs font-bold text-cyan-300 transition-colors disabled:opacity-50"
                    >
                      {searchStatus === "busy" ? "Buscando..." : "Buscar"}
                    </button>
                  </div>
                  {searchStatus === "found" && (
                    <p className="text-[10px] font-semibold text-emerald-400 mt-1">Cliente encontrado: se completaron los datos.</p>
                  )}
                  {searchStatus === "empty" && (
                    <p className="text-[10px] font-semibold text-amber-400 mt-1">No se encontró un cliente registrado con ese documento.</p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Nombre del cliente</label>
                  <input
                    type="text"
                    autoComplete="off"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Celular <span className="text-rose-400">*</span></label>
                  <input
                    type="text"
                    autoComplete="off"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 9))}
                    placeholder="9XXXXXXXX"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Tipo de vehículo</label>
                  <input
                    type="text"
                    autoComplete="off"
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    placeholder="Ej: scooter, moto, bici"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Técnico que realizó el trabajo <span className="text-rose-400">*</span></label>
                  <input
                    type="text"
                    autoComplete="off"
                    value={technicianName}
                    onChange={(e) => setTechnicianName(e.target.value)}
                    placeholder="Nombre del técnico"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>
            </div>

            {/* Lista de servicios */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
                  <Wrench className="w-4 h-4 text-cyan-400" />
                  <span>Servicios y precios</span>
                </h2>
                <div className="flex space-x-2">
                  <button
                    onClick={resetQuantities}
                    title="Quitar cantidades"
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-[10px] font-bold text-slate-300 flex items-center space-x-1 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Limpiar</span>
                  </button>
                  <button
                    onClick={resetPrices}
                    title="Restaurar precios originales"
                    className="hidden px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-[10px] font-bold text-slate-300 flex items-center space-x-1 transition-colors"
                  >
                    <Hash className="w-3 h-3" />
                    <span>Precios base</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {services.map((s) => (
                  <div
                    key={s.id}
                    className={`rounded-xl border transition-colors ${
                      s.qty > 0 ? "bg-cyan-500/5 border-cyan-500/40" : "bg-slate-950/60 border-slate-800"
                    }`}
                  >
                    {/* Fila colapsada: nombre + subtotal + chevron */}
                    <button
                      type="button"
                      onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                      className="w-full flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-slate-950/40 transition-colors"
                      title={expandedId === s.id ? "Ocultar controles" : "Abrir controles del servicio"}
                    >
                      <span className="flex-1 text-xs font-semibold text-slate-200 truncate text-left">
                        {s.name}
                      </span>
                      <span className="flex items-center space-x-3 shrink-0">
                        <span className="w-20 text-right text-xs font-bold text-cyan-300">{money(s.price * s.qty)}</span>
                        <span
                          className={`flex items-center justify-center transition-transform ${
                            expandedId === s.id ? "rotate-180 text-cyan-300" : "text-slate-500"
                          }`}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </span>
                      </span>
                    </button>

                    {/* Controles expandidos */}
                    {expandedId === s.id && (
                      <div className="flex items-center gap-2 px-2 pb-2 border-t border-slate-800/60 pt-2">
                        <button
                          onClick={() => setQty(s.id, s.qty - 1)}
                          className="w-8 h-8 shrink-0 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
                          title="Quitar"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={s.qty}
                          onChange={(e) => setQty(s.id, parseInt(e.target.value, 10) || 0)}
                          className="w-12 shrink-0 px-1 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-center text-sm font-bold text-cyan-300 focus:outline-none focus:border-cyan-500/50"
                        />
                        <button
                          onClick={() => setQty(s.id, s.qty + 1)}
                          className="w-8 h-8 shrink-0 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
                          title="Agregar"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        {isCustomService(s.id) ? (
                          <input
                            type="text"
                            autoComplete="off"
                            value={s.name}
                            onChange={(e) => updateServiceName(s.id, e.target.value)}
                            placeholder="Nombre del producto"
                            className="flex-1 min-w-0 px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-semibold text-slate-100 focus:outline-none focus:border-cyan-500/50"
                          />
                        ) : (
                          <span className="flex-1 text-xs font-semibold text-slate-200 truncate">{s.name}</span>
                        )}
                        <div className="flex items-center space-x-1 shrink-0">
                          <span className="text-[10px] font-bold text-slate-500">S/</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]*\.?[0-9]*"
                            value={s.price}
                            onChange={(e) => setPrice(s.id, e.target.value)}
                            className="w-16 px-1.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-sm font-bold text-slate-100 text-right focus:outline-none focus:border-cyan-500/50"
                          />
                        </div>
                        {isCustomService(s.id) && (
                          <button
                            onClick={() => removeService(s.id)}
                            className="shrink-0 px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-bold flex items-center space-x-1 transition-colors"
                            title="Eliminar producto"
                          >
                            <Trash className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Eliminar</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={addProduct}
                className="w-full mt-3 py-2.5 bg-slate-900 hover:bg-slate-800 border border-dashed border-slate-700 hover:border-cyan-500/50 rounded-xl text-xs font-bold text-slate-400 hover:text-cyan-300 flex items-center justify-center space-x-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar producto</span>
              </button>

              <div className="flex flex-wrap items-center justify-between gap-3 mt-4 p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400">
                  <span className="font-bold text-slate-200">{selectedCount}</span> servicio{selectedCount !== 1 && "s"} seleccionado{selectedCount !== 1 && "s"}
                </div>
                <div className="text-sm font-black text-white">
                  Total: <span className="text-cyan-400">{money(selectedTotal)}</span>
                </div>
              </div>

              {/* Método de pago (obligatorio) */}
              <div className="mt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Método de pago <span className="text-rose-400">*</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {EXPRESS_PAYMENT_METHODS.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setPaymentMethod(m.key)}
                      className={`py-2.5 rounded-xl text-xs font-black border transition-all ${
                        paymentMethod === m.key
                          ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                          : "bg-slate-950 text-slate-300 border-slate-800 hover:border-cyan-500/40"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={generateReceipt}
              disabled={selectedCount === 0}
              className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-950 rounded-xl font-black text-sm transition-colors shadow-[0_0_20px_rgba(6,182,212,0.25)]"
            >
              Generar Recibo · {money(selectedTotal)}
            </button>
          </div>

          {/* Vista previa del recibo */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
                <Receipt className="w-4 h-4 text-cyan-400" />
                <span>Vista previa del recibo</span>
              </h2>
              <button
                onClick={handlePrint}
                disabled={!preview}
                className="flex items-center space-x-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-950 rounded-xl text-xs font-black transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir recibo</span>
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex justify-center">
              {preview ? (
                <ReceiptPaper receipt={preview} />
              ) : (
                <div className="flex flex-col items-center justify-center py-14 text-center space-y-2">
                  <Receipt className="w-10 h-10 text-slate-700" />
                  <p className="text-xs text-slate-500 font-medium max-w-[240px]">
                    Selecciona los servicios y presiona "Generar Recibo" para verlo aquí e imprimirlo.
                  </p>
                </div>
              )}
            </div>

            {/* Historial */}
            {history.length > 0 && (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                <h3 className="text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider flex items-center justify-between">
                  <span>Recibos de {localShort(localKey)}</span>
                  {hydrating && <span className="text-[10px] text-cyan-400 font-normal normal-case">Sincronizando…</span>}
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {history.map((r) => (
                    <div
                      key={r.correlative}
                      onClick={() => setPreview(r)}
                      className={`flex items-center justify-between gap-2 p-2.5 bg-slate-950 border rounded-xl cursor-pointer transition-colors ${
                        r.annulled ? "border-rose-500/30 opacity-70" : "border-slate-800 hover:border-cyan-500/40"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className={`text-xs font-bold font-mono ${r.annulled ? "text-rose-400 line-through" : "text-cyan-300"}`}>{r.correlative}</p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {r.annulled ? "ANULADO · " : ""}
                          {r.annulled && r.annulReason ? <span className="text-rose-400/80">Motivo: {r.annulReason} · </span> : ""}
                          {r.clientName || "Sin cliente"} · {r.date}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <span className={`text-xs font-black ${r.annulled ? "text-rose-400 line-through" : "text-white"}`}>{money(r.total)}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (r.annulled) {
                              if (confirm(`¿Restaurar el recibo ${r.correlative}? Volverá a ser un recibo válido.`)) {
                                toggleAnnulled(r.correlative);
                              }
                            } else {
                              setAnnulTarget(r);
                              setAnnulReasonInput("");
                            }
                          }}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            r.annulled
                              ? "text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                              : "text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                          }`}
                          title={r.annulled ? "Restaurar recibo" : "Anular recibo"}
                        >
                          {r.annulled ? <Check className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {annulTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-rose-800/60 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">Anular Recibo</h3>
                <p className="text-[11px] text-slate-500">
                  {annulTarget.correlative} · {annulTarget.clientName || "Sin cliente"} · {localShort(localKey)}
                </p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-950 rounded-xl border border-slate-800 p-3">
                El recibo quedará marcado como <strong className="text-rose-400">ANULADO</strong> y conservará un historial de venta. Solo es válido para anulaciones del mismo día o errores de registro.
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Motivo de anulación *
                </label>
                <textarea
                  value={annulReasonInput}
                  onChange={(e) => setAnnulReasonInput(e.target.value)}
                  rows={3}
                  placeholder="Ej. Error de cobro, cliente se retractó, producto sin stock, etc."
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:border-rose-500/60 focus:outline-none transition-colors resize-none"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setAnnulTarget(null)}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Volver
              </button>
              <button
                type="button"
                disabled={!annulReasonInput.trim()}
                onClick={() => {
                  if (!annulReasonInput.trim()) return;
                  const corr = annulTarget.correlative;
                  setAnnulTarget(null);
                  toggleAnnulled(corr, annulReasonInput.trim());
                  alert(`Recibo ${corr} anulado. Motivo registrado: "${annulReasonInput.trim()}"`);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-rose-600/20"
              >
                <Ban className="w-3.5 h-3.5" />
                Anular Recibo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function ReceiptPaper({ receipt }: { receipt: ExpressReceipt }) {
  return (
    <div
      id="express-receipt-print"
      className="w-[300px] bg-white text-black font-mono text-[11px] leading-snug rounded-lg shadow-2xl overflow-hidden relative"
    >
      {receipt.annulled && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="text-rose-500 text-4xl font-black tracking-[0.2em] uppercase opacity-30 -rotate-[25deg] border-4 border-rose-500 rounded-lg px-5 py-2">
            Anulado
          </div>
        </div>
      )}
      <div className={`px-5 py-4 ${receipt.annulled ? "opacity-70" : ""}`}>
        <div className="text-center mb-2">
          <p className="text-[13px] font-black tracking-tight">LITIO<span className="text-cyan-500">ENERGY</span></p>
          <p className="text-[9px] font-bold">{receipt.businessName}</p>
          {receipt.ruc && <p className="text-[9px]">RUC: {receipt.ruc}</p>}
        </div>
        <div className="border-t border-dashed border-black my-2"></div>
        <div className="text-center mb-2">
          <p className="text-[9px] font-bold">{receipt.localName}</p>
          {receipt.localAddress && <p className="text-[9px]">{receipt.localAddress}</p>}
        </div>
        <div className="border-t border-dashed border-black my-2"></div>
        <p className="text-[10px] font-black text-center mb-1">RECIBO N° {receipt.correlative}</p>
        <p className="text-[9px]">Fecha: {receipt.date}</p>
        {receipt.technicianName && <p className="text-[9px]">Atendido por: {receipt.technicianName}</p>}
        {receipt.createdBy && receipt.createdBy !== receipt.technicianName && (
          <p className="text-[9px]">Registrado por: {receipt.createdBy}</p>
        )}
        <p className="text-[9px]">Cliente: {receipt.clientName || "—"}</p>
        <p className="text-[9px]">DNI/RUC: {receipt.clientDni || "—"}</p>
        {receipt.vehicleType && <p className="text-[9px]">Vehículo: {receipt.vehicleType}</p>}
        {receipt.clientPhone && <p className="text-[9px]">Celular: {receipt.clientPhone}</p>}
        <div className="border-t border-dashed border-black my-2"></div>
        {receipt.items.map((item, idx) => (
          <div key={idx} className="mb-1">
            <p className="text-[9px] font-semibold">{item.name} × {item.qty}</p>
            <div className="flex justify-between text-[9px]">
              <span></span>
              <span>{money(item.subtotal)}</span>
            </div>
          </div>
        ))}
        <div className="border-t border-dashed border-black my-2"></div>
        <div className="flex justify-between text-[11px] font-black">
          <span>TOTAL</span>
          <span>{money(receipt.total)}</span>
        </div>
        {paymentMethodLabel(receipt.paymentMethod) && (
          <p className="text-[9px] mt-0.5">Pago: {paymentMethodLabel(receipt.paymentMethod)}</p>
        )}
        <div className="border-t border-dashed border-black my-2"></div>
        <p className="text-center text-[9px] font-semibold">¡Gracias por su visita!</p>
        <p className="text-center text-[8px]">Servicio Express · Litio Energy</p>
        {receipt.annulled && (
          <p className="text-center text-[9px] font-black text-rose-600 mt-2">*** RECIBO ANULADO ***</p>
        )}
        {receipt.annulled && receipt.annulReason && (
          <p className="text-[9px] font-semibold text-rose-600 mt-1">Motivo: {receipt.annulReason}</p>
        )}
      </div>
    </div>
  );
}
