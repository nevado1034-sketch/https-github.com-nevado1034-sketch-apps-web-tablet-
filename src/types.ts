export type VehicleType = 'scooter' | 'moto' | 'bici' | 'otro';
export type ServiceType = 'mantenimiento' | 'diagnostico' | 'garantia' | 'cambio';
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
  dni: string; // Will hold DNI or RUC
}

export interface VehicleInfo {
  type: VehicleType;
  brand: string;
  model: string;
  voltage: string;
  batteryCondition: 'bueno' | 'regular' | 'malo' | 'no_aplica';
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
  videos?: string[]; // Video links/mock links
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

export interface RepairItem {
  id: string;
  receptionDate: string;
  workshopBranch: WorkshopBranch; // Sede
  serviceType: ServiceType; // Tipo de Servicio
  serviceTypeDetail?: string; // Detail for "Cambio" or custom notes
  client: ClientInfo;
  vehicle: VehicleInfo;
  accessories: Accessories;
  visualState: VisualState;
  status: RepairStatus;
  aiDiagnostic: AiDiagnostic | null;
  technicianNotes: string;
  estimatedCost: number;
  actualCost: number;
  payment?: PaymentInfo; // PDF payment section
  historyLog: HistoryLog[];
  clientSignature?: string; // Base64 signature of the client
  clientSignatureName?: string; // Name of client who signed
  tallerSignature?: string; // Base64 signature of the representative (Receptionist)
  tallerSignatureName?: string; // Name of receptionist who signed
  technicianSignature?: string; // Base64 signature of the technician
  technicianSignatureName?: string; // Name of technician who signed
  repairPhotos?: string[]; // Photos taken during repair/maintenance
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

