import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner@2.0.3';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { setCurrentUser } from '../lib/auth';
import { authApi } from '../lib/api';
import {
  Stethoscope, ShieldCheck, Package, Crown, Eye, EyeOff,
  QrCode, Clock, ArrowRight, Pill, Activity, Shield,
  Users, FileText, Fingerprint, Globe, CheckCircle2,
  Sparkles, Lock, Zap, Heart, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setActiveFeature(prev => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Show message if redirected due to session timeout or unauthorized
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const reason = params.get('reason')
    if (reason === 'session') {
      toast.error('Session expired due to inactivity. Please log in again.')
      window.history.replaceState({}, '', '/')
    } else if (reason === 'unauthorized') {
      toast.error('Your session has ended. Please log in again.')
      window.history.replaceState({}, '', '/')
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { token, user } = await authApi.login(email, password);
      setCurrentUser(user, token);
      toast.success(`Welcome, ${user.fullName}!`);

      switch (user.role) {
        case 'doctor': navigate('/dashboard/doctor'); break;
        case 'pharmacist': navigate('/dashboard/pharmacist'); break;
        case 'admin':
        case 'super_admin': navigate('/dashboard/admin'); break;
        default: navigate('/dashboard/doctor');
      }
    } catch (err: any) {
      toast.error(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (role: 'doctor' | 'pharmacist' | 'admin' | 'superadmin') => {
    const creds: Record<string, { email: string; password: string }> = {
      doctor:      { email: 'doctor@example.kz',      password: 'password123' },
      pharmacist:  { email: 'pharmacist@example.kz',  password: 'password123' },
      admin:       { email: 'admin@example.kz',        password: 'password123' },
      superadmin:  { email: 'superadmin@example.kz',  password: 'password123' },
    };
    setEmail(creds[role].email);
    setPassword(creds[role].password);
  };

  const features = [
    { icon: QrCode, title: 'QR Verification', desc: 'Instant prescription verification via secure QR codes', color: 'emerald' },
    { icon: Pill, title: 'Smart Dispensing', desc: 'Partial dispensing with real-time inventory tracking', color: 'cyan' },
    { icon: Clock, title: 'Auto-Expiration', desc: '30-day validity with automated status management', color: 'amber' },
    { icon: Lock, title: 'End-to-End Encryption', desc: 'All data protected with enterprise-grade encryption', color: 'violet' },
  ];

  const demoAccounts = [
    { key: 'doctor' as const, icon: Stethoscope, label: 'Doctor', desc: 'Create & manage prescriptions', gradient: 'from-blue-500 to-blue-700', bg: 'bg-blue-50', border: 'hover:border-blue-300', iconColor: 'text-blue-600' },
    { key: 'pharmacist' as const, icon: Package, label: 'Pharmacist', desc: 'Scan QR & dispense medications', gradient: 'from-violet-500 to-violet-700', bg: 'bg-violet-50', border: 'hover:border-violet-300', iconColor: 'text-violet-600' },
    { key: 'admin' as const, icon: ShieldCheck, label: 'Admin', desc: 'Manage users & view audit logs', gradient: 'from-slate-500 to-slate-700', bg: 'bg-slate-50', border: 'hover:border-slate-300', iconColor: 'text-slate-600' },
    { key: 'superadmin' as const, icon: Crown, label: 'Super Admin', desc: 'Full system access & control', gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', border: 'hover:border-amber-300', iconColor: 'text-amber-600' },
  ];

  const stats = [
    { value: '4', label: 'User Roles', icon: Users },
    { value: 'QR Code', label: 'Secure access', icon: QrCode },
    { value: '30 days', label: 'Rx Validity', icon: Clock },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">

      {/* ====== LEFT PANEL — Immersive Dark Branding ====== */}
      <div className="hidden lg:flex lg:w-[520px] xl:w-[560px] 2xl:w-[600px] relative overflow-hidden shrink-0" style={{
        background: 'linear-gradient(165deg, #030712 0%, #0a0f1a 20%, #0d1425 40%, #111d2e 60%, #0c1220 80%, #050a12 100%)'
      }}>
        <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-[0.07]" style={{
          background: 'radial-gradient(circle, #10b981 0%, transparent 70%)'
        }} />
        <div className="absolute bottom-[10%] left-[-10%] w-[350px] h-[350px] rounded-full opacity-[0.05]" style={{
          background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)'
        }} />
        <div className="absolute top-[40%] right-[10%] w-[250px] h-[250px] rounded-full opacity-[0.04]" style={{
          background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)'
        }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} />

        <div className="relative z-10 flex flex-col justify-between p-8 xl:p-10 2xl:p-12 w-full">
          <div>
            <div className={`flex items-center gap-4 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
              <div className="relative">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/40 to-cyan-500/30 rounded-xl rotate-12 scale-95" />
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/60 to-emerald-600/50 rounded-xl rotate-6 scale-[0.97]" />
                  <div className="relative w-full h-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                      <path d="M5 13.5C5 9.5 7.5 7 11 7C14.5 7 16.5 9.5 16.5 13H7C7 16 9 18 12 18C14 18 15.5 17 16 15.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                      <line x1="7" y1="13" x2="16" y2="13" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
                      <path d="M17 11L21 19M19.5 15L22 11" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)] border-2 border-[#0a0f1a]" />
              </div>
              <div>
                <p className="text-white text-[17px] tracking-tight">
                  <span className="bg-gradient-to-r from-emerald-300 to-emerald-400 bg-clip-text text-transparent">e</span>Prescription
                </p>
                <p className="text-gray-500 text-[11px] tracking-wide">Digital Healthcare Platform</p>
              </div>
            </div>
          </div>

          <div className={`space-y-10 -mt-6 transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-px w-8 bg-gradient-to-r from-emerald-500 to-transparent" />
                <span className="text-emerald-400 text-[11px] tracking-[0.25em] uppercase">Digital Healthcare Platform</span>
              </div>
              <h1 className="text-[32px] xl:text-[36px] 2xl:text-[40px] text-white leading-[1.15] tracking-tight">
                The future of<br />
                <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                  prescription management
                </span>
              </h1>
              <p className="text-gray-400 mt-4 text-[14px] leading-relaxed max-w-[380px]">
                Connecting doctors, pharmacists, and patients through a unified, secure, and intelligent e-prescription ecosystem.
              </p>
            </div>

            <div className="space-y-3">
              {features.map((f, i) => {
                const Icon = f.icon;
                const isActive = i === activeFeature;
                const colorClasses: Record<string, { dot: string; bg: string; text: string; border: string }> = {
                  emerald: { dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
                  cyan: { dot: 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]', bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
                  amber: { dot: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
                  violet: { dot: 'bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.6)]', bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
                };
                const cc = colorClasses[f.color];
                return (
                  <button
                    key={i}
                    onClick={() => setActiveFeature(i)}
                    className={`w-full flex items-center gap-4 p-3.5 rounded-xl transition-all duration-500 text-left cursor-pointer border ${
                      isActive
                        ? `${cc.bg} ${cc.border} scale-[1.02]`
                        : 'border-transparent hover:bg-white/[0.03] hover:border-white/[0.05]'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500 ${
                      isActive ? `${cc.bg} ${cc.text}` : 'bg-white/[0.04] text-gray-500'
                    }`}>
                      <Icon className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] transition-colors duration-500 ${isActive ? 'text-white' : 'text-gray-400'}`}>
                        {f.title}
                      </p>
                      <p className={`text-[12px] mt-0.5 transition-all duration-500 ${
                        isActive ? 'text-gray-400 max-h-10 opacity-100' : 'text-gray-600 max-h-0 opacity-0 overflow-hidden'
                      }`}>
                        {f.desc}
                      </p>
                    </div>
                    {isActive && (
                      <div className={`w-1.5 h-8 rounded-full ${cc.dot} shrink-0`} />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2.5">
              {stats.map((s, i) => {
                const Icon = s.icon;
                const glowColors = ['rgba(52,211,153,0.15)', 'rgba(34,211,238,0.15)', 'rgba(139,92,246,0.15)'];
                const iconColors = ['text-emerald-400', 'text-cyan-400', 'text-violet-400'];
                const borderColors = ['border-emerald-500/15', 'border-cyan-500/15', 'border-violet-500/15'];
                return (
                  <div
                    key={i}
                    className={`flex-1 relative group cursor-default rounded-2xl border ${borderColors[i]} p-4 text-center transition-all duration-300 hover:scale-[1.03]`}
                    style={{ background: 'rgba(255,255,255,0.02)' }}
                  >
                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{
                      background: `radial-gradient(circle at 50% 50%, ${glowColors[i]}, transparent 70%)`
                    }} />
                    <div className="relative">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center mx-auto mb-2.5">
                        <Icon className="size-4 text-gray-500" />
                      </div>
                      <p className="text-white text-[20px] tracking-tight">{s.value}</p>
                      <p className="text-gray-500 text-[9px] uppercase tracking-[0.2em] mt-1">{s.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={`flex items-center justify-between transition-all duration-700 delay-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <p className="text-[11px] text-gray-600">Digital Healthcare · 2026</p>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              All systems operational
            </div>
          </div>
        </div>
      </div>

      {/* ====== RIGHT PANEL — Login Form ====== */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #111827 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }} />

        <div className={`relative z-10 w-full max-w-[420px] transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

          <div className="lg:hidden mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-700 rounded-lg flex items-center justify-center">
                  <svg width="22" height="22" viewBox="0 0 26 26" fill="none">
                    <path d="M5 13.5C5 9.5 7.5 7 11 7C14.5 7 16.5 9.5 16.5 13H7C7 16 9 18 12 18C14 18 15.5 17 16 15.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="7" y1="13" x2="16" y2="13" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
                    <path d="M17 11L21 19M19.5 15L22 11" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              <div>
                <p className="text-[15px]"><span className="text-emerald-600">e</span>Prescription</p>
                <p className="text-[11px] text-muted-foreground">Digital Healthcare Platform</p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Sparkles className="size-4 text-emerald-600" />
              </div>
              <span className="text-[12px] text-emerald-600 tracking-wide">Secure Portal</span>
            </div>
            <h2 className="text-[26px] sm:text-[30px] tracking-tight text-gray-900">Welcome back</h2>
            <p className="text-muted-foreground text-[14px] mt-1.5">
              Sign in to access the healthcare management system
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[12px] text-gray-600">Email address</Label>
              <div className="relative group">
                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.kz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 pl-11 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-emerald-300 transition-all text-[14px]"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[12px] text-gray-600">Password</Label>
                <Link to="/forgot-password" className="text-[12px] text-emerald-600 hover:text-emerald-700 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 pl-11 pr-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-emerald-300 transition-all text-[14px]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-0.5"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-lg shadow-emerald-500/20 transition-all text-[14px]"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign in <ArrowRight className="size-4" />
                </span>
              )}
            </Button>

          </form>

          <div className="mt-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent flex-1" />
              <span className="text-[11px] text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-1.5">
                <Zap className="size-3" /> Quick Demo Access
              </span>
              <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent flex-1" />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {demoAccounts.map(({ key, icon: Icon, label, desc, gradient, bg, border }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => fillCredentials(key)}
                  className={`relative group flex items-center gap-3 p-3.5 rounded-xl border border-gray-150 ${border} hover:shadow-lg transition-all duration-300 text-left hover:-translate-y-0.5 overflow-hidden bg-white`}
                >
                  <div className={`absolute inset-0 ${bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}>
                      <Icon className="size-4 text-white" />
                    </div>
                  </div>
                  <div className="relative min-w-0 flex-1">
                    <p className="text-[13px] text-gray-800">{label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{desc}</p>
                  </div>
                  <ChevronRight className="relative size-3.5 text-gray-300 group-hover:text-gray-500 transition-all shrink-0" />
                </button>
              ))}
            </div>
          </div>


        </div>
      </div>
    </div>
  );
}
