export type PrescriptionStatus =
  | 'Active'
  | 'Partially dispensed'
  | 'Dispensed'
  | 'Cancelled'
  | 'Expired';

export type UserRole = 'Doctor' | 'Pharmacist' | 'Admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface Patient {
  id: string;
  fullName: string;
  iin: string; // Individual Identification Number (Kazakhstan)
  phone: string;
  email: string;
}

export interface PrescriptionItem {
  id: string;
  medicationName: string;
  form: string; // tablets, ampules, syrup, etc.
  dosage: string;
  qtyPrescribed: number;
  qtyDispensed: number;
  qtyRemaining: number;
  instructions: string;
}

export interface Prescription {
  id: string;
  patient: Patient;
  doctor: User;
  items: PrescriptionItem[];
  status: PrescriptionStatus;
  createdAt: string;
  expiresAt: string;
  updatedAt: string;
  cancelledReason?: string;
}

export interface DispenseEvent {
  id: string;
  prescriptionId: string;
  pharmacist: User;
  items: {
    itemId: string;
    qtyDispensed: number;
  }[];
  dispensedAt: string;
  notes?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  timestamp: string;
}
