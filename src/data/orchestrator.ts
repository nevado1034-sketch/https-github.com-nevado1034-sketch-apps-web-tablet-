import { upsertClient } from "./clientService";
import { upsertAsset } from "./assetService";
import { createOrden, updateOrden, deleteOrden } from "./orderService";
import type { Cliente, Activo } from "./types";
import type { RepairItem } from "../types";

/**
 * Data Layer — Orchestrator
 *
 * When a repair is created/updated in `repairs`, this also writes to:
 *   - `clientes/{id}`  — normalized client entity (CLI-XXXXXX)
 *   - `activos/{id}`   — normalized asset entity (SCO-XXXXXX, etc.)
 *   - `ordenes/{id}`   — normalized order entity (LSI-XXXXX, etc.)
 *
 * The existing `repairs` collection remains the source of truth for all views.
 * These new collections are written in parallel for future migration.
 *
 * No existing code is modified — this is purely additive.
 */

export interface DualWriteResult {
  cliente: Cliente;
  activo: Activo;
}

/**
 * After a RepairItem is created in `repairs`, create/update the normalized entities.
 * Call this at the end of handleCreateRepair.
 */
export async function onRepairCreated(repair: RepairItem): Promise<DualWriteResult | null> {
  try {
    // 1. Create or update client
    const cliente = await upsertClient({
      name: repair.client?.name || "",
      phone: repair.client?.phone || "",
      email: repair.client?.email || "",
      dni: repair.client?.dni || "",
    });

    // 2. Create or update asset
    const activo = await upsertAsset({
      type: repair.vehicle?.type || "otro",
      brand: repair.vehicle?.brand || "",
      model: repair.vehicle?.model || "",
      clientId: cliente.id,
      clientName: cliente.name,
      voltage: repair.vehicle?.voltage,
      batteryCondition: repair.vehicle?.batteryCondition,
    });

    // 3. Create order in normalized collection
    await createOrden(repair, cliente.id, activo.id);

    return { cliente, activo };
  } catch (e) {
    console.error("Error in dual-write (onRepairCreated):", e);
    return null;
  }
}

/**
 * After a RepairItem is updated in `repairs`, sync changes to `ordenes`.
 * Only syncs fields that commonly change.
 */
export async function onRepairUpdated(repair: RepairItem): Promise<void> {
  try {
    await updateOrden(repair.id, {
      status: repair.status,
      technicianName: repair.technicianName,
      technicianNotes: repair.technicianNotes,
      spareParts: repair.spareParts,
      recommendations: repair.recommendations,
      estimatedCost: repair.estimatedCost,
      actualCost: repair.actualCost,
      payment: repair.payment,
      visualState: repair.visualState as any,
      aiDiagnostic: repair.aiDiagnostic as any,
      qcReport: repair.qcReport as any,
      approvalStatus: repair.approvalStatus,
      approvalResponseAt: repair.approvalResponseAt,
      serviceAuthorized: repair.serviceAuthorized,
      clientEntryApproval: repair.clientEntryApproval,
      clientEntryResponseAt: repair.clientEntryResponseAt,
      deliveredAt: repair.deliveredAt,
      historyLog: repair.historyLog as any,
      repairPhotos: repair.repairPhotos,
      clientSignature: repair.clientSignature,
      clientSignatureName: repair.clientSignatureName,
      tallerSignature: repair.tallerSignature,
      tallerSignatureName: repair.tallerSignatureName,
      technicianSignature: repair.technicianSignature,
      technicianSignatureName: repair.technicianSignatureName,
      deliverySignature: repair.deliverySignature,
      deliverySignatureName: repair.deliverySignatureName,
    });
  } catch (e) {
    console.error("Error in dual-write (onRepairUpdated):", e);
  }
}

/**
 * After a RepairItem is deleted from `repairs`, delete from `ordenes`.
 */
export async function onRepairDeleted(repairId: string): Promise<void> {
  try {
    await deleteOrden(repairId);
  } catch (e) {
    console.error("Error in dual-write (onRepairDeleted):", e);
  }
}
