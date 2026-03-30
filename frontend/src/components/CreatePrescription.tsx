import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner@2.0.3';
import { prescriptionApi } from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';

interface MedicationForm {
  id: string; name: string; form: string; dosage: string; quantity: number; course: string;
}

export default function CreatePrescription() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [patientData, setPatientData] = useState({ fullName: '', iin: '', phone: '', email: '' });
  const [medications, setMedications] = useState<MedicationForm[]>([
    { id: crypto.randomUUID(), name: '', form: 'tablets', dosage: '', quantity: 0, course: '' },
  ]);

  const medicationForms = ['Tablets','Capsules','Syrup','Suspension','Ampoules','Injection','Drops','Ointment','Cream','Gel'];

  const addMedication = () => {
    setMedications([...medications, { id: crypto.randomUUID(), name: '', form: 'tablets', dosage: '', quantity: 0, course: '' }]);
  };

  const removeMedication = (id: string) => {
    if (medications.length > 1) setMedications(medications.filter(m => m.id !== id));
  };

  const updateMedication = (id: string, field: string, value: any) => {
    setMedications(medications.map(m => (m.id === id ? { ...m, [field]: value } : m)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!patientData.fullName || !patientData.iin || !patientData.phone || !patientData.email) {
      toast.error('Please fill in all patient details'); return;
    }
    if (patientData.iin.length !== 12) {
      toast.error('IIN must be 12 digits'); return;
    }
    const invalidMed = medications.find(m => !m.name || !m.dosage || !m.quantity || !m.course);
    if (invalidMed) {
      toast.error('Please fill in all medication details'); return;
    }

    setLoading(true);
    try {
      await prescriptionApi.create({
        patient: patientData,
        medications: medications.map(med => ({
          name: med.name,
          form: med.form as any,
          dosage: med.dosage,
          qtyPrescribed: med.quantity,
          course: med.course,
        })),
      });

      toast.success('Prescription created. QR code sent to patient.');
      navigate('/dashboard/doctor');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create prescription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[800px] mx-auto">
      <button onClick={() => navigate('/dashboard/doctor')} className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground mb-5 transition-colors">
        <ArrowLeft className="size-4" /> Back to prescriptions
      </button>

      <div className="mb-6">
        <h2 className="text-[20px]">New Prescription</h2>
        <p className="text-[13px] text-muted-foreground mt-0.5">Fill in patient information and add medications</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Patient */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50/50">
            <span className="text-[14px]">Patient Information</span>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Full Name *</Label>
                <Input placeholder="Assel Karimova" value={patientData.fullName} onChange={(e) => setPatientData({ ...patientData, fullName: e.target.value })} className="h-10" required />
              </div>
              <div className="space-y-1.5">
                <Label>IIN (12 digits) *</Label>
                <Input placeholder="920415350167" maxLength={12} value={patientData.iin} onChange={(e) => setPatientData({ ...patientData, iin: e.target.value.replace(/\D/g, '') })} className="h-10" required />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone *</Label>
                <Input type="tel" placeholder="+77771234567" value={patientData.phone} onChange={(e) => setPatientData({ ...patientData, phone: e.target.value })} className="h-10" required />
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input type="email" placeholder="patient@example.kz" value={patientData.email} onChange={(e) => setPatientData({ ...patientData, email: e.target.value })} className="h-10" required />
              </div>
            </div>
          </div>
        </div>

        {/* Medications */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50/50 flex items-center justify-between">
            <span className="text-[14px]">Medications</span>
            <Button type="button" onClick={addMedication} variant="outline" size="sm" className="h-8 text-[12px]">
              <Plus className="size-3.5 mr-1" /> Add
            </Button>
          </div>
          <div className="divide-y">
            {medications.map((medication, index) => (
              <div key={medication.id} className="px-5 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-muted-foreground bg-gray-100 px-2 py-0.5 rounded">#{index + 1}</span>
                  {medications.length > 1 && (
                    <button type="button" onClick={() => removeMedication(medication.id)} className="text-[12px] text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors">
                      <Trash2 className="size-3" /> Remove
                    </button>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Medication Name *</Label>
                    <Input placeholder="e.g., Amoxicillin" value={medication.name} onChange={(e) => updateMedication(medication.id, 'name', e.target.value)} className="h-10" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Form *</Label>
                    <Select value={medication.form} onValueChange={(v) => updateMedication(medication.id, 'form', v)}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>{medicationForms.map(f => <SelectItem key={f} value={f.toLowerCase()}>{f}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Dosage *</Label>
                    <Input placeholder="e.g., 500mg" value={medication.dosage} onChange={(e) => updateMedication(medication.id, 'dosage', e.target.value)} className="h-10" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Quantity *</Label>
                    <Input type="number" min="1" placeholder="e.g., 30" value={medication.quantity || ''} onChange={(e) => updateMedication(medication.id, 'quantity', parseInt(e.target.value) || 0)} className="h-10" required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Instructions / Course *</Label>
                  <Textarea placeholder="e.g., Take 1 tablet 3 times daily after meals for 10 days" value={medication.course} onChange={(e) => updateMedication(medication.id, 'course', e.target.value)} rows={2} required />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:justify-end">
          <Button type="button" variant="outline" className="h-10" onClick={() => navigate('/dashboard/doctor')}>Cancel</Button>
          <Button type="submit" className="h-10" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating…
              </span>
            ) : (
              <><Save className="size-4 mr-1.5" /> Create Prescription</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
