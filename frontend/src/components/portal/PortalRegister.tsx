import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner@2.0.3';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

export default function PortalRegister() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', website: '', phone: '', description: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { toast.error('Fill in all required fields'); return; }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/portal/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setDone(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e5e7eb', padding: 48, maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 12 }}>Registration Successful!</h2>
        <p style={{ color: '#6b7280', fontSize: 15, marginBottom: 24, lineHeight: 1.6 }}>
          Your organization is now <strong style={{ color: '#1D9E75' }}>active</strong>.<br />
          Sign in to get your API key and start integrating.
        </p>
        <button onClick={() => navigate('/developer/login')} style={{ padding: '12px 28px', background: '#1D9E75', border: 'none', borderRadius: 8, color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Sign In & Get API Key →</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e5e7eb', padding: 40, maxWidth: 520, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Register Organization</h1>
          <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>Get access to E-Prescription API</p>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { key: 'name', label: 'Organization Name *', placeholder: 'MedCenter Almaty', type: 'text' },
            { key: 'email', label: 'Email *', placeholder: 'admin@medcenter.kz', type: 'email' },
            { key: 'password', label: 'Password * (min 8 chars)', placeholder: '••••••••', type: 'password' },
            { key: 'website', label: 'Website', placeholder: 'https://medcenter.kz', type: 'url' },
            { key: 'phone', label: 'Phone', placeholder: '+7 727 123 45 67', type: 'tel' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>{f.label}</label>
              <input
                type={f.type} placeholder={f.placeholder} value={(form as any)[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                style={{ width: '100%', height: 40, padding: '0 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>
          ))}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>How do you plan to use the API?</label>
            <textarea placeholder="Briefly describe your use case..." value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <button type="submit" disabled={loading}
            style={{ height: 44, background: loading ? '#9ca3af' : '#1D9E75', border: 'none', borderRadius: 8, color: 'white', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {loading ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />Submitting…</> : 'Submit Application'}
          </button>
        </form>
        <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280', marginTop: 20 }}>
          Already have an account? <button onClick={() => navigate('/developer/login')} style={{ background: 'none', border: 'none', color: '#1D9E75', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Sign In</button>
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
