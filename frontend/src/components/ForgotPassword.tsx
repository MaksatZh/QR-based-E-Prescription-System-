import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner@2.0.3';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error('Enter your email'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Something went wrong');
      }

      setSent(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

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

        {sent ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="size-7 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-[18px] mb-1">Check your email</h2>
              <p className="text-[13px] text-muted-foreground">
                If an account with <span className="text-foreground">{email}</span> exists, a reset link has been sent.
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Demo mode: the reset link is printed in the backend console.
            </p>
            <Button variant="outline" className="w-full h-10" onClick={() => navigate('/')}>
              <ArrowLeft className="size-4 mr-2" /> Back to Login
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <h2 className="text-[18px]">Forgot Password</h2>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                Enter your email and we'll send you a reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[12px]">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.kz"
                    className="h-10 pl-10"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-10" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending…
                  </span>
                ) : 'Send Reset Link'}
              </Button>

              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full text-center text-[12px] text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                <ArrowLeft className="size-3 inline mr-1" />
                Back to Login
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
