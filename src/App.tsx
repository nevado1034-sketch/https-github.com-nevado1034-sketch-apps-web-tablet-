import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import ReceptionView from "./components/ReceptionView";
import AssignTechView from "./components/AssignTechView";
import TechnicianView from "./components/TechnicianView";
import ClientesView from "./components/ClientesView";
import ChatView from "./components/ChatView";
import ExpressView from "./components/ExpressView";
import QualityControlView from "./components/QualityControlView";
import PresupuestoView from "./components/PresupuestoView";
import ControlView from "./components/ControlView";
import OrdenPublica from "./components/OrdenPublica";
import RecepcionPublica from "./components/RecepcionPublica";
import TerminosCondiciones from "./components/TerminosCondiciones";
import GarantiaCondiciones from "./components/GarantiaCondiciones";
import AuthScreen from "./components/AuthScreen";
import AdminDashboard from "./components/AdminDashboard";
import TimeMetricsView from "./components/TimeMetricsView";
import WelcomeScreen from "./components/WelcomeScreen";
import AccessManager from "./components/AccessManager";
import { RepairItem, WorkshopStats, VideoEvidence } from "./types";
import { AuthConfig, AuthSession, ROLE_TABS, loadConfig, loadSession, saveConfig, saveSession, clearSession, isValidConfig, pushRemoteConfig, listUsers } from "./auth";
import { onRepairCreated, onRepairUpdated, onRepairDeleted } from "./data";
import { nextClientId } from "./data/idGenerator";
import { AlertCircle, RefreshCw } from "lucide-react";

// Firestore rechaza valores `undefined`; elimina recursivamente esos campos
// antes de escribir (create y update).
function cleanUndefined(obj: any): any {
  if (Array.isArray(obj)) return obj.map(cleanUndefined);
  if (obj && typeof obj === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) out[k] = cleanUndefined(v);
    }
    return out;
  }
  return obj;
}

