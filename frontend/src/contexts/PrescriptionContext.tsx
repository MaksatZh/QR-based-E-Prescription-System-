import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Prescription,
  User,
  DispenseEvent,
  AuditLog,
  Patient,
  PrescriptionItem,
} from '../types/prescription';

interface PrescriptionContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  prescriptions: Prescription[];
  addPrescription: (prescription: Prescription) => void;
  updatePrescription: (id: string, prescription: Partial<Prescription>) => void;
  getPrescriptionById: (id: string) => Prescription | undefined;
  users: User[];
  addUser: (user: User) => void;
  updateUser: (id: string, user: Partial<User>) => void;
  deleteUser: (id: string) => void;
  dispenseEvents: DispenseEvent[];
  addDispenseEvent: (event: DispenseEvent) => void;
  auditLogs: AuditLog[];
  addAuditLog: (log: AuditLog) => void;
}

const PrescriptionContext = createContext<PrescriptionContextType | undefined>(undefined);

export function PrescriptionProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [dispenseEvents, setDispenseEvents] = useState<DispenseEvent[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Initialize with mock data
  useEffect(() => {
    // Mock users
    const mockUsers: User[] = [
      {
        id: '1',
        name: 'Dr. Aigerim Nurbekova',
        email: 'aigerim.nurbekova@hospital.kz',
        phone: '+7 777 123 4567',
        role: 'Doctor',
        isActive: true,
        createdAt: '2024-01-15T10:00:00Z',
      },
      {
        id: '2',
        name: 'Dr. Marat Suleimenov',
        email: 'marat.suleimenov@hospital.kz',
        phone: '+7 777 234 5678',
        role: 'Doctor',
        isActive: true,
        createdAt: '2024-01-20T10:00:00Z',
      },
      {
        id: '3',
        name: 'Dinara Akhmetova',
        email: 'dinara.akhmetova@pharmacy.kz',
        phone: '+7 777 345 6789',
        role: 'Pharmacist',
        isActive: true,
        createdAt: '2024-02-01T10:00:00Z',
      },
      {
        id: '4',
        name: 'Asel Tulegenova',
        email: 'asel.tulegenova@pharmacy.kz',
        phone: '+7 777 456 7890',
        role: 'Pharmacist',
        isActive: true,
        createdAt: '2024-02-10T10:00:00Z',
      },
      {
        id: '5',
        name: 'Admin User',
        email: 'admin@system.kz',
        phone: '+7 777 567 8901',
        role: 'Admin',
        isActive: true,
        createdAt: '2024-01-01T10:00:00Z',
      },
    ];

    // Mock prescriptions
    const mockPrescriptions: Prescription[] = [
      {
        id: 'RX001',
        patient: {
          id: 'P001',
          fullName: 'Nurgul Temirbekova',
          iin: '920315400123',
          phone: '+7 701 111 2233',
          email: 'nurgul.t@example.kz',
        },
        doctor: mockUsers[0],
        items: [
          {
            id: 'I001',
            medicationName: 'Amoxicillin',
            form: 'Tablets',
            dosage: '500mg',
            qtyPrescribed: 30,
            qtyDispensed: 0,
            qtyRemaining: 30,
            instructions: 'Take 1 tablet 3 times daily for 10 days',
          },
          {
            id: 'I002',
            medicationName: 'Ibuprofen',
            form: 'Tablets',
            dosage: '400mg',
            qtyPrescribed: 20,
            qtyDispensed: 0,
            qtyRemaining: 20,
            instructions: 'Take 1 tablet when needed for pain, max 3 times daily',
          },
        ],
        status: 'Active',
        createdAt: '2025-03-15T10:00:00Z',
        expiresAt: '2025-04-14T10:00:00Z',
        updatedAt: '2025-03-15T10:00:00Z',
      },
      {
        id: 'RX002',
        patient: {
          id: 'P002',
          fullName: 'Berik Aldabergenov',
          iin: '850720301234',
          phone: '+7 702 222 3344',
          email: 'berik.a@example.kz',
        },
        doctor: mockUsers[1],
        items: [
          {
            id: 'I003',
            medicationName: 'Metformin',
            form: 'Tablets',
            dosage: '500mg',
            qtyPrescribed: 60,
            qtyDispensed: 30,
            qtyRemaining: 30,
            instructions: 'Take 1 tablet 2 times daily with meals',
          },
        ],
        status: 'Partially dispensed',
        createdAt: '2025-03-10T10:00:00Z',
        expiresAt: '2025-04-09T10:00:00Z',
        updatedAt: '2025-03-12T14:30:00Z',
      },
      {
        id: 'RX003',
        patient: {
          id: 'P003',
          fullName: 'Saltanat Karimova',
          iin: '780105500456',
          phone: '+7 703 333 4455',
          email: 'saltanat.k@example.kz',
        },
        doctor: mockUsers[0],
        items: [
          {
            id: 'I004',
            medicationName: 'Lisinopril',
            form: 'Tablets',
            dosage: '10mg',
            qtyPrescribed: 30,
            qtyDispensed: 30,
            qtyRemaining: 0,
            instructions: 'Take 1 tablet once daily in the morning',
          },
        ],
        status: 'Dispensed',
        createdAt: '2025-03-05T10:00:00Z',
        expiresAt: '2025-04-04T10:00:00Z',
        updatedAt: '2025-03-08T11:20:00Z',
      },
    ];

    setUsers(mockUsers);
    setPrescriptions(mockPrescriptions);
  }, []);

  const addPrescription = (prescription: Prescription) => {
    setPrescriptions((prev) => [...prev, prescription]);
  };

  const updatePrescription = (id: string, updatedData: Partial<Prescription>) => {
    setPrescriptions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updatedData, updatedAt: new Date().toISOString() } : p))
    );
  };

  const getPrescriptionById = (id: string) => {
    return prescriptions.find((p) => p.id === id);
  };

  const addUser = (user: User) => {
    setUsers((prev) => [...prev, user]);
  };

  const updateUser = (id: string, updatedData: Partial<User>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updatedData } : u)));
  };

  const deleteUser = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const addDispenseEvent = (event: DispenseEvent) => {
    setDispenseEvents((prev) => [...prev, event]);
  };

  const addAuditLog = (log: AuditLog) => {
    setAuditLogs((prev) => [...prev, log]);
  };

  return (
    <PrescriptionContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        prescriptions,
        addPrescription,
        updatePrescription,
        getPrescriptionById,
        users,
        addUser,
        updateUser,
        deleteUser,
        dispenseEvents,
        addDispenseEvent,
        auditLogs,
        addAuditLog,
      }}
    >
      {children}
    </PrescriptionContext.Provider>
  );
}

export function usePrescriptionContext() {
  const context = useContext(PrescriptionContext);
  if (!context) {
    throw new Error('usePrescriptionContext must be used within PrescriptionProvider');
  }
  return context;
}
