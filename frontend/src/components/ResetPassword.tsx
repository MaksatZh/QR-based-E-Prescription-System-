import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { toast } from 'sonner@2.0.3';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Shield } from 'lucide-react';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [status, setStatus] = useState<'loading' | 'form' | 'invalid' | 'expired' | 'done'>('loading');
  const [userEmail, setUserEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const checks = {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number:    /[0-9]/.test(password),
  };
  const allValid = Object.values(checks).every(Boolean);

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }

    fetch(`${BASE_URL}/auth/reset-password/${token}`)
      .then(async res => {
        if (res.ok) {
          const data = await res.json();
          setUserEmail(data.email);
          setStatus('form');
        } else {
          const data = await res.json().catch(() => ({}));
          if (data.error?.includes('expired')) setStatus('expired');
          else setStatus('invalid');
        }
      })
      .catch(() => setStatus('invalid'));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allValid) { toast.error('Password does not meet requirements'); return; }
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }

    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Reset failed');
      }

      setStatus('done');
      toast.success('Password reset! Redirecting to login…');
      setTimeout(() => navigate('/'), 2500);
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setSaving(false);
    }
  };

  // Loading
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6f8] p-4">
        <div className="bg-white rounded-xl border shadow-sm p-8 max-w-sm w-full text-center">
          <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[13px] text-muted-foreground">Validating reset link…</p>
        </div>
      </div>
    );
  }

  // Invalid
  if (status === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6f8] p-4">
        <div className="bg-white rounded-xl border shadow-sm max-w-sm w-full p-8 text-center space-y-4">
          <AlertCircle className="size-10 text-red-300 mx-auto" />
          <h2 className="text-[18px]">Invalid Link</h2>
          <p className="text-[13px] text-muted-foreground">This reset link is invalid or has already been used.</p>
          <Button className="w-full h-10" onClick={() => navigate('/forgot-password')}>Request New Link</Button>
        </div>
      </div>
    );
  }

  // Expired
  if (status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6f8] p-4">
        <div className="bg-white rounded-xl border shadow-sm max-w-sm w-full p-8 text-center space-y-4">
          <AlertCircle className="size-10 text-amber-400 mx-auto" />
          <h2 className="text-[18px]">Link Expired</h2>
          <p className="text-[13px] text-muted-foreground">This reset link has expired (valid for 1 hour). Please request a new one.</p>
          <Button className="w-full h-10" onClick={() => navigate('/forgot-password')}>Request New Link</Button>
        </div>
      </div>
    );
  }

  // Done
  if (status === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6f8] p-4">
        <div className="bg-white rounded-xl border shadow-sm max-w-sm w-full p-8 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="size-7 text-emerald-600" />
          </div>
          <h2 className="text-[18px]">Password Reset!</h2>
          <p className="text-[13px] text-muted-foreground">Redirecting to login…</p>
        </div>
      </div>
    );
  }

  // Form
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
          <h2 className="text-[18px]">Reset Password</h2>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Set a new password for <span className="text-foreground">{userEmail}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
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

          {/* Requirements */}
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

          {/* Match */}
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
                Resetting…
              </span>
            ) : (
              <><Shield className="size-4 mr-1.5" /> Reset Password</>
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
