import { db, collection, doc, getDocs, setDoc, query, where, onSnapshot } from "../firebase";
import { isFirebaseConfigured } from "../firebase";
import type { Activo, VehicleType, AssetPrefix, OwnerHistoryEntry } from "./types";
import { VEHICLE_TYPE_TO_ASSET_PREFIX } from "./types";
import { nextAssetId } from "./idGenerator";

/**
 * Asset Service — normalized equipment/entity.
 *
 * Collection: activos/{assetId}
 * ID format: SCO-000847, MOT-000214, BIC-000391, BAT-001052, CAR-000678, EQP-000145
 *
 * Each physical item gets a unique, permanent ID.
 * Owner history is preserved even when the asset changes owner.
 */

const ACTIVOS_COLLECTION = "activos";

function assetPrefixForType(type: VehicleType): AssetPrefix {
  return VEHICLE_TYPE_TO_ASSET_PREFIX[type] || "EQP";
}

/**
 * Search for an existing asset by serial number or by (type + brand + model + owner).
 * Serial number is the strongest match. If no serial, falls back to composite key.
 */
export async function findExistingAsset(data: {
  type: VehicleType;
  brand: string;
  model: string;
  serialNumber?: string;
  clientId?: string;
}): Promise<Activo | null> {
  if (!isFirebaseConfigured || !db) return null;

  // 1. Match by serial number (strongest)
  if (data.serialNumber && data.serialNumber.trim()) {
    const snQuery = query(
      collection(db, ACTIVOS_COLLECTION),
      where("serialNumber", "==", data.serialNumber.trim())
    );
    const snSnap = await getDocs(snQuery);
    if (!snSnap.empty) {
      const d = snSnap.docs[0];
      return { id: d.id, ...d.data() } as Activo;
    }
  }

  // 2. Match by (type + brand + model + current owner)
  if (data.clientId) {
    const compositeQuery = query(
      collection(db, ACTIVOS_COLLECTION),
      where("type", "==", data.type),
      where("brand", "==", data.brand),
      where("model", "==", data.model),
      where("ownerId", "==", data.clientId)
    );
    const compositeSnap = await getDocs(compositeQuery);
    if (!compositeSnap.empty) {
      const d = compositeSnap.docs[0];
      return { id: d.id, ...d.data() } as Activo;
    }
  }

  return null;
}

/**
 * Create or update an asset. If found by serial or composite key, transfers ownership.
 * Otherwise creates a new asset.
 *
 * Returns the Activo (new or updated).
 */
export async function upsertAsset(data: {
  type: VehicleType;
  brand: string;
  model: string;
  serialNumber?: string;
  plate?: string;
  voltage?: string;
  batteryCondition?: string;
  clientId: string;
  clientName: string;
}): Promise<Activo> {
  if (!isFirebaseConfigured || !db) {
    const prefix = assetPrefixForType(data.type);
    const id = await nextAssetId(prefix);
    return {
      id,
      type: data.type,
      assetType: prefix,
      brand: data.brand,
      model: data.model,
      serialNumber: data.serialNumber,
      plate: data.plate,
      voltage: data.voltage,
      batteryCondition: data.batteryCondition,
      ownerId: data.clientId,
      ownerName: data.clientName,
      ownerHistory: [{
        clientId: data.clientId,
        clientName: data.clientName,
        from: new Date().toISOString(),
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const existing = await findExistingAsset({
    type: data.type,
    brand: data.brand,
    model: data.model,
    serialNumber: data.serialNumber,
    clientId: data.clientId,
  });

  const now = new Date().toISOString();

  if (existing) {
    // Same owner? Just update fields
    if (existing.ownerId === data.clientId) {
      const updated: Activo = {
        ...existing,
        serialNumber: data.serialNumber || existing.serialNumber,
        plate: data.plate || existing.plate,
        voltage: data.voltage || existing.voltage,
        batteryCondition: data.batteryCondition || existing.batteryCondition,
        updatedAt: now,
      };
      await setDoc(doc(db, ACTIVOS_COLLECTION, existing.id), updated, { merge: true });
      return updated;
    }

    // Different owner → transfer
    const history: OwnerHistoryEntry[] = [
      ...(existing.ownerHistory || []),
      { clientId: existing.ownerId, clientName: existing.ownerName, from: existing.createdAt, to: now },
    ];
    const transferred: Activo = {
      ...existing,
      ownerId: data.clientId,
      ownerName: data.clientName,
      ownerHistory: history,
      serialNumber: data.serialNumber || existing.serialNumber,
      plate: data.plate || existing.plate,
      voltage: data.voltage || existing.voltage,
      batteryCondition: data.batteryCondition || existing.batteryCondition,
      updatedAt: now,
    };
    await setDoc(doc(db, ACTIVOS_COLLECTION, existing.id), transferred, { merge: true });
    return transferred;
  }

  // Create new asset
  const prefix = assetPrefixForType(data.type);
  const id = await nextAssetId(prefix);
  const newAsset: Activo = {
    id,
    type: data.type,
    assetType: prefix,
    brand: data.brand,
    model: data.model,
    serialNumber: data.serialNumber,
    plate: data.plate,
    voltage: data.voltage,
    batteryCondition: data.batteryCondition,
    ownerId: data.clientId,
    ownerName: data.clientName,
    ownerHistory: [{
      clientId: data.clientId,
      clientName: data.clientName,
      from: now,
    }],
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(doc(db, ACTIVOS_COLLECTION, id), newAsset);
  return newAsset;
}

/**
 * Get an asset by ID.
 */
export async function getAsset(assetId: string): Promise<Activo | null> {
  if (!isFirebaseConfigured || !db) return null;
  const assetRef = doc(db, ACTIVOS_COLLECTION, assetId);
  const snap = await getDocs(query(collection(db, ACTIVOS_COLLECTION), where("id", "==", assetId)));
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Activo;
}

/**
 * Subscribe to all assets (realtime).
 */
export function subscribeAssets(callback: (assets: Activo[]) => void): () => void {
  if (!isFirebaseConfigured || !db) {
    callback([]);
    return () => {};
  }
  return onSnapshot(collection(db, ACTIVOS_COLLECTION), (snap) => {
    const assets: Activo[] = [];
    snap.forEach((d) => {
      assets.push({ id: d.id, ...d.data() } as Activo);
    });
    callback(assets);
  });
}
