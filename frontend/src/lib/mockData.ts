import { User, Prescription, DispenseEvent, AuditLog } from './types';

export const mockUsers: User[] = [
  {
    id: 'doc1',
    fullName: 'Dr. Aigerim Suleimenova',
    email: 'doctor@example.kz',
    role: 'doctor',
    phone: '+77771234567',
    isActive: true,
    accountStatus: 'active',
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'doc2',
    fullName: 'Dr. Nurlan Ospanov',
    email: 'doctor2@example.kz',
    role: 'doctor',
    phone: '+77771234568',
    isActive: true,
    accountStatus: 'active',
    createdAt: '2024-01-20T10:00:00Z',
  },
  {
    id: 'pharm1',
    fullName: 'Marat Kulanov',
    email: 'pharmacist@example.kz',
    role: 'pharmacist',
    phone: '+77779876543',
    isActive: true,
    accountStatus: 'active',
    createdAt: '2024-01-10T10:00:00Z',
  },
  {
    id: 'pharm2',
    fullName: 'Dana Akhmetova',
    email: 'pharmacist2@example.kz',
    role: 'pharmacist',
    phone: '+77779876544',
    isActive: true,
    accountStatus: 'active',
    createdAt: '2024-01-12T10:00:00Z',
  },
  {
    id: 'admin1',
    fullName: 'Aliya Nurzhanova',
    email: 'admin@example.kz',
    role: 'admin',
    phone: '+77775554433',
    isActive: true,
    accountStatus: 'active',
    createdAt: '2024-01-05T10:00:00Z',
  },
  {
    id: 'admin2',
    fullName: 'Timur Bekmurzaev',
    email: 'admin2@example.kz',
    role: 'admin',
    phone: '+77775554434',
    isActive: true,
    accountStatus: 'active',
    createdAt: '2024-01-08T10:00:00Z',
  },
  {
    id: 'superadmin1',
    fullName: 'Askar Nazarbayev',
    email: 'superadmin@example.kz',
    role: 'super_admin',
    phone: '+77775559999',
    isActive: true,
    accountStatus: 'active',
    createdAt: '2024-01-01T10:00:00Z',
  },
];

// Calculate dates
const now = new Date();
const expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

