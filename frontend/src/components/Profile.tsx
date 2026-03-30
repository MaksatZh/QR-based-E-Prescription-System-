import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';
import { getCurrentUser, setCurrentUser, logout } from '../lib/auth';
import { authApi } from '../lib/api';
import { useNavigate } from 'react-router';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Save, Upload, Lock, Mail, Phone, ShieldCheck, ArrowLeft, CheckCircle2, Info,
  Clock, Smartphone, QrCode, Copy, Shield, AlertTriangle, History, KeyRound,
  Eye, EyeOff, Fingerprint, Download, RefreshCw, LogOut,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from './ui/dialog';

type VerifyTarget = 'email' | 'phone' | null;

interface ProfileAuditEntry {
  id: string; action: string; field: string;
  oldValue?: string; newValue?: string;
  timestamp: Date; ip: string; device: string;
}

function getDeviceInfo(): string {
  const ua = navigator.userAgent;
  let browser = 'Browser';
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edg')) browser = 'Edge';
  let os = 'Unknown OS';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  return `${browser} / ${os}`;
}
const CURRENT_DEVICE = getDeviceInfo();

const INITIAL_AUDIT: ProfileAuditEntry[] = [
  { id: 'pa1', action: 'LOGIN', field: 'session', timestamp: new Date(), ip: 'Current session', device: CURRENT_DEVICE },
];

const MOCK_TOTP_SECRET = 'JBSWY3DPEHPK3PXP';
const MOCK_BACKUP_CODES = ['8a4f-2c91', '3b7e-d105', '9c2a-f438', '1d6b-e752', '5e8c-a069', '7f3d-b184', '2a9e-c497', '4b1f-d630'];

