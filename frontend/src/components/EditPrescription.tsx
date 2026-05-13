import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { toast } from 'sonner@2.0.3';
import { prescriptionApi } from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Plus, Trash2, ArrowLeft, Save, Lock, AlertCircle,
  Search, Pill, Stethoscope, CheckCircle2, Sparkles,
  Calendar, Clock, AlertTriangle, X, ShieldAlert
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

const FREQUENCIES = [
  { label: '1×/day', value: 'один раз в день' },
  { label: '2×/day', value: 'два раза в день' },
  { label: '3×/day', value: 'три раза в день' },
  { label: '4×/day', value: 'четыре раза в день' },
  { label: '1×/week', value: 'один раз в неделю' },
  { label: '2×/week', value: 'два раза в неделю' },
  { label: 'As needed', value: 'по необходимости' },
];

interface MedItem {
  id: string;
  name: string;
  form: string;
  dosage: string;
  quantity: number;
  course: string;
  dispensed: number;
  isNew: boolean;
  drugId?: string;
  atxCode?: string;
  routeOfAdmin?: string;
  startDate?: string;
  durationDays?: number;
  frequency?: string;
  availableDosages?: string[];
}

interface Interaction {
  drugA?: { mnn: string };
  drugB?: { mnn: string };
  severity: 'warning' | 'contraindicated';
  description: string;
}

function generateInstruction(med: MedItem): string {
  const parts: string[] = [];
  parts.push(med.routeOfAdmin || 'Принимать внутрь');
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

function DrugCombobox({ value, onChange, onSelect, disabled }: {
  value: string; onChange: (v: string) => void;
  onSelect: (drug: any) => void; disabled?: boolean;
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
    if (disabled) return;
    clearTimeout(debounceRef.current);
    if (v.length >= 2) {
      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        const data = await apiFetch(`/drugs/search?q=${encodeURIComponent(v)}`);
        setResults(data?.drugs || []);
        setOpen((data?.drugs || []).length > 0);
        setLoading(false);
      }, 300);
    } else {
      setResults([]); setOpen(false);
    }
  }, [onChange, disabled]);

  return (
      <div ref={ref} style={{ position: 'relative', zIndex: open ? 9999 : 'auto' }}>
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#9ca3af' }} />
          <input
              value={value}
              onChange={e => handleChange(e.target.value)}
              onFocus={() => !disabled && results.length > 0 && setOpen(true)}
              disabled={disabled}
              placeholder={disabled ? '' : 'Кандесартан, Амоксициллин...'}
              style={{
                width: '100%', height: 40, paddingLeft: 36, paddingRight: 12,
                border: `1px solid ${disabled ? '#f3f4f6' : '#e5e7eb'}`,
                borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                background: disabled ? '#f9fafb' : 'white', fontFamily: 'inherit',
              }}
          />
          {loading && <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, border: '2px solid #e5e7eb', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />}
        </div>
        {open && results.length > 0 && (
            <div style={{ position: 'absolute', zIndex: 9999, top: '100%', left: 0, right: 0, marginTop: 4, background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', maxHeight: 280, overflowY: 'auto' }}>
              {results.map((drug: any) => (
                  <button key={drug.id} type="button"
                          onClick={() => { onSelect(drug); onChange(drug.mnn); setOpen(false); }}
                          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}
                          onMouseEnter={(e: any) => e.currentTarget.style.background = '#f9fafb'}
                          onMouseLeave={(e: any) => e.currentTarget.style.background = 'none'}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{drug.mnn}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2, display: 'flex', gap: 6 }}>
                      <span style={{ fontFamily: 'monospace', color: '#6366f1' }}>{drug.atxCode}</span>
                      <span>·</span><span>{drug.form?.slice(0, 35)}</span>
                      <span>·</span><span style={{ color: '#10b981' }}>{drug.routeOfAdmin}</span>
                    </div>
                  </button>
              ))}
            </div>
        )}
      </div>
  );
}

