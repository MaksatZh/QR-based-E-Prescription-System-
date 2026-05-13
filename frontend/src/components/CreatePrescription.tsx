import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner@2.0.3';
import { prescriptionApi } from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Plus, Trash2, ArrowLeft, Save, Search, AlertTriangle,
  AlertCircle, User, Pill, Stethoscope, Weight, Sparkles,
  ChevronDown, Clock, Calendar, CheckCircle2, X, ShieldAlert
} from 'lucide-react';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';
const getToken = () => localStorage.getItem('token') || '';

async function apiFetch(path: string) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) return null;
  return res.json();
}

async function apiPost(path: string, body: any) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  return res.json();
}

function calcAge(iin: string): number | null {
  if (iin.length < 7) return null;
  const yy = parseInt(iin.substring(0, 2));
  const mm = parseInt(iin.substring(2, 4));
  const dd = parseInt(iin.substring(4, 6));
  const genderDigit = parseInt(iin[6]);
  let century: number;
  if (genderDigit <= 2) century = 1800;
  else if (genderDigit <= 4) century = 1900;
  else century = 2000;
  const birth = new Date(century + yy, mm - 1, dd);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())) age--;
  return age;
}

function getGender(iin: string): string | null {
  if (iin.length < 7) return null;
  return parseInt(iin[6]) % 2 === 1 ? 'Male' : 'Female';
}

function getCategory(age: number | null) {
  if (age === null) return null;
  if (age < 18) return { label: 'Child', color: '#3b82f6', bg: '#eff6ff', value: 'child' };
  if (age >= 60) return { label: 'Elderly', color: '#f59e0b', bg: '#fffbeb', value: 'elderly' };
  return { label: 'Adult', color: '#10b981', bg: '#f0fdf4', value: 'adult' };
}

function generateInstruction(med: MedItem): string {
  const parts: string[] = [];
  const route = med.routeOfAdmin || 'Принимать внутрь';
  parts.push(route);
  if (med.dosage) parts.push(`по ${med.dosage}`);
  if (med.frequency) parts.push(med.frequency);
  if (med.startDate && med.durationDays) {
    const start = new Date(med.startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + med.durationDays);
    const fmt = (d: Date) => d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    parts.push(`с ${fmt(start)} по ${fmt(end)}`);
  } else if (med.durationDays) {
    parts.push(`в течение ${med.durationDays} дней`);
  }
  return parts.join(', ') + '.';
}

interface MedItem {
  id: string;
  name: string;
  form: string;
  dosage: string;
  quantity: number;
  course: string;
  drugId?: string;
  atxCode?: string;
  routeOfAdmin?: string;
  startDate?: string;
  durationDays?: number;
  frequency?: string;
  instructions?: string;
  availableDosages?: string[];
}

interface Interaction {
  drugA?: { mnn: string };
  drugB?: { mnn: string };
  severity: 'warning' | 'contraindicated';
  description: string;
}

