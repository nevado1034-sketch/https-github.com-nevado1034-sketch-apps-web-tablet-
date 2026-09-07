import type { VehicleType, WorkshopBranch, RepairStatus, ServiceType, PaymentMethod } from "../types";
export type { VehicleType, WorkshopBranch, RepairStatus, ServiceType, PaymentMethod } from "../types";

/* ─────────────────────────────────────────────────
 *  CLIENTE  (CLI-XXXXXX)
 * ───────────────────────────────────────────────── */
export interface Cliente {
  id: string;               // CLI-000001
  name: string;
  phone: string;
  email: string;
  dni: string;              // DNI o C.E.
  createdAt: string;        // ISO date
  updatedAt: string;        // ISO date
  totalOrders: number;      // Orders count (denormalized)
}

/* ─────────────────────────────────────────────────
 *  ACTIVO / EQUIPO  ({PREFIX}-XXXXXX)
 * ───────────────────────────────────────────────── */
export type AssetPrefix = "SCO" | "MOT" | "BIC" | "BAT" | "CAR" | "EQP";

export const VEHICLE_TYPE_TO_ASSET_PREFIX: Record<VehicleType, AssetPrefix> = {
  scooter:  "SCO",
  moto:     "MOT",
  bici:     "BIC",
  bicimoto: "MOT",
  trimoto:  "MOT",
  otro:     "EQP",
};

export const ASSET_PREFIX_TO_LABEL: Record<AssetPrefix, string> = {
  SCO: "Scooter",
  MOT: "Moto Eléctrica",
  BIC: "Bicicleta Eléctrica",
  BAT: "Batería",
  CAR: "Cargador",
  EQP: "Otro Equipo",
};

export interface OwnerHistoryEntry {
  clientId: string;         // CLI-XXXXXX
  clientName: string;
  from: string;             // ISO date
  to?: string;              // ISO date (null = current owner)
}

export interface Activo {
  id: string;               // SCO-000847, MOT-000214, etc.
  type: VehicleType;        // scooter | moto | bici | bicimoto | trimoto | otro
  assetType: AssetPrefix;   // SCO | MOT | BIC | BAT | CAR | EQP
  brand: string;
  model: string;
  color?: string;
  serialNumber?: string;    // Número de serie / VIN
  plate?: string;           // Placa (si aplica)
  voltage?: string;         // 48V, 60V, 72V, etc.
  batteryCondition?: string;
  ownerId: string;          // CLI-XXXXXX (current owner)
  ownerName: string;        // Current owner name (denormalized)
  ownerHistory: OwnerHistoryEntry[];
  notes?: string;           // Notas generales del activo
  createdAt: string;
  updatedAt: string;
}

/* ─────────────────────────────────────────────────
 *  ORDEN DE TRABAJO  ({BRANCH}-XXXXX)
 * ───────────────────────────────────────────────── */
export interface Orden {
  id: string;               // LSI-00001, LSB-00003, etc.
  clientId: string;         // CLI-XXXXXX
  assetId: string;          // SCO-000847, etc.
  sede: WorkshopBranch;
  serviceType: ServiceType;
  serviceTypeDetail?: string;
  status: RepairStatus;
  technicianName?: string;

  // Snapshot data at order time (for quick display)
  clientSnapshot: {
    name: string;
    phone: string;
    email: string;
    dni: string;
  };
  assetSnapshot: {
    type: VehicleType;
    brand: string;
    model: string;
    serialNumber?: string;
  };

  // Workshop data
  accessories: {
    charger: boolean;
    key: boolean;
    battery: boolean;
    helmet: boolean;
    padlock: boolean;
    others: string;
  };
  visualState: {
    scratches: boolean;
    cracks: boolean;
    brakesOk: boolean;
    lightsOk: boolean;
    screenOk: boolean;
    tiresOk: boolean;
    videoRecorded: boolean;
    photosTaken: boolean;
    notes: string;
    photos?: string[];
    videoEvidence?: Array<{
      url: string;
      durationSec: number;
      sizeBytes: number;
      recordedAt: string;
      recordedBy: string;
      orderId: string;
      branch: string;
    }>;
  };

  // Diagnostics & repair
  aiDiagnostic: {
    probableCauses: string[];
    testProcedures: string[];
    estimatedTime: string;
    suggestedParts: string[];
    aiNote: string;
  } | null;
  technicianNotes: string;
  spareParts?: Array<{
    id: string;
    description: string;
    type: "reparacion" | "cambio" | "mantenimiento";
    partPrice?: number;
    laborPrice?: number;
    source?: "tecnico" | "cliente";
  }>;
  recommendations?: string;

  // Financials
  estimatedCost: number;
  actualCost: number;
  payment?: {
    estimatedCost: number;
    advancePayment: number;
    remainingBalance: number;
    paymentMethod: PaymentMethod;
    paymentNotes: string;
  };

  // Signatures
  clientSignature?: string;
  clientSignatureName?: string;
  tallerSignature?: string;
  tallerSignatureName?: string;
  technicianSignature?: string;
  technicianSignatureName?: string;
  deliverySignature?: string;
  deliverySignatureName?: string;

  // QC & approval
  qcReport?: {
    batteryLevel: string;
    mileageKm: number;
    minSpeedKm: number;
    maxSpeedKm: number;
    faultResolved: boolean;
    cleanliness: string;
    notes: string;
    result: "approved" | "rejected" | "draft";
    reviewedBy: string;
    reviewedAt: string;
    [key: string]: any;
  };
  approvalStatus?: "pendiente" | "aprobado" | "rechazado";
  approvalResponseAt?: string;
  serviceAuthorized?: boolean;
  clientEntryApproval?: "pendiente" | "aprobado" | "rechazado";
  clientEntryResponseAt?: string;
  deliveredAt?: string;

  // History & metadata
  historyLog: Array<{
    id: string;
    date: string;
    status: RepairStatus;
    description: string;
    user: string;
  }>;
  source?: string;
  repairPhotos?: string[];

  createdAt: string;
  updatedAt: string;
}

/* ─────────────────────────────────────────────────
 *  COUNTER (for atomic ID generation)
 * ───────────────────────────────────────────────── */
export interface Counter {
  count: number;
  lastUpdated?: string;
}