export default function EditPrescription() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [prescription, setPrescription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [medications, setMedications] = useState<MedItem[]>([]);
  const [diagnosisCode, setDiagnosisCode] = useState('');
  const [diagnosisName, setDiagnosisName] = useState('');
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [patientInteractions, setPatientInteractions] = useState<Interaction[]>([]);

  useEffect(() => {
    if (!id) return;
    prescriptionApi.get(id).then(res => {
      const rx = res.prescription;
      setPrescription(rx);
      setDiagnosisCode(rx.diagnosisCode || '');
      setDiagnosisName(rx.diagnosisName || '');
      setMedications(rx.medications.map((m: any) => ({
        id: m.id,
        name: m.name,
        form: m.form || '',
        dosage: m.dosage,
        quantity: m.qtyPrescribed,
        course: m.course || '',
        dispensed: m.qtyDispensed,
        isNew: false,
        drugId: m.drugId || undefined,
        atxCode: m.atxCode || undefined,
        routeOfAdmin: m.routeOfAdmin || undefined,
        startDate: m.startDate ? m.startDate.split('T')[0] : undefined,
        durationDays: m.durationDays || undefined,
        frequency: m.frequency || undefined,
      })));
    }).catch(err => toast.error(err.message || 'Ошибка загрузки'))
        .finally(() => setLoading(false));
  }, [id]);

  // Проверка взаимодействий внутри рецепта
  useEffect(() => {
    const drugIds = medications.filter(m => m.drugId).map(m => m.drugId!);
    if (drugIds.length < 2) { setInteractions([]); return; }
    apiPost('/drugs/check-interactions', { drugIds }).then(data => {
      setInteractions(data?.interactions || []);
    });
  }, [medications]);

  // Проверка взаимодействий с другими активными рецептами пациента
  useEffect(() => {
    if (!prescription) return;
    const drugIds = medications.filter(m => m.drugId).map(m => m.drugId!);
    if (drugIds.length === 0) { setPatientInteractions([]); return; }
    apiPost('/drugs/check-patient-interactions', {
      patientId: prescription.patientId,
      drugIds,
      excludePrescriptionId: id,
    }).then(data => {
      setPatientInteractions(data?.interactions || []);
    });
  }, [medications, prescription]);

  if (loading) return <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Загрузка…</div>;
  if (!prescription) return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <p style={{ color: '#9ca3af', fontSize: 13 }}>Рецепт не найден</p>
        <button onClick={() => navigate('/dashboard/doctor')} style={{ marginTop: 16, padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer' }}>Назад</button>
      </div>
  );

  const isPartial = prescription.status === 'partially_dispensed';

  const addMed = () => setMedications(prev => [...prev, {
    id: crypto.randomUUID(), name: '', form: '', dosage: '',
    quantity: 0, course: '', dispensed: 0, isNew: true,
  }]);

  const removeMed = (medId: string) => {
    const med = medications.find(m => m.id === medId);
    if (!med?.isNew && med && med.dispensed > 0) {
      toast.error('Нельзя удалить препарат, который уже частично выдан'); return;
    }
    if (medications.length > 1) setMedications(prev => prev.filter(m => m.id !== medId));
  };

  const updateMed = (medId: string, field: string, value: any) => {
    const med = medications.find(m => m.id === medId);
    if (!med?.isNew && med && med.dispensed > 0 && ['name', 'form', 'dosage'].includes(field)) {
      toast.error('Нельзя изменить препарат/форму/дозировку — уже частично выдан'); return;
    }
    if (field === 'quantity' && med && !med.isNew && med.dispensed > 0) {
      const newQty = parseInt(value) || 0;
      if (newQty < med.dispensed) {
        toast.error(`Количество не может быть меньше уже выданного (${med.dispensed})`); return;
      }
    }
    setMedications(prev => prev.map(m => m.id === medId ? { ...m, [field]: value } : m));
  };

  const selectDrug = (medId: string, drug: any) => {
    const med = medications.find(m => m.id === medId);
    if (!med?.isNew && med && med.dispensed > 0) return;
    const dosages = drug.dosages ? drug.dosages.split(',').map((d: string) => d.trim()).filter(Boolean) : [];
    setMedications(prev => prev.map(m => m.id === medId ? {
      ...m, name: drug.mnn, form: drug.form || '',
      atxCode: drug.atxCode, routeOfAdmin: drug.routeOfAdmin,
      drugId: drug.id, availableDosages: dosages,
      dosage: dosages[0] || m.dosage,
    } : m));
  };

  const autoGenerate = (med: MedItem) => updateMed(med.id, 'course', generateInstruction(med));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = medications.find(m => !m.name || !m.dosage || !m.quantity);
    if (invalid) { toast.error('Заполните все поля препаратов'); return; }

    setSaving(true);
    try {
      await prescriptionApi.edit(id!, {
        diagnosisCode: diagnosisCode || undefined,
        diagnosisName: diagnosisName || undefined,
        medications: medications.map(med => ({
          ...(med.isNew ? {} : { id: med.id }),
          name: med.name,
          form: med.form || 'other',
          dosage: med.dosage,
          qtyPrescribed: med.quantity,
          course: med.course || generateInstruction(med),
          drugId: med.drugId,
          atxCode: med.atxCode,
          routeOfAdmin: med.routeOfAdmin,
          startDate: med.startDate,
          durationDays: med.durationDays,
          frequency: med.frequency,
        })),
      });
      toast.success('Рецепт обновлён');
      navigate(`/dashboard/doctor/prescription/${id}`);
    } catch (err: any) {
      toast.error(err.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
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
        .card { background: white; border-radius: 12px; border: 1px solid #e5e7eb; margin-bottom: 16px; }
        .card-header { padding: 12px 20px; background: #fafafa; border-bottom: 1px solid #f3f4f6; display: flex; align-items: center; gap: 8px; border-radius: 12px 12px 0 0; }
        .field-label { font-size: 13px; font-weight: 500; color: #374151; margin-bottom: 6px; display: block; }
        .field-input { width: 100%; height: 40px; padding: 0 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; outline: none; box-sizing: border-box; font-family: inherit; }
        .field-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }
        .field-input:disabled { background: #f9fafb; color: #9ca3af; }
        .freq-btn { padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 500; border: 1.5px solid #e5e7eb; background: white; cursor: pointer; transition: all 0.15s; color: #6b7280; }
        .freq-btn:hover { border-color: #6366f1; color: #6366f1; }
        .freq-btn.active { background: #1e1b4b; color: white; border-color: #1e1b4b; }
        .dosage-chip { padding: 4px 10px; border-radius: 6px; font-size: 12px; border: 1px solid #e5e7eb; background: white; cursor: pointer; transition: all 0.12s; color: #374151; }
        .dosage-chip.active { background: #eff6ff; border-color: #3b82f6; color: #1d4ed8; font-weight: 600; }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        @media (max-width: 600px) { .grid2, .grid3 { grid-template-columns: 1fr; } }
      `}</style>

        <button onClick={() => navigate(`/dashboard/doctor/prescription/${id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 20, padding: 0 }}>
          <ArrowLeft size={15} /> Back to prescription
        </button>

        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>Edit Prescription</h2>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>
            {isPartial ? 'Редактирование ограничено — рецепт частично выдан' : 'Update the prescription data'}
          </p>
        </div>

        {isPartial && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10 }}>
              <AlertCircle size={16} color="#d97706" style={{ marginTop: 2, flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: '#92400e' }}>
                <strong style={{ display: 'block', marginBottom: 4 }}>Ограничения редактирования:</strong>
                <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
                  <li>Можно добавить новые препараты</li>
                  <li>Можно увеличить количество (не меньше уже выданного)</li>
                  <li>Нельзя изменить название/форму/дозировку выданных препаратов</li>
                </ul>
              </div>
            </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* Пациент */}
          <div className="card">
            <div className="card-header">
              <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Patient data</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9ca3af' }}>Read-only</span>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <div className="grid2" style={{ marginBottom: 12 }}>
                <div>
                  <label className="field-label">Full name</label>
                  <input className="field-input" value={prescription.patient.fullName} disabled />
                </div>
                <div>
                  <label className="field-label">IIN</label>
                  <input className="field-input" value={prescription.patient.iin} disabled />
                </div>
              </div>
              <div className="grid2">
                <div>
                  <label className="field-label">Phone</label>
                  <input className="field-input" value={prescription.patient.phone} disabled />
                </div>
                <div>
                  <label className="field-label">Email</label>
                  <input className="field-input" value={prescription.patient.email} disabled />
                </div>
              </div>
            </div>
          </div>

          {/* Диагноз */}
          <div className="card">
            <div className="card-header">
              <Stethoscope size={15} color="#6366f1" />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Diagnosis</span>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <div className="grid2">
                <div>
                  <label className="field-label">МКБ-10 Code</label>
                  <input className="field-input" placeholder="I10" value={diagnosisCode}
                         onChange={e => setDiagnosisCode(e.target.value)} />
                </div>
                <div>
                  <label className="field-label">Name of the diagnosis</label>
                  <input className="field-input" placeholder="Гипертоническая болезнь..."
                         value={diagnosisName} onChange={e => setDiagnosisName(e.target.value)} />
                </div>
              </div>
            </div>
          </div>



          {/* Препараты */}
          <div className="card">
            <div className="card-header">
              <Pill size={15} color="#6366f1" />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Medication</span>
              <button type="button" onClick={addMed}
                      style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', color: '#374151' }}>
                <Plus size={13} /> Add
              </button>
            </div>

            {medications.map((med, index) => {
              const isLocked = !med.isNew && med.dispensed > 0;
              return (
                  <div key={med.id} style={{ padding: '20px', borderBottom: index < medications.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>Medication #{index + 1}</span>
                        {isLocked && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#d97706', background: '#fffbeb', padding: '2px 8px', borderRadius: 20, border: '1px solid #fde68a' }}>
                        <Lock size={10} /> Частично выдан
                      </span>
                        )}
                        {med.isNew && (
                            <span style={{ fontSize: 11, color: '#10b981', background: '#f0fdf4', padding: '2px 8px', borderRadius: 20, border: '1px solid #bbf7d0' }}>Новый</span>
                        )}
                      </div>
                      {(med.isNew || (!isLocked && medications.length > 1)) && (
                          <button type="button" onClick={() => removeMed(med.id)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                            <Trash2 size={13} /> Удалить
                          </button>
                      )}
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <label className="field-label">Препарат (МНН) *</label>
                      <DrugCombobox value={med.name} onChange={v => updateMed(med.id, 'name', v)} onSelect={drug => selectDrug(med.id, drug)} disabled={isLocked} />
                      {med.atxCode && (
                          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                            <span style={{ fontSize: 11, fontFamily: 'monospace', background: '#f0f4ff', color: '#4338ca', padding: '2px 8px', borderRadius: 4 }}>{med.atxCode}</span>
                            {med.routeOfAdmin && <span style={{ fontSize: 11, color: '#10b981', background: '#f0fdf4', padding: '2px 8px', borderRadius: 4 }}>📍 {med.routeOfAdmin}</span>}
                          </div>
                      )}
                    </div>

                    <div className="grid2" style={{ marginBottom: 12 }}>
                      <div>
                        <label className="field-label">Dosage form</label>
                        <input className="field-input" placeholder="Таблетки..." value={med.form} disabled={isLocked} onChange={e => updateMed(med.id, 'form', e.target.value)} />
                      </div>
                      <div>
                        <label className="field-label">Dosage *</label>
                        {med.availableDosages && med.availableDosages.length > 0 && !isLocked ? (
                            <div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                                {med.availableDosages.map(d => (
                                    <button key={d} type="button" className={`dosage-chip ${med.dosage === d ? 'active' : ''}`} onClick={() => updateMed(med.id, 'dosage', d)}>{d}</button>
                                ))}
                              </div>
                              <input className="field-input" placeholder="Или введите вручную" value={med.dosage} onChange={e => updateMed(med.id, 'dosage', e.target.value)} style={{ height: 32, fontSize: 13 }} />
                            </div>
                        ) : (
                            <input className="field-input" placeholder="500 мг..." value={med.dosage} disabled={isLocked} onChange={e => updateMed(med.id, 'dosage', e.target.value)} required />
                        )}
                      </div>
                    </div>

                    {isLocked && (
                        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#1d4ed8' }}>
                          Выдано: {med.dispensed} из {med.quantity} упаковок
                        </div>
                    )}

                    <div className="grid3" style={{ marginBottom: 12 }}>
                      <div>
                        <label className="field-label">Quantity (pack) * {isLocked && <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 4 }}>мин: {med.dispensed}</span>}</label>
                        <input className="field-input" type="number" min={isLocked ? med.dispensed : 1} value={med.quantity || ''} onChange={e => updateMed(med.id, 'quantity', parseInt(e.target.value) || 0)} required />
                      </div>
                      <div>
                        <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> Start date</label>
                        <input className="field-input" type="date" value={med.startDate || ''} onChange={e => updateMed(med.id, 'startDate', e.target.value)} />
                      </div>
                      <div>
                        <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> Course (days)</label>
                        <input className="field-input" type="number" min="1" placeholder="30" value={med.durationDays || ''} onChange={e => updateMed(med.id, 'durationDays', parseInt(e.target.value) || undefined)} />
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <label className="field-label">Reception frequency</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {FREQUENCIES.map(f => (
                            <button key={f.value} type="button" className={`freq-btn ${med.frequency === f.value ? 'active' : ''}`} onClick={() => updateMed(med.id, 'frequency', med.frequency === f.value ? '' : f.value)}>{f.label}</button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <label className="field-label" style={{ margin: 0 }}>Instructions / Course</label>
                        {(med.routeOfAdmin || med.frequency) && (
                            <button type="button" onClick={() => autoGenerate(med)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, border: '1.5px solid #e5e7eb', background: 'white', cursor: 'pointer', color: '#6366f1' }}>
                              <Sparkles size={12} /> Сгенерировать
                            </button>
                        )}
                      </div>
                      {med.course && (
                          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', marginBottom: 8, fontSize: 13, color: '#334155', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                            <CheckCircle2 size={14} color="#10b981" style={{ marginTop: 2, flexShrink: 0 }} />
                            <span>{med.course}</span>
                            <button type="button" onClick={() => updateMed(med.id, 'course', '')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={13} /></button>
                          </div>
                      )}
                      <textarea placeholder="Принимать внутрь по 1 таблетке 1 раз в день..." value={med.course} onChange={e => updateMed(med.id, 'course', e.target.value)} rows={2}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                  </div>
              );
            })}
          </div>


          {/* Конфликт с другими рецептами пациента */}
          {hasPatientInteractions && (
              <div style={{ background: '#fdf4ff', border: '2px solid #d946ef', borderRadius: 12, padding: '16px 18px', marginBottom: 16, animation: 'slideIn 0.3s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f5d0fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <AlertCircle size={16} color="#a21caf" />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#a21caf' }}>
                      ⚠️ Конфликт с другими активными рецептами
                    </div>
                    <div style={{ fontSize: 12, color: '#86198f', marginTop: 2 }}>
                      Найдено {patientInteractions.length} взаимодействий с препаратами из других рецептов пациента
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '10px 16px', borderRadius: 10, background: contraindicated.length > 0 ? '#fef2f2' : '#fffbeb', border: `1.5px solid ${contraindicated.length > 0 ? '#fca5a5' : '#fde68a'}` }}>
                  <ShieldAlert size={20} color={contraindicated.length > 0 ? '#dc2626' : '#d97706'} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: contraindicated.length > 0 ? '#dc2626' : '#d97706' }}>Проверьте перед сохранением</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                      Обнаружено {interactions.length} {interactions.length === 1 ? 'взаимодействие' : interactions.length < 5 ? 'взаимодействия' : 'взаимодействий'} между препаратами
                    </div>
                  </div>
                </div>

                {contraindicated.length > 0 && (
                    <div style={{ background: '#fef2f2', border: '2px solid #fca5a5', borderRadius: 12, padding: '16px 18px', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <AlertCircle size={16} color="#dc2626" />
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#dc2626' }}>Противопоказанные сочетания ({contraindicated.length})</span>
                      </div>
                      {contraindicated.map((i, idx) => (
                          <div key={idx} style={{ background: '#fee2e2', borderRadius: 8, padding: '10px 14px', marginBottom: idx < contraindicated.length - 1 ? 8 : 0, fontSize: 13, color: '#7f1d1d', borderLeft: '3px solid #dc2626' }}>
                            <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>{i.drugA?.mnn}</span><span style={{ color: '#dc2626', fontSize: 16 }}>×</span><span>{i.drugB?.mnn}</span>
                            </div>
                            <div style={{ color: '#991b1b', lineHeight: 1.4 }}>{i.description.slice(0, 200)}{i.description.length > 200 ? '...' : ''}</div>
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
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#d97706' }}>Предупреждения о взаимодействиях ({warnings.length})</span>
                      </div>
                      {warnings.map((i, idx) => (
                          <div key={idx} style={{ background: '#fef3c7', borderRadius: 8, padding: '10px 14px', marginBottom: idx < warnings.length - 1 ? 8 : 0, fontSize: 13, color: '#78350f', borderLeft: '3px solid #d97706' }}>
                            <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>{i.drugA?.mnn}</span><span style={{ color: '#d97706' }}>+</span><span>{i.drugB?.mnn}</span>
                            </div>
                            <div style={{ color: '#92400e', lineHeight: 1.4 }}>{i.description.slice(0, 200)}{i.description.length > 200 ? '...' : ''}</div>
                          </div>
                      ))}
                    </div>
                )}
              </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => navigate(`/dashboard/doctor/prescription/${id}`)}
                    style={{ height: 42, padding: '0 20px', borderRadius: 10, fontSize: 14, fontWeight: 500, border: '1.5px solid #e5e7eb', background: 'white', cursor: 'pointer', color: '#374151' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
                    style={{ height: 42, padding: '0 24px', borderRadius: 10, fontSize: 14, fontWeight: 600, border: 'none', background: saving ? '#9ca3af' : '#6366f1', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              {saving ? (
                  <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />Сохранение…</>
              ) : (
                  <><Save size={16} /> Save Changes</>
              )}
            </button>
          </div>
        </form>
      </div>
  );
}
