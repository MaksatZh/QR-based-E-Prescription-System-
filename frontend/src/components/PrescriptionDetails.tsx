import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { prescriptionApi, publicApi } from '../lib/api';
import { Button } from './ui/button';
import {
  ArrowLeft, Calendar, QrCode, AlertTriangle, Edit, XCircle, CheckCircle, Clock, Copy
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from './ui/alert-dialog';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { toast } from 'sonner@2.0.3';

export default function PrescriptionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [prescription, setPrescription] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [patientUrl, setPatientUrl] = useState<string>('');
  const [cancelReason, setCancelReason] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      prescriptionApi.get(id),
      publicApi.getQR(id),
    ]).then(([rxRes, qrRes]) => {
      setPrescription(rxRes.prescription);
      setQrDataUrl(qrRes.qrDataUrl);
      setPatientUrl(qrRes.patientUrl);
    }).catch(err => {
      toast.error(err.message || 'Failed to load prescription');
    }).finally(() => setLoading(false));
  }, [id]);

  const handleCancel = async () => {
    try {
      await prescriptionApi.cancel(id!, cancelReason);
      toast.success(prescription.status === 'partially_dispensed'
        ? 'Remaining prescription cancelled'
        : 'Prescription cancelled');
      navigate(-1);
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel');
    }
  };

  const copyUrl = () => {
    navigator.clipboard?.writeText(patientUrl).then(() => toast.success('Link copied!')).catch(() => {});
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 text-center text-muted-foreground text-[13px]">
        Loading…
      </div>
    );
  }

  if (!prescription) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-xl border shadow-sm p-12 text-center max-w-md mx-auto">
          <p className="text-muted-foreground text-[13px]">Prescription not found</p>
          <Button size="sm" className="mt-4" onClick={() => navigate(-1)}>Back</Button>
        </div>
      </div>
    );
  }

  const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
    active:              { label: 'Active',              className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
    created:             { label: 'Active',              className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
    partially_dispensed: { label: 'Partially Dispensed', className: 'bg-amber-50 text-amber-700 border-amber-200',      icon: Clock },
    dispensed:           { label: 'Completed',           className: 'bg-blue-50 text-blue-600 border-blue-200',          icon: CheckCircle },
    cancelled:           { label: 'Cancelled',           className: 'bg-red-50 text-red-600 border-red-200',             icon: XCircle },
    expired:             { label: 'Expired',             className: 'bg-gray-100 text-gray-500 border-gray-200',         icon: Clock },
  };

  const sc = statusConfig[prescription.status] || statusConfig.active;
  const canEdit   = ['active', 'created', 'partially_dispensed'].includes(prescription.status);
  const canCancel = !['dispensed', 'cancelled', 'expired'].includes(prescription.status);
  const daysRemaining = Math.ceil((new Date(prescription.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[800px] mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground mb-5 transition-colors">
        <ArrowLeft className="size-4" /> Back
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-[20px]">Rx-{prescription.id}</h2>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Created {new Date(prescription.createdAt).toLocaleDateString()}
            {!['cancelled', 'expired', 'dispensed'].includes(prescription.status) && (
              <span className={`ml-2 ${daysRemaining <= 7 ? 'text-amber-600' : ''}`}>· {daysRemaining}d remaining</span>
            )}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] border self-start ${sc.className}`}>
          <sc.icon className="size-3.5" /> {sc.label}
        </span>
      </div>

      <div className="space-y-4">
        {/* Patient + Details */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50/50">
            <span className="text-[14px]">Patient & Prescription Details</span>
          </div>
          <div className="px-5 py-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { label: 'Patient',  value: prescription.patient.fullName },
                { label: 'IIN',     value: prescription.patient.iin, mono: true },
                { label: 'Phone',   value: prescription.patient.phone },
                { label: 'Email',   value: prescription.patient.email },
              ].map(item => (
                <div key={item.label}>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{item.label}</p>
                  <p className={`text-[13px] mt-0.5 ${item.mono ? 'font-mono' : ''}`}>{item.value}</p>
                </div>
              ))}
            </div>
            <div className="h-px bg-border my-4" />
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Prescribed by</p>
                <p className="text-[13px] mt-0.5">{prescription.doctor?.fullName}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Status</p>
                <p className="text-[13px] mt-0.5 capitalize">{prescription.status.replace('_', ' ')}</p>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] text-muted-foreground">Created</p>
                  <p className="text-[12px]">{new Date(prescription.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] text-muted-foreground">Expires</p>
                  <p className="text-[12px]">{new Date(prescription.expiresAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Medications */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50/50">
            <span className="text-[14px]">Medications ({prescription.medications.length})</span>
          </div>
          <div className="divide-y">
            {prescription.medications.map((med: any) => {
              const remaining = med.qtyPrescribed - med.qtyDispensed;
              return (
                <div key={med.id} className="px-5 py-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[14px]">{med.name} <span className="text-muted-foreground">· {med.dosage}</span></p>
                      <p className="text-[12px] text-muted-foreground">{med.form}</p>
                    </div>
                    {med.qtyDispensed > 0 && remaining > 0 && (
                      <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 shrink-0">Partial</span>
                    )}
                    {remaining === 0 && (
                      <span className="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">Done</span>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-[12px] text-muted-foreground">{med.course}</div>
                  <div className="grid grid-cols-3 gap-2 text-[12px]">
                    {[
                      { label: 'Prescribed', value: med.qtyPrescribed, color: '' },
                      { label: 'Dispensed',  value: med.qtyDispensed,  color: 'text-blue-600' },
                      { label: 'Remaining',  value: remaining,          color: 'text-emerald-700' },
                    ].map(item => (
                      <div key={item.label} className="bg-gray-50 rounded-lg px-3 py-2">
                        <p className="text-muted-foreground">{item.label}</p>
                        <p className={`text-[14px] mt-0.5 ${item.color}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* QR Code */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50/50">
            <span className="text-[14px]">Patient QR Code</span>
          </div>
          <div className="px-5 py-6 flex flex-col items-center">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code" className="w-40 h-40 rounded-xl mb-4" />
            ) : (
              <div className="bg-gray-50 p-5 rounded-2xl mb-4">
                <QrCode className="size-28 text-[#111827]" />
              </div>
            )}
            <p className="text-[12px] text-muted-foreground mb-2">Sent to patient via SMS and email</p>
            <div className="flex items-center gap-2">
              <code className="text-[11px] text-muted-foreground bg-gray-50 px-2 py-1 rounded border font-mono max-w-[260px] truncate">{patientUrl}</code>
              <button onClick={copyUrl} className="text-muted-foreground hover:text-foreground transition-colors">
                <Copy className="size-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:justify-end">
          {canEdit && (
            <Button variant="outline" className="h-10" onClick={() => navigate(`/dashboard/doctor/edit/${prescription.id}`)}>
              <Edit className="size-4 mr-1.5" /> Edit Prescription
            </Button>
          )}
          {canCancel && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="h-10">
                  <XCircle className="size-4 mr-1.5" />
                  {prescription.status === 'partially_dispensed' ? 'Cancel Remaining' : 'Cancel Prescription'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="size-5 text-amber-500" /> Confirm Cancellation
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {prescription.status === 'partially_dispensed'
                      ? 'This cancels remaining undispensed items. Dispensed medications cannot be reversed.'
                      : 'This cancels the entire prescription. This action cannot be undone.'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-3">
                  <Label className="text-[12px]">Reason (optional)</Label>
                  <Textarea placeholder="Enter reason…" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="mt-1.5" rows={2} />
                </div>
                <AlertDialogFooter className="gap-2 sm:gap-0">
                  <AlertDialogCancel>Keep</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancel} className="bg-red-600 hover:bg-red-700">Confirm</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </div>
  );
}
