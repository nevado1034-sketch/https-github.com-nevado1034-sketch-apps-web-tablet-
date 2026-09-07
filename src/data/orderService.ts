import { db, collection, doc, getDocs, setDoc, onSnapshot, query, orderBy, where, deleteDoc } from "../firebase";
import { isFirebaseConfigured } from "../firebase";
import type { Orden } from "./types";
import { nextOrderId } from "./idGenerator";
import { RepairItem, WorkshopBranch, VehicleType } from "../types";

/**
 * Order Service — normalized work order entity.
 *
 * Collection: ordenes/{orderId}
 * ID format: LSI-00001, LSB-00003, LS-00012, LL-00005
 *
 * This service writes to BOTH `repairs` (existing) and `ordenes` (new).
 * Reading still comes from `repairs` for now — `ordenes` is for future migration.
 *
 * The Orden document contains:
 *   - clientId → links to Cliente entity
 *   - assetId  → links to Activo entity
 *   - sede     → workshop branch
 *   - technicianName → assigned tech
 *   - All existing order data (accessories, visualState, etc.)
 *   - clientSnapshot & assetSnapshot for fast display without joins
 */

const ORDENES_COLLECTION = "ordenes";

/**
 * Create an Orden in the new normalized collection.
 * Called AFTER the repair is already created in `repairs`.
 *
 * @param repair  The RepairItem just created in `repairs`
 * @param clientId  The Cliente ID (CLI-XXXXXX)
 * @param assetId   The Activo ID (SCO-XXXXXX, etc.)
 */
export async function createOrden(
  repair: RepairItem,
  clientId: string,
  assetId: string
): Promise<Orden> {
  const now = new Date().toISOString();

  const orden: Orden = {
    id: repair.id,
    clientId,
    assetId,
    sede: repair.workshopBranch,
    serviceType: repair.serviceType,
    serviceTypeDetail: repair.serviceTypeDetail,
    status: repair.status,
    technicianName: repair.technicianName,

    // Snapshots for fast display
    clientSnapshot: {
      name: repair.client?.name || "",
      phone: repair.client?.phone || "",
      email: repair.client?.email || "",
      dni: repair.client?.dni || "",
    },
    assetSnapshot: {
      type: repair.vehicle?.type || "otro",
      brand: repair.vehicle?.brand || "",
      model: repair.vehicle?.model || "",
      serialNumber: undefined,
    },

    // Workshop data (mirrored from repair)
    accessories: repair.accessories || { charger: false, key: false, battery: false, helmet: false, padlock: false, others: "" },
    visualState: repair.visualState || {
      scratches: false, cracks: false, brakesOk: true, lightsOk: true,
      screenOk: true, tiresOk: true, videoRecorded: false, photosTaken: false, notes: "",
    },
    aiDiagnostic: repair.aiDiagnostic || null,
    technicianNotes: repair.technicianNotes || "",
    spareParts: repair.spareParts || [],
    recommendations: repair.recommendations || "",

    // Financials
    estimatedCost: repair.estimatedCost || 0,
    actualCost: repair.actualCost || 0,
    payment: repair.payment,

    // Signatures
    clientSignature: repair.clientSignature,
    clientSignatureName: repair.clientSignatureName,
    tallerSignature: repair.tallerSignature,
    tallerSignatureName: repair.tallerSignatureName,
    technicianSignature: repair.technicianSignature,
    technicianSignatureName: repair.technicianSignatureName,
    deliverySignature: repair.deliverySignature,
    deliverySignatureName: repair.deliverySignatureName,

    // QC & approval
    qcReport: repair.qcReport as any,
    approvalStatus: repair.approvalStatus,
    approvalResponseAt: repair.approvalResponseAt,
    serviceAuthorized: repair.serviceAuthorized,
    clientEntryApproval: repair.clientEntryApproval,
    clientEntryResponseAt: repair.clientEntryResponseAt,
    deliveredAt: repair.deliveredAt,

    // History
    historyLog: repair.historyLog || [],
    source: repair.source,
    repairPhotos: repair.repairPhotos,

    createdAt: repair.receptionDate || now,
    updatedAt: now,
  };

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, ORDENES_COLLECTION, orden.id), orden);
    } catch (e) {
      console.error("Error creating orden:", e);
    }
  }

  return orden;
}

/**
 * Update an Orden when the underlying repair is updated.
 * Writes only changed fields to minimize bandwidth.
 */
export async function updateOrden(
  repairId: string,
  updates: Partial<Omit<Orden, "id" | "createdAt">>
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await setDoc(
      doc(db, ORDENES_COLLECTION, repairId),
      { ...updates, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  } catch (e) {
    console.error("Error updating orden:", e);
  }
}

/**
 * Delete an Orden (when repair is deleted).
 */
export async function deleteOrden(repairId: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await deleteDoc(doc(db, ORDENES_COLLECTION, repairId));
  } catch (e) {
    console.error("Error deleting orden:", e);
  }
}

/**
 * Get an Orden by ID.
 */
export async function getOrden(ordenId: string): Promise<Orden | null> {
  if (!isFirebaseConfigured || !db) return null;
  const snap = await getDocs(query(collection(db, ORDENES_COLLECTION), where("id", "==", ordenId)));
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Orden;
}

/**
 * Subscribe to all ordenes (realtime).
 */
export function subscribeOrdenes(callback: (ordenes: Orden[]) => void): () => void {
  if (!isFirebaseConfigured || !db) {
    callback([]);
    return () => {};
  }
  return onSnapshot(
    query(collection(db, ORDENES_COLLECTION), orderBy("createdAt", "desc")),
    (snap) => {
      const ordenes: Orden[] = [];
      snap.forEach((d) => {
        ordenes.push({ id: d.id, ...d.data() } as Orden);
      });
      callback(ordenes);
    }
  );
}
