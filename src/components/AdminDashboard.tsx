import React, { useState, useEffect } from "react";
import { RepairItem, WorkshopStats } from "../types";
import { db, isFirebaseConfigured, collection, query, orderBy, limit, getDocs } from "../firebase";
import { BRANCHES } from "../data/metrics";
import AdminReportes from "./AdminReportes";

interface AdminDashboardProps {
  repairs: RepairItem[];
  stats?: WorkshopStats;
}

// El panel de administración ahora es UNA sola página unificada
// (operación + tiempos + negocio + reportes) con KPIs, alertas, secciones
// y la gestión de metas de tiempo integrada al final.
export default function AdminDashboard({ repairs }: AdminDashboardProps) {
  const [expressReceipts, setExpressReceipts] = useState<any[]>([]);

  useEffect(() => {
    if (!isFirebaseConfigured || !db) return;
    let mounted = true;
    const fetchAll = async () => {
      try {
        const results = await Promise.all(
          BRANCHES.map(async (b) => {
            const q = query(collection(db, "recibos_express", b, "recibos"), orderBy("seq", "desc"), limit(200));
            const snap = await getDocs(q);
            return snap.docs.map((d) => ({ ...d.data(), localKey: b }));
          })
        );
        if (mounted) setExpressReceipts(results.flat());
      } catch { /* ignore */ }
    };
    fetchAll();
    return () => { mounted = false; };
  }, []);

  return <AdminReportes repairs={repairs} expressReceipts={expressReceipts} />;
}