class AppErrorBoundary extends React.Component<{ children?: React.ReactNode }, { error: Error | null }> {
  constructor(props: { children?: React.ReactNode }) {
    super(props);
    (this as any).state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error("AppErrorBoundary:", error);
  }
  render() {
    const { error } = (this as any).state;
    if (error) {
      return (
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 max-w-md w-full">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-white mb-1">Ocurrió un error inesperado</h2>
            <p className="text-sm text-slate-300 break-all mb-4">
              {error.message || "Error desconocido"}
            </p>
            <pre className="text-[10px] text-red-300/80 text-left break-all whitespace-pre-wrap mb-4 max-h-40 overflow-y-auto bg-black/30 rounded-lg p-2">
              {error.stack || error.message || "sin stack"}
            </pre>
            <p className="text-[10px] text-slate-500 mb-4">
              bundle: {(() => { try { const found = performance.getEntriesByType("resource").map((e: any) => e.name).find((n: string) => /index-[A-Za-z0-9_-]+\.js/.test(n)); const m = found && found.match(/index-([A-Za-z0-9_-]+)\.js/); return m ? m[1] : "?"; } catch { return "?"; } })()}
            </p>
            <button
              onClick={() => {
                try {
                  ["litio_express_services_", "litio_express_config_", "litio_express_history_"].forEach((p) => {
                    Object.keys(localStorage)
                      .filter((k) => k.startsWith(p))
                      .forEach((k) => localStorage.removeItem(k));
                  });
                } catch {}
                (this as any).setState({ error: null });
              }}
              className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg mb-2"
            >
              <RefreshCw className="w-4 h-4" /> Limpiar datos del Express y reintentar
            </button>
            <div>
              <button
                onClick={() => {
                  try {
                    location.href = location.pathname + "?v=" + Date.now();
                  } catch {
                    location.reload();
                  }
                }}
                className="text-sm text-slate-400 hover:text-white underline"
              >
                Recargar la aplicación
              </button>
            </div>
          </div>
        </main>
      );
    }
    return (this as any).props.children;
  }
}
import { 
  db, 
  isFirebaseConfigured, 
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
  collection, 
  doc, 
  setDoc, 
  deleteDoc,
  onSnapshot, 
  query, 
  orderBy,
  where,
  limit,
  getDoc,
  getDocs
} from "./firebase";

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>(() => {
    const s = loadSession();
    return s && s.role ? ROLE_TABS[s.role][0] : "reception";
  });
  const [enteredPlatform, setEnteredPlatform] = useState<boolean>(false);
  const [repairs, setRepairs] = useState<RepairItem[]>([]);
  const [stats, setStats] = useState<WorkshopStats>({
    total: 0,
    receptioned: 0,
    diagnosing: 0,
    repairing: 0,
    testing: 0,
    ready: 0,
    delivered: 0,
    monthlyEarnings: 0
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Configuración de accesos y sesión activa (guardadas localmente en esta tablet)
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(() => loadConfig());
  const [session, setSession] = useState<AuthSession | null>(() => loadSession());
  const [authConfigReady, setAuthConfigReady] = useState<boolean>(false);

  // Si la sesión activa no tiene permiso sobre la pestaña actual, redirige a la primera permitida
  useEffect(() => {
    if (session && !ROLE_TABS[session.role].includes(currentTab)) {
      setCurrentTab(ROLE_TABS[session.role][0]);
    }
  }, [session]);

  // Ruta pública para el cliente: #/orden/{id} (sin necesidad de iniciar sesión)
  const [publicOrderId, setPublicOrderId] = useState<string | null>(() => {
    const m = window.location.hash.match(/^#\/orden\/(.+)$/);
    return m ? decodeURIComponent(m[1]) : null;
  });

  // Ruta pública: /recepcion/{id} - Confirmación de ingreso del cliente (URL limpia)
  const [publicReceptionId, setPublicReceptionId] = useState<string | null>(() => {
    const p = window.location.pathname;
    const m = p.match(/^\/recepcion\/(.+)$/);
    if (m) return decodeURIComponent(m[1]);
    const hm = window.location.hash.match(/^#\/recepcion\/(.+)$/);
    return hm ? decodeURIComponent(hm[1]) : null;
  });

  // Ruta pública: /terminos - Términos y Condiciones (URL limpia)
  const [showTerminos, setShowTerminos] = useState<boolean>(() => {
    return window.location.pathname === "/terminos" || window.location.hash === "#/terminos";
  });

  // Ruta pública: /garantia - Condiciones de Garantía
  const [showGarantia, setShowGarantia] = useState<boolean>(() => {
    return window.location.pathname === "/garantia" || window.location.hash === "#/garantia";
  });

  useEffect(() => {
    const onHash = () => {
      const m = window.location.hash.match(/^#\/orden\/(.+)$/);
      setPublicOrderId(m ? decodeURIComponent(m[1]) : null);
      const p = window.location.pathname;
      const rm = p.match(/^\/recepcion\/(.+)$/);
      const rhm = window.location.hash.match(/^#\/recepcion\/(.+)$/);
      setPublicReceptionId(rm ? decodeURIComponent(rm[1]) : rhm ? decodeURIComponent(rhm[1]) : null);
      setShowTerminos(window.location.pathname === "/terminos" || window.location.hash === "#/terminos");
      setShowGarantia(window.location.pathname === "/garantia" || window.location.hash === "#/garantia");
    };
    window.addEventListener("hashchange", onHash);
    window.addEventListener("popstate", onHash);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("popstate", onHash);
    };
  }, []);

  // Sincroniza la configuración de accesos con Firestore para que sea la misma en todos los dispositivos
  useEffect(() => {
    if (isFirebaseConfigured && db) {
      const unsub = onSnapshot(doc(db, "config", "accesos"), (snap) => {
        const data = snap.data();
        const remote = data && (data.config || data);
        if (isValidConfig(remote)) {
          setAuthConfig(remote);
          saveConfig(remote);
        } else if (!loadConfig()) {
          setAuthConfig(null);
        }
        setAuthConfigReady(true);
      }, (err) => {
        console.error("Error sincronizando configuración de accesos:", err);
        setAuthConfigReady(true);
      });
      return () => unsub();
    }
    setAuthConfigReady(true);
    return undefined;
  }, []);

  // Fetch all repairs & stats from backend (Fallback Mode)
  const fetchAllData = async (silent = false) => {
    if (isFirebaseConfigured) return;
    if (!silent) setIsLoading(true);
    else setIsPolling(true);

    try {
      const [repairsRes, statsRes] = await Promise.all([
        fetch("/api/repairs"),
        fetch("/api/stats")
      ]);

      if (!repairsRes.ok || !statsRes.ok) {
        throw new Error("No se pudo conectar con la base de datos de Litio Energy.");
      }

      const repairsData = await repairsRes.json();
      const statsData = await statsRes.json();

      setRepairs(repairsData);
      setStats(statsData);
      setErrorMsg("");
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Ocurrió un error al sincronizar con el taller. Revisa que el servidor Express esté activo.");
    } finally {
      setIsLoading(false);
      setIsPolling(false);
    }
  };

  // Synchronize via Firestore in real-time OR poll REST endpoints
  useEffect(() => {
    if (isFirebaseConfigured && db) {
      setIsLoading(true);
      const q = query(collection(db, "repairs"), orderBy("receptionDate", "desc"));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const repairsData: RepairItem[] = [];
        snapshot.forEach((doc) => {
          repairsData.push(doc.data() as RepairItem);
        });

        setRepairs(repairsData);

        // Calculate stats client-side in Firestore mode
        const total = repairsData.length;
        const statsData: WorkshopStats = {
          total,
          receptioned: repairsData.filter((r) => r.status === "receptioned").length,
          diagnosing: repairsData.filter((r) => r.status === "diagnosing").length,
          repairing: repairsData.filter((r) => r.status === "repairing").length,
          testing: repairsData.filter((r) => r.status === "testing").length,
          ready: repairsData.filter((r) => r.status === "ready").length,
          delivered: repairsData.filter((r) => r.status === "delivered").length,
          monthlyEarnings: repairsData
            .filter((r) => r.status === "delivered" || r.status === "ready")
            .reduce((sum, r) => sum + (r.actualCost || r.estimatedCost || 0), 0)
        };
        setStats(statsData);
        setIsLoading(false);
        setErrorMsg("");
      }, (err) => {
        console.error("Firestore onSnapshot error:", err);
        setErrorMsg("Error al conectar con Firestore. Revisa las reglas de seguridad o tu configuración.");
        setIsLoading(false);
      });

      return () => unsubscribe();
    } else {
      // Fallback: initial fetch & polling every 3.5 seconds
      fetchAllData();
      const timer = setInterval(() => {
        fetchAllData(true);
      }, 3500);

      return () => clearInterval(timer);
    }
  }, []);

  // Post new repair to server / Firestore
  const handleCreateRepair = async (payload: any): Promise<RepairItem | undefined> => {
    setIsLoading(true);
    try {
      if (isFirebaseConfigured && db) {
        const BRANCH_PREFIXES: Record<string, string> = {
          lince_arenales: "LSI",
          san_borja: "LSB",
          surco: "LS",
          lince_leal: "LL"
        };
        const branch = payload.workshopBranch || "lince_arenales";
        const prefix = BRANCH_PREFIXES[branch] || "LT";
        const branchRepairs = repairs.filter((r) => (r.workshopBranch || "lince_arenales") === branch);
        let count = branchRepairs.length + 1;
        let seqId = `${prefix}-${String(count).padStart(5, "0")}`;
        const existingIds = new Set(repairs.map((r) => r.id));
        while (existingIds.has(seqId)) {
          count++;
          seqId = `${prefix}-${String(count).padStart(5, "0")}`;
        }

        // Subir videos de respaldo a Firebase Storage: evidencias/{año}/{mes}/{orden}/{timestamp}-{sede}.webm
        const videoBlobs = payload.videoEvidenceBlobs || [];
        const videoEvidence: VideoEvidence[] = [];
        let failedUploads = 0;
        let lastUploadError = "";
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");

        if (videoBlobs.length) {
          if (!storage) {
            alert("El respaldo en video requiere Firebase Storage. Actívalo en la consola de Firebase para poder guardar los videos.");
          } else {
            for (const v of videoBlobs) {
              try {
                const ext = (v.blob.type || "video/webm").includes("mp4") ? "mp4" : "webm";
                const fileRef = ref(
                  storage,
                  `evidencias/${year}/${month}/${seqId}/${Date.now()}-${branch}.${ext}`
                );
                await uploadBytes(fileRef, v.blob);
                const url = await getDownloadURL(fileRef);
                videoEvidence.push({
                  url,
                  durationSec: v.durationSec,
                  sizeBytes: v.sizeBytes,
                  recordedAt: new Date().toISOString(),
                  recordedBy: "Recepcionista Litio",
                  orderId: seqId,
                  branch
                });
              } catch (uploadErr: any) {
                const errMsg = uploadErr?.code || uploadErr?.message || String(uploadErr);
                console.error("Error subiendo video de evidencia:", uploadErr);
                console.error("Storage bucket:", storage ? storage.app.options.storageBucket : "null");
                lastUploadError = errMsg;
                failedUploads++;
              }
            }
            if (failedUploads > 0) {
              alert("Error subiendo video: " + lastUploadError);
            }
          }
        }
        
        const repairItem: RepairItem = {
          id: seqId,
          receptionDate: new Date().toISOString(),
          workshopBranch: payload.workshopBranch || "lince_arenales",
          serviceType: payload.serviceType || "diagnostico",
          serviceTypeDetail: payload.serviceTypeDetail || "",
          client: payload.client,
          vehicle: payload.vehicle,
          accessories: payload.accessories,
          visualState: {
            ...payload.visualState,
            videoRecorded: videoEvidence.length > 0,
            videoEvidence
          },
          status: "diagnosing",
          source: "tablet",
          aiDiagnostic: payload.aiDiagnostic || null,
          technicianNotes: "",
          estimatedCost: Number(payload.estimatedCost) || 0,
          actualCost: 0,
          clientSignature: payload.clientSignature || "",
          tallerSignature: payload.tallerSignature || "",
          payment: payload.payment,
          scheduledDeadline: payload.scheduledDeadline || undefined,
          serviceStartedAt: payload.serviceStartedAt || new Date().toISOString(),
          historyLog: [
            {
              id: `log_${Date.now()}`,
              date: new Date().toISOString(),
              status: "diagnosing",
              description: "Vehiculo ingresado a taller. Pasa automaticamente a diagnostico.",
              user: "Asesora de Servicio Litio"
            }
          ]
        };

        await setDoc(doc(db, "repairs", seqId), cleanUndefined(repairItem));

        // Dual-write: sync to normalized collections (clientes, activos, ordenes)
        onRepairCreated(repairItem).catch((e) => console.error("Dual-write error:", e));

        // Sincronizar el cliente también en la colección "clientes" (mismo formato que la App Android)
        try {
          const branchToSede: Record<string, string> = {
            lince_arenales: "Litio Lince",
            surco: "Litio Surco",
            san_borja: "Litio San Borja",
            lince_leal: "Litio Jose Leal"
          };
          const typeToLabel: Record<string, string> = {
            scooter: "Scooter",
            bici: "Bicicleta",
            moto: "Moto",
            bicimoto: "Bicimoto",
            trimoto: "Trimoto",
            otro: "Otro"
          };
          const phoneKey = (payload.client.phone || "").trim() ||
            (payload.client.dni || "").trim() || `tablet-${Date.now()}`;
          const clientDocId = phoneKey.replace(/[^a-zA-Z0-9._-]/g, "_");
          const dniStored = (payload.client.dni || "").trim();
          // Dedupe: reutilizar el doc canónico existente (por DNI o por teléfono)
          // para no crear duplicados. No altera la estructura (subcolección local + canónico).
          let existingRef: any = null;
          let existingClient: any = null;
          if (isFirebaseConfigured && db) {
            try {
              if (dniStored) {
                existingRef = doc(db, "clientes", dniStored);
                existingClient = await getDoc(existingRef);
                if (!existingClient.exists()) {
                  const q = query(collection(db, "clientes"), where("dni", "==", dniStored), where("dni", "!=", ""), limit(1));
                  const snap = await getDocs(q);
                  if (!snap.empty) {
                    existingClient = snap.docs[0];
                    existingRef = snap.docs[0].ref;
                  }
                }
              } else if (phoneKey && !phoneKey.startsWith("tablet-")) {
                const q = query(collection(db, "clientes"), where("phone", "==", payload.client.phone), limit(1));
                const snap = await getDocs(q);
                if (!snap.empty) {
                  existingClient = snap.docs[0];
                  existingRef = snap.docs[0].ref;
                }
              }
            } catch (dedupeErr) {
              console.warn("Dedupe lookup skip:", dedupeErr);
              existingClient = null;
              existingRef = null;
            }
          }
          const internalIdStored = existingClient?.exists?.()
            ? ((existingClient.data() as any)?.internalId as string) || ""
            : await nextClientId();
          const clientData = {
            internalId: internalIdStored,
            name: payload.client.name || "",
            phone: payload.client.phone || "",
            dni: dniStored || phoneKey,
            email: payload.client.email || "",
            vehicleType: typeToLabel[payload.vehicle.type] || "Scooter",
            vehicleBrand: payload.vehicle.brand || "",
            vehicleModel: payload.vehicle.model || "",
            vehicleSerialNumber: "Otros",
            problemDescription: payload.vehicle.reportedFailure || "Revisión general preventiva",
            status: "Recibido",
            progress: 10,
            technicianNotes: "Vehículo registrado desde la tablet. Pendiente de ingreso a bahía de diagnóstico.",
            estimatedCost: Number(payload.estimatedCost) || 0,
            estimatedCompletionDate: "Pendiente de diagnóstico",
            sede: branchToSede[payload.workshopBranch] || "Litio Surco",
            sedeKey: payload.workshopBranch || "lince_arenales",
            source: "tablet",
            createdAt: Date.now()
          };
          const branchKey = payload.workshopBranch || "lince_arenales";
          // Lista propia por local: cada local guarda sus clientes en su subcolección
          await setDoc(doc(db, "clientes", branchKey, "clientes", clientDocId), clientData);
          // Espejo canónico: si ya existía el cliente (por DNI o teléfono) se actualiza ese
          // mismo doc para no crear duplicados; si no existe se crea con docId = DNI.
          if (existingRef) {
            await setDoc(existingRef, clientData, { merge: true });
          } else {
            await setDoc(doc(db, "clientes", dniStored || clientDocId), clientData);
          }
        } catch (clientErr) {
          console.error("Error sincronizando cliente a Firestore:", clientErr);
        }

        return repairItem;
      } else {
        const response = await fetch("/api/repairs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error("Error en el registro del vehículo.");
        }
        const createdItem = await response.json();
        await fetchAllData(true);
        return createdItem;
      }
    } catch (err: any) {
      console.error(err);
      alert("No se pudo registrar la recepción del vehículo. Intente nuevamente.");
      return undefined;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRepair = async (repair: RepairItem) => {
    if (!isFirebaseConfigured || !db) return;
    try {
        await deleteDoc(doc(db, "repairs", repair.id));

        // Dual-write: delete from ordenes collection
        onRepairDeleted(repair.id).catch((e) => console.error("Dual-write delete error:", e));

        const phone = (repair.client?.phone || "").replace(/[^\d]/g, "");
      const dni = (repair.client?.dni || "").replace(/[^\d]/g, "");
      if (phone) {
        await deleteDoc(doc(db, "clientes", phone)).catch(() => {});
        await deleteDoc(doc(db, "clientes", repair.workshopBranch || "lince_arenales", "clientes", phone)).catch(() => {});
      }
      if (dni && dni !== phone) {
        await deleteDoc(doc(db, "clientes", dni)).catch(() => {});
      }
      setRepairs((prev) => prev.filter((r) => r.id !== repair.id));
    } catch (err) {
      console.error("Error eliminando repair:", err);
      alert("No se pudo eliminar. Intente de nuevo.");
    }
  };

  // Put repair status/notes update (REST / Firestore)
  const handleUpdateRepair = async (id: string, updateData: any) => {
    setIsLoading(true);
    try {
      if (isFirebaseConfigured && db) {
        const currentItem = repairs.find((r) => r.id === id);
        if (!currentItem) {
          throw new Error("Reparación no encontrada.");
        }

        const oldStatus = currentItem.status;
        const newStatus = updateData.status;
        let logs = [...(currentItem.historyLog || [])];
        
        if (newStatus && oldStatus !== newStatus) {
          const statusLabels: Record<string, string> = {
            receptioned: "Recibido",
            diagnosing: "En Diagnóstico",
            quoted: "Presupuesto",
            paid: "Pagado",
            repairing: "En Reparación",
            testing: "En Pruebas",
            ready: "Listo para Entrega",
            delivered: "Entregado al Cliente"
          };
          
          logs.push({
            id: `log_${Date.now()}`,
            date: new Date().toISOString(),
            status: newStatus,
            description: `Estado cambiado de "${statusLabels[oldStatus] || oldStatus}" a "${statusLabels[newStatus] || newStatus}".`,
            user: updateData.technicianName || "Sistema Litio"
          });
        }

        if (updateData.assignedTech && updateData.assignedTech !== currentItem.assignedTech) {
          logs.push({
            id: `log_${Date.now()}_asg`,
            date: new Date().toISOString(),
            status: currentItem.status || "receptioned",
            description: `Derivado al técnico ${updateData.assignedTech}.`,
            user: updateData.assignedByName || session?.name || "Asesora de Servicio"
          });
        }

        // Subir videos de respaldo registrados por el técnico durante el diagnóstico
        const videoBlobs = updateData.videoEvidenceBlobs || [];
        const newVideoEvidence: VideoEvidence[] = [];
        let failedUploads = 0;
        if (videoBlobs.length) {
          if (!storage) {
            alert("El respaldo en video requiere Firebase Storage. Actívalo en la consola de Firebase para poder guardar los videos.");
          } else {
            const year = new Date().getFullYear();
            const month = String(new Date().getMonth() + 1).padStart(2, "0");
            for (const v of videoBlobs) {
              try {
                const ext = (v.blob.type || "video/webm").includes("mp4") ? "mp4" : "webm";
                const fileRef = ref(
                  storage,
                  `evidencias/${year}/${month}/${id}/${Date.now()}-tecnico.${ext}`
                );
                await uploadBytes(fileRef, v.blob);
                const url = await getDownloadURL(fileRef);
                newVideoEvidence.push({
                  url,
                  durationSec: v.durationSec,
                  sizeBytes: v.sizeBytes,
                  recordedAt: new Date().toISOString(),
                  recordedBy: updateData.technicianName || "Técnico Litio",
                  orderId: id,
                  branch: currentItem.workshopBranch || "lince_arenales"
                });
              } catch (uploadErr) {
                console.error("Error subiendo video del técnico:", uploadErr);
                failedUploads++;
              }
            }
            if (failedUploads > 0) {
              alert(`No se pudo subir ${failedUploads} video(s) a la nube. El video quedó solo en la memoria de esta tablet y el cliente NO podrá verlo. Verifica tu conexión y vuelve a grabarlo.`);
            }
          }
        }
        delete updateData.videoEvidenceBlobs;

        const existingVisual = currentItem.visualState || {};
        const incomingVisual = updateData.visualState || {};
        const mergedVideoEvidence = [...(existingVisual.videoEvidence || []), ...newVideoEvidence];

        const updatedItem = {
          ...currentItem,
          ...updateData,
          historyLog: logs,
          visualState: {
            ...existingVisual,
            ...incomingVisual,
            videoEvidence: mergedVideoEvidence,
            videoRecorded: mergedVideoEvidence.length > 0
          }
        };

        const cleanUndefined = (obj: any): any => {
          if (Array.isArray(obj)) return obj.map(cleanUndefined);
          if (obj && typeof obj === "object") {
            const out: any = {};
            for (const [k, v] of Object.entries(obj)) {
              if (v !== undefined) out[k] = cleanUndefined(v);
            }
            return out;
          }
          return obj;
        };
        await setDoc(doc(db, "repairs", id), cleanUndefined(updatedItem));

        // Dual-write: sync update to ordenes collection
        onRepairUpdated(cleanUndefined(updatedItem) as RepairItem).catch((e) => console.error("Dual-write update error:", e));
      } else {
        delete updateData.videoEvidenceBlobs;
        const response = await fetch(`/api/repairs/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData)
        });

        if (!response.ok) {
          throw new Error("Error al actualizar la bitácora del vehículo.");
        }
        await fetchAllData(true);
      }
    } catch (err: any) {
      console.error(err);
      alert("Error al actualizar la orden en taller.");
    } finally {
      setIsLoading(false);
    }
  };

  if (publicOrderId) {
    return <OrdenPublica orderId={publicOrderId} />;
  }

  if (publicReceptionId) {
    return <RecepcionPublica orderId={publicReceptionId} />;
  }

  if (showTerminos) {
    return <TerminosCondiciones />;
  }

  if (showGarantia) {
    return <GarantiaCondiciones />;
  }

  if (!authConfigReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-slate-900 border-t-cyan-500 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium text-sm">Cargando configuración de accesos...</p>
        </div>
      </div>
    );
  }

  if (!authConfig || !session) {
    return (
      <AuthScreen
        config={authConfig}
        onSetup={(c) => {
          setAuthConfig(c);
          saveConfig(c);
          pushRemoteConfig(c).catch((err) => console.error("No se pudo sincronizar accesos:", err));
        }}
        onAuthed={(s) => {
          setSession(s);
          saveSession(s);
          setCurrentTab(ROLE_TABS[s.role][0]);
        }}
      />
    );
  }

  const visibleRepairs = session.localKey
    ? repairs.filter((r) => r.workshopBranch === session.localKey)
    : repairs;

  // El admin entra directo al Panel de Control. Jefas y técnicos ven su pantalla de trabajo.
  if (!enteredPlatform && session.role !== "tecnico" && session.role !== "admin") {
    return (
      <WelcomeScreen
        session={session}
        repairs={visibleRepairs}
        onNewOrder={() => {
          setEnteredPlatform(true);
          setCurrentTab("reception");
        }}
        onClients={() => {
          setEnteredPlatform(true);
          setCurrentTab("clientes");
        }}
        onLogout={() => {
          clearSession();
          setSession(null);
          setEnteredPlatform(false);
          setCurrentTab("reception");
        }}
      />
    );
  }

  const allowedTabs = ROLE_TABS[session.role];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Cabecera / Navegación */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isPolling={isPolling}
        onRefresh={() => fetchAllData(false)}
        allowedTabs={allowedTabs}
        currentUser={session}
        qcCount={visibleRepairs.filter((r) => r.status === "testing").length}
        presupuestoCount={visibleRepairs.filter((r) => (r.status === "quoted" || r.status === "paid") && !(r.serviceType === "garantia" && r.warrantyCovered)).length}
        onLogout={() => {
          clearSession();
          setSession(null);
          setEnteredPlatform(false);
          setCurrentTab("reception");
        }}
      />

      {/* Alerta de Error en Red */}
      {errorMsg && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-4">
          <div className="p-4 bg-rose-950/40 border border-rose-800/60 text-rose-200 rounded-2xl flex items-center space-x-3 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {/* Cargando (Primeras peticiones) */}
      {isLoading && repairs.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-4 border-slate-900 border-t-cyan-500 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium text-sm">Conectando con Litio Energy...</p>
        </div>
      ) : (
        <main className="flex-1 pb-16">
          <AppErrorBoundary>
            {currentTab === "reception" && (
              <ReceptionView
                repairs={visibleRepairs}
                onCreateRepair={handleCreateRepair}
                onDeleteRepair={handleDeleteRepair}
                onUpdateRepair={handleUpdateRepair}
                isLoading={isLoading}
                userLocalKey={session.localKey}
                userRole={session.role}
                onOpenExpress={() => setCurrentTab("express")}
              />
            )}

            {currentTab === "derivar" && (
              <AssignTechView
                repairs={visibleRepairs}
                onUpdateRepair={handleUpdateRepair}
                userLocalKey={session.localKey}
                userName={session.name}
                siteConfig={authConfig}
              />
            )}

            {currentTab === "technician" && (
              <TechnicianView
                repairs={visibleRepairs}
                onUpdateRepair={handleUpdateRepair}
                isLoading={isLoading}
                userLocalKey={session.localKey}
                userName={session.name}
                userRole={session.role}
                initialMode="diagnostico"
              />
            )}

            {currentTab === "presupuesto" && (
              <PresupuestoView
                repairs={visibleRepairs}
                onUpdateRepair={handleUpdateRepair}
                userLocalKey={session.localKey}
                userName={session.name}
                siteConfig={authConfig}
              />
            )}

            {currentTab === "control" && (
              <ControlView
                repairs={visibleRepairs}
                userLocalKey={session.localKey}
                siteConfig={authConfig}
                onUpdateRepair={handleUpdateRepair}
              />
            )}

            {currentTab === "repair" && (
              <TechnicianView
                repairs={visibleRepairs}
                onUpdateRepair={handleUpdateRepair}
                isLoading={isLoading}
                userLocalKey={session.localKey}
                userName={session.name}
                userRole={session.role}
                initialMode="reparacion"
              />
            )}

            {currentTab === "admin-dashboard" && session.role === "admin" && (
              <AdminDashboard
                repairs={repairs}
                stats={stats}
              />
            )}

            {currentTab === "tiempos" && (
              <TimeMetricsView
                repairs={repairs}
                userLocalKey={session.localKey}
                canEdit={session.role === "admin"}
                technicians={authConfig ? listUsers(authConfig).filter((u) => u.role === "tecnico").map((u) => u.name.trim()) : []}
              />
            )}

            {currentTab === "clientes" && (
              <ClientesView repairs={visibleRepairs} onUpdateRepair={handleUpdateRepair} userLocalKey={session.localKey} />
            )}

            {currentTab === "chat" && (
              <ChatView userLocalKey={session.localKey} userName={session.name} />
            )}

            {currentTab === "express" && (
              <ExpressView userLocalKey={session.localKey} userName={session.name} />
            )}

            {currentTab === "calidad" && (
              <QualityControlView
                repairs={visibleRepairs}
                onUpdateRepair={handleUpdateRepair}
                userLocalKey={session.localKey}
                userName={session.name}
              />
            )}

            {currentTab === "accesos" && (
              <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
                <div className="mb-6">
                  <h1 className="text-xl font-bold text-white">Administración de accesos</h1>
                  <p className="text-sm text-slate-400 mt-1">
                    Configura las asesoras y técnicos de cada local. Los cambios se aplican en todos los
                    dispositivos conectados.
                  </p>
                </div>
                <AccessManager
                  initial={authConfig}
                  onSave={(c) => {
                    setAuthConfig(c);
                    saveConfig(c);
                    pushRemoteConfig(c).catch((err) =>
                      console.error("No se pudo sincronizar accesos:", err)
                    );
                    alert("Configuración de accesos guardada correctamente.");
                  }}
                  saveLabel="Guardar cambios"
                />
              </div>
            )}
          </AppErrorBoundary>
        </main>
      )}

      {/* Footer corporativo */}
      <footer className="bg-slate-900 border-t border-slate-800 py-4 text-center text-xs text-slate-500 font-medium mt-auto">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 Litio Energy S.A.C. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
