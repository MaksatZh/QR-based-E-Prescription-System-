import { useNavigate } from 'react-router';

export default function PortalLanding() {
  const navigate = useNavigate();
  const features = [
    { icon: '📋', title: 'Create Prescriptions', desc: 'Create e-prescriptions via API and send QR codes to patients automatically' },
    { icon: '🔍', title: 'Track Status', desc: 'Get real-time prescription status — active, partially dispensed, expired' },
    { icon: '⚠️', title: 'Drug Interactions', desc: 'Built-in drug interaction database with 8,000+ pairs' },
    { icon: '🏥', title: 'Patient Lookup', desc: 'Find patient data by IIN and check active prescriptions' },
    { icon: '📱', title: 'QR Codes', desc: 'Get QR code data URL for embedding in your own interface' },
    { icon: '🔐', title: 'Secure Access', desc: 'API key authentication — simple header-based auth' },
  ];
  const steps = [
    { n: '1', title: 'Register', desc: 'Fill in your organization details and submit the application' },
    { n: '2', title: 'Get Approved', desc: 'Admin reviews and approves your application within 24 hours' },
    { n: '3', title: 'Get API Key', desc: 'Login to Developer Portal and generate your API key' },
    { n: '4', title: 'Integrate', desc: 'Add X-API-Key header to your requests and start creating prescriptions' },
  ];
  return (
    <div style={{ fontFamily: 'system-ui,-apple-system,sans-serif', minHeight: '100vh', background: '#f9fafb' }}>
      <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '0 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg,#1D9E75,#0f7a5a)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontSize: 14, fontWeight: 700 }}>Rx</span>
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>E-Prescription API</span>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => navigate('/developer/login')} style={{ padding: '8px 16px', border: '1px solid #e5e7eb', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 14, color: '#374151' }}>Sign In</button>
            <button onClick={() => navigate('/developer/register')} style={{ padding: '8px 16px', border: 'none', borderRadius: 8, background: '#1D9E75', cursor: 'pointer', fontSize: 14, color: 'white', fontWeight: 600 }}>Get API Key</button>
          </div>
        </div>
      </header>
      <section style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#1D9E75 100%)', padding: '80px 32px', textAlign: 'center' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <h1 style={{ fontSize: 44, fontWeight: 800, color: 'white', margin: '0 0 20px', lineHeight: 1.2 }}>Integrate Electronic<br />Prescriptions in Your MIS</h1>
          <p style={{ fontSize: 18, color: '#c7d2fe', margin: '0 0 40px', lineHeight: 1.6 }}>Connect your medical information system to E-Prescription API.<br />Create prescriptions, send QR codes to patients, track dispensing.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => navigate('/developer/register')} style={{ padding: '14px 32px', background: '#1D9E75', border: 'none', borderRadius: 10, color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>Get API Key →</button>
            <button onClick={() => navigate('/developer/docs')} style={{ padding: '14px 32px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, color: 'white', fontSize: 16, cursor: 'pointer' }}>View Docs</button>
          </div>
        </div>
      </section>
      <section style={{ padding: '80px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 700, color: '#111827', marginBottom: 48 }}>What you can do</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
            {features.map(f => (
              <div key={f.title} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: '#6b7280', margin: 0, lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section style={{ background: '#1e1b4b', padding: '60px 32px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, color: 'white', marginBottom: 32 }}>Simple Integration</h2>
          <div style={{ background: '#0f0e1a', borderRadius: 12, padding: 24, fontFamily: 'monospace', fontSize: 13, lineHeight: 2, overflowX: 'auto' }}>
            <div style={{ color: '#6b7280' }}>// POST /api/external/prescriptions</div>
            <div style={{ color: '#f9fafb' }}>fetch(<span style={{ color: '#34d399' }}>'https://api.../external/prescriptions'</span>, {'{'}</div>
            <div style={{ color: '#f9fafb', paddingLeft: 16 }}>method: <span style={{ color: '#fbbf24' }}>'POST'</span>,</div>
            <div style={{ color: '#f9fafb', paddingLeft: 16 }}>headers: {'{ '}<span style={{ color: '#34d399' }}>'X-API-Key'</span>: <span style={{ color: '#fbbf24' }}>'epx_your_key...'</span> {'}'},</div>
            <div style={{ color: '#f9fafb', paddingLeft: 16 }}>body: JSON.stringify({'{'} patientIin, medications {'}'})</div>
            <div style={{ color: '#f9fafb' }}>{')'}</div>
            <br />
            <div style={{ color: '#6b7280' }}>// Response 201:</div>
            <div style={{ color: '#34d399' }}>{'{ prescriptionId: "abc123", qrUrl: "https://...", expiresAt: "..." }'}</div>
          </div>
        </div>
      </section>
      <section style={{ padding: '80px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 700, color: '#111827', marginBottom: 48 }}>How to get started</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24 }}>
            {steps.map(s => (
              <div key={s.n} style={{ textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, background: '#1D9E75', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 20, fontWeight: 700, color: 'white' }}>{s.n}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <button onClick={() => navigate('/developer/register')} style={{ padding: '14px 40px', background: '#1D9E75', border: 'none', borderRadius: 10, color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>Register your organization →</button>
          </div>
        </div>
      </section>
      <footer style={{ background: '#111827', padding: '32px', textAlign: 'center' }}>
        <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>E-Prescription System · Kazakhstan · 2026</p>
      </footer>
    </div>
  );
}