function Combobox({
                    value, onChange, onSelect, fetchResults, placeholder, renderItem, getKey, getLabel
                  }: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (item: any) => void;
  fetchResults: (q: string) => Promise<any[]>;
  placeholder?: string;
  renderItem: (item: any) => React.ReactNode;
  getKey: (item: any) => string;
  getLabel: (item: any) => string;
}) {
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = useCallback((v: string) => {
    onChange(v);
    clearTimeout(debounceRef.current);
    if (v.length >= 2) {
      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        const r = await fetchResults(v);
        setResults(r);
        setOpen(r.length > 0);
        setLoading(false);
      }, 300);
    } else {
      setResults([]);
      setOpen(false);
    }
  }, [onChange, fetchResults]);

  return (
      <div ref={ref} style={{ position: 'relative', zIndex: open ? 9999 : 'auto' }}>
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#9ca3af' }} />
          <input
              value={value}
              onChange={e => handleChange(e.target.value)}
              onFocus={() => results.length > 0 && setOpen(true)}
              placeholder={placeholder}
              style={{
                width: '100%', height: 40, paddingLeft: 36, paddingRight: 12,
                border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14,
                outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
                fontFamily: 'inherit',
              }}
              onBlur={(e: any) => e.target.style.borderColor = '#e5e7eb'}
          />
          {loading && (
              <div style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                width: 14, height: 14, border: '2px solid #e5e7eb', borderTopColor: '#6366f1',
                borderRadius: '50%', animation: 'spin 0.6s linear infinite',
              }} />
          )}
        </div>
        {open && results.length > 0 && (
            <div style={{
              position: 'absolute', zIndex: 9999, top: '100%', left: 0, right: 0, marginTop: 4,
              background: 'white', border: '1px solid #e5e7eb', borderRadius: 10,
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)', maxHeight: 320, overflowY: 'auto',
            }}>
              {results.map(item => (
                  <button
                      key={getKey(item)}
                      type="button"
                      onClick={() => { onSelect(item); onChange(getLabel(item)); setOpen(false); }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px',
                        background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid #f3f4f6',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={(e: any) => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={(e: any) => e.currentTarget.style.background = 'none'}
                  >
                    {renderItem(item)}
                  </button>
              ))}
              <div style={{ padding: '8px 14px', fontSize: 11, color: '#9ca3af', fontStyle: 'italic', borderTop: '1px solid #f3f4f6', background: '#fafafa' }}>
                Не нашли? Введите вручную
              </div>
            </div>
        )}
      </div>
  );
}

const FREQUENCIES = [
  { label: '1×/day', value: 'один раз в день' },
  { label: '2×/day', value: 'два раза в день' },
  { label: '3×/day', value: 'три раза в день' },
  { label: '4×/day', value: 'четыре раза в день' },
  { label: '1×/week', value: 'один раз в неделю' },
  { label: '2×/week', value: 'два раза в неделю' },
  { label: 'As needed', value: 'по необходимости' },
];

