import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner@2.0.3';
import { getCurrentUser } from '../lib/auth';
import { prescriptionApi, dispenseApi } from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import {
  QrCode, Search, User, Phone, Mail, CheckCircle, AlertCircle, ArrowRight,
  ScanLine, Clock, ShieldAlert, Pill, ChevronRight, Package,
  CheckCircle2, XCircle, Timer, Hash, Activity, Zap
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from './ui/dialog';
import { Link } from 'react-router';

export default function PharmacistPortal() {
  const user = getCurrentUser();
  const [prescriptionId, setPrescriptionId] = useState('');
  const [currentPrescription, setCurrentPrescription] = useState<any>(null);
  const [dispensingQuantities, setDispensingQuantities] = useState<Record<string, number>>({});
  const [showDispenseDialog, setShowDispenseDialog] = useState(false);
  const [loadingRx, setLoadingRx] = useState(false);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [dispensing, setDispensing] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    dispenseApi.history().then(res => setHistory(res.events)).catch(() => {});
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const todayHistory = history.filter(d => {
    const t = new Date(d.timestamp);
    return t.toDateString() === new Date().toDateString();
  });
  const totalUnitsToday = todayHistory.reduce((s: number, d: any) =>
    s + d.items.reduce((a: number, i: any) => a + i.qtyDispensed, 0), 0);

  const startScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      stream.getTracks().forEach(t => t.stop());
      setScanning(true);
    } catch (err) {
      toast.error('Cannot access camera. Please allow camera access in browser settings.');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { scannerRef.current.stop(); } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleVideoRef = async (video: HTMLVideoElement | null) => {
    if (!video || !scanning) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      video.srcObject = stream;
      scannerRef.current = { stop: () => stream.getTracks().forEach(t => t.stop()) } as any;

      const { BrowserQRCodeReader } = await import('@zxing/browser');
      const reader = new BrowserQRCodeReader();
      const scanLoop = async () => {
        if (!scanning) return;
        try {
          const result = await reader.decodeOnceFromVideoElement(video);
          const text = result.getText();
          const match = text.match(/\/patient\/([^\/\s]+)$/);
          const id = match ? match[1] : text.replace(/^Rx-/i, '').trim();
          stopScanner();
          setPrescriptionId(id);
          setLoadingRx(true);
          try {
            const res = await prescriptionApi.get(id);
            const rx = res.prescription;
            if (rx.status === 'cancelled') { toast.error('Prescription cancelled'); return; }
            if (rx.status === 'expired')   { toast.error('Prescription expired');   return; }
            setCurrentPrescription(rx);
            const q: Record<string, number> = {};
            rx.medications.forEach((med: any) => { q[med.id] = med.qtyPrescribed - med.qtyDispensed; });
            setDispensingQuantities(q);
            toast.success('Prescription loaded');
          } catch (err: any) {
            toast.error(err.message || 'Prescription not found');
          } finally {
            setLoadingRx(false);
          }
        } catch { scanLoop(); }
      };
      scanLoop();
    } catch {
      toast.error('Camera error. Please enter ID manually.');
      setScanning(false);
    }
  };

  const handleScanQR = async () => {
    if (!prescriptionId.trim()) { toast.error('Please enter a prescription ID'); return; }
    setLoadingRx(true);
    try {
      const cleanId = prescriptionId.trim().replace(/^Rx-/i, '');
      const res = await prescriptionApi.get(cleanId);
      const rx = res.prescription;

      if (rx.status === 'dispensed')  { toast.info('Fully dispensed already'); }
      if (rx.status === 'cancelled')  { toast.error('Prescription cancelled'); setLoadingRx(false); return; }
      if (rx.status === 'expired')    { toast.error('Prescription expired');   setLoadingRx(false); return; }

      setCurrentPrescription(rx);
      const q: Record<string, number> = {};
      rx.medications.forEach((med: any) => {
        q[med.id] = med.qtyPrescribed - med.qtyDispensed;
      });
      setDispensingQuantities(q);
      toast.success('Prescription loaded');
    } catch (err: any) {
      toast.error(err.message || 'Prescription not found');
    } finally {
      setLoadingRx(false);
    }
  };

  const handleDispenseClick = () => {
    if (!currentPrescription) return;
    if (!Object.values(dispensingQuantities).some(q => q > 0)) {
      toast.error('Enter quantities to dispense'); return;
    }
    setShowDispenseDialog(true);
  };

  const handleConfirmDispense = async () => {
    if (!currentPrescription) return;
    setDispensing(true);
    try {
      const items = currentPrescription.medications
        .filter((med: any) => (dispensingQuantities[med.id] || 0) > 0)
        .map((med: any) => ({
          medicationId: med.id,
          qtyDispensed: dispensingQuantities[med.id] || 0,
        }));

      const res = await dispenseApi.dispense(currentPrescription.id, items);
      const total = items.reduce((s: number, i: any) => s + i.qtyDispensed, 0);
      toast.success(`Dispensed ${total} units successfully`);

      // Обновляем историю
      dispenseApi.history().then(r => setHistory(r.events)).catch(() => {});

      setShowDispenseDialog(false);
      setCurrentPrescription(null);
      setPrescriptionId('');
      setDispensingQuantities({});
    } catch (err: any) {
      toast.error(err.message || 'Dispense failed');
    } finally {
      setDispensing(false);
    }
  };

  const updateDispensingQuantity = (medId: string, value: string) => {
    const qty = parseInt(value) || 0;
    const med = currentPrescription?.medications.find((m: any) => m.id === medId);
    const remaining = med ? med.qtyPrescribed - med.qtyDispensed : 0;
    if (med && qty > remaining) { toast.error(`Maximum: ${remaining}`); return; }
    setDispensingQuantities({ ...dispensingQuantities, [medId]: qty });
  };

  const dispenseFull = () => {
    if (!currentPrescription) return;
    const q: Record<string, number> = {};
    currentPrescription.medications.forEach((med: any) => {
      q[med.id] = med.qtyPrescribed - med.qtyDispensed;
    });
    setDispensingQuantities(q);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string; label: string; icon: any }> = {
      active:              { className: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Active',             icon: CheckCircle2 },
      created:             { className: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Active',             icon: CheckCircle2 },
      partially_dispensed: { className: 'bg-amber-50 text-amber-700 border-amber-200',       label: 'Partially Dispensed', icon: Timer },
      dispensed:           { className: 'bg-blue-50 text-blue-600 border-blue-200',           label: 'Fully Dispensed',   icon: CheckCircle2 },
      cancelled:           { className: 'bg-red-50 text-red-600 border-red-200',              label: 'Cancelled',         icon: XCircle },
      expired:             { className: 'bg-gray-100 text-gray-500 border-gray-200',          label: 'Expired',           icon: Clock },
    };
    const c = config[status] || { className: '', label: status, icon: Clock };
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border ${c.className}`}>
        <Icon className="size-3" />{c.label}
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto space-y-6">

      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#111827] via-[#1a2332] to-[#0f172a] rounded-2xl p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-cyan-400 text-[12px] tracking-wide uppercase">Pharmacy Station</span>
            </div>
            <h1 className="text-white text-[22px] sm:text-[26px]">
              {greeting}, <span className="text-cyan-400">{user?.fullName}</span>
            </h1>
            <p className="text-gray-400 text-[13px] mt-1.5 max-w-md">
              You've dispensed <span className="text-white">{totalUnitsToday} units</span> across <span className="text-cyan-400">{todayHistory.length} prescriptions</span> today
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Total Dispenses',  value: history.length,      icon: Package,  iconBg: 'bg-slate-100',   iconColor: 'text-slate-600',  gradient: 'from-slate-500 to-slate-700' },
          { label: "Today's Dispenses", value: todayHistory.length, icon: Zap,      iconBg: 'bg-cyan-100',    iconColor: 'text-cyan-600',   gradient: 'from-cyan-500 to-cyan-700' },
          { label: 'Units Today',       value: totalUnitsToday,     icon: Pill,     iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', gradient: 'from-emerald-500 to-emerald-700' },
          { label: 'Unique Rx',         value: new Set(history.map((d: any) => d.prescription?.id)).size, icon: User, iconBg: 'bg-purple-100', iconColor: 'text-purple-600', gradient: 'from-purple-500 to-purple-700' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="group bg-white rounded-xl border border-gray-100 p-4 sm:p-5 hover:shadow-lg hover:border-gray-200 transition-all duration-300 hover:-translate-y-0.5 cursor-default">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`size-5 ${s.iconColor}`} />
                </div>
                <div className={`w-8 h-1 rounded-full bg-gradient-to-r ${s.gradient} opacity-60`} />
              </div>
              <p className="text-[28px] sm:text-[32px] tracking-tight text-gray-900">{s.value}</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[1fr,340px] gap-5">
        <div className="space-y-5">

          {/* Scanner */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center">
                  <ScanLine className="size-4 text-cyan-600" />
                </div>
                <div>
                  <p className="text-[14px] text-gray-800">Prescription Lookup</p>
                  <p className="text-[11px] text-muted-foreground">Scan QR code or enter ID manually</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              <div className="flex gap-2 mb-5">
                <div className="relative flex-1">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <Input
                    placeholder="Enter prescription ID…"
                    value={prescriptionId}
                    onChange={(e) => setPrescriptionId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleScanQR()}
                    className="h-11 pl-10 bg-gray-50 border-gray-200 rounded-xl text-[13px] focus:border-cyan-300 transition-all"
                  />
                </div>
                <Button onClick={handleScanQR} disabled={loadingRx} className="h-11 px-5 rounded-xl bg-cyan-600 hover:bg-cyan-700 transition-all">
                  {loadingRx
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><Search className="size-4 mr-1.5" /> Load</>
                  }
                </Button>
              </div>

              {!currentPrescription && (
                <div className="border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden bg-gray-50/30">
                  {scanning ? (
                    <div className="relative bg-black rounded-xl overflow-hidden" style={{minHeight: '300px'}}>
                      <video
                        ref={handleVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                        style={{minHeight: '300px'}}
                      />
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-52 h-52 border-2 border-cyan-400 rounded-xl" />
                      </div>
                      <p className="absolute bottom-4 left-0 right-0 text-center text-white text-[12px]">Point at QR code</p>
                      <button
                        onClick={stopScanner}
                        className="absolute top-3 right-3 bg-white/90 text-[12px] text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-white transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="py-10 flex flex-col items-center gap-4">
                      <div className="w-20 h-20 rounded-2xl bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                        <QrCode className="size-10 text-gray-300" />
                      </div>
                      <span className="text-[13px] text-gray-500">Point camera at QR code or enter ID manually</span>
                      <Button
                        onClick={startScanner}
                        variant="outline"
                        className="h-10 px-5 rounded-xl border-cyan-200 text-cyan-600 hover:bg-cyan-50 transition-all"
                      >
                        <ScanLine className="size-4 mr-2" /> Open Camera
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Loaded prescription */}
          {currentPrescription && (
            <>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center shadow-sm">
                      <span className="text-[11px] text-white font-mono">Rx</span>
                    </div>
                    <div>
                      <span className="font-mono text-[14px] text-gray-800">Rx-{currentPrescription.id}</span>
                      <p className="text-[12px] text-muted-foreground">{currentPrescription.doctor?.fullName}</p>
                    </div>
                  </div>
                  {getStatusBadge(currentPrescription.status)}
                </div>

                <div className="px-5 py-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldAlert className="size-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-[13px] text-amber-800">Verify patient identity before dispensing</p>
                    <p className="text-[12px] text-amber-600 mt-0.5">Check government-issued ID — IIN must match</p>
                  </div>
                </div>

                <div className="px-5 py-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    {[
                      { icon: User,  label: 'Patient', value: currentPrescription.patient.fullName, mono: false },
                      { icon: Hash,  label: 'IIN',     value: currentPrescription.patient.iin,      mono: true },
                      { icon: Phone, label: 'Phone',   value: currentPrescription.patient.phone,    mono: false },
                      { icon: Mail,  label: 'Email',   value: currentPrescription.patient.email,    mono: false },
                    ].map(item => {
                      const Icon = item.icon;
                      return (
                        <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/80 border border-gray-100">
                          <Icon className="size-4 text-gray-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-wider text-gray-400">{item.label}</p>
                            <p className={`text-[13px] text-gray-800 truncate ${item.mono ? 'font-mono' : ''}`}>{item.value}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Medications */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <Pill className="size-4 text-emerald-600" />
                    </div>
                    <span className="text-[14px] text-gray-800">Medications to Dispense</span>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 text-[12px] rounded-lg border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={dispenseFull}>
                    <Zap className="size-3 mr-1" /> Fill All
                  </Button>
                </div>

                <div className="divide-y divide-gray-100">
                  {currentPrescription.medications.map((med: any, idx: number) => {
                    const remaining = med.qtyPrescribed - med.qtyDispensed;
                    return (
                      <div key={med.id} className="px-5 py-5 space-y-4 hover:bg-gray-50/30 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-[12px] text-gray-500 shrink-0 mt-0.5">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="text-[14px] text-gray-800">{med.name} <span className="text-gray-400">·</span> <span className="text-muted-foreground">{med.dosage}</span></p>
                              <p className="text-[12px] text-muted-foreground mt-0.5">{med.form} — {med.course}</p>
                            </div>
                          </div>
                          {remaining === 0 && (
                            <span className="flex items-center gap-1 text-[11px] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shrink-0">
                              <CheckCircle className="size-3" /> Done
                            </span>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>Dispensing progress</span>
                            <span>{med.qtyDispensed} / {med.qtyPrescribed}</span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500"
                              style={{ width: `${(med.qtyDispensed / med.qtyPrescribed) * 100}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-[12px]">
                          {[
                            { label: 'Prescribed', value: med.qtyPrescribed, bg: 'bg-gray-50',    color: 'text-gray-700' },
                            { label: 'Dispensed',  value: med.qtyDispensed,  bg: 'bg-blue-50',    color: 'text-blue-600' },
                            { label: 'Remaining',  value: remaining,          bg: 'bg-emerald-50', color: 'text-emerald-700' },
                          ].map(item => (
                            <div key={item.label} className={`${item.bg} rounded-xl px-3 py-2.5 text-center`}>
                              <p className="text-muted-foreground text-[10px] uppercase tracking-wider">{item.label}</p>
                              <p className={`text-[16px] mt-0.5 ${item.color}`}>{item.value}</p>
                            </div>
                          ))}
                        </div>

                        {remaining > 0 && (
                          <div className="flex items-center gap-3 p-3 bg-cyan-50/50 rounded-xl border border-cyan-100">
                            <Label className="text-[12px] text-cyan-700 shrink-0">Qty to dispense:</Label>
                            <Input
                              type="number" min="0" max={remaining}
                              value={dispensingQuantities[med.id] || 0}
                              onChange={(e) => updateDispensingQuantity(med.id, e.target.value)}
                              className="h-9 w-24 bg-white border-cyan-200 rounded-lg text-center text-[14px]"
                            />
                            <span className="text-[12px] text-cyan-600">of {remaining} remaining</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50">
                  <Button
                    className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all"
                    onClick={handleDispenseClick}
                    disabled={currentPrescription.medications.every((m: any) => (m.qtyPrescribed - m.qtyDispensed) === 0)}
                  >
                    Confirm Dispensing <ArrowRight className="size-4 ml-2" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="order-first lg:order-last space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-[13px] text-gray-500 uppercase tracking-wider mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link to="/dashboard/profile" className="block">
                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-purple-50 transition-all group cursor-pointer border border-transparent hover:border-purple-100">
                  <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                    <User className="size-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-gray-800">Profile</p>
                    <p className="text-[11px] text-muted-foreground">Account settings</p>
                  </div>
                  <ChevronRight className="size-4 text-gray-300 group-hover:text-purple-500 transition-colors" />
                </div>
              </Link>
            </div>
          </div>

          {/* Recent Dispenses */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm lg:sticky lg:top-6">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Clock className="size-4 text-amber-600" />
                </div>
                <span className="text-[14px] text-gray-800">Recent Dispenses</span>
              </div>
            </div>
            <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
              {history.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                    <Package className="size-5 text-gray-300" />
                  </div>
                  <p className="text-[13px] text-muted-foreground">No recent activity</p>
                </div>
              ) : (
                history.slice(0, 10).map((event: any) => {
                  const totalQty = event.items.reduce((s: number, i: any) => s + i.qtyDispensed, 0);
                  return (
                    <div key={event.id} className="px-5 py-3.5 hover:bg-gray-50/60 transition-colors cursor-default">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[12px] bg-gray-100 px-2 py-0.5 rounded-md text-gray-600">
                          Rx-{event.prescription?.id || event.prescriptionId}
                        </span>
                        <span className="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{totalQty} units</span>
                      </div>
                      {event.prescription?.patient && (
                        <p className="text-[12px] text-gray-700">{event.prescription.patient.fullName}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(event.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={showDispenseDialog} onOpenChange={setShowDispenseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="size-4 text-emerald-600" />
              </div>
              Confirm Dispensing
            </DialogTitle>
            <DialogDescription>Review and verify before confirming</DialogDescription>
          </DialogHeader>

          {currentPrescription && (
            <div className="py-2">
              <div className="bg-gray-50 rounded-xl p-3 mb-3 flex items-center gap-3">
                <User className="size-4 text-gray-400" />
                <div>
                  <p className="text-[13px] text-gray-800">{currentPrescription.patient.fullName}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{currentPrescription.patient.iin}</p>
                </div>
              </div>
              <div className="space-y-2">
                {currentPrescription.medications.map((med: any) => {
                  const qty = dispensingQuantities[med.id] || 0;
                  if (qty === 0) return null;
                  return (
                    <div key={med.id} className="flex justify-between items-center py-2.5 px-3 border border-gray-100 rounded-xl">
                      <div>
                        <span className="text-[13px] text-gray-800">{med.name}</span>
                        <span className="text-[12px] text-muted-foreground ml-1">({med.dosage})</span>
                      </div>
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100">{qty} units</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl px-4 py-3.5 flex items-start gap-3">
            <AlertCircle className="size-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-[12px] text-amber-700">Ensure patient identity has been verified with government-issued ID</p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDispenseDialog(false)} className="rounded-lg">Cancel</Button>
            <Button onClick={handleConfirmDispense} disabled={dispensing} className="rounded-lg bg-emerald-600 hover:bg-emerald-700 shadow-sm">
              {dispensing
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><CheckCircle2 className="size-4 mr-1.5" /> Confirm & Dispense</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
