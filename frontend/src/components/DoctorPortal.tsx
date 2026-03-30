import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { getCurrentUser } from '../lib/auth';
import { prescriptionApi } from '../lib/api';
import { Prescription } from '../lib/types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Plus, Search, Eye, Edit2, AlertCircle, Calendar, User as UserIcon,
  Clock, FileText, Activity, TrendingUp, Pill, ArrowRight, Sparkles,
  CheckCircle2, XCircle, Timer, ChevronRight
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from './ui/table';

export default function DoctorPortal() {
  const user = getCurrentUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    prescriptionApi.list().then(res => {
      setPrescriptions(res.prescriptions);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filterPrescriptions = (list: Prescription[], status?: string) => {
    let filtered = list;
    if (status) {
      filtered = filtered.filter(p => {
        if (status === 'active') return p.status === 'active' || p.status === 'created';
        if (status === 'in_progress') return p.status === 'partially_dispensed';
        if (status === 'completed') return p.status === 'dispensed';
        if (status === 'cancelled') return p.status === 'cancelled' || p.status === 'expired';
        return true;
      });
    }
    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.patient.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.patient.iin.includes(searchQuery) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string; label: string; icon: any }> = {
      active: { className: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Active', icon: CheckCircle2 },
      created: { className: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Active', icon: CheckCircle2 },
      partially_dispensed: { className: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Partial', icon: Timer },
      dispensed: { className: 'bg-blue-50 text-blue-600 border-blue-200', label: 'Completed', icon: CheckCircle2 },
      cancelled: { className: 'bg-red-50 text-red-600 border-red-200', label: 'Cancelled', icon: XCircle },
      expired: { className: 'bg-gray-100 text-gray-500 border-gray-200', label: 'Expired', icon: Clock },
    };
    const c = config[status] || { className: '', label: status, icon: Clock };
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border ${c.className}`}>
        <Icon className="size-3" />
        {c.label}
      </span>
    );
  };

  const getDaysRemaining = (expiresAt: Date) => {
    return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const activePrescriptions      = filterPrescriptions(prescriptions, 'active');
  const inProgressPrescriptions  = filterPrescriptions(prescriptions, 'in_progress');
  const completedPrescriptions   = filterPrescriptions(prescriptions, 'completed');
  const cancelledPrescriptions   = filterPrescriptions(prescriptions, 'cancelled');
  const allPrescriptions         = filterPrescriptions(prescriptions);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const stats = [
    { label: 'Total Prescriptions', value: prescriptions.length, icon: FileText, gradient: 'from-slate-500 to-slate-700', bgLight: 'bg-slate-50', iconBg: 'bg-slate-100', iconColor: 'text-slate-600' },
    { label: 'Active', value: activePrescriptions.length, icon: Activity, gradient: 'from-emerald-500 to-emerald-700', bgLight: 'bg-emerald-50', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
    { label: 'In Progress', value: inProgressPrescriptions.length, icon: TrendingUp, gradient: 'from-amber-500 to-amber-700', bgLight: 'bg-amber-50', iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
    { label: 'Completed', value: completedPrescriptions.length, icon: CheckCircle2, gradient: 'from-blue-500 to-blue-700', bgLight: 'bg-blue-50', iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
  ];

  const PrescriptionCard = ({ p }: { p: Prescription }) => {
    const days = getDaysRemaining(p.expiresAt);
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3 hover:shadow-md hover:border-gray-200 transition-all duration-200 group">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-mono text-muted-foreground tracking-wide">Rx-{p.id}</p>
            <p className="mt-0.5 text-[14px]">{p.patient.fullName}</p>
          </div>
          {getStatusBadge(p.status)}
        </div>
        <div className="flex items-center gap-4 text-[12px] text-muted-foreground">
          <span className="flex items-center gap-1"><UserIcon className="size-3" />{p.patient.iin}</span>
          <span className="flex items-center gap-1"><Pill className="size-3" />{p.medications.length} med(s)</span>
        </div>
        {!['cancelled', 'expired', 'dispensed'].includes(p.status) && (
          <div className="flex items-center gap-1.5 text-[12px]">
            {days <= 7 && <AlertCircle className="size-3 text-amber-500" />}
            <Clock className="size-3 text-muted-foreground" />
            <span className={days <= 7 ? 'text-amber-600' : 'text-muted-foreground'}>{days}d remaining</span>
          </div>
        )}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
          <Link to={`/dashboard/doctor/prescription/${p.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full h-8 text-[12px] border-gray-200">
              <Eye className="size-3 mr-1" /> View
            </Button>
          </Link>
          {['active', 'created', 'partially_dispensed'].includes(p.status) && (
            <Link to={`/dashboard/doctor/edit/${p.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full h-8 text-[12px] border-gray-200">
                <Edit2 className="size-3 mr-1" /> Edit
              </Button>
            </Link>
          )}
        </div>
      </div>
    );
  };

  const PrescriptionTable = ({ prescriptions }: { prescriptions: Prescription[] }) => {
    if (loading) {
      return (
        <div className="py-20 text-center text-muted-foreground text-[14px]">
          Loading prescriptions…
        </div>
      );
    }
    if (prescriptions.length === 0) {
      return (
        <div className="py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <FileText className="size-7 text-gray-300" />
          </div>
          <p className="text-muted-foreground text-[14px]">No prescriptions found</p>
          <p className="text-muted-foreground text-[12px] mt-1">Try adjusting your search or filters</p>
        </div>
      );
    }
    return (
      <>
        <div className="hidden lg:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                <TableHead className="w-[100px] text-[11px] uppercase tracking-wider text-gray-500">ID</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-gray-500">Patient</TableHead>
                <TableHead className="hidden xl:table-cell text-[11px] uppercase tracking-wider text-gray-500">IIN</TableHead>
                <TableHead className="text-center w-[80px] text-[11px] uppercase tracking-wider text-gray-500">Meds</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-gray-500">Status</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-gray-500">Expires</TableHead>
                <TableHead className="text-right w-[100px] text-[11px] uppercase tracking-wider text-gray-500">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prescriptions.map(p => {
                const days = getDaysRemaining(p.expiresAt);
                return (
                  <TableRow key={p.id} className="group hover:bg-emerald-50/30 transition-colors">
                    <TableCell className="font-mono text-[12px] text-muted-foreground">
                      <span className="bg-gray-100 px-2 py-0.5 rounded-md">Rx-{p.id}</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="text-[13px]">{p.patient.fullName}</span>
                        <p className="xl:hidden text-[11px] text-muted-foreground font-mono">{p.patient.iin}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell font-mono text-[12px] text-muted-foreground">{p.patient.iin}</TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-50 text-[13px] text-gray-600">{p.medications.length}</span>
                    </TableCell>
                    <TableCell>{getStatusBadge(p.status)}</TableCell>
                    <TableCell>
                      {['cancelled', 'expired', 'dispensed'].includes(p.status)
                        ? <span className="text-[12px] text-muted-foreground">—</span>
                        : <div className="flex items-center gap-1.5">
                            {days <= 7 && <AlertCircle className="size-3 text-amber-500 animate-pulse" />}
                            <span className={`text-[12px] ${days <= 7 ? 'text-amber-600' : 'text-muted-foreground'}`}>{days}d left</span>
                          </div>
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5 opacity-40 group-hover:opacity-100 transition-opacity">
                        <Link to={`/dashboard/doctor/prescription/${p.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-emerald-50 hover:text-emerald-600"><Eye className="size-4" /></Button>
                        </Link>
                        {['active', 'created', 'partially_dispensed'].includes(p.status) && (
                          <Link to={`/dashboard/doctor/edit/${p.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"><Edit2 className="size-4" /></Button>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="lg:hidden grid gap-3 p-4 sm:grid-cols-2">
          {prescriptions.map(p => <PrescriptionCard key={p.id} p={p} />)}
        </div>
      </>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#111827] via-[#1a2332] to-[#0f172a] rounded-2xl p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/8 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
        <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 text-[12px] tracking-wide uppercase">E-Prescription System</span>
            </div>
            <h1 className="text-white text-[22px] sm:text-[26px]">
              {greeting}, <span className="text-emerald-400">{user?.fullName?.split(' ').slice(0, 2).join(' ')}</span>
            </h1>
            <p className="text-gray-400 text-[13px] mt-1.5 max-w-md">
              You have <span className="text-white">{activePrescriptions.length} active</span> and <span className="text-amber-400">{inProgressPrescriptions.length} in-progress</span> prescriptions today
            </p>
          </div>
          <Link to="/dashboard/doctor/create">
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white h-10 px-5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all w-full sm:w-auto">
              <Plus className="size-4 mr-2" />
              New Prescription
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s) => {
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

      {/* Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-[13px] text-gray-500 uppercase tracking-wider mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <Link to="/dashboard/doctor/create" className="block">
              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-50 transition-all group cursor-pointer border border-transparent hover:border-emerald-100">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                  <Plus className="size-4 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] text-gray-800">New Prescription</p>
                  <p className="text-[11px] text-muted-foreground">Create a new e-prescription</p>
                </div>
                <ChevronRight className="size-4 text-gray-300 group-hover:text-emerald-500 transition-colors" />
              </div>
            </Link>
            <Link to="/dashboard/profile" className="block">
              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-purple-50 transition-all group cursor-pointer border border-transparent hover:border-purple-100">
                <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <UserIcon className="size-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] text-gray-800">Profile Settings</p>
                  <p className="text-[11px] text-muted-foreground">Manage your account</p>
                </div>
                <ChevronRight className="size-4 text-gray-300 group-hover:text-purple-500 transition-colors" />
              </div>
            </Link>
          </div>
        </div>

        {/* Recent prescriptions preview */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] text-gray-500 uppercase tracking-wider">Recent Prescriptions</h3>
          </div>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground text-[13px]">Loading…</div>
          ) : prescriptions.slice(0, 3).length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-[13px]">No prescriptions yet</div>
          ) : (
            <div className="space-y-3">
              {prescriptions.slice(0, 3).map(p => (
                <Link key={p.id} to={`/dashboard/doctor/prescription/${p.id}`}>
                  <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all group cursor-pointer border border-transparent hover:border-gray-100">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                      <Pill className="size-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] text-gray-800 truncate">{p.patient.fullName}</p>
                        <span className="text-[10px] font-mono text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded">Rx-{p.id}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {p.medications.map((m: any) => m.name).join(', ')}
                      </p>
                    </div>
                    {getStatusBadge(p.status)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-lg">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
        <Input
          placeholder="Search by patient name, IIN, or prescription ID…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-11 h-11 bg-white border-gray-200 rounded-xl text-[13px] shadow-sm focus:border-emerald-300 transition-all"
        />
      </div>

      {/* Tabs + Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <Tabs defaultValue="all">
          <div className="px-4 sm:px-5 py-3.5 border-b border-gray-100 overflow-x-auto bg-gray-50/50">
            <TabsList className="bg-white rounded-full h-9 p-1 gap-1 flex-nowrap shadow-sm border border-gray-100">
              {[
                { value: 'all', label: 'All', count: allPrescriptions.length },
                { value: 'active', label: 'Active', count: activePrescriptions.length },
                { value: 'in_progress', label: 'In Progress', count: inProgressPrescriptions.length },
                { value: 'completed', label: 'Completed', count: completedPrescriptions.length },
                { value: 'cancelled', label: 'Cancelled', count: cancelledPrescriptions.length },
              ].map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-full data-[state=active]:bg-[#111827] data-[state=active]:text-white data-[state=active]:shadow-sm px-3 text-[12px] whitespace-nowrap transition-all"
                >
                  {tab.label}
                  <span className="ml-1 data-[state=active]:text-gray-300 text-muted-foreground">({tab.count})</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <TabsContent value="all" className="mt-0"><PrescriptionTable prescriptions={allPrescriptions} /></TabsContent>
          <TabsContent value="active" className="mt-0"><PrescriptionTable prescriptions={activePrescriptions} /></TabsContent>
          <TabsContent value="in_progress" className="mt-0"><PrescriptionTable prescriptions={inProgressPrescriptions} /></TabsContent>
          <TabsContent value="completed" className="mt-0"><PrescriptionTable prescriptions={completedPrescriptions} /></TabsContent>
          <TabsContent value="cancelled" className="mt-0"><PrescriptionTable prescriptions={cancelledPrescriptions} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
