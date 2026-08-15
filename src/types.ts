export type VehicleType = 'scooter' | 'bici' | 'moto' | 'bicimoto' | 'trimoto' | 'otro';
export type ServiceType = 'mantenimiento' | 'diagnostico' | 'garantia' | 'cambio' | 'express';
export type PaymentMethod = 'efectivo' | 'transferencia' | 'yape_plin' | 'tarjeta';
export type WorkshopBranch = 'lince_arenales' | 'surco' | 'san_borja' | 'lince_leal';

export type RepairStatus = 
  | 'receptioned' 
  | 'diagnosing' 
  | 'waiting_parts' 
  | 'repairing' 
  | 'testing' 
  | 'ready' 
  | 'delivered';

export interface ClientInfo {
  name: string;
  phone: string;
  email: string;
  dni: string; // Will hold DNI or C.E
}

export interface VehicleInfo {
  type: VehicleType;
  brand: string;
  model: string;
  voltage: string;
  batteryCondition: '0-1año' | '1-2años' | '2-3años' | '3-4años';
  reportedFailure: string;
}

export interface Accessories {
  charger: boolean;
  key: boolean;
  battery: boolean;
  helmet: boolean;
  padlock: boolean; // "Candado" in PDF
  others: string;
}

export interface VideoEvidence {
  url: string; // Download URL en Firebase Storage
  durationSec: number;
  sizeBytes: number;
  recordedAt: string;
  recordedBy: string;
  orderId: string;
  branch: string;
}

export interface VisualState {
  scratches: boolean;
  cracks: boolean;
  brakesOk: boolean;
  lightsOk: boolean;
  screenOk: boolean;
  tiresOk: boolean;
  videoRecorded: boolean; // "Video Realizado" in PDF
  photosTaken: boolean; // "Fotografías Realizadas" in PDF
  notes: string; // Observaciones Generales
  photos?: string[]; // Base64 images or device mock photos
  videoEvidence?: VideoEvidence[]; // Videos de respaldo subidos a Firebase Storage
}

export interface PaymentInfo {
  estimatedCost: number; // TOTAL ESTIMADO
  advancePayment: number; // ADELANTO
  remainingBalance: number; // SALDO PENDIENTE
  paymentMethod: PaymentMethod;
  paymentNotes: string; // OBSERVACIONES DE PAGO
}

export interface AiDiagnostic {
  probableCauses: string[];
  testProcedures: string[];
  estimatedTime: string;
  suggestedParts: string[];
  aiNote: string;
}

export interface HistoryLog {
  id: string;
  date: string;
  status: RepairStatus;
  description: string;
  user: string;
}

// Repuesto / trabajo que el técnico detecta durante el diagnóstico
// (ej. "Cambio de acelerador", "Purgado", "Cambio de llantas").
// El precio de repuesto y la mano de obra los coloca la jefa de sede.
export interface SparePart {
  id: string;
  description: string;
  type: "reparacion" | "cambio";
  partPrice?: number; // Costo del repuesto (lo pone la jefa)
  laborPrice?: number; // Mano de obra (lo pone la jefa)
}

export interface RepairItem {
  id: string;
  receptionDate: string;
  workshopBranch: WorkshopBranch; // Sede
  source?: string; // Origen del registro: "tablet" (web) o "android"
  serviceType: ServiceType; // Tipo de Servicio
  serviceTypeDetail?: string; // Detail for "Cambio" or custom notes
  client: ClientInfo;
  vehicle: VehicleInfo;
  accessories: Accessories;
  visualState: VisualState;
  status: RepairStatus;
  aiDiagnostic: AiDiagnostic | null;
  technicianNotes: string;
  technicianName?: string; // Nombre del técnico responsable del diagnóstico
  estimatedCost: number;
  actualCost: number;
  payment?: PaymentInfo; // PDF payment section
  historyLog: HistoryLog[];
  clientSignature?: string; // Base64 signature of the client
  clientSignatureName?: string; // Name of client who signed
  deliveredAt?: string; // Fecha/hora en que el vehículo fue entregado al cliente
  deliverySignature?: string; // Firma del cliente al recibir el vehículo
  deliverySignatureName?: string; // Nombre del cliente que firmó la entrega
  tallerSignature?: string; // Base64 signature of the representative (Receptionist)
  tallerSignatureName?: string; // Name of receptionist who signed
  technicianSignature?: string; // Base64 signature of the technician
  technicianSignatureName?: string; // Name of technician who signed
  repairPhotos?: string[]; // Photos taken during repair/maintenance
  spareParts?: SparePart[]; // Repuestos detectados por el técnico en el diagnóstico
  qcReport?: QualityChecklist; // Control de calidad
  approvalStatus?: "pendiente" | "aprobado" | "rechazado"; // Respuesta del cliente vía WhatsApp
  approvalResponseAt?: string; // Fecha/hora en que el cliente respondió
  serviceAuthorized?: boolean; // True cuando el presupuesto fue aprobado por el cliente y guardado por la jefa
}

// Ítem binario del checklist de calidad: en buen estado / para cambio
export interface QcCheckItem {
  good: boolean;
  replace: boolean;
}

// Checklist de Control de Calidad
export interface QualityChecklist {
  batteryLevel: "optimo" | "regular" | "bajo" | "no_carga";
  mileageKm: number;
  minSpeedKmh: number;
  maxSpeedKmh: number;
  faultResolved: boolean;
  cleanliness: "excelente" | "buena" | "regular" | "pendiente";
  frontBrake: QcCheckItem;
  rearBrake: QcCheckItem;
  electricHarness: QcCheckItem; // Ramal eléctrico
  motorHarness: QcCheckItem; // Ramal del motor
  headlights: QcCheckItem; // Faros delanteros
  rearLight: QcCheckItem; // Luz de freno posterior
  horn: QcCheckItem; // Bocina
  mirrors: QcCheckItem; // Espejos
  suspension: QcCheckItem; // Suspensión
  turnSignals: boolean; // Direccionales si/no
  rightTurnLight: QcCheckItem; // Luces derecha
  leftTurnLight: QcCheckItem; // Luces izquierda
  frontTires: QcCheckItem; // Llantas delanteras
  rearTires: QcCheckItem; // Llantas traseras
  chargingTimeMin: number; // Tiempo de carga en minutos
  finalVoltage: string; // Voltaje final
  notes: string; // Observaciones
  result: "approved" | "rejected" | "draft";
  reviewedBy: string;
  reviewedAt: string;
}

export interface WorkshopStats {
  total: number;
  receptioned: number;
  diagnosing: number;
  waiting_parts: number;
  repairing: number;
  testing: number;
  ready: number;
  delivered: number;
  monthlyEarnings: number;
}