export const mockPrescriptions: Prescription[] = [
  {
    id: 'RX001',
    patient: {
      fullName: 'Assel Karimova',
      iin: '920415350167',
      phone: '+77771112233',
      email: 'assel.k@example.kz',
    },
    doctorId: 'doc1',
    doctorName: 'Dr. Aigerim Suleimenova',
    medications: [
      {
        id: 'med1',
        name: 'Amoxicillin',
        form: 'Tablets',
        dosage: '500mg',
        qtyPrescribed: 30,
        qtyDispensed: 0,
        qtyRemaining: 30,
        course: 'Take 1 tablet 3 times daily after meals for 10 days',
      },
      {
        id: 'med2',
        name: 'Ibuprofen',
        form: 'Tablets',
        dosage: '400mg',
        qtyPrescribed: 20,
        qtyDispensed: 0,
        qtyRemaining: 20,
        course: 'Take 1 tablet as needed for pain, max 3 times daily',
      },
    ],
    status: 'active',
    createdAt: now,
    expiresAt: expiryDate,
  },
  {
    id: 'RX002',
    patient: {
      fullName: 'Daniyar Bekov',
      iin: '850728450289',
      phone: '+77772223344',
      email: 'daniyar.b@example.kz',
    },
    doctorId: 'doc1',
    doctorName: 'Dr. Aigerim Suleimenova',
    medications: [
      {
        id: 'med3',
        name: 'Lisinopril',
        form: 'Tablets',
        dosage: '10mg',
        qtyPrescribed: 30,
        qtyDispensed: 15,
        qtyRemaining: 15,
        course: 'Take 1 tablet once daily in the morning',
      },
      {
        id: 'med4',
        name: 'Atorvastatin',
        form: 'Tablets',
        dosage: '20mg',
        qtyPrescribed: 30,
        qtyDispensed: 15,
        qtyRemaining: 15,
        course: 'Take 1 tablet once daily in the evening',
      },
    ],
    status: 'partially_dispensed',
    createdAt: twoDaysAgo,
    expiresAt: new Date(twoDaysAgo.getTime() + 30 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'RX003',
    patient: {
      fullName: 'Saule Zhakanova',
      iin: '780912450123',
      phone: '+77773334455',
      email: 'saule.zh@example.kz',
    },
    doctorId: 'doc1',
    doctorName: 'Dr. Aigerim Suleimenova',
    medications: [
      {
        id: 'med5',
        name: 'Metformin',
        form: 'Tablets',
        dosage: '850mg',
        qtyPrescribed: 60,
        qtyDispensed: 60,
        qtyRemaining: 0,
        course: 'Take 1 tablet twice daily with meals',
      },
    ],
    status: 'dispensed',
    createdAt: yesterday,
    expiresAt: new Date(yesterday.getTime() + 30 * 24 * 60 * 60 * 1000),
  },
];

export const mockDispenseEvents: DispenseEvent[] = [
  {
    id: 'disp1',
    prescriptionId: 'RX002',
    pharmacistId: 'pharm1',
    pharmacistName: 'Marat Kulanov',
    timestamp: yesterday,
    items: [
      {
        medicationId: 'med3',
        medicationName: 'Lisinopril 10mg',
        qtyDispensed: 15,
      },
      {
        medicationId: 'med4',
        medicationName: 'Atorvastatin 20mg',
        qtyDispensed: 15,
      },
    ],
  },
  {
    id: 'disp2',
    prescriptionId: 'RX003',
    pharmacistId: 'pharm1',
    pharmacistName: 'Marat Kulanov',
    timestamp: yesterday,
    items: [
      {
        medicationId: 'med5',
        medicationName: 'Metformin 850mg',
        qtyDispensed: 60,
      },
    ],
  },
];

export const mockAuditLogs: AuditLog[] = [
  {
    id: 'audit1',
    userId: 'doc1',
    userName: 'Dr. Aigerim Suleimenova',
    action: 'CREATE',
    entityType: 'Prescription',
    entityId: 'RX001',
    details: 'Created prescription for Assel Karimova',
    timestamp: now,
  },
  {
    id: 'audit2',
    userId: 'pharm1',
    userName: 'Marat Kulanov',
    action: 'DISPENSE',
    entityType: 'Prescription',
    entityId: 'RX002',
    details: 'Partially dispensed prescription (15 of 30 tablets per medication)',
    timestamp: yesterday,
  },
  {
    id: 'audit3',
    userId: 'pharm1',
    userName: 'Marat Kulanov',
    action: 'DISPENSE',
    entityType: 'Prescription',
    entityId: 'RX003',
    details: 'Fully dispensed prescription',
    timestamp: yesterday,
  },
];

// Login credentials for demo
export const demoCredentials = {
  doctor: {
    email: 'doctor@example.kz',
    password: 'doctor123',
    user: mockUsers[0],
  },
  pharmacist: {
    email: 'pharmacist@example.kz',
    password: 'pharmacist123',
    user: mockUsers[2],
  },
  admin: {
    email: 'admin@example.kz',
    password: 'admin123',
    user: mockUsers[4],
  },
  superadmin: {
    email: 'superadmin@example.kz',
    password: 'superadmin123',
    user: mockUsers[6],
  },
};

// Helper function to update prescription status
export const updatePrescriptionStatus = (prescriptionId: string, newStatus: Prescription['status']) => {
  const prescription = mockPrescriptions.find(p => p.id === prescriptionId);
  if (prescription) {
    prescription.status = newStatus;
  }
};

// Helper function to create a new prescription
export const createPrescription = (prescriptionData: Omit<Prescription, 'id' | 'createdAt' | 'expiresAt' | 'status'>) => {
  const now = new Date();
  const expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days validity
  
  const newPrescription: Prescription = {
    ...prescriptionData,
    id: `RX${String(mockPrescriptions.length + 1).padStart(3, '0')}`,
    createdAt: now,
    expiresAt: expiryDate,
    status: 'active',
  };
  
  mockPrescriptions.push(newPrescription);
  return newPrescription;
};

// Helper function to record a dispense event
export const createDispenseEvent = (
  prescriptionId: string,
  pharmacistId: string,
  pharmacistName: string,
  items: { medicationId: string; medicationName: string; qtyDispensed: number }[]
) => {
  const prescription = mockPrescriptions.find(p => p.id === prescriptionId);
  if (!prescription) return null;

  // Update medication quantities
  items.forEach(item => {
    const medication = prescription.medications.find(m => m.id === item.medicationId);
    if (medication) {
      medication.qtyDispensed += item.qtyDispensed;
      medication.qtyRemaining -= item.qtyDispensed;
    }
  });

  // Check if fully dispensed
  const allDispensed = prescription.medications.every(m => m.qtyRemaining === 0);
  if (allDispensed) {
    prescription.status = 'dispensed';
  } else if (prescription.medications.some(m => m.qtyDispensed > 0)) {
    prescription.status = 'partially_dispensed';
  }

  // Create dispense event
  const newEvent: DispenseEvent = {
    id: `DE${String(mockDispenseEvents.length + 1).padStart(3, '0')}`,
    prescriptionId,
    pharmacistId,
    pharmacistName,
    timestamp: new Date(),
    items,
  };

  // Add to beginning of array for "recent" display
  mockDispenseEvents.unshift(newEvent);
  
  return newEvent;
};