import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner@2.0.3';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

export default function PortalLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/portal/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      localStorage.setItem('portal_token', data.token);
      localStorage.setItem('portal_org', JSON.stringify(data.organization));
      navigate('/developer/dashboard');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e5e7eb', padding: 40, maxWidth: 400, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg,#1D9E75,#0f7a5a)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 20, fontWeight: 700, color: 'white' }}>Rx</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>Developer Portal</h1>
          <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>Sign in to manage your API keys</p>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Email</label>
            <input type="email" placeholder="admin@organization.kz" value={email} onChange={e => setEmail(e.target.value)} required
              style={{ width: '100%', height: 40, padding: '0 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Password</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required
              style={{ width: '100%', height: 40, padding: '0 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <button type="submit" disabled={loading}
            style={{ height: 44, background: loading ? '#9ca3af' : '#1D9E75', border: 'none', borderRadius: 8, color: 'white', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4 }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #f3f4f6', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 8px' }}>Don't have access yet?</p>
          <button onClick={() => navigate('/developer/register')} style={{ background: 'none', border: '1px solid #1D9E75', borderRadius: 8, color: '#1D9E75', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: '8px 16px' }}>Register Organization</button>
        </div>
        <p style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={() => navigate('/developer')} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 12 }}>← Back to landing</button>
        </p>
      </div>
    </div>
  );
}
