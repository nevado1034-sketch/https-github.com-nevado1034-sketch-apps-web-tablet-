export type { Cliente, Activo, Orden, AssetPrefix, OwnerHistoryEntry, Counter } from "./types";
export { VEHICLE_TYPE_TO_ASSET_PREFIX, ASSET_PREFIX_TO_LABEL } from "./types";
export { nextClientId, nextAssetId, nextOrderId } from "./idGenerator";
export { upsertClient, findExistingClient, updateClient, getClient, subscribeClients } from "./clientService";
export { upsertAsset, findExistingAsset, getAsset, subscribeAssets } from "./assetService";
export { createOrden, updateOrden, deleteOrden, getOrden, subscribeOrdenes } from "./orderService";
export { onRepairCreated, onRepairUpdated, onRepairDeleted } from "./orchestrator";
export type { DualWriteResult } from "./orchestrator";
