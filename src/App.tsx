import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import ReceptionView from "./components/ReceptionView";
import TechnicianView from "./components/TechnicianView";
import DashboardView from "./components/DashboardView";
import ClientesView from "./components/ClientesView";
import ChatView from "./components/ChatView";
import ExpressView from "./components/ExpressView";
import QualityControlView from "./components/QualityControlView";
import PresupuestoView from "./components/PresupuestoView";
import OrdenPublica from "./components/OrdenPublica";
import AuthScreen from "./components/AuthScreen";
import AccessManager from "./components/AccessManager";
import { RepairItem, WorkshopStats, VideoEvidence } from "./types";
import { AuthConfig, AuthSession, ROLE_TABS, loadConfig, loadSession, saveConfig, saveSession, clearSession, isValidConfig, pushRemoteConfig } from "./auth";
import { AlertCircle, RefreshCw } from "lucide-react";

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
  onSnapshot, 
  query, 
  orderBy 
} from "./firebase";

function currentBuildHash(): string {
  try {
    const name = performance
      .getEntriesByType("resource")
      .map((e) => e.name)
      .find((n) => /assets\/index-[A-Za-z0-9_-]+\.js/.test(n));
    if (name) {
      const m = name.match(/index-([^.]+)\.js/);
      if (m) return m[1];
    }
  } catch {}
  return "?";
}

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>("reception");
  const [repairs, setRepairs] = useState<RepairItem[]>([]);
  const [stats, setStats] = useState<WorkshopStats>({
    total: 0,
    receptioned: 0,
    diagnosing: 0,
    waiting_parts: 0,
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

  useEffect(() => {
    const onHash = () => {
      const m = window.location.hash.match(/^#\/orden\/(.+)$/);
      setPublicOrderId(m ? decodeURIComponent(m[1]) : null);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
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
          waiting_parts: repairsData.filter((r) => r.status === "waiting_parts").length,
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
        const year = new Date().getFullYear();
        let count = repairs.length + 1;
        let seqId = `LT-${year}-${String(count).padStart(4, "0")}`;
        const existingIds = new Set(repairs.map((r) => r.id));
        while (existingIds.has(seqId)) {
          count++;
          seqId = `LT-${year}-${String(count).padStart(4, "0")}`;
        }

        // Subir videos de respaldo a Firebase Storage: evidencias/{año}/{mes}/{orden}/{timestamp}-{sede}.webm
        const videoBlobs = payload.videoEvidenceBlobs || [];
        const videoEvidence: VideoEvidence[] = [];
        let failedUploads = 0;
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const branch = payload.workshopBranch || "lince_arenales";

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
              } catch (uploadErr) {
                console.error("Error subiendo video de evidencia:", uploadErr);
                failedUploads++;
              }
            }
            if (failedUploads > 0) {
              alert(`No se pudo subir ${failedUploads} video(s) a la nube. El video quedó solo en la memoria de esta tablet y el cliente NO podrá verlo. Verifica tu conexión y vuelve a grabarlo.`);
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
          status: "receptioned",
          source: "tablet",
          aiDiagnostic: payload.aiDiagnostic || null,
          technicianNotes: "Vehículo recién ingresado por recepción.",
          estimatedCost: Number(payload.estimatedCost) || 0,
          actualCost: 0,
          clientSignature: payload.clientSignature || "",
          tallerSignature: payload.tallerSignature || "",
          payment: payload.payment,
          historyLog: [
            {
              id: `log_${Date.now()}`,
              date: new Date().toISOString(),
              status: "receptioned",
              description: "Ingreso del vehículo a taller por recepción en tablet.",
              user: "Recepcionista Litio"
            }
          ]
        };

        await setDoc(doc(db, "repairs", seqId), repairItem);

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
          const clientData = {
            name: payload.client.name || "",
            phone: payload.client.phone || "",
            dni: payload.client.dni || "",
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
          // Espejo canónico por teléfono (compatibilidad con la app Android)
          await setDoc(doc(db, "clientes", clientDocId), clientData);
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
            waiting_parts: "Esperando Repuestos",
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

        await setDoc(doc(db, "repairs", id), updatedItem);
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
        }}
      />
    );
  }

  const allowedTabs = ROLE_TABS[session.role];

  // Las jefas y técnicos solo ven la información de su propio local; el admin ve todo
  const visibleRepairs = session.localKey
    ? repairs.filter((r) => r.workshopBranch === session.localKey)
    : repairs;
  const visibleStats: WorkshopStats = session.localKey
    ? {
        total: visibleRepairs.length,
        receptioned: visibleRepairs.filter((r) => r.status === "receptioned").length,
        diagnosing: visibleRepairs.filter((r) => r.status === "diagnosing").length,
        waiting_parts: visibleRepairs.filter((r) => r.status === "waiting_parts").length,
        repairing: visibleRepairs.filter((r) => r.status === "repairing").length,
        testing: visibleRepairs.filter((r) => r.status === "testing").length,
        ready: visibleRepairs.filter((r) => r.status === "ready").length,
        delivered: visibleRepairs.filter((r) => r.status === "delivered").length,
        monthlyEarnings: visibleRepairs
          .filter((r) => r.status === "delivered" || r.status === "ready")
          .reduce((sum, r) => sum + (r.actualCost || r.estimatedCost || 0), 0)
      }
    : stats;

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
        presupuestoCount={visibleRepairs.filter((r) => (r.spareParts || []).length > 0).length}
        onLogout={() => {
          clearSession();
          setSession(null);
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
                isLoading={isLoading}
                userLocalKey={session.localKey}
                userRole={session.role}
              />
            )}

            {currentTab === "technician" && (
              <TechnicianView
                repairs={visibleRepairs}
                onUpdateRepair={handleUpdateRepair}
                isLoading={isLoading}
                userLocalKey={session.localKey}
              />
            )}

            {currentTab === "presupuesto" && (
              <PresupuestoView
                repairs={visibleRepairs}
                onUpdateRepair={handleUpdateRepair}
                userLocalKey={session.localKey}
                userName={session.name}
              />
            )}

            {currentTab === "dashboard" && (
              <DashboardView
                repairs={visibleRepairs}
                stats={visibleStats}
              />
            )}

            {currentTab === "clientes" && (
              <ClientesView repairs={visibleRepairs} userLocalKey={session.localKey} />
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
                    Configura las jefas y técnicos de cada local. Los cambios se aplican en todos los
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
          <p>© 2026 Litio Energy S.A.C. - Sistema Automatizado de Taller de Vehículos Eléctricos</p>
          <p className="mt-1">Build: {currentBuildHash()}</p>
        </div>
      </footer>
    </div>
  );
}
