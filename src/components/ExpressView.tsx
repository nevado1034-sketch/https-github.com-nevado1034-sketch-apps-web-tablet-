import React, { useState, useEffect } from "react";
import { Printer, Plus, Minus, Store, User, Hash, Receipt, RotateCcw, ChevronDown, ChevronUp, Settings, Trash, Zap, Wrench, XCircle, Check } from "lucide-react";
import { db, isFirebaseConfigured, collection, doc, getDocs, getDoc, setDoc, query, where, orderBy, limit, serverTimestamp } from "../firebase";
import { nextClientId } from "../data/idGenerator";

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
  vehicleType: string;
  technicianName: string;
  createdBy?: string;
  seq?: number;
  items: ReceiptItem[];
  total: number;
  annulled?: boolean;
  annulledAt?: string;
}

const LOCALES = [
  { key: "lince_arenales", name: "Litio San Isidro Arenales", address: "Av. Arenales 2584, San Isidro", short: "San Isidro" },
  { key: "surco", name: "Litio Surco", address: "Av. Santiago de Surco 4352, Surco", short: "Surco" },
  { key: "san_borja", name: "Litio San Borja", address: "Av. Aviación 2410 – Stand 17, San Borja", short: "San Borja" },
  { key: "lince_leal", name: "Litio Lince Leal", address: "Av. Jose Leal 571, Lince", short: "Lince Leal" }
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
      const base = defaults.get(s.id) || { id: s.id || "servicio", name: "Servicio", price: 0 };
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
    return sanitizeServices(JSON.parse(raw));
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
    annulled: r.annulled === true,
    annulledAt: str(r.annulledAt)
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

function printReceipt(receipt: ExpressReceipt) {
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
  body { font-family: "Courier New", monospace; font-size: 11px; color: #000; background: #fff; padding: 4mm 5mm; }
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
</style></head><body>
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
  <div class="dashed"></div>
  ${itemsHtml}
  <div class="dashed"></div>
  <div class="total"><span>TOTAL</span><span>${money(receipt.total)}</span></div>
  <div class="dashed"></div>
  ${receipt.annulled ? `<div class="center"><div class="anulado">ANULADO</div></div><div class="dashed"></div>` : ""}
  <p class="thanks">&iexcl;Gracias por su visita!</p>
  <p class="small">Servicio Express &middot; Litio Energy</p>
</body></html>`;

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
  const [searchStatus, setSearchStatus] = useState<string | null>(null);
  const [preview, setPreview] = useState<ExpressReceipt | null>(null);
  const [showConfig, setShowConfig] = useState(false);

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
    const digits = clientDni.replace(/\D/g, "");
    if (digits.length === 8 || digits.length === 11) {
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
    if (clientDni.trim() && !/^(\d{8}|\d{11})$/.test(clientDni.trim())) {
      alert("El DNI debe tener 8 dígitos o el RUC 11 dígitos.");
      return;
    }

    let count = loadCount(localKey);
    let maxSeq = history.reduce((m, r) => Math.max(m, r.seq || 0), 0);
    if (isFirebaseConfigured && db) {
      const metaRef = doc(db, "recibos_express", localKey, "meta", "count");
      try {
        const metaSnap = await getDoc(metaRef);
        const metaCount = metaSnap.exists() && typeof metaSnap.data().count === "number" ? metaSnap.data().count : 0;
        count = Math.max(metaCount, count, maxSeq);
      } catch {}
    }
    const nextCount = count + 1;
    const correlative = `E-${new Date().getFullYear()}-${String(nextCount).padStart(4, "0")}`;
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
      vehicleType: vehicleType.trim(),
      technicianName: technicianName.trim(),
      createdBy: userName || "",
      seq: nextCount,
      items,
      total: items.reduce((sum, i) => sum + i.subtotal, 0)
    };
    setPreview(receipt);

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, "recibos_express", localKey, "meta", "count"), { count: nextCount }, { merge: true });
        await setDoc(doc(db, "recibos_express", localKey, "recibos", correlative), receiptToFirestore(receipt, nextCount));
      } catch (e) {
        console.error("Error guardando recibo en Firestore:", e);
      }
    }

    // Sincronizar cliente del Express: dar ID interno CLI-XXXXXX si es nuevo
    if (isFirebaseConfigured && db) {
      try {
        const dniSync = receipt.clientDni || "";
        const phoneSync = receipt.clientPhone || "";
        let clientRef = doc(db, "clientes", dniSync || phoneSync || correlative);
        let existing = await getDoc(clientRef);
        // Dedupe: si el doc con id = DNI/teléfono no existe, buscar por campo dni o phone
        // para no crear duplicados del mismo cliente.
        if (!existing.exists() && dniSync) {
          const byDni = await getDocs(query(collection(db, "clientes"), where("dni", "==", dniSync), limit(1)));
          if (!byDni.empty) {
            clientRef = byDni.docs[0].ref;
            existing = await getDoc(clientRef);
          }
        } else if (!existing.exists() && phoneSync && (existing as any)) {
          const byPhone = await getDocs(query(collection(db, "clientes"), where("phone", "==", phoneSync), limit(1)));
          if (!byPhone.empty) {
            clientRef = byPhone.docs[0].ref;
            existing = await getDoc(clientRef);
          }
        }
        const existingData = existing.exists() ? (existing.data() as any) : null;
        const internalId = existingData?.internalId || await nextClientId();
        const clientDoc = {
          internalId,
          name: receipt.clientName || "",
          phone: phoneSync,
          dni: dniSync,
          vehicleType: receipt.vehicleType || "",
          source: "express",
          createdAt: existingData?.createdAt || Date.now(),
          updatedAt: Date.now()
        };
        await setDoc(clientRef, clientDoc, { merge: true });
      } catch (e) {
        console.error("Error sincronizando cliente Express:", e);
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
  };

  const handlePrint = () => {
    if (!preview) {
      alert("Genera primero el recibo.");
      return;
    }
    printReceipt(preview);
  };

  const toggleAnnulled = (corr: string) => {
    const target = history.find((x) => x.correlative === corr);
    if (!target) return;
    const annulled = !target.annulled;
    const updated = history.map((x) =>
      x.correlative === corr ? { ...x, annulled, annulledAt: annulled ? new Date().toISOString() : "" } : x
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
          annulledAt: annulled ? new Date().toISOString() : null
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
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">DNI / C.E / RUC</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      autoComplete="off"
                      value={clientDni}
                      onChange={(e) => {
                        setClientDni(e.target.value.replace(/[^\d]/g, "").slice(0, 11));
                        setSearchStatus(null);
                      }}
                      placeholder="8 o 11 dígitos"
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
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Celular</label>
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
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Técnico que realizó el trabajo</label>
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
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-[10px] font-bold text-slate-300 flex items-center space-x-1 transition-colors"
                  >
                    <Hash className="w-3 h-3" />
                    <span>Precios base</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {services.map((s) => (
                  <div
                    key={s.id}
                    className={`flex items-center gap-2 p-2 rounded-xl border transition-colors ${
                      s.qty > 0 ? "bg-cyan-500/5 border-cyan-500/40" : "bg-slate-950/60 border-slate-800"
                    }`}
                  >
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
                        className="w-8 h-8 shrink-0 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 flex items-center justify-center transition-colors"
                        title="Eliminar producto"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <span className="w-20 shrink-0 text-right text-xs font-bold text-cyan-300">{money(s.price * s.qty)}</span>
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
                          {r.clientName || "Sin cliente"} · {r.date}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <span className={`text-xs font-black ${r.annulled ? "text-rose-400 line-through" : "text-white"}`}>{money(r.total)}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (r.annulled) {
                              toggleAnnulled(r.correlative);
                            } else if (confirm(`¿Anular el recibo ${r.correlative}? No se eliminará, quedará marcado como ANULADO.`)) {
                              toggleAnnulled(r.correlative);
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
    </>
  );
}

function ReceiptPaper({ receipt }: { receipt: ExpressReceipt }) {
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
        <div className="border-t border-dashed border-black my-2"></div>
        <p className="text-center text-[9px] font-semibold">¡Gracias por su visita!</p>
        <p className="text-center text-[8px]">Servicio Express · Litio Energy</p>
        {receipt.annulled && (
          <p className="text-center text-[9px] font-black text-rose-600 mt-2">*** RECIBO ANULADO ***</p>
        )}
      </div>
    </div>
  );
}
