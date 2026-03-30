import { useState, useEffect } from 'react';
import { getCurrentUser } from '../lib/auth';
import { prescriptionApi, dispenseApi, adminApi } from '../lib/api';
import { Clock, Package, FileText, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';

export default function RecentActivity() {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadActivity();
  }, []);

  const loadActivity = async () => {
    const items: any[] = [];
    try {
      if (user!.role === 'doctor') {
        const res = await prescriptionApi.list();
        res.prescriptions.forEach((p: any) => {
          items.push({
            id: `rx-${p.id}`,
            icon: FileText,
            iconColor: 'text-blue-500 bg-blue-500/10',
            title: `Created Rx-${p.id}`,
            detail: p.medications.map((m: any) => `${m.name} ${m.dosage}`).join(', '),
            meta: `Patient: ${p.patient.fullName}`,
            time: new Date(p.createdAt),
            prescriptionId: p.id,
          });
        });
      } else if (user!.role === 'pharmacist') {
        const res = await dispenseApi.history();
        res.events.forEach((e: any) => {
          items.push({
            id: e.id,
            icon: Package,
            iconColor: 'text-violet-500 bg-violet-500/10',
            title: `Dispensed Rx-${e.prescriptionId}`,
            detail: e.items.map((i: any) => `${i.item?.name || ''} ${i.item?.dosage || ''} × ${i.qtyDispensed}`).join(', '),
            meta: e.prescription?.patient ? `Patient: ${e.prescription.patient.fullName}` : '',
            time: new Date(e.timestamp),
            prescriptionId: e.prescriptionId,
          });
        });
      } else {
        const res = await adminApi.getAuditLogs({ limit: 50 });
        res.logs.forEach((l: any) => {
          items.push({
            id: l.id,
            icon: ShieldCheck,
            iconColor: 'text-slate-500 bg-slate-500/10',
            title: `${l.action.replace(/_/g, ' ')} — ${l.entityType}`,
            detail: l.details,
            meta: `By: ${l.user?.fullName || ''}`,
            time: new Date(l.timestamp),
            prescriptionId: l.prescriptionId,
          });
        });
      }

      items.sort((a, b) => b.time.getTime() - a.time.getTime());
      setActivity(items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (d: Date) => {
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  if (!user) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[800px] mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground mb-5 transition-colors">
        <ArrowLeft className="size-4" /> Back
      </button>

      <div className="mb-6">
        <h2 className="text-[20px]">Recent Activity</h2>
        <p className="text-muted-foreground text-[13px] mt-0.5">
          {loading ? 'Loading…' : `${activity.length} event${activity.length !== 1 ? 's' : ''} recorded`}
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border shadow-sm py-16 text-center">
          <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" />
        </div>
      ) : activity.length === 0 ? (
        <div className="bg-white rounded-xl border shadow-sm py-16 text-center">
          <Clock className="size-10 text-gray-200 mx-auto mb-3" />
          <p className="text-[13px] text-muted-foreground">No activity yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden divide-y divide-gray-100">
          {activity.map(item => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="px-5 py-4 hover:bg-gray-50/60 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.iconColor}`}>
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] text-gray-800">{item.title}</p>
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">{formatTime(item.time)}</span>
                    </div>
                    {item.detail && <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{item.detail}</p>}
                    {item.meta && <p className="text-[12px] text-muted-foreground mt-0.5">{item.meta}</p>}
                    {item.prescriptionId && (
                      <button
                        onClick={() => {
                          if (user.role === 'doctor') {
                            navigate(`/dashboard/doctor/prescription/${item.prescriptionId}`);
                          } else if (user.role === 'pharmacist') {
                            navigate(`/patient/${item.prescriptionId}`);
                          } else {
                            navigate(`/patient/${item.prescriptionId}`);
                          }
                        }}
                        className="text-[11px] text-emerald-600 hover:text-emerald-700 mt-1 transition-colors"
                      >
                        Click to view details →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
