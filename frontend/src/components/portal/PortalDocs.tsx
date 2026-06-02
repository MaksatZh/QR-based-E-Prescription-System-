import { useState } from 'react';
import { useNavigate } from 'react-router';

export default function PortalDocs() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const BASE = 'https://qr-based-e-prescription-system-production.up.railway.app/api/external';

  const endpoints = [
    {
      id: 'create',
      method: 'POST',
      path: '/prescriptions',
      color: '#059669', bg: '#dcfce7',
      desc: 'Create a new prescription. Patient receives QR code via email.',
      request: `POST ${BASE}/prescriptions
X-API-Key: epx_your_key_here
Content-Type: application/json

{
  "patientIin": "920415350167",
  "patientName": "Asel Karimova",
  "patientPhone": "+77771234567",
  "patientEmail": "patient@example.kz",
  "diagnosisCode": "I10",
  "diagnosisName": "Hypertension",
  "doctorName": "Dr. Ivanov A.P.",
  "medications": [
    {
      "name": "Амлодипин",
      "dosage": "5 мг",
      "form": "Таблетки",
      "quantity": 30,
      "course": "1 tablet daily in the morning"
    }
  ]
}`,
      response: `HTTP 201 Created

{
  "success": true,
  "prescriptionId": "cmnzmgjb400056fj2tsb92mkp",
  "qrUrl": "https://app.../patient/cmnzmgjb400056fj2tsb92mkp",
  "expiresAt": "2026-06-25T10:00:00.000Z",
  "patient": {
    "iin": "920415350167",
    "fullName": "Asel Karimova"
  }
}`,
    },
    {
      id: 'status',
      method: 'GET',
      path: '/prescriptions/:id',
      color: '#2563eb', bg: '#dbeafe',
      desc: 'Get prescription status, patient info and medications with dispensing progress.',
      request: `GET ${BASE}/prescriptions/cmnzmgjb400056fj2tsb92mkp
X-API-Key: epx_your_key_here`,
      response: `HTTP 200 OK

{
  "id": "cmnzmgjb400056fj2tsb92mkp",
  "status": "active",
  "createdAt": "2026-05-26T10:00:00.000Z",
  "expiresAt": "2026-06-25T10:00:00.000Z",
  "qrUrl": "https://app.../patient/cmnzmgjb400056fj2...",
  "patient": {
    "fullName": "Asel Karimova",
    "iin": "920415350167",
    "phone": "+77771234567",
    "email": "patient@example.kz"
  },
  "medications": [
    {
      "id": "uuid-1234",
      "name": "Амлодипин",
      "dosage": "5 мг",
      "form": "Таблетки",
      "qtyPrescribed": 30,
      "qtyDispensed": 10,
      "qtyRemaining": 20,
      "course": "1 tablet daily"
    }
  ]
}`,
    },
    {
      id: 'qr',
      method: 'GET',
      path: '/prescriptions/:id/qr',
      color: '#2563eb', bg: '#dbeafe',
      desc: 'Get QR code as base64 PNG image. Can be displayed directly in your interface.',
      request: `GET ${BASE}/prescriptions/cmnzmgjb400056fj2tsb92mkp/qr
X-API-Key: epx_your_key_here`,
      response: `HTTP 200 OK

{
  "qrDataUrl": "data:image/png;base64,iVBORw0KGgo...",
  "patientUrl": "https://app.../patient/cmnzmgjb400056fj2...",
  "status": "active"
}

// Use qrDataUrl directly in <img> tag:
// <img src={qrDataUrl} alt="QR Code" />`,
    },
    {
      id: 'patient',
      method: 'GET',
      path: '/patients/:iin',
      color: '#2563eb', bg: '#dbeafe',
      desc: 'Look up patient by IIN. Returns patient data and count of active prescriptions.',
      request: `GET ${BASE}/patients/920415350167
X-API-Key: epx_your_key_here`,
      response: `HTTP 200 OK

// Patient found:
{
  "found": true,
  "patient": {
    "id": "uuid-5678",
    "fullName": "Asel Karimova",
    "iin": "920415350167",
    "phone": "+77771234567",
    "email": "patient@example.kz",
    "activePrescriptions": 2
  }
}

// Patient not found:
{
  "found": false,
  "patient": null
}`,
    },
  ];

  const statuses = [
    { s: 'active', color: '#059669', bg: '#dcfce7', desc: 'Prescription is valid and ready for dispensing' },
    { s: 'partially_dispensed', color: '#d97706', bg: '#fef3c7', desc: 'Some medications have been dispensed, remainder available' },
    { s: 'dispensed', color: '#2563eb', bg: '#dbeafe', desc: 'All medications have been fully dispensed' },
    { s: 'cancelled', color: '#dc2626', bg: '#fee2e2', desc: 'Prescription was cancelled by the doctor' },
    { s: 'expired', color: '#6b7280', bg: '#f3f4f6', desc: 'Prescription has expired (30 day limit)' },
  ];

  const errors = [
    { code: '400', title: 'Bad Request', desc: 'Invalid input data (e.g. IIN not 12 digits, missing required fields)' },
    { code: '401', title: 'Unauthorized', desc: 'Missing or invalid API key' },
    { code: '403', title: 'Forbidden', desc: 'Organization is suspended or not active' },
    { code: '404', title: 'Not Found', desc: 'Prescription or patient not found' },
    { code: '409', title: 'Conflict', desc: 'Duplicate resource (e.g. email already registered)' },
    { code: '500', title: 'Server Error', desc: 'Internal error — contact support' },
  ];

  return (
    <div style={{ fontFamily: 'system-ui,-apple-system,sans-serif', minHeight: '100vh', background: '#f9fafb' }}>

      {/* Header */}
      <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '0 32px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => navigate('/developer')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg,#1D9E75,#0f7a5a)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white' }}>Rx</div>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>E-Prescription API</span>
            </button>
            <span style={{ color: '#d1d5db' }}>·</span>
            <span style={{ fontSize: 14, color: '#6b7280' }}>Documentation</span>
          </div>
          <button onClick={() => navigate('/developer/register')}
            style={{ padding: '8px 16px', background: '#1D9E75', border: 'none', borderRadius: 8, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Get API Key →
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 32px' }}>

        {/* Title */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: '#111827', margin: '0 0 12px' }}>API Documentation</h1>
          <p style={{ fontSize: 16, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
            Integrate electronic prescriptions into your Medical Information System.<br />
            All endpoints require an <strong>X-API-Key</strong> header.
          </p>
        </div>

        {/* Auth info */}
        <div style={{ background: '#1e1b4b', borderRadius: 12, padding: 24, marginBottom: 40 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'white', margin: '0 0 12px' }}>🔐 Authentication</h2>
          <p style={{ fontSize: 14, color: '#c7d2fe', margin: '0 0 16px' }}>Add your API key to every request as a header:</p>
          <div style={{ background: '#0f0e1a', borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <code style={{ fontSize: 14, color: '#34d399', fontFamily: 'monospace' }}>
              X-API-Key: <span style={{ color: '#fbbf24' }}>epx_your_api_key_here</span>
            </code>
            <button onClick={() => copy('X-API-Key: epx_your_api_key_here', 'auth')}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, padding: '4px 12px', color: 'white', cursor: 'pointer', fontSize: 12 }}>
              {copied === 'auth' ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <p style={{ fontSize: 13, color: '#818cf8', margin: '12px 0 0' }}>
            Base URL: <code style={{ color: '#a5f3fc' }}>{window.location.origin.replace('3000', '3001')}/api/external</code>
          </p>
        </div>

        {/* Endpoints */}
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 20 }}>Endpoints</h2>
        {endpoints.map(ep => (
          <div key={ep.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, marginBottom: 20, overflow: 'hidden', background: 'white' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: ep.bg, color: ep.color, minWidth: 40, textAlign: 'center' }}>{ep.method}</span>
              <code style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{ep.path}</code>
              <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 4 }}>— {ep.desc}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              <div style={{ padding: 20, borderRight: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Request</span>
                  <button onClick={() => copy(ep.request, ep.id + '_req')}
                    style={{ background: '#f3f4f6', border: 'none', borderRadius: 4, padding: '3px 10px', fontSize: 11, cursor: 'pointer', color: '#6b7280' }}>
                    {copied === ep.id + '_req' ? '✓' : 'Copy'}
                  </button>
                </div>
                <pre style={{ background: '#1e1b4b', borderRadius: 8, padding: 16, margin: 0, fontSize: 12, lineHeight: 1.6, overflow: 'auto', color: '#e2e8f0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{ep.request}</pre>
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Response</span>
                  <button onClick={() => copy(ep.response, ep.id + '_res')}
                    style={{ background: '#f3f4f6', border: 'none', borderRadius: 4, padding: '3px 10px', fontSize: 11, cursor: 'pointer', color: '#6b7280' }}>
                    {copied === ep.id + '_res' ? '✓' : 'Copy'}
                  </button>
                </div>
                <pre style={{ background: '#052e16', borderRadius: 8, padding: 16, margin: 0, fontSize: 12, lineHeight: 1.6, overflow: 'auto', color: '#86efac', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{ep.response}</pre>
              </div>
            </div>
          </div>
        ))}

        {/* Prescription statuses */}
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '40px 0 20px' }}>Prescription Statuses</h2>
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          {statuses.map((s, i) => (
            <div key={s.s} style={{ padding: '14px 20px', borderBottom: i < statuses.length - 1 ? '1px solid #f3f4f6' : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>{s.s}</span>
              <span style={{ fontSize: 14, color: '#374151' }}>{s.desc}</span>
            </div>
          ))}
        </div>

        {/* Error codes */}
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '40px 0 20px' }}>Error Codes</h2>
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          {errors.map((e, i) => (
            <div key={e.code} style={{ padding: '14px 20px', borderBottom: i < errors.length - 1 ? '1px solid #f3f4f6' : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', background: '#fee2e2', padding: '3px 10px', borderRadius: 6, minWidth: 36, textAlign: 'center' }}>{e.code}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#111827', minWidth: 120 }}>{e.title}</span>
              <span style={{ fontSize: 14, color: '#6b7280' }}>{e.desc}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)', borderRadius: 16, padding: '40px', textAlign: 'center', marginTop: 48 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'white', margin: '0 0 12px' }}>Ready to integrate?</h2>
          <p style={{ color: '#c7d2fe', fontSize: 15, margin: '0 0 24px' }}>Register your organization and get an API key in minutes.</p>
          <button onClick={() => navigate('/developer/register')}
            style={{ padding: '14px 32px', background: '#1D9E75', border: 'none', borderRadius: 10, color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
            Get API Key →
          </button>
        </div>

      </div>
    </div>
  );
}
