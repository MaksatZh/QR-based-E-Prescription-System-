import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { toast } from 'sonner@2.0.3';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { CheckCircle2, AlertCircle, Mail, Eye, EyeOff, Lock, Shield } from 'lucide-react';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function ActivateAccount() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [status, setStatus] = useState<'loading' | 'form' | 'invalid' | 'done'>('loading');
  const [userEmail, setUserEmail] = useState('');
  const [userFullName, setUserFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Password strength checks
  const checks = {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number:    /[0-9]/.test(password),
  };
  const allValid = Object.values(checks).every(Boolean);

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }

    // Validate token — just check it exists and get user email
    fetch(`${BASE_URL}/auth/activate/${token}`)
      .then(async res => {
        if (res.ok) {
          const data = await res.json();
          setUserEmail(data.email);
          setUserFullName(data.fullName);
          setStatus('form');
        } else {
          setStatus('invalid');
        }
      })
      .catch(() => setStatus('invalid'));
  }, [token]);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allValid) { toast.error('Password does not meet requirements'); return; }
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }

    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/auth/activate/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Activation failed');
      }

      setStatus('done');
      toast.success('Account activated! Redirecting to login…');
      setTimeout(() => navigate('/'), 2500);
    } catch (err: any) {
      toast.error(err.message || 'Activation failed');
    } finally {
      setSaving(false);
    }
  };

  // ── Loading ──
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6f8] p-4">
        <div className="bg-white rounded-xl border shadow-sm p-8 max-w-sm w-full text-center">
          <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[13px] text-muted-foreground">Validating activation link…</p>
        </div>
      </div>
    );
  }

  // ── Invalid token ──
  if (status === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6f8] p-4">
        <div className="bg-white rounded-xl border shadow-sm max-w-sm w-full p-8 text-center">
          <AlertCircle className="size-10 text-red-300 mx-auto mb-4" />
          <h2 className="text-[18px] mb-1">Invalid Link</h2>
          <p className="text-[13px] text-muted-foreground mb-5">
            This activation link is invalid or has already been used.
          </p>
          <Button className="h-10 w-full" onClick={() => navigate('/')}>Back to Login</Button>
        </div>
      </div>
    );
  }

  // ── Success ──
  if (status === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6f8] p-4">
        <div className="bg-white rounded-xl border shadow-sm max-w-sm w-full p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="size-7 text-emerald-600" />
          </div>
          <h2 className="text-[18px] mb-1">Account Activated!</h2>
          <p className="text-[13px] text-muted-foreground">Redirecting to login…</p>
        </div>
      </div>
    );
  }

  // ── Password form ──
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f6f8] p-4">
      <div className="bg-white rounded-xl border shadow-sm max-w-sm w-full p-6">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-6">
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
          <span className="text-[13px]"><span className="text-emerald-600">e</span>Prescription</span>
        </div>

        <div className="mb-5">
          <h2 className="text-[18px]">Activate Account</h2>
          <p className="text-[13px] text-muted-foreground mt-0.5">Set a password to complete setup</p>
        </div>

        {/* User info */}
        <div className="bg-gray-50 rounded-lg px-3 py-2.5 flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
            <Mail className="size-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Activating account for</p>
            <p className="text-[13px]">{userFullName} — {userEmail}</p>
          </div>
        </div>

        <form onSubmit={handleActivate} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[12px]">New Password *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-10 pl-10 pr-10"
                required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px]">Confirm Password *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="h-10 pl-10 pr-10"
                required
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* Password requirements */}
          {password.length > 0 && (
            <div className="bg-gray-50 rounded-lg px-3 py-2.5 space-y-1.5">
              {[
                { key: 'length',    label: '8+ characters' },
                { key: 'uppercase', label: 'Uppercase letter' },
                { key: 'lowercase', label: 'Lowercase letter' },
                { key: 'number',    label: 'Number' },
              ].map(item => (
                <div key={item.key} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${checks[item.key as keyof typeof checks] ? 'bg-emerald-100' : 'bg-gray-200'}`}>
                    {checks[item.key as keyof typeof checks]
                      ? <CheckCircle2 className="size-3 text-emerald-600" />
                      : <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                    }
                  </div>
                  <span className={`text-[11px] ${checks[item.key as keyof typeof checks] ? 'text-emerald-600' : 'text-muted-foreground'}`}>{item.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Match indicator */}
          {confirmPassword.length > 0 && (
            <div className={`flex items-center gap-2 text-[11px] ${password === confirmPassword ? 'text-emerald-600' : 'text-red-500'}`}>
              {password === confirmPassword
                ? <><CheckCircle2 className="size-3" /> Passwords match</>
                : <><AlertCircle className="size-3" /> Passwords do not match</>
              }
            </div>
          )}

          <Button type="submit" className="w-full h-10 mt-1" disabled={saving || !allValid || password !== confirmPassword}>
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Activating…
              </span>
            ) : (
              <><Shield className="size-4 mr-1.5" /> Activate Account</>
            )}
          </Button>

          <button type="button" onClick={() => navigate('/')} className="w-full text-center text-[12px] text-muted-foreground hover:text-foreground transition-colors py-1.5">
            Back to Login
          </button>
        </form>
      </div>
    </div>
  );
}
