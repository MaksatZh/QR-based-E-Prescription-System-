import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { publicApi } from '../lib/api';
import {
  QrCode, CheckCircle, XCircle, AlertCircle, Clock
} from 'lucide-react';

export default function PatientView() {
  const { prescriptionId } = useParams();
  const [prescription, setPrescription] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!prescriptionId) return;
    Promise.all([
      publicApi.getPrescription(prescriptionId),
      publicApi.getQR(prescriptionId),
    ]).then(([rx, qr]) => {
      setPrescription(rx);
      setQrDataUrl(qr.qrDataUrl);
    }).catch(() => {
      setNotFound(true);
    }).finally(() => setLoading(false));
  }, [prescriptionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6f8]">
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !prescription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6f8] p-4">
        <div className="bg-white rounded-2xl border max-w-sm w-full p-8 text-center shadow-sm">
          <XCircle className="size-12 mx-auto text-red-300 mb-4" />
          <h2 className="text-[18px] mb-1">Prescription Not Found</h2>
          <p className="text-[13px] text-muted-foreground">The prescription ID doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const statusMap: Record<string, { icon: any; color: string; label: string; bg: string; text: string }> = {
    active:              { icon: CheckCircle,  color: 'text-emerald-600', label: 'Active',             bg: 'bg-emerald-50 border-emerald-200', text: 'Ready to be dispensed at any pharmacy' },
    created:             { icon: CheckCircle,  color: 'text-emerald-600', label: 'Active',             bg: 'bg-emerald-50 border-emerald-200', text: 'Ready to be dispensed at any pharmacy' },
    partially_dispensed: { icon: Clock,        color: 'text-amber-600',   label: 'Partially Dispensed', bg: 'bg-amber-50 border-amber-200',   text: 'Some medications collected. Remaining items available.' },
    dispensed:           { icon: CheckCircle,  color: 'text-blue-600',    label: 'Fully Dispensed',   bg: 'bg-blue-50 border-blue-200',       text: 'All medications have been collected.' },
    cancelled:           { icon: XCircle,      color: 'text-red-500',     label: 'Cancelled',         bg: 'bg-red-50 border-red-200',         text: 'Cancelled by your doctor.' },
    expired:             { icon: AlertCircle,  color: 'text-gray-500',    label: 'Expired',           bg: 'bg-gray-50 border-gray-200',       text: 'Please consult your doctor for a new prescription.' },
  };

  const status = statusMap[prescription.status] || statusMap.active;
  const StatusIcon = status.icon;
  const daysRemaining = Math.ceil((new Date(prescription.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="min-h-screen bg-[#f5f6f8] py-5 px-4 sm:py-8">
      <div className="max-w-[480px] mx-auto space-y-4">

        {/* Header */}
        <div className="text-center py-2">
          <div className="inline-flex items-center gap-2 mb-1">
            <div className="relative w-7 h-7">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/40 to-cyan-500/30 rounded-md rotate-12 scale-95" />
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/60 to-emerald-600/50 rounded-md rotate-6 scale-[0.97]" />
              <div className="relative w-full h-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-700 rounded-md flex items-center justify-center">
                <svg width="15" height="15" viewBox="0 0 26 26" fill="none">
                  <path d="M5 13.5C5 9.5 7.5 7 11 7C14.5 7 16.5 9.5 16.5 13H7C7 16 9 18 12 18C14 18 15.5 17 16 15.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="7" y1="13" x2="16" y2="13" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
                  <path d="M17 11L21 19M19.5 15L22 11" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <span className="text-[14px]">Electronic Prescription</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Digital Healthcare Platform</p>
        </div>

        {/* QR Code */}
        <div className="bg-white rounded-2xl border shadow-sm p-5 sm:p-6">
          <div className="flex flex-col items-center">
            <div className="bg-[#f5f6f8] p-6 sm:p-8 rounded-2xl mb-4">
              {qrDataUrl
                ? <img src={qrDataUrl} alt="QR Code" className="w-32 h-32 sm:w-40 sm:h-40" />
                : <QrCode className="size-32 sm:size-40 text-[#111827]" />
              }
            </div>
            <p className="font-mono text-[15px] tracking-wide">Rx-{prescription.id}</p>
            <p className="text-[12px] text-muted-foreground mt-1">Prescribed by {prescription.doctorName}</p>
            <p className="text-[12px] text-muted-foreground">
              {new Date(prescription.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Status */}
        <div className={`rounded-xl border px-4 py-3.5 flex items-start gap-3 ${status.bg}`}>
          <StatusIcon className={`size-5 ${status.color} shrink-0 mt-0.5`} />
          <div>
            <p className={`text-[14px] font-medium ${status.color}`}>{status.label}</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">{status.text}</p>
          </div>
        </div>

        {/* Validity */}
        {!['cancelled', 'expired'].includes(prescription.status) && (
          <div className="bg-white rounded-xl border px-4 py-3 flex items-center justify-between">
            <span className="text-[13px] text-muted-foreground">Valid until</span>
            <div className="text-right">
              <span className="text-[14px]">{new Date(prescription.expiresAt).toLocaleDateString()}</span>
              <span className={`text-[12px] ml-2 ${daysRemaining <= 7 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                ({daysRemaining}d left)
              </span>
            </div>
          </div>
        )}

        {/* Patient */}
        <div className="bg-white rounded-xl border px-4 py-3.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2">Patient</p>
          <span className="text-[14px]">{prescription.patient.fullName}</span>
        </div>

        {/* Medications */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50/50">
            <span className="text-[14px]">Medications ({prescription.medications.length})</span>
          </div>
          <div className="divide-y">
            {prescription.medications.map((med: any) => (
              <div key={med.id} className="px-4 py-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[14px]">{med.name}</p>
                    <p className="text-[12px] text-muted-foreground">{med.form} · {med.dosage}</p>
                  </div>
                  {med.qtyRemaining === 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                      <CheckCircle className="size-3" /> Collected
                    </span>
                  )}
                </div>
                <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-[12px] text-muted-foreground leading-relaxed">
                  {med.course}
                </div>
                <div className="grid grid-cols-3 gap-2 text-[12px]">
                  <div className="text-center bg-gray-50 rounded-lg py-2">
                    <p className="text-muted-foreground">Prescribed</p>
                    <p className="text-[15px] mt-0.5">{med.qtyPrescribed}</p>
                  </div>
                  <div className="text-center bg-gray-50 rounded-lg py-2">
                    <p className="text-muted-foreground">Collected</p>
                    <p className="text-[15px] mt-0.5 text-blue-600">{med.qtyDispensed}</p>
                  </div>
                  <div className="text-center bg-gray-50 rounded-lg py-2">
                    <p className="text-muted-foreground">Remaining</p>
                    <p className="text-[15px] mt-0.5 text-emerald-700">{med.qtyRemaining}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-xl border px-4 py-3.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2">How to use</p>
          <ul className="space-y-1.5 text-[12px] text-muted-foreground">
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span>Present this QR code at any registered pharmacy</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span>Bring your ID document for verification</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span>Medications can be collected partially over multiple visits</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span>Valid for 30 days from issue date</li>
          </ul>
        </div>

        <div className="text-center text-[11px] text-muted-foreground py-3">
          ePrescription · Digital Healthcare Platform
        </div>
      </div>
    </div>
  );
}
