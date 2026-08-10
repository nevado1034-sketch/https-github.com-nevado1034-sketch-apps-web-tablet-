import React, { useState, useEffect, useMemo } from "react";
import Header from "./components/Header";
import ReceptionView from "./components/ReceptionView";
import TechnicianView from "./components/TechnicianView";
import DashboardView from "./components/DashboardView";
import ChatView from "./components/ChatView";
import ReportsView from "./components/ReportsView";
import LoginView from "./components/LoginView";
import { RepairItem, WorkshopStats } from "./types";
import { AlertCircle, LogOut } from "lucide-react";
import { getSession, logout, isAdmin, SessionUser } from "./auth";
import { 
  db, 
  isFirebaseConfigured, 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  orderBy 
} from "./firebase";

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>("reception");
  const [repairs, setRepairs] = useState<RepairItem[]>([]);
  const [session, setSession] = useState<SessionUser | null>(() => getSession());
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

  // Repairs filtered by branch for non-admin users
  const visibleRepairs = useMemo(() => {
    if (!session) return repairs;
    if (isAdmin(session)) return repairs;
    return repairs.filter((r) => r.workshopBranch === session.branch);
  }, [repairs, session]);

  // Stats computed from the visible set (per-branch for local users)
  const visibleStats = useMemo(() => {
    if (!session || isAdmin(session) || !session.branch) return stats;
    const filtered = visibleRepairs;
    const s: WorkshopStats = {
      total: filtered.length,
      receptioned: 0,
      diagnosing: 0,
      waiting_parts: 0,
      repairing: 0,
      testing: 0,
      ready: 0,
      delivered: 0,
      monthlyEarnings: 0
    };
    for (const r of filtered) {
      if (r.status === "receptioned") s.receptioned++;
      else if (r.status === "diagnosing") s.diagnosing++;
      else if (r.status === "waiting_parts") s.waiting_parts++;
      else if (r.status === "repairing") s.repairing++;
      else if (r.status === "testing") s.testing++;
      else if (r.status === "ready") s.ready++;
      else if (r.status === "delivered") s.delivered++;
      if (r.status === "delivered" || r.status === "ready") {
        s.monthlyEarnings += (r.actualCost || r.estimatedCost || 0);
      }
    }
    return s;
  }, [visibleRepairs, session, stats]);

  const handleLogin = (user: SessionUser) => {
    setSession(user);
    setCurrentTab("reception");
  };

  const handleLogout = () => {
    logout();
    setSession(null);
  };

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
          repairsData.push({
            ...(doc.data() as RepairItem),
            id: doc.id,
          });
        });

        setRepairs(repairsData);

        // Calculate stats client-side in Firestore mode (single pass)
        const statsData: WorkshopStats = {
          total: repairsData.length,
          receptioned: 0,
          diagnosing: 0,
          waiting_parts: 0,
          repairing: 0,
          testing: 0,
          ready: 0,
          delivered: 0,
          monthlyEarnings: 0
        };
        for (const r of repairsData) {
          if (r.status === "receptioned") statsData.receptioned++;
          else if (r.status === "diagnosing") statsData.diagnosing++;
          else if (r.status === "waiting_parts") statsData.waiting_parts++;
          else if (r.status === "repairing") statsData.repairing++;
          else if (r.status === "testing") statsData.testing++;
          else if (r.status === "ready") statsData.ready++;
          else if (r.status === "delivered") statsData.delivered++;
          if (r.status === "delivered" || r.status === "ready") {
            statsData.monthlyEarnings += (r.actualCost || r.estimatedCost || 0);
          }
        }
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
        // Compute next sequential ID from the highest existing number for this year,
        // avoiding duplicates when records are deleted or users create concurrently.
        const prefix = `LT-${year}-`;
        let maxSeq = 0;
        for (const r of repairs) {
          if (r.id && r.id.startsWith(prefix)) {
            const num = parseInt(r.id.slice(prefix.length), 10);
            if (!isNaN(num) && num > maxSeq) maxSeq = num;
          }
        }
        const seqId = `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
        
        const repairItem: RepairItem = {
          id: seqId,
          receptionDate: new Date().toISOString(),
          workshopBranch: payload.workshopBranch || "lince_arenales",
          serviceType: payload.serviceType || "diagnostico",
          serviceTypeDetail: payload.serviceTypeDetail || "",
          client: payload.client,
          vehicle: payload.vehicle,
          accessories: payload.accessories,
          visualState: payload.visualState,
          status: "receptioned",
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
            lince_leal: "Litio Lince"
          };
          const typeToLabel: Record<string, string> = {
            scooter: "Scooter",
            moto: "Moto",
            bici: "Bicicleta",
            otro: "Otros"
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
            createdAt: Date.now()
          };
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

        const updatedItem = {
          ...currentItem,
          ...updateData,
          historyLog: logs
        };

        await setDoc(doc(db, "repairs", id), updatedItem);
      } else {
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {!session ? (
        <LoginView onLogin={handleLogin} />
      ) : (
        <>
      {/* Cabecera / Navegación */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isPolling={isPolling}
        onRefresh={() => fetchAllData(false)}
        session={session}
        onLogout={handleLogout}
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

      {/* Barra de progreso durante actualizaciones silenciosas */}
      {isLoading && repairs.length > 0 && (
        <div className="fixed top-16 left-0 right-0 z-40 h-0.5 bg-slate-800 overflow-hidden">
          <div className="h-full w-1/3 bg-cyan-500 rounded-full animate-loading-bar"></div>
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
          {currentTab === "reception" && (
            <ReceptionView
              repairs={visibleRepairs}
              onCreateRepair={handleCreateRepair}
              isLoading={isLoading}
              userBranch={session.branch}
            />
          )}

          {currentTab === "technician" && (
            <TechnicianView
              repairs={visibleRepairs}
              onUpdateRepair={handleUpdateRepair}
              isLoading={isLoading}
              userBranch={session.branch}
            />
          )}

          {currentTab === "dashboard" && (
            <DashboardView
              repairs={visibleRepairs}
              stats={visibleStats}
              userBranch={session.branch}
            />
          )}

          {currentTab === "chat" && (
            <ChatView userBranch={session.branch} />
          )}

          {currentTab === "reports" && (
            <ReportsView repairs={visibleRepairs} userBranch={session.branch} />
          )}
        </main>
      )}

      {/* Footer corporativo */}
      <footer className="bg-slate-900 border-t border-slate-800 py-4 text-center text-xs text-slate-500 font-medium mt-auto">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 Litio Energy S.A.C. - Sistema Automatizado de Taller de Vehículos Eléctricos</p>
        </div>
      </footer>
        </>
      )}
    </div>
  );
}
