export type UserRole = 'doctor' | 'pharmacist' | 'admin' | 'super_admin';

export type PrescriptionStatus = 
  | 'created' 
  | 'active' 
  | 'partially_dispensed' 
  | 'dispensed' 
  | 'cancelled' 
  | 'expired';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  phone: string;
  isActive: boolean;
  accountStatus: 'pending' | 'active' | 'suspended';
  activationToken?: string;
  createdAt?: string;
}

export interface Patient {
  fullName: string;
  iin: string; // Individual Identification Number (Kazakhstan)
  phone: string;
  email: string;
}

export interface MedicationItem {
  id: string;
  name: string;
  form: string; // tablets, ampoules, syrup, etc.
  dosage: string;
  qtyPrescribed: number;
  qtyDispensed: number;
  qtyRemaining: number;
  course: string; // instructions
}

export interface Prescription {
  id: string;
  patient: Patient;
  doctorId: string;
  doctorName: string;
  medications: MedicationItem[];
  status: PrescriptionStatus;
  createdAt: Date;
  expiresAt: Date;
  cancelledAt?: Date;
  cancelReason?: string;
}

export interface DispenseEvent {
  id: string;
  prescriptionId: string;
  pharmacistId: string;
  pharmacistName: string;
  timestamp: Date;
  items: {
    medicationId: string;
    medicationName: string;
    qtyDispensed: number;
  }[];
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  timestamp: Date;
}