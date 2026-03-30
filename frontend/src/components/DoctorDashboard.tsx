import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { usePrescriptionContext } from '../contexts/PrescriptionContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { LogOut, PlusCircle, FileText, User } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import CreatePrescription from './CreatePrescription';
import EditPrescription from './EditPrescription';
import PrescriptionList from './PrescriptionList';
import { Prescription } from '../types/prescription';

export default function DoctorDashboard() {
  const { currentUser, setCurrentUser, prescriptions } = usePrescriptionContext();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPrescription, setEditingPrescription] = useState<Prescription | null>(null);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'Doctor') {
      navigate('/');
    }
  }, [currentUser, navigate]);

  if (!currentUser) return null;

  const handleLogout = () => {
    setCurrentUser(null);
    toast.success('Вы вышли из системы');
    navigate('/');
  };

  const myPrescriptions = prescriptions.filter((p) => p.doctor.id === currentUser.id);

  const stats = {
    total: myPrescriptions.length,
    active: myPrescriptions.filter((p) => p.status === 'Active').length,
    partial: myPrescriptions.filter((p) => p.status === 'Partially dispensed').length,
    completed: myPrescriptions.filter((p) => p.status === 'Dispensed').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Портал врача</h1>
                <p className="text-sm text-gray-600">{currentUser.name}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Выйти
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Всего рецептов</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Активные</CardDescription>
              <CardTitle className="text-3xl text-green-600">{stats.active}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Частично выданы</CardDescription>
              <CardTitle className="text-3xl text-orange-600">{stats.partial}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Завершены</CardDescription>
              <CardTitle className="text-3xl text-blue-600">{stats.completed}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Prescriptions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Мои рецепты</CardTitle>
                <CardDescription>Управление электронными рецептами</CardDescription>
              </div>
              <Button onClick={() => setShowCreateModal(true)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Создать рецепт
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <PrescriptionList
              prescriptions={myPrescriptions}
              onEdit={setEditingPrescription}
              userRole="Doctor"
            />
          </CardContent>
        </Card>
      </main>

      {/* Modals */}
      {showCreateModal && (
        <CreatePrescription
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      )}
      {editingPrescription && (
        <EditPrescription
          prescription={editingPrescription}
          open={!!editingPrescription}
          onClose={() => setEditingPrescription(null)}
        />
      )}
    </div>
  );
}
