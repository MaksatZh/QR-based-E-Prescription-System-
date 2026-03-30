import { useState } from 'react';
import { Prescription } from '../types/prescription';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Edit, Eye, QrCode, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import ViewPrescription from './ViewPrescription';

interface PrescriptionListProps {
  prescriptions: Prescription[];
  onEdit?: (prescription: Prescription) => void;
  onDispense?: (prescription: Prescription) => void;
  userRole: 'Doctor' | 'Pharmacist' | 'Admin';
}

export default function PrescriptionList({
  prescriptions,
  onEdit,
  onDispense,
  userRole,
}: PrescriptionListProps) {
  const [viewingPrescription, setViewingPrescription] = useState<Prescription | null>(null);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      Active: { variant: 'default', label: 'Активен' },
      'Partially dispensed': { variant: 'secondary', label: 'Частично выдан' },
      Dispensed: { variant: 'outline', label: 'Выдан полностью' },
      Cancelled: { variant: 'destructive', label: 'Отменён' },
      Expired: { variant: 'destructive', label: 'Истёк' },
    };
    const config = variants[status] || { variant: 'default' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const canEdit = (prescription: Prescription) => {
    return (
      userRole === 'Doctor' &&
      (prescription.status === 'Active' || prescription.status === 'Partially dispensed')
    );
  };

  const canDispense = (prescription: Prescription) => {
    return (
      userRole === 'Pharmacist' &&
      (prescription.status === 'Active' || prescription.status === 'Partially dispensed')
    );
  };

  if (prescriptions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p>Рецепты не найдены</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Пациент</TableHead>
              <TableHead>ИИН</TableHead>
              {userRole !== 'Doctor' && <TableHead>Врач</TableHead>}
              <TableHead>Препараты</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Создан</TableHead>
              <TableHead>Действителен до</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prescriptions.map((prescription) => (
              <TableRow key={prescription.id}>
                <TableCell className="font-medium">{prescription.id}</TableCell>
                <TableCell>{prescription.patient.fullName}</TableCell>
                <TableCell className="font-mono text-sm">{prescription.patient.iin}</TableCell>
                {userRole !== 'Doctor' && <TableCell>{prescription.doctor.name}</TableCell>}
                <TableCell>{prescription.items.length} поз.</TableCell>
                <TableCell>{getStatusBadge(prescription.status)}</TableCell>
                <TableCell className="text-sm text-gray-600">
                  {format(new Date(prescription.createdAt), 'dd MMM yyyy', { locale: ru })}
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {format(new Date(prescription.expiresAt), 'dd MMM yyyy', { locale: ru })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewingPrescription(prescription)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canEdit(prescription) && onEdit && (
                      <Button variant="ghost" size="sm" onClick={() => onEdit(prescription)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {canDispense(prescription) && onDispense && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => onDispense(prescription)}
                      >
                        <QrCode className="h-4 w-4 mr-1" />
                        Выдать
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {viewingPrescription && (
        <ViewPrescription
          prescription={viewingPrescription}
          open={!!viewingPrescription}
          onClose={() => setViewingPrescription(null)}
        />
      )}
    </>
  );
}

function FileText({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}