export default function CreatePrescription() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [iin, setIin] = useState('');
  const [patient, setPatient] = useState({ fullName: '', phone: '', email: '' });
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientExtra, setPatientExtra] = useState<{ age: number | null; gender: string | null; existingPatient: boolean }>({
    age: null, gender: null, existingPatient: false,
  });
  const [diagnosisCode, setDiagnosisCode] = useState('');
  const [diagnosisName, setDiagnosisName] = useState('');
  const [weight, setWeight] = useState('');
  const [suggestedDrugs, setSuggestedDrugs] = useState<any[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [patientInteractions, setPatientInteractions] = useState<Interaction[]>([]);
  const [medications, setMedications] = useState<MedItem[]>([
    { id: crypto.randomUUID(), name: '', form: '', dosage: '', quantity: 0, course: '' },
  ]);

  const age = calcAge(iin);
  const gender = getGender(iin);
  const category = getCategory(age);

  // Auto-fill patient from IIN
  useEffect(() => {
    if (iin.length !== 12) return;
    apiFetch(`/drugs/patient-info?iin=${iin}`).then(info => {
      if (!info) return;
      if (info.patient) {
        setPatient({ fullName: info.patient.fullName, phone: info.patient.phone, email: info.patient.email });
        setPatientExtra({ age: info.age, gender: info.gender, existingPatient: true });
        setPatientId(info.patient.id);
        toast.success('Пациент найден в базе');
      } else {
        setPatientExtra({ age: info.age, gender: info.gender, existingPatient: false });
        setPatientId(null);
      }
    });
  }, [iin]);

  // Load suggested drugs by diagnosis
  useEffect(() => {
    if (!diagnosisCode || diagnosisCode.length < 3) { setSuggestedDrugs([]); return; }
    apiFetch(`/drugs/by-diagnosis?code=${diagnosisCode}${age ? `&age=${age}` : ''}`).then(data => {
      setSuggestedDrugs(data?.drugs || []);
    });
  }, [diagnosisCode, age]);

  // Check interactions within this prescription
  useEffect(() => {
    const drugIds = medications.filter(m => m.drugId).map(m => m.drugId!);
    if (drugIds.length < 2) { setInteractions([]); return; }
    apiPost('/drugs/check-interactions', { drugIds }).then(data => {
      setInteractions(data?.interactions || []);
    });
  }, [medications]);

  // Check interactions with patient's existing active prescriptions
  useEffect(() => {
    const drugIds = medications.filter(m => m.drugId).map(m => m.drugId!);
    if (drugIds.length === 0 || !patientId) { setPatientInteractions([]); return; }
    apiPost('/drugs/check-patient-interactions', { patientId, drugIds }).then(data => {
      setPatientInteractions(data?.interactions || []);
    });
  }, [medications, patientId]);

  const addMed = () => setMedications(prev => [
    ...prev, { id: crypto.randomUUID(), name: '', form: '', dosage: '', quantity: 0, course: '' }
  ]);

  const removeMed = (id: string) => {
    if (medications.length > 1) setMedications(prev => prev.filter(m => m.id !== id));
  };

  const updateMed = (id: string, field: string, value: any) =>
      setMedications(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));

  const selectDrug = (medId: string, drug: any) => {
    const dosages = drug.dosages ? drug.dosages.split(',').map((d: string) => d.trim()).filter(Boolean) : [];
    setMedications(prev => prev.map(m => m.id === medId ? {
      ...m, name: drug.mnn, form: drug.form || '',
      atxCode: drug.atxCode, routeOfAdmin: drug.routeOfAdmin,
      drugId: drug.id, availableDosages: dosages,
      dosage: dosages[0] || m.dosage,
    } : m));
  };

  const selectDiagnosisDrug = (drug: any) => {
    const emptyMed = medications.find(m => !m.name);
    if (emptyMed) {
      selectDrug(emptyMed.id, drug);
    } else {
      const newId = crypto.randomUUID();
      const dosages = drug.dosages ? drug.dosages.split(',').map((d: string) => d.trim()).filter(Boolean) : [];
      setMedications(prev => [...prev, {
        id: newId, name: drug.mnn, form: drug.form || '', dosage: dosages[0] || '',
        quantity: 0, course: '', drugId: drug.id, atxCode: drug.atxCode,
        routeOfAdmin: drug.routeOfAdmin, availableDosages: dosages,
      }]);
    }
  };

  const autoGenerate = (med: MedItem) => {
    const instruction = generateInstruction(med);
    updateMed(med.id, 'course', instruction);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient.fullName || !iin || !patient.phone || !patient.email) {
      toast.error('Заполните все данные пациента'); return;
    }
    if (iin.length !== 12) { toast.error('ИИН должен содержать 12 цифр'); return; }
    if (medications.some(m => !m.name || !m.dosage || !m.quantity)) {
      toast.error('Заполните все поля препаратов'); return;
    }

    setLoading(true);
    try {
      await prescriptionApi.create({
        patient: { fullName: patient.fullName, iin, phone: patient.phone, email: patient.email },
        medications: medications.map(m => ({
          name: m.name, form: m.form || 'other', dosage: m.dosage,
          qtyPrescribed: m.quantity, course: m.course || generateInstruction(m),
          drugId: m.drugId, atxCode: m.atxCode, routeOfAdmin: m.routeOfAdmin,
          startDate: m.startDate, durationDays: m.durationDays,
          frequency: m.frequency, instructions: m.course || generateInstruction(m),
        })),
        diagnosisCode: diagnosisCode || undefined,
        diagnosisName: diagnosisName || undefined,
        patientWeight: weight ? parseFloat(weight) : undefined,
        patientAge: age ?? undefined,
        patientCategory: category?.value as any,
      });
      toast.success('Рецепт создан. QR-код отправлен пациенту.');
      navigate('/dashboard/doctor');
    } catch (err: any) {
      toast.error(err.message || 'Ошибка создания рецепта');
    } finally {
      setLoading(false);
    }
  };

  const contraindicated = interactions.filter(i => i.severity === 'contraindicated');
  const warnings = interactions.filter(i => i.severity === 'warning');
  const hasInteractions = contraindicated.length > 0 || warnings.length > 0;
  const hasPatientInteractions = patientInteractions.length > 0;

  return (
      <div style={{ padding: '24px', maxWidth: 860, margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        .card { background: white; border-radius: 12px; border: 1px solid #e5e7eb; margin-bottom: 16px; }
        .card-header { padding: 12px 20px; background: #fafafa; border-bottom: 1px solid #f3f4f6; display: flex; align-items: center; gap: 8px; border-radius: 12px 12px 0 0; }
        .field-label { font-size: 13px; font-weight: 500; color: #374151; margin-bottom: 6px; display: block; }
        .field-input { width: 100%; height: 40px; padding: 0 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; outline: none; box-sizing: border-box; font-family: inherit; transition: border-color 0.15s; }
        .field-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }
        .tag-btn { padding: 5px 12px; border-radius: 20px; font-size: 12px; border: 1px solid #e5e7eb; background: white; cursor: pointer; transition: all 0.15s; color: #374151; }
        .tag-btn:hover { border-color: #6366f1; color: #6366f1; background: #f0f0ff; }
        .tag-btn.active { background: #6366f1; color: white; border-color: #6366f1; }
        .freq-btn { padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 500; border: 1.5px solid #e5e7eb; background: white; cursor: pointer; transition: all 0.15s; color: #6b7280; }
        .freq-btn:hover { border-color: #6366f1; color: #6366f1; }
        .freq-btn.active { background: #1e1b4b; color: white; border-color: #1e1b4b; }
        .dosage-chip { padding: 4px 10px; border-radius: 6px; font-size: 12px; border: 1px solid #e5e7eb; background: white; cursor: pointer; transition: all 0.12s; color: #374151; }
        .dosage-chip:hover { border-color: #6366f1; background: #f0f0ff; color: #6366f1; }
        .dosage-chip.active { background: #eff6ff; border-color: #3b82f6; color: #1d4ed8; font-weight: 600; }
        .gen-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; border: 1.5px solid #e5e7eb; background: white; cursor: pointer; color: #6366f1; transition: all 0.15s; }
        .gen-btn:hover { background: #f0f0ff; border-color: #6366f1; }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        @media (max-width: 600px) { .grid2, .grid3 { grid-template-columns: 1fr; } }
      `}</style>

        <button
            onClick={() => navigate('/dashboard/doctor')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 20, padding: 0 }}
        >
          <ArrowLeft size={15} /> Back to prescriptions
        </button>

        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>New prescription</h2>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>Fill in the patient's details and prescribe medications</p>
        </div>

        <form onSubmit={handleSubmit}>

          <div className="card">
            <div className="card-header">
              <User size={15} color="#6366f1" />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Patient data</span>
              {patientExtra.existingPatient && (
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle2 size={12} /> Найден в базе
              </span>
              )}
            </div>
            <div style={{ padding: '16px 20px' }}>
              <div style={{ marginBottom: 12 }}>
                <label className="field-label">IIN *</label>
                <div style={{ position: 'relative' }}>
                  <input
                      className="field-input"
                      placeholder="920415350167"
                      maxLength={12}
                      value={iin}
                      onChange={e => setIin(e.target.value.replace(/\D/g, ''))}
                      required
                  />
                  {iin.length === 12 && (
                      <CheckCircle2 size={16} color="#10b981" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  )}
                </div>
                {age !== null && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>Age: <strong>{age} лет</strong></span>
                      {gender && <span style={{ fontSize: 12, color: '#6b7280' }}>· {gender}</span>}
                      {category && (
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: category.bg, color: category.color, fontWeight: 600 }}>{category.label}</span>
                      )}
                    </div>
                )}
              </div>

              <div className="grid2" style={{ marginBottom: 12 }}>
                <div>
                  <label className="field-label">Full name *</label>
                  <input className="field-input" placeholder="Асель Каримова" value={patient.fullName}
                         onChange={e => setPatient(p => ({ ...p, fullName: e.target.value }))} required />
                </div>
                <div>
                  <label className="field-label">Phone*</label>
                  <input className="field-input" type="tel" placeholder="+77771234567" value={patient.phone}
                         onChange={e => setPatient(p => ({ ...p, phone: e.target.value }))} required />
                </div>
              </div>

              <div className="grid2">
                <div>
                  <label className="field-label">Email *</label>
                  <input className="field-input" type="email" placeholder="patient@example.kz" value={patient.email}
                         onChange={e => setPatient(p => ({ ...p, email: e.target.value }))} required />
                </div>
                <div>
                  <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Weight size={13} /> Weight (kg)
                  </label>
                  <input className="field-input" type="number" placeholder="70" min="1" max="300"
                         value={weight} onChange={e => setWeight(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <Stethoscope size={15} color="#6366f1" />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Diagnosis</span>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <div className="grid2" style={{ marginBottom: suggestedDrugs.length > 0 ? 14 : 0 }}>
                <div>
                  <label className="field-label">МКБ-10 Code</label>
                  <Combobox
                      value={diagnosisCode}
                      onChange={setDiagnosisCode}
                      onSelect={item => { setDiagnosisCode(item.code); setDiagnosisName(item.name); }}
                      fetchResults={async q => {
                        const data = await apiFetch(`/drugs/icd10/search?q=${encodeURIComponent(q)}`);
                        return data?.codes || [];
                      }}
                      placeholder="I10, J18..."
                      getKey={i => i.code}
                      getLabel={i => i.code}
                      renderItem={i => (
                          <div>
                            <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#6366f1', marginRight: 8, fontWeight: 600 }}>{i.code}</span>
                            <span style={{ fontSize: 13, color: '#374151' }}>{i.name}</span>
                          </div>
                      )}
                  />
                </div>
                <div>
                  <label className="field-label">Name of the diagnosis</label>
                  <Combobox
                      value={diagnosisName}
                      onChange={setDiagnosisName}
                      onSelect={item => { setDiagnosisCode(item.code); setDiagnosisName(item.name); }}
                      fetchResults={async q => {
                        const data = await apiFetch(`/drugs/icd10/search?q=${encodeURIComponent(q)}`);
                        return data?.codes || [];
                      }}
                      placeholder="Гипертония, Пневмония..."
                      getKey={i => i.code}
                      getLabel={i => i.name}
                      renderItem={i => (
                          <div>
                            <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#6366f1', marginRight: 8 }}>{i.code}</span>
                            <span style={{ fontSize: 13, color: '#374151' }}>{i.name}</span>
                          </div>
                      )}
                  />
                </div>
              </div>

              {suggestedDrugs.length > 0 && (
                  <div style={{ background: '#f0f4ff', border: '1px solid #c7d2fe', borderRadius: 10, padding: '12px 14px', animation: 'slideIn 0.2s ease' }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#4338ca', marginBottom: 8, marginTop: 0 }}>
                      💊 Препараты по диагнозу {diagnosisCode} ({suggestedDrugs.length}):
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {suggestedDrugs.slice(0, 15).map((drug: any) => (
                          <button key={drug.id} type="button" className="tag-btn"
                                  onClick={() => selectDiagnosisDrug(drug)}
                                  title={`${drug.form} · ${drug.routeOfAdmin}`}>
                            {drug.mnn}
                          </button>
                      ))}
                      {suggestedDrugs.length > 15 && (
                          <span style={{ fontSize: 11, color: '#6b7280', alignSelf: 'center' }}>+{suggestedDrugs.length - 15} ещё</span>
                      )}
                    </div>
                  </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <Pill size={15} color="#6366f1" />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Medication</span>
              <button type="button" onClick={addMed}
                      style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', color: '#374151' }}>
                <Plus size={13} /> Add
              </button>
            </div>

            {medications.map((med, index) => (
                <div key={med.id} style={{ padding: '20px', borderBottom: index < medications.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>MEDICATION #{index + 1}</span>
                    {medications.length > 1 && (
                        <button type="button" onClick={() => removeMed(med.id)}
                                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                          <Trash2 size={13} /> Удалить
                        </button>
                    )}
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label className="field-label">Препарат (МНН или торговое название) *</label>
                    <Combobox
                        value={med.name}
                        onChange={v => updateMed(med.id, 'name', v)}
                        onSelect={drug => selectDrug(med.id, drug)}
                        fetchResults={async q => {
                          const data = await apiFetch(`/drugs/search?q=${encodeURIComponent(q)}`);
                          return data?.drugs || [];
                        }}
                        placeholder="Кандесартан, Амоксициллин..."
                        getKey={d => d.id}
                        getLabel={d => d.mnn}
                        renderItem={d => (
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{d.mnn}</div>
                              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2, display: 'flex', gap: 6 }}>
                                <span style={{ fontFamily: 'monospace', color: '#6366f1' }}>{d.atxCode}</span>
                                <span>·</span>
                                <span>{d.form?.slice(0, 35)}</span>
                                <span>·</span>
                                <span style={{ color: '#10b981' }}>{d.routeOfAdmin}</span>
                              </div>
                            </div>
                        )}
                    />
                    {med.atxCode && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                          <span style={{ fontSize: 11, fontFamily: 'monospace', background: '#f0f4ff', color: '#4338ca', padding: '2px 8px', borderRadius: 4 }}>{med.atxCode}</span>
                          {med.routeOfAdmin && <span style={{ fontSize: 11, color: '#10b981', background: '#f0fdf4', padding: '2px 8px', borderRadius: 4 }}>📍 {med.routeOfAdmin}</span>}
                        </div>
                    )}
                  </div>

                  <div className="grid2" style={{ marginBottom: 12 }}>
                    <div>
                      <label className="field-label">Medicinal form</label>
                      <input className="field-input" placeholder="Таблетки, Раствор для инъекций..."
                             value={med.form} onChange={e => updateMed(med.id, 'form', e.target.value)} />
                    </div>
                    <div>
                      <label className="field-label">Dosage *</label>
                      {med.availableDosages && med.availableDosages.length > 0 ? (
                          <div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                              {med.availableDosages.map(d => (
                                  <button key={d} type="button"
                                          className={`dosage-chip ${med.dosage === d ? 'active' : ''}`}
                                          onClick={() => updateMed(med.id, 'dosage', d)}>{d}</button>
                              ))}
                            </div>
                            <input className="field-input" placeholder="Или введите вручную"
                                   value={med.dosage} onChange={e => updateMed(med.id, 'dosage', e.target.value)}
                                   style={{ height: 32, fontSize: 13 }} />
                          </div>
                      ) : (
                          <input className="field-input" placeholder="500 мг, 10 мг/мл..."
                                 value={med.dosage} onChange={e => updateMed(med.id, 'dosage', e.target.value)} required />
                      )}
                    </div>
                  </div>

                  <div className="grid3" style={{ marginBottom: 12 }}>
                    <div>
                      <label className="field-label">Quantity (pack) *</label>
                      <input className="field-input" type="number" min="1" placeholder="30"
                             value={med.quantity || ''} onChange={e => updateMed(med.id, 'quantity', parseInt(e.target.value) || 0)} required />
                    </div>
                    <div>
                      <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={12} /> Start date
                      </label>
                      <input className="field-input" type="date"
                             value={med.startDate || ''} onChange={e => updateMed(med.id, 'startDate', e.target.value)} />
                    </div>
                    <div>
                      <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} /> Course (days)
                      </label>
                      <input className="field-input" type="number" min="1" placeholder="30"
                             value={med.durationDays || ''} onChange={e => updateMed(med.id, 'durationDays', parseInt(e.target.value) || undefined)} />
                    </div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} /> Reception frequency
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {FREQUENCIES.map(f => (
                          <button key={f.value} type="button"
                                  className={`freq-btn ${med.frequency === f.value ? 'active' : ''}`}
                                  onClick={() => updateMed(med.id, 'frequency', med.frequency === f.value ? '' : f.value)}>
                            {f.label}
                          </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <label className="field-label" style={{ margin: 0 }}>Instructions / Course</label>
                      {(med.routeOfAdmin || med.frequency || med.durationDays) && (
                          <button type="button" className="gen-btn" onClick={() => autoGenerate(med)}>
                            <Sparkles size={13} />
                            Generate automatically
                          </button>
                      )}
                    </div>
                    {med.course && (
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', marginBottom: 8, fontSize: 13, color: '#334155', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <CheckCircle2 size={15} color="#10b981" style={{ marginTop: 2, flexShrink: 0 }} />
                          <span>{med.course}</span>
                          <button type="button" onClick={() => updateMed(med.id, 'course', '')}
                                  style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', flexShrink: 0 }}>
                            <X size={13} />
                          </button>
                        </div>
                    )}
                    <textarea
                        placeholder="Принимать внутрь по 1 таблетке 1 раз в день утром."
                        value={med.course}
                        onChange={e => updateMed(med.id, 'course', e.target.value)}
                        rows={2}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box', color: '#374151' }}
                    />
                  </div>
                </div>
            ))}
          </div>

          {/* Конфликт с другими рецептами пациента — фиолетовый баннер */}
          {hasPatientInteractions && (
              <div style={{ background: '#fdf4ff', border: '2px solid #d946ef', borderRadius: 12, padding: '16px 18px', marginBottom: 16, animation: 'slideIn 0.3s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f5d0fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <AlertCircle size={16} color="#a21caf" />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#a21caf' }}>
                      ⚠️ Конфликт с активными рецептами пациента
                    </div>
                    <div style={{ fontSize: 12, color: '#86198f', marginTop: 2 }}>
                      Найдено {patientInteractions.length} взаимодействий с препаратами из других активных рецептов
                    </div>
                  </div>
                </div>
                {patientInteractions.map((i, idx) => (
                    <div key={idx} style={{ background: '#fae8ff', borderRadius: 8, padding: '10px 14px', marginBottom: idx < patientInteractions.length - 1 ? 8 : 0, fontSize: 13, color: '#581c87', borderLeft: '3px solid #a21caf' }}>
                      <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{i.drugA?.mnn}</span>
                        <span style={{ color: '#a21caf' }}>↔</span>
                        <span>{i.drugB?.mnn}</span>
                        {i.severity === 'contraindicated' && (
                            <span style={{ fontSize: 10, background: '#dc2626', color: 'white', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>ПРОТИВОПОКАЗАНО</span>
                        )}
                      </div>
                      <div style={{ color: '#6b21a8', lineHeight: 1.4 }}>
                        {i.description.slice(0, 200)}{i.description.length > 200 ? '...' : ''}
                      </div>
                    </div>
                ))}
              </div>
          )}

          {/* Взаимодействия внутри рецепта */}
          {hasInteractions && (
              <div style={{ animation: 'slideIn 0.3s ease', marginBottom: 16 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
                  padding: '10px 16px', borderRadius: 10,
                  background: contraindicated.length > 0 ? '#fef2f2' : '#fffbeb',
                  border: `1.5px solid ${contraindicated.length > 0 ? '#fca5a5' : '#fde68a'}`,
                }}>
                  <ShieldAlert size={20} color={contraindicated.length > 0 ? '#dc2626' : '#d97706'} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: contraindicated.length > 0 ? '#dc2626' : '#d97706' }}>
                      Проверьте перед выпиской
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                      Обнаружено {interactions.length} {interactions.length === 1 ? 'взаимодействие' : interactions.length < 5 ? 'взаимодействия' : 'взаимодействий'} между назначенными препаратами
                    </div>
                  </div>
                </div>

                {contraindicated.length > 0 && (
                    <div style={{ background: '#fef2f2', border: '2px solid #fca5a5', borderRadius: 12, padding: '16px 18px', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <AlertCircle size={16} color="#dc2626" />
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#dc2626' }}>
                    Противопоказанные сочетания ({contraindicated.length})
                  </span>
                      </div>
                      {contraindicated.map((i, idx) => (
                          <div key={idx} style={{ background: '#fee2e2', borderRadius: 8, padding: '10px 14px', marginBottom: idx < contraindicated.length - 1 ? 8 : 0, fontSize: 13, color: '#7f1d1d', borderLeft: '3px solid #dc2626' }}>
                            <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>{i.drugA?.mnn}</span>
                              <span style={{ color: '#dc2626', fontSize: 16 }}>×</span>
                              <span>{i.drugB?.mnn}</span>
                            </div>
                            <div style={{ color: '#991b1b', lineHeight: 1.4 }}>
                              {i.description.slice(0, 200)}{i.description.length > 200 ? '...' : ''}
                            </div>
                          </div>
                      ))}
                    </div>
                )}

                {warnings.length > 0 && (
                    <div style={{ background: '#fffbeb', border: '2px solid #fde68a', borderRadius: 12, padding: '16px 18px', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <AlertTriangle size={16} color="#d97706" />
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#d97706' }}>
                    Предупреждения о взаимодействиях ({warnings.length})
                  </span>
                      </div>
                      {warnings.map((i, idx) => (
                          <div key={idx} style={{ background: '#fef3c7', borderRadius: 8, padding: '10px 14px', marginBottom: idx < warnings.length - 1 ? 8 : 0, fontSize: 13, color: '#78350f', borderLeft: '3px solid #d97706' }}>
                            <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>{i.drugA?.mnn}</span>
                              <span style={{ color: '#d97706' }}>+</span>
                              <span>{i.drugB?.mnn}</span>
                            </div>
                            <div style={{ color: '#92400e', lineHeight: 1.4 }}>
                              {i.description.slice(0, 200)}{i.description.length > 200 ? '...' : ''}
                            </div>
                          </div>
                      ))}
                    </div>
                )}
              </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
            {hasInteractions && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, marginRight: 'auto',
                  fontSize: 12, fontWeight: 600,
                  color: contraindicated.length > 0 ? '#dc2626' : '#d97706',
                  animation: 'pulse 2s ease-in-out infinite',
                }}>
                  {contraindicated.length > 0 ? <AlertCircle size={14} /> : <AlertTriangle size={14} />}
                  {contraindicated.length > 0 ? `${contraindicated.length} противопоказ.` : `${warnings.length} предупр.`}
                </div>
            )}
            <button type="button"
                    onClick={() => navigate('/dashboard/doctor')}
                    style={{ height: 42, padding: '0 20px', borderRadius: 10, fontSize: 14, fontWeight: 500, border: '1.5px solid #e5e7eb', background: 'white', cursor: 'pointer', color: '#374151' }}>
              Cancel
            </button>
            <button type="submit" disabled={loading}
                    style={{ height: 42, padding: '0 24px', borderRadius: 10, fontSize: 14, fontWeight: 600, border: 'none', background: loading ? '#9ca3af' : '#6366f1', color: 'white', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.15s' }}>
              {loading ? (
                  <>
                    <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                    Creation…
                  </>
              ) : (
                  <><Save size={16} /> Create Prescription</>
              )}
            </button>
          </div>

        </form>
      </div>
  );
}
