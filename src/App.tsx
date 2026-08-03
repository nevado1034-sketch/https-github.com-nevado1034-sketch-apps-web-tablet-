import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import ReceptionView from "./components/ReceptionView";
import TechnicianView from "./components/TechnicianView";
import DashboardView from "./components/DashboardView";
import ChatView from "./components/ChatView";
import { RepairItem, WorkshopStats } from "./types";
import { AlertCircle } from "lucide-react";
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
        const count = repairs.length + 1;
        const seqId = `LT-${year}-${String(count).padStart(4, "0")}`;
        
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
      {/* Cabecera / Navegación */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isPolling={isPolling}
        onRefresh={() => fetchAllData(false)}
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
          {currentTab === "reception" && (
            <ReceptionView
              repairs={repairs}
              onCreateRepair={handleCreateRepair}
              isLoading={isLoading}
            />
          )}

          {currentTab === "technician" && (
            <TechnicianView
              repairs={repairs}
              onUpdateRepair={handleUpdateRepair}
              isLoading={isLoading}
            />
          )}

          {currentTab === "dashboard" && (
            <DashboardView
              repairs={repairs}
              stats={stats}
            />
          )}

          {currentTab === "chat" && (
            <ChatView />
          )}
        </main>
      )}

      {/* Footer corporativo */}
      <footer className="bg-slate-900 border-t border-slate-800 py-4 text-center text-xs text-slate-500 font-medium mt-auto">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 Litio Energy S.A.C. - Sistema Automatizado de Taller de Vehículos Eléctricos</p>
        </div>
      </footer>
    </div>
  );
}