export default function Profile() {
  const user = getCurrentUser();
  const navigate = useNavigate();
  if (!user) return null;

  const [profileData] = useState({ fullName: user.fullName, email: user.email, phone: user.phone });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const [verifyTarget, setVerifyTarget] = useState<VerifyTarget>(null);
  const [verifyStep, setVerifyStep] = useState<'input' | 'code' | 'success'>('input');
  const [newValue, setNewValue] = useState('');
  const [verifyCode, setVerifyCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [auditLog, setAuditLog] = useState<ProfileAuditEntry[]>(
    [...INITIAL_AUDIT].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  );

  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [twoFAStep, setTwoFAStep] = useState<'qr' | 'verify' | 'backup' | 'done'>('qr');
  const [twoFACode, setTwoFACode] = useState(['', '', '', '', '', '']);
  const [showSecret, setShowSecret] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [show2FADisable, setShow2FADisable] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const twoFARefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  const addAuditEntry = (action: string, field: string, oldVal?: string, newVal?: string) => {
    setAuditLog(prev => [{
      id: `pa-${Date.now()}`, action, field, oldValue: oldVal, newValue: newVal,
      timestamp: new Date(), ip: '192.168.1.45', device: CURRENT_DEVICE,
    }, ...prev]);
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const roleLabel = user.role === 'super_admin' ? 'Super Admin' : user.role.charAt(0).toUpperCase() + user.role.slice(1);

  const openVerify = (target: 'email' | 'phone') => {
    setVerifyTarget(target); setVerifyStep('input');
    setNewValue(target === 'email' ? profileData.email : profileData.phone);
    setVerifyCode(['', '', '', '', '', '']);
  };
  const closeVerify = () => { setVerifyTarget(null); setVerifyStep('input'); setNewValue(''); setVerifyCode(['', '', '', '', '', '']); };

  const handleSendCode = () => {
    if (!newValue.trim()) { toast.error(`Please enter a valid ${verifyTarget}`); return; }
    if (verifyTarget === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newValue)) { toast.error('Please enter a valid email'); return; }
    setVerifyStep('code'); setCountdown(60);
    toast.success(verifyTarget === 'email' ? `Code sent to ${newValue}` : `SMS sent to ${newValue}`);
    setTimeout(() => codeRefs.current[0]?.focus(), 100);
  };

  const handleCodeInput = (index: number, value: string, refs: React.MutableRefObject<(HTMLInputElement | null)[]>, setState: React.Dispatch<React.SetStateAction<string[]>>, state: string[]) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...state]; next[index] = value.slice(-1); setState(next);
    if (value && index < 5) refs.current[index + 1]?.focus();
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent, refs: React.MutableRefObject<(HTMLInputElement | null)[]>, state: string[]) => {
    if (e.key === 'Backspace' && !state[index] && index > 0) refs.current[index - 1]?.focus();
  };

  const handleCodePaste = (e: React.ClipboardEvent, setState: React.Dispatch<React.SetStateAction<string[]>>, refs: React.MutableRefObject<(HTMLInputElement | null)[]>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      e.preventDefault();
      const next = ['', '', '', '', '', ''];
      pasted.split('').forEach((ch, i) => { next[i] = ch; });
      setState(next); refs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  const handleVerifyCode = () => {
    const code = verifyCode.join('');
    if (code.length < 6) { toast.error('Enter the full 6-digit code'); return; }
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      const oldVal = verifyTarget === 'email' ? profileData.email : profileData.phone;
      addAuditEntry(verifyTarget === 'email' ? 'EMAIL_CHANGED' : 'PHONE_CHANGED', verifyTarget!, oldVal, newValue);
      setVerifyStep('success');
      toast.success(`${verifyTarget === 'email' ? 'Email' : 'Phone'} updated successfully`);
    }, 1500);
  };

  // ── Password — РЕАЛЬНЫЙ API ──
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordData.currentPassword) { toast.error('Enter current password'); return; }
    if (!passwordData.newPassword || !passwordData.confirmPassword) { toast.error('Fill in all fields'); return; }
    if (passwordData.newPassword !== passwordData.confirmPassword) { toast.error('Passwords don\'t match'); return; }
    if (passwordData.newPassword.length < 8) { toast.error('Min 8 characters'); return; }
    if (!/[A-Z]/.test(passwordData.newPassword) || !/[a-z]/.test(passwordData.newPassword) || !/[0-9]/.test(passwordData.newPassword)) {
      toast.error('Must contain uppercase, lowercase, and numbers'); return;
    }
    setSavingPassword(true);
    try {
      await authApi.changePassword(passwordData.currentPassword, passwordData.newPassword);
      addAuditEntry('PASSWORD_CHANGED', 'password');
      toast.success('Password updated successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  const start2FASetup = () => { setShow2FASetup(true); setTwoFAStep('qr'); setTwoFACode(['', '', '', '', '', '']); setShowSecret(false); };
  const verify2FACode = () => { if (twoFACode.join('').length < 6) { toast.error('Enter 6-digit code'); return; } setTwoFAStep('backup'); };
  const complete2FASetup = () => { setTwoFAEnabled(true); setTwoFAStep('done'); addAuditEntry('2FA_ENABLED', 'security'); toast.success('Two-factor authentication enabled'); };
  const disable2FA = () => { if (!disablePassword) { toast.error('Enter your password'); return; } setTwoFAEnabled(false); setShow2FADisable(false); setDisablePassword(''); addAuditEntry('2FA_DISABLED', 'security'); toast.success('2FA disabled'); };
  const copyToClipboard = (text: string) => { navigator.clipboard?.writeText(text).then(() => toast.success('Copied!')).catch(() => {}); };
  const handleLogout = () => { logout(); navigate('/'); };

  const twoFACodeComplete = twoFACode.every(c => c !== '');
  const codeComplete = verifyCode.every(c => c !== '');

  const getAuditIcon = (action: string) => {
    const map: Record<string, { icon: any; bg: string; color: string }> = {
      ACCOUNT_CREATED: { icon: CheckCircle2, bg: 'bg-emerald-100', color: 'text-emerald-600' },
      PASSWORD_CHANGED: { icon: KeyRound, bg: 'bg-amber-100', color: 'text-amber-600' },
      EMAIL_CHANGED: { icon: Mail, bg: 'bg-blue-100', color: 'text-blue-600' },
      PHONE_CHANGED: { icon: Phone, bg: 'bg-violet-100', color: 'text-violet-600' },
      LOGIN: { icon: Fingerprint, bg: 'bg-gray-100', color: 'text-gray-600' },
      '2FA_ENABLED': { icon: Shield, bg: 'bg-emerald-100', color: 'text-emerald-600' },
      '2FA_DISABLED': { icon: AlertTriangle, bg: 'bg-red-100', color: 'text-red-600' },
    };
    return map[action] || { icon: Clock, bg: 'bg-gray-100', color: 'text-gray-500' };
  };

  const getAuditLabel = (action: string) => ({
    ACCOUNT_CREATED: 'Account Created', PASSWORD_CHANGED: 'Password Changed',
    EMAIL_CHANGED: 'Email Changed', PHONE_CHANGED: 'Phone Changed',
    LOGIN: 'Login Session', '2FA_ENABLED': '2FA Enabled', '2FA_DISABLED': '2FA Disabled',
  }[action] || action);

  const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formatTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const OTPInputRow = ({ code, setCode, refs, onPaste, autoFocus }: {
    code: string[]; setCode: React.Dispatch<React.SetStateAction<string[]>>;
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>;
    onPaste: (e: React.ClipboardEvent) => void; autoFocus?: boolean;
  }) => (
    <div className="flex justify-center gap-2" onPaste={onPaste}>
      {code.map((digit, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el; }} type="text" inputMode="numeric" maxLength={1} value={digit}
          onChange={(e) => handleCodeInput(i, e.target.value, refs, setCode, code)}
          onKeyDown={(e) => handleCodeKeyDown(i, e, refs, code)}
          autoFocus={autoFocus && i === 0}
          className="w-11 h-12 text-center text-[18px] border rounded-lg bg-gray-50 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
        />
      ))}
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[700px] mx-auto">
      <div className="mb-6">
        <h2 className="text-[20px]">Profile Settings</h2>
        <p className="text-[13px] text-muted-foreground mt-0.5">Manage your account information</p>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-xl border shadow-sm px-5 py-5 flex flex-col sm:flex-row items-center gap-4 mb-5">
        <div className="w-16 h-16 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-[18px] shrink-0">{getInitials(user.fullName)}</div>
        <div className="text-center sm:text-left flex-1">
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <p className="text-[16px]">{profileData.fullName}</p>
            {twoFAEnabled && <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5"><Shield className="size-2.5" /> 2FA</span>}
          </div>
          <p className="text-[13px] text-muted-foreground">{roleLabel}</p>
          <p className="text-[12px] text-muted-foreground">{profileData.email}</p>
        </div>
        <Button variant="outline" size="sm" className="h-9" onClick={() => toast.info('Photo upload — not available in demo')}><Upload className="size-4 mr-1.5" /> Photo</Button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <Tabs defaultValue="profile">
          <div className="px-5 py-3">
            <TabsList className="bg-[#f0f1f3] rounded-full h-9 p-1 gap-1">
              <TabsTrigger value="profile" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 text-[13px] transition-all">Information</TabsTrigger>
              <TabsTrigger value="security" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 text-[13px] transition-all">Security</TabsTrigger>
              <TabsTrigger value="activity" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 text-[13px] transition-all"><History className="size-3.5 mr-1" />Activity</TabsTrigger>
            </TabsList>
          </div>

          {/* Information */}
          <TabsContent value="profile" className="mt-0 p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">Full Name <Lock className="size-3 text-gray-400" /></Label>
              <Input value={profileData.fullName} disabled className="h-10 bg-gray-50 text-gray-500 cursor-not-allowed" />
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Info className="size-3 shrink-0" /><span>Name is linked to your license. Contact administrator to change.</span></div>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Mail className="size-3 text-gray-400" />Email</Label>
              <div className="flex gap-2">
                <Input value={profileData.email} disabled className="h-10 bg-gray-50 text-gray-500 cursor-not-allowed flex-1" />
                <Button type="button" variant="outline" className="h-10 px-4 text-[13px] shrink-0" onClick={() => openVerify('email')}>Change</Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Phone className="size-3 text-gray-400" />Phone</Label>
              <div className="flex gap-2">
                <Input value={profileData.phone} disabled className="h-10 bg-gray-50 text-gray-500 cursor-not-allowed flex-1" />
                <Button type="button" variant="outline" className="h-10 px-4 text-[13px] shrink-0" onClick={() => openVerify('phone')}>Change</Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><ShieldCheck className="size-3 text-gray-400" />Role</Label>
              <Input value={roleLabel} disabled className="h-10 bg-gray-50 text-gray-500 cursor-not-allowed" />
            </div>
          </TabsContent>

          {/* Security */}
          <TabsContent value="security" className="mt-0 p-5 space-y-6">
            {/* 2FA */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center"><Fingerprint className="size-4 text-purple-600" /></div>
                <div className="flex-1"><p className="text-[14px]">Two-Factor Authentication</p><p className="text-[12px] text-muted-foreground">Add an extra layer of security</p></div>
              </div>
              <div className={`rounded-xl border p-4 space-y-3 ${twoFAEnabled ? 'bg-emerald-50/50 border-emerald-200' : 'bg-gray-50/50 border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="size-4 text-gray-500" />
                    <div><p className="text-[13px]">Authenticator App</p><p className="text-[11px] text-muted-foreground">Google Authenticator, Authy, or similar</p></div>
                  </div>
                  {twoFAEnabled
                    ? <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-100 border border-emerald-200 rounded-full px-2.5 py-1"><CheckCircle2 className="size-3" /> Enabled</span>
                    : <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-1"><AlertTriangle className="size-3" /> Disabled</span>
                  }
                </div>
                {twoFAEnabled ? (
                  <div className="flex items-center gap-2 pt-1">
                    <Button variant="outline" size="sm" className="h-8 text-[12px] rounded-lg" onClick={() => setShowBackupCodes(true)}><Eye className="size-3 mr-1" /> View Backup Codes</Button>
                    <Button variant="outline" size="sm" className="h-8 text-[12px] rounded-lg text-red-600 hover:bg-red-50 border-red-200" onClick={() => { setShow2FADisable(true); setDisablePassword(''); }}>Disable 2FA</Button>
                  </div>
                ) : (
                  <Button size="sm" className="h-9 text-[12px] rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700" onClick={start2FASetup}><Shield className="size-3.5 mr-1.5" /> Enable 2FA</Button>
                )}
              </div>
            </div>

            <div className="border-t border-gray-100" />

            {/* Password */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center"><KeyRound className="size-4 text-amber-600" /></div>
                <div><p className="text-[14px]">Change Password</p><p className="text-[12px] text-muted-foreground">Update your password to keep your account secure</p></div>
              </div>
              <form onSubmit={handleUpdatePassword} className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[12px]">Current Password</Label>
                  <div className="relative">
                    <Input type={showCurrentPw ? 'text' : 'password'} value={passwordData.currentPassword} onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} placeholder="••••••••" className="h-10 pr-10" />
                    <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{showCurrentPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px]">New Password</Label>
                  <div className="relative">
                    <Input type={showNewPw ? 'text' : 'password'} value={passwordData.newPassword} onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} placeholder="••••••••" className="h-10 pr-10" />
                    <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{showNewPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px]">Confirm New Password</Label>
                  <Input type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} placeholder="••••••••" className="h-10" />
                </div>
                <div className="text-[11px] text-muted-foreground bg-gray-50 rounded-lg px-3 py-2"><p className="text-foreground">Password requirements:</p><p>8+ characters · uppercase · lowercase · numbers</p></div>
                <div className="flex justify-end pt-1">
                  <Button type="submit" className="h-10" disabled={savingPassword}>
                    {savingPassword ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</span> : <><Save className="size-4 mr-1.5" /> Update Password</>}
                  </Button>
                </div>
              </form>
            </div>

            <div className="border-t border-gray-100" />
            <div>
              <p className="text-[13px] text-muted-foreground mb-3">Sign out of your account on this device.</p>
              <Button variant="outline" className="h-10 border-red-200 text-red-600 hover:bg-red-50" onClick={handleLogout}><LogOut className="size-4 mr-2" /> Sign Out</Button>
            </div>
          </TabsContent>

          {/* Activity */}
          <TabsContent value="activity" className="mt-0 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center"><History className="size-4 text-slate-600" /></div>
              <div><p className="text-[14px]">Profile Activity Log</p><p className="text-[11px] text-muted-foreground">{auditLog.length} events recorded</p></div>
            </div>
            <div className="space-y-0">
              {auditLog.map((entry, idx) => {
                const { icon: Icon, bg, color } = getAuditIcon(entry.action);
                return (
                  <div key={entry.id} className="relative flex gap-3 group">
                    {idx < auditLog.length - 1 && <div className="absolute left-[19px] top-10 bottom-0 w-px bg-gray-200" />}
                    <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0 z-10 group-hover:scale-110 transition-transform duration-200`}><Icon className={`size-4 ${color}`} /></div>
                    <div className="flex-1 pb-5 min-w-0">
                      <div className="bg-gray-50/80 rounded-xl px-4 py-3 border border-transparent group-hover:border-gray-200 group-hover:bg-white transition-all duration-200">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[13px]">{getAuditLabel(entry.action)}</p>
                            {entry.oldValue && entry.newValue && (
                              <div className="flex items-center gap-1.5 mt-1 text-[11px]">
                                <span className="text-red-500 line-through bg-red-50 rounded px-1.5 py-0.5 truncate max-w-[140px]">{entry.oldValue}</span>
                                <span className="text-gray-400">→</span>
                                <span className="text-emerald-600 bg-emerald-50 rounded px-1.5 py-0.5 truncate max-w-[140px]">{entry.newValue}</span>
                              </div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[11px] text-muted-foreground whitespace-nowrap">{formatDate(entry.timestamp)}</p>
                            <p className="text-[10px] text-gray-400">{formatTime(entry.timestamp)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                          <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-gray-300" />{entry.ip}</span>
                          <span>{entry.device}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="bg-white rounded-xl border shadow-sm mt-4 overflow-hidden">
        <div className="px-5 py-3 border-b bg-gray-50/50">
          <span className="text-[14px]">Account Details</span>
        </div>
        <div className="divide-y divide-gray-100">
          <div className="px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><ShieldCheck className="size-4 text-blue-500" /></div>
              <span className="text-[13px] text-muted-foreground">Role</span>
            </div>
            <span className="text-[13px] font-medium">{roleLabel}</span>
          </div>
          <div className="px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center"><CheckCircle2 className="size-4 text-emerald-500" /></div>
              <span className="text-[13px] text-muted-foreground">Status</span>
            </div>
            <span className="text-[13px] text-emerald-600 font-medium">Active</span>
          </div>
          <div className="px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center"><KeyRound className="size-4 text-gray-500" /></div>
              <span className="text-[13px] text-muted-foreground">User ID</span>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">{user.id}</span>
          </div>
          <div className="px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${twoFAEnabled ? 'bg-purple-50' : 'bg-gray-100'}`}><Fingerprint className={`size-4 ${twoFAEnabled ? 'text-purple-500' : 'text-gray-400'}`} /></div>
              <span className="text-[13px] text-muted-foreground">Two-Factor Auth</span>
            </div>
            <span className={`text-[13px] font-medium ${twoFAEnabled ? 'text-purple-600' : 'text-gray-400'}`}>{twoFAEnabled ? 'Enabled' : 'Disabled'}</span>
          </div>
        </div>
      </div>

      {/* Verification Dialog */}
      <Dialog open={verifyTarget !== null} onOpenChange={(open) => { if (!open) closeVerify(); }}>
        <DialogContent className="sm:max-w-[400px]">
          {verifyStep === 'input' && (<>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-[16px]">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${verifyTarget === 'email' ? 'bg-blue-100' : 'bg-emerald-100'}`}>
                  {verifyTarget === 'email' ? <Mail className="size-4 text-blue-600" /> : <Phone className="size-4 text-emerald-600" />}
                </div>
                Change {verifyTarget === 'email' ? 'Email' : 'Phone'}
              </DialogTitle>
              <DialogDescription className="text-[13px]">Enter your new {verifyTarget === 'email' ? 'email address' : 'phone number'}. We'll send a verification code.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5"><Label className="text-[12px]">Current</Label><Input value={verifyTarget === 'email' ? profileData.email : profileData.phone} disabled className="h-10 bg-gray-50 text-gray-500" /></div>
              <div className="space-y-1.5"><Label className="text-[12px]">New *</Label><Input type={verifyTarget === 'email' ? 'email' : 'tel'} value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder={verifyTarget === 'email' ? 'new@example.com' : '+77770001122'} className="h-10" autoFocus /></div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0"><Button variant="outline" onClick={closeVerify} className="rounded-lg">Cancel</Button><Button onClick={handleSendCode} className="rounded-lg">Send Code</Button></DialogFooter>
          </>)}
          {verifyStep === 'code' && (<>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-[16px]">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${verifyTarget === 'email' ? 'bg-blue-100' : 'bg-emerald-100'}`}><ShieldCheck className={`size-4 ${verifyTarget === 'email' ? 'text-blue-600' : 'text-emerald-600'}`} /></div>
                Enter Verification Code
              </DialogTitle>
              <DialogDescription className="text-[13px]">{verifyTarget === 'email' ? `Code sent to ${newValue}` : `SMS sent to ${newValue}`}</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <OTPInputRow code={verifyCode} setCode={setVerifyCode} refs={codeRefs} onPaste={(e) => handleCodePaste(e, setVerifyCode, codeRefs)} autoFocus />
              <div className="text-center mt-4">
                {countdown > 0 ? <p className="text-[12px] text-muted-foreground">Resend in <span className="text-foreground">{countdown}s</span></p> : <button type="button" className="text-[12px] text-emerald-600 hover:text-emerald-700" onClick={() => { setCountdown(60); toast.success('Code resent'); }}>Resend code</button>}
              </div>
              <p className="text-[11px] text-muted-foreground text-center mt-3 bg-gray-50 rounded-lg py-2 px-3">Demo: enter any 6 digits to verify</p>
            </div>
            <DialogFooter className="gap-2 sm:gap-0"><Button variant="outline" onClick={() => setVerifyStep('input')} className="rounded-lg"><ArrowLeft className="size-4 mr-1" /> Back</Button><Button onClick={handleVerifyCode} disabled={!codeComplete || isVerifying} className="rounded-lg">{isVerifying ? 'Verifying…' : 'Verify & Save'}</Button></DialogFooter>
          </>)}
          {verifyStep === 'success' && (
            <div className="py-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto"><CheckCircle2 className="size-7 text-emerald-600" /></div>
              <h3 className="text-[16px]">{verifyTarget === 'email' ? 'Email' : 'Phone'} Updated</h3>
              <p className="text-[13px] text-muted-foreground">Changed to <span className="text-foreground">{newValue}</span></p>
              <Button onClick={closeVerify} className="mt-2 rounded-lg">Done</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 2FA Setup */}
      <Dialog open={show2FASetup} onOpenChange={(open) => { if (!open) setShow2FASetup(false); }}>
        <DialogContent className="sm:max-w-[440px]">
          {twoFAStep === 'qr' && (<>
            <DialogHeader><DialogTitle className="flex items-center gap-2 text-[16px]"><div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center"><QrCode className="size-4 text-purple-600" /></div>Set Up Authenticator</DialogTitle><DialogDescription className="text-[13px]">Scan this QR code with your authenticator app</DialogDescription></DialogHeader>
            <div className="py-4 space-y-4">
              <div className="flex justify-center">
                <div className="w-48 h-48 bg-white border-2 border-gray-200 rounded-2xl p-3 flex items-center justify-center relative">
                  <div className="w-full h-full grid grid-cols-11 grid-rows-11 gap-[2px]">
                    {Array.from({ length: 121 }).map((_, i) => {
                      const row = Math.floor(i / 11); const col = i % 11;
                      const isCornerFinder = (row < 3 && col < 3) || (row < 3 && col > 7) || (row > 7 && col < 3);
                      const isInnerCorner = (row === 1 && col === 1) || (row === 1 && col === 9) || (row === 9 && col === 1);
                      const filled = isCornerFinder || (!isCornerFinder && Math.random() > 0.45);
                      return <div key={i} className={`rounded-[1px] ${isInnerCorner ? 'bg-purple-600' : isCornerFinder ? 'bg-gray-900' : filled ? 'bg-gray-800' : 'bg-transparent'}`} />;
                    })}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center"><div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm"><Shield className="size-5 text-purple-600" /></div></div>
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[11px] text-muted-foreground text-center">Can't scan? Enter this key manually:</p>
                <div className="flex items-center gap-2 justify-center">
                  <code className={`text-[13px] px-3 py-1.5 bg-gray-100 rounded-lg border font-mono tracking-wider ${showSecret ? '' : 'blur-sm select-none'}`}>{MOCK_TOTP_SECRET}</code>
                  <button type="button" onClick={() => setShowSecret(!showSecret)} className="p-1.5 hover:bg-gray-100 rounded-lg">{showSecret ? <EyeOff className="size-4 text-gray-400" /> : <Eye className="size-4 text-gray-400" />}</button>
                  <button type="button" onClick={() => copyToClipboard(MOCK_TOTP_SECRET)} className="p-1.5 hover:bg-gray-100 rounded-lg"><Copy className="size-4 text-gray-400" /></button>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0"><Button variant="outline" onClick={() => setShow2FASetup(false)} className="rounded-lg">Cancel</Button><Button onClick={() => { setTwoFAStep('verify'); setTwoFACode(['', '', '', '', '', '']); setTimeout(() => twoFARefs.current[0]?.focus(), 100); }} className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600">Next: Verify Code</Button></DialogFooter>
          </>)}
          {twoFAStep === 'verify' && (<>
            <DialogHeader><DialogTitle className="flex items-center gap-2 text-[16px]"><div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center"><ShieldCheck className="size-4 text-purple-600" /></div>Verify Setup</DialogTitle><DialogDescription className="text-[13px]">Enter the 6-digit code from your authenticator app.</DialogDescription></DialogHeader>
            <div className="py-4 space-y-4">
              <OTPInputRow code={twoFACode} setCode={setTwoFACode} refs={twoFARefs} onPaste={(e) => handleCodePaste(e, setTwoFACode, twoFARefs)} autoFocus />
              <p className="text-[11px] text-muted-foreground text-center bg-gray-50 rounded-lg py-2 px-3">Demo: enter any 6 digits to verify</p>
            </div>
            <DialogFooter className="gap-2 sm:gap-0"><Button variant="outline" onClick={() => setTwoFAStep('qr')} className="rounded-lg"><ArrowLeft className="size-4 mr-1" /> Back</Button><Button onClick={verify2FACode} disabled={!twoFACodeComplete} className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600">Verify</Button></DialogFooter>
          </>)}
          {twoFAStep === 'backup' && (<>
            <DialogHeader><DialogTitle className="flex items-center gap-2 text-[16px]"><div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center"><KeyRound className="size-4 text-amber-600" /></div>Save Backup Codes</DialogTitle><DialogDescription className="text-[13px]">Save these codes safely. Each can be used once.</DialogDescription></DialogHeader>
            <div className="py-3 space-y-3">
              <div className="bg-gray-50 border rounded-xl p-4"><div className="grid grid-cols-2 gap-2">{MOCK_BACKUP_CODES.map((code, i) => <div key={i} className="font-mono text-[13px] text-center bg-white border rounded-lg py-1.5 px-2 text-gray-700">{code}</div>)}</div></div>
              <div className="flex items-center gap-2 justify-center"><Button variant="outline" size="sm" className="h-8 text-[12px] rounded-lg" onClick={() => copyToClipboard(MOCK_BACKUP_CODES.join('\n'))}><Copy className="size-3 mr-1" /> Copy All</Button><Button variant="outline" size="sm" className="h-8 text-[12px] rounded-lg" onClick={() => toast.success('Download started (demo)')}><Download className="size-3 mr-1" /> Download</Button></div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2"><AlertTriangle className="size-3.5 text-amber-600 shrink-0 mt-0.5" /><p className="text-[11px] text-amber-700">Each backup code can only be used once. Store them securely.</p></div>
            </div>
            <DialogFooter><Button onClick={complete2FASetup} className="rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 w-full"><CheckCircle2 className="size-4 mr-1.5" /> I've Saved My Codes — Enable 2FA</Button></DialogFooter>
          </>)}
          {twoFAStep === 'done' && (
            <div className="py-8 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto"><Shield className="size-8 text-emerald-600" /></div>
              <h3 className="text-[16px]">2FA Enabled Successfully</h3>
              <p className="text-[13px] text-muted-foreground max-w-[280px] mx-auto">Your account is now protected with two-factor authentication.</p>
              <Button onClick={() => setShow2FASetup(false)} className="mt-2 rounded-lg">Done</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Backup Codes */}
      <Dialog open={showBackupCodes} onOpenChange={setShowBackupCodes}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-[16px]"><div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center"><KeyRound className="size-4 text-amber-600" /></div>Backup Codes</DialogTitle><DialogDescription className="text-[13px]">Use these one-time codes if you lose access to your authenticator.</DialogDescription></DialogHeader>
          <div className="py-3">
            <div className="bg-gray-50 border rounded-xl p-4"><div className="grid grid-cols-2 gap-2">{MOCK_BACKUP_CODES.map((code, i) => <div key={i} className="font-mono text-[13px] text-center bg-white border rounded-lg py-1.5 px-2 text-gray-700">{code}</div>)}</div></div>
            <div className="flex items-center gap-2 justify-center mt-3"><Button variant="outline" size="sm" className="h-8 text-[12px] rounded-lg" onClick={() => copyToClipboard(MOCK_BACKUP_CODES.join('\n'))}><Copy className="size-3 mr-1" /> Copy All</Button><Button variant="outline" size="sm" className="h-8 text-[12px] rounded-lg" onClick={() => toast.info('Regenerated (demo)')}><RefreshCw className="size-3 mr-1" /> Regenerate</Button></div>
          </div>
          <DialogFooter><Button onClick={() => setShowBackupCodes(false)} className="rounded-lg w-full">Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable 2FA */}
      <Dialog open={show2FADisable} onOpenChange={setShow2FADisable}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-[16px]"><div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center"><AlertTriangle className="size-4 text-red-600" /></div>Disable 2FA</DialogTitle><DialogDescription className="text-[13px]">This will remove the extra security layer. Enter your password to confirm.</DialogDescription></DialogHeader>
          <div className="py-3 space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-start gap-2"><AlertTriangle className="size-3.5 text-red-500 shrink-0 mt-0.5" /><p className="text-[11px] text-red-700">Disabling 2FA makes your account less secure.</p></div>
            <div className="space-y-1.5"><Label className="text-[12px]">Current Password *</Label><Input type="password" value={disablePassword} onChange={(e) => setDisablePassword(e.target.value)} placeholder="••••••••" className="h-10" autoFocus /></div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0"><Button variant="outline" onClick={() => setShow2FADisable(false)} className="rounded-lg">Cancel</Button><Button variant="destructive" onClick={disable2FA} className="rounded-lg">Disable 2FA</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
