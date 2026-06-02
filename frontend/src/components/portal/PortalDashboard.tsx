import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner@2.0.3';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';
const getToken = () => localStorage.getItem('portal_token') || '';

export default function PortalDashboard() {
  const navigate = useNavigate();
  const [org, setOrg] = useState<any>(null);
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'keys' | 'docs'>('keys');

  useEffect(() => {
    const token = getToken();
    if (!token) { navigate('/developer/login'); return; }
    fetch(`${API_URL}/portal/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.error) { navigate('/developer/login'); return; }
        setOrg(data.organization);
        setKeys(data.apiKeys || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const createKey = async () => {
    if (!newKeyName.trim()) { toast.error('Enter a key name'); return; }
    setCreating(true);
    try {
      const res = await fetch(`${API_URL}/portal/keys`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRevealedKey(data.key);
      setKeys(prev => [{ id: data.id, name: data.name, isActive: true, createdAt: data.createdAt, lastUsedAt: null, requestCount: 0 }, ...prev]);
      setNewKeyName('');
      setShowCreate(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (keyId: string, keyName: string) => {
    if (!confirm(`Revoke key "${keyName}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_URL}/portal/keys/${keyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Failed to revoke');
      setKeys(prev => prev.map(k => k.id === keyId ? { ...k, isActive: false } : k));
      toast.success('Key revoked');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const logout = () => {
    localStorage.removeItem('portal_token');
    localStorage.removeItem('portal_org');
    navigate('/developer/login');
  };

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui,sans-serif' }}>Loading…</div>;

  const baseUrl = API_URL.replace('/api', '');

  return (
    <div style={{ fontFamily: 'system-ui,sans-serif', minHeight: '100vh', background: '#f9fafb' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '0 32px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg,#1D9E75,#0f7a5a)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white' }}>Rx</div>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Developer Portal</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 14, color: '#374151' }}>{org?.name}</span>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: org?.status === 'active' ? '#dcfce7' : '#fef3c7', color: org?.status === 'active' ? '#166534' : '#92400e', fontWeight: 600 }}>
              {org?.status?.toUpperCase()}
            </span>
            <button onClick={logout} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 13, color: '#6b7280' }}>Sign Out</button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px' }}>

        {/* Revealed key modal */}
        {revealedKey && (
          <div style={{ background: '#f0fdf4', border: '2px solid #22c55e', borderRadius: 12, padding: 24, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 20 }}>🔑</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#166534' }}>Your new API key — save it now!</span>
            </div>
            <p style={{ fontSize: 13, color: '#166534', marginBottom: 12 }}>⚠️ This key will only be shown once. Copy and store it securely.</p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <code style={{ flex: 1, background: 'white', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontFamily: 'monospace', wordBreak: 'break-all', color: '#111827' }}>{revealedKey}</code>
              <button onClick={() => { navigator.clipboard?.writeText(revealedKey); toast.success('Copied!'); }}
                style={{ padding: '10px 16px', background: '#1D9E75', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>Copy</button>
            </div>
            <button onClick={() => setRevealedKey(null)} style={{ marginTop: 12, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#6b7280' }}>I've saved it, dismiss ×</button>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'white', padding: 4, borderRadius: 10, border: '1px solid #e5e7eb', width: 'fit-content' }}>
          {(['keys', 'docs'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: activeTab === tab ? '#111827' : 'transparent', color: activeTab === tab ? 'white' : '#6b7280' }}>
              {tab === 'keys' ? 'API Keys' : 'Documentation'}
            </button>
          ))}
        </div>

        {/* API Keys Tab */}
        {activeTab === 'keys' && (
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>API Keys ({keys.filter(k => k.isActive).length} active)</span>
              <button onClick={() => setShowCreate(true)}
                style={{ padding: '8px 16px', background: '#111827', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>+ New Key</button>
            </div>

            {showCreate && (
              <div style={{ padding: '16px 24px', background: '#f9fafb', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Key Name</label>
                  <input placeholder="Production, Staging, Test..." value={newKeyName} onChange={e => setNewKeyName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createKey()}
                    style={{ width: '100%', height: 38, padding: '0 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} autoFocus />
                </div>
                <button onClick={createKey} disabled={creating}
                  style={{ height: 38, padding: '0 20px', background: '#1D9E75', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                  {creating ? 'Creating…' : 'Create'}
                </button>
                <button onClick={() => setShowCreate(false)} style={{ height: 38, padding: '0 14px', background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontSize: 14, color: '#6b7280' }}>Cancel</button>
              </div>
            )}

            {keys.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
                No API keys yet. Create your first key to get started.
              </div>
            ) : keys.map(k => (
              <div key={k.id} style={{ padding: '16px 24px', borderBottom: '1px solid #f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: k.isActive ? 1 : 0.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 18 }}>🔑</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{k.name}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                      Created {new Date(k.createdAt).toLocaleDateString()}
                      {k.lastUsedAt && ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString()}`}
                      {' · '}{k.requestCount} requests
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: k.isActive ? '#dcfce7' : '#fee2e2', color: k.isActive ? '#166534' : '#dc2626' }}>
                    {k.isActive ? 'Active' : 'Revoked'}
                  </span>
                  {k.isActive && (
                    <button onClick={() => revokeKey(k.id, k.name)}
                      style={{ padding: '6px 12px', border: '1px solid #fecaca', borderRadius: 6, background: 'white', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}>
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Docs Tab */}
        {activeTab === 'docs' && (
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 24 }}>API Documentation</h2>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>
              Base URL: <code style={{ background: '#f3f4f6', padding: '2px 8px', borderRadius: 4, fontSize: 13 }}>{baseUrl}/api/external</code>
              {' · '}Authentication: <code style={{ background: '#f3f4f6', padding: '2px 8px', borderRadius: 4, fontSize: 13 }}>X-API-Key: your_key</code>
            </p>
            {[
              {
                method: 'POST', path: '/prescriptions', color: '#059669', bg: '#dcfce7',
                desc: 'Create a new prescription',
                body: `{
  "patientIin": "920415350167",
  "patientName": "Asel Karimova",
  "patientPhone": "+77771234567",
  "patientEmail": "patient@example.kz",
  "diagnosisCode": "I10",
  "medications": [{
    "name": "Амлодипин",
    "dosage": "5 мг",
    "form": "Таблетки",
    "quantity": 30,
    "course": "1 tablet daily"
  }]
}`,
                response: `{ "prescriptionId": "abc123", "qrUrl": "https://...", "expiresAt": "2026-06-25..." }`
              },
              {
                method: 'GET', path: '/prescriptions/:id', color: '#2563eb', bg: '#dbeafe',
                desc: 'Get prescription status and details',
                body: null,
                response: `{ "id": "abc123", "status": "active", "patient": {...}, "medications": [...] }`
              },
              {
                method: 'GET', path: '/patients/:iin', color: '#2563eb', bg: '#dbeafe',
                desc: 'Look up patient by IIN',
                body: null,
                response: `{ "found": true, "patient": { "fullName": "...", "iin": "...", "activePrescriptions": 1 } }`
              },
              {
                method: 'GET', path: '/prescriptions/:id/qr', color: '#2563eb', bg: '#dbeafe',
                desc: 'Get QR code as base64 data URL',
                body: null,
                response: `{ "qrDataUrl": "data:image/png;base64,...", "patientUrl": "https://..." }`
              },
            ].map(ep => (
              <div key={ep.path} style={{ border: '1px solid #e5e7eb', borderRadius: 10, marginBottom: 16, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', background: '#f9fafb', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: ep.bg, color: ep.color }}>{ep.method}</span>
                  <code style={{ fontSize: 14, color: '#111827', fontWeight: 600 }}>/api/external{ep.path}</code>
                  <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 8 }}>{ep.desc}</span>
                </div>
                <div style={{ padding: 16 }}>
                  {ep.body && (
                    <div style={{ marginBottom: 12 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', margin: '0 0 6px' }}>Request Body:</p>
                      <pre style={{ background: '#f3f4f6', borderRadius: 6, padding: 12, margin: 0, fontSize: 12, overflow: 'auto', color: '#374151' }}>{ep.body}</pre>
                    </div>
                  )}
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', margin: '0 0 6px' }}>Response:</p>
                    <pre style={{ background: '#f0fdf4', borderRadius: 6, padding: 12, margin: 0, fontSize: 12, overflow: 'auto', color: '#166534' }}>{ep.response}</pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
