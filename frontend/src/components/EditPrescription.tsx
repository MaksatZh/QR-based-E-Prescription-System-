import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { toast } from 'sonner@2.0.3';
import { prescriptionApi } from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Trash2, ArrowLeft, Save, Lock, AlertCircle } from 'lucide-react';

interface MedicationForm {
  id: string; name: string; form: string; dosage: string;
  quantity: number; course: string; dispensed: number; isNew: boolean;
}

export default function EditPrescription() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [prescription, setPrescription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [medications, setMedications] = useState<MedicationForm[]>([]);

  const medicationForms = ['Tablets','Capsules','Syrup','Suspension','Ampoules','Injection','Drops','Ointment','Cream','Gel'];

  useEffect(() => {
    if (!id) return;
    prescriptionApi.get(id).then(res => {
      const rx = res.prescription;
      setPrescription(rx);
      setMedications(rx.medications.map((m: any) => ({
        id: m.id,
        name: m.name,
        form: m.form.toLowerCase(),
        dosage: m.dosage,
        quantity: m.qtyPrescribed,
        course: m.course,
        dispensed: m.qtyDispensed,
        isNew: false,
      })));
    }).catch(err => {
      toast.error(err.message || 'Failed to load prescription');
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 text-center text-muted-foreground text-[13px]">Loading…</div>
    );
  }

  if (!prescription) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-xl border shadow-sm p-12 text-center max-w-md mx-auto">
          <p className="text-muted-foreground text-[13px]">Prescription not found</p>
          <Button size="sm" className="mt-4" onClick={() => navigate('/dashboard/doctor')}>Back</Button>
        </div>
      </div>
    );
  }

  const isPartiallyDispensed = prescription.status === 'partially_dispensed';

  const addMedication = () => {
    setMedications([...medications, {
      id: crypto.randomUUID(), name: '', form: 'tablets',
      dosage: '', quantity: 0, course: '', dispensed: 0, isNew: true,
    }]);
  };

  const removeMedication = (medId: string) => {
    const med = medications.find(m => m.id === medId);
    if (!med?.isNew && med && med.dispensed > 0) {
      toast.error('Cannot remove medication that has been dispensed'); return;
    }
    if (medications.length > 1) setMedications(medications.filter(m => m.id !== medId));
  };

  const updateMedication = (medId: string, field: string, value: any) => {
    const med = medications.find(m => m.id === medId);
    if (!med?.isNew && med && med.dispensed > 0 && ['name', 'form', 'dosage'].includes(field)) {
      toast.error('Cannot modify name/form/dosage after partial dispensing'); return;
    }
    if (field === 'quantity' && med && !med.isNew && med.dispensed > 0) {
      const newQty = parseInt(value) || 0;
      if (newQty < med.dispensed) {
        toast.error(`Quantity cannot be less than already dispensed (${med.dispensed})`); return;
      }
    }
    setMedications(medications.map(m => m.id === medId ? { ...m, [field]: value } : m));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const invalid = medications.find(m => !m.name || !m.dosage || !m.quantity || !m.course);
    if (invalid) { toast.error('Fill in all medication details'); return; }

    setSaving(true);
    try {
      const payload = {
        medications: medications.map(med => ({
          ...(med.isNew ? {} : { id: med.id }),
          name: med.name,
          form: med.form as any,
          dosage: med.dosage,
          qtyPrescribed: med.quantity,
          course: med.course,
        })),
      };

      await prescriptionApi.edit(id!, payload);
      toast.success('Prescription updated');
      navigate(`/dashboard/doctor/prescription/${id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update prescription');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[800px] mx-auto">
      <button onClick={() => navigate(`/dashboard/doctor/prescription/${id}`)} className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground mb-5 transition-colors">
        <ArrowLeft className="size-4" /> Back to prescription
      </button>

      <div className="mb-6">
        <h2 className="text-[20px]">Edit Rx-{prescription.id}</h2>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          {isPartiallyDispensed ? 'Editing restricted due to partial dispensing' : 'Update prescription details'}
        </p>
      </div>

      {isPartiallyDispensed && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 flex items-start gap-3 mb-5">
          <AlertCircle className="size-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-[12px] text-amber-700 space-y-1.5">
            <p className="font-medium text-amber-800">Editing restrictions apply</p>
            <ul className="list-disc list-inside space-y-0.5 text-amber-600">
              <li>Can add new medications</li>
              <li>Can increase quantities (not below dispensed amount)</li>
              <li>Cannot modify name, form or dosage of dispensed medications</li>
            </ul>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Patient — read only */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50/50">
            <span className="text-[14px]">Patient Information</span>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input value={prescription.patient.fullName} disabled className="h-10 bg-gray-50" />
              </div>
              <div className="space-y-1.5">
                <Label>IIN</Label>
                <Input value={prescription.patient.iin} disabled className="h-10 bg-gray-50" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={prescription.patient.phone} disabled className="h-10 bg-gray-50" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={prescription.patient.email} disabled className="h-10 bg-gray-50" />
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
            {medications.map((medication, index) => {
              const isLocked = !medication.isNew && medication.dispensed > 0;
              return (
                <div key={medication.id} className="px-5 py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-muted-foreground bg-gray-100 px-2 py-0.5 rounded">#{index + 1}</span>
                      {isLocked && (
                        <span className="flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          <Lock className="size-3" /> Partially dispensed
                        </span>
                      )}
                      {medication.isNew && (
                        <span className="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">New</span>
                      )}
                    </div>
                    {(medication.isNew || (!isLocked && medications.length > 1)) && (
                      <button type="button" onClick={() => removeMedication(medication.id)} className="text-[12px] text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors">
                        <Trash2 className="size-3" /> Remove
                      </button>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Name *</Label>
                      <Input
                        value={medication.name}
                        onChange={e => updateMedication(medication.id, 'name', e.target.value)}
                        disabled={isLocked}
                        className={`h-10 ${isLocked ? 'bg-gray-50' : ''}`}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Form *</Label>
                      <Select
                        value={medication.form}
                        onValueChange={v => updateMedication(medication.id, 'form', v)}
                        disabled={isLocked}
                      >
                        <SelectTrigger className={`h-10 ${isLocked ? 'bg-gray-50' : ''}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {medicationForms.map(f => <SelectItem key={f} value={f.toLowerCase()}>{f}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Dosage *</Label>
                      <Input
                        value={medication.dosage}
                        onChange={e => updateMedication(medication.id, 'dosage', e.target.value)}
                        disabled={isLocked}
                        className={`h-10 ${isLocked ? 'bg-gray-50' : ''}`}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>
                        Quantity *{' '}
                        {isLocked && <span className="text-[11px] text-muted-foreground">(min: {medication.dispensed})</span>}
                      </Label>
                      <Input
                        type="number"
                        min={isLocked ? medication.dispensed : 1}
                        value={medication.quantity || ''}
                        onChange={e => updateMedication(medication.id, 'quantity', parseInt(e.target.value) || 0)}
                        className="h-10"
                        required
                      />
                    </div>
                  </div>

                  {isLocked && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 text-[12px] text-blue-700">
                      Already dispensed: {medication.dispensed} of {medication.quantity} units
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label>Instructions *</Label>
                    <Textarea
                      value={medication.course}
                      onChange={e => updateMedication(medication.id, 'course', e.target.value)}
                      rows={2}
                      required
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:justify-end">
          <Button type="button" variant="outline" className="h-10" onClick={() => navigate(`/dashboard/doctor/prescription/${id}`)}>
            Cancel
          </Button>
          <Button type="submit" className="h-10" disabled={saving}>
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </span>
            ) : (
              <><Save className="size-4 mr-1.5" /> Save Changes</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
