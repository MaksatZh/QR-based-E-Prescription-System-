import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Edit, Trash2, Users, UserPlus, UserMinus } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  department: string;
  status: 'active' | 'inactive';
  lastLogin: string;
  createdAt: string;
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@company.com',
      role: 'Administrator',
      department: 'IT',
      status: 'active',
      lastLogin: '2024-03-15 10:30 AM',
      createdAt: '2024-01-15'
    },
    {
      id: '2',
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@company.com',
      role: 'Manager',
      department: 'HR',
      status: 'active',
      lastLogin: '2024-03-14 02:15 PM',
      createdAt: '2024-01-20'
    },
    {
      id: '3',
      firstName: 'Mike',
      lastName: 'Davis',
      email: 'mike.davis@company.com',
      role: 'Employee',
      department: 'Marketing',
      status: 'active',
      lastLogin: '2024-03-13 09:45 AM',
      createdAt: '2024-02-01'
    },
    {
      id: '4',
      firstName: 'Emily',
      lastName: 'Brown',
      email: 'emily.brown@company.com',
      role: 'Employee',
      department: 'IT',
      status: 'inactive',
      lastLogin: '2024-03-10 11:20 AM',
      createdAt: '2024-02-10'
    }
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    department: ''
  });

  const roles = ['Administrator', 'Manager', 'Employee', 'Viewer'];
  const departments = ['IT', 'HR', 'Marketing', 'Finance', 'Operations'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingUser) {
      // Update existing user
      setUsers(prev => prev.map(user => 
        user.id === editingUser.id 
          ? { ...user, ...formData }
          : user
      ));
      toast.success('User updated successfully!');
    } else {
      // Add new user
      const newUser: User = {
        id: Date.now().toString(),
        ...formData,
        status: 'active',
        lastLogin: 'Never',
        createdAt: new Date().toISOString().split('T')[0]
      };
      setUsers(prev => [...prev, newUser]);
      toast.success('User added successfully!');
    }
    
    resetForm();
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      department: user.department
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setUsers(prev => prev.filter(user => user.id !== id));
    toast.success('User deleted successfully!');
  };

  const toggleUserStatus = (id: string) => {
    setUsers(prev => prev.map(user => 
      user.id === id 
        ? { ...user, status: user.status === 'active' ? 'inactive' : 'active' }
        : user
    ));
    const user = users.find(u => u.id === id);
    const newStatus = user?.status === 'active' ? 'deactivated' : 'activated';
    toast.success(`User ${newStatus} successfully!`);
  };

  const resetForm = () => {
    setFormData({ firstName: '', lastName: '', email: '', role: '', department: '' });
    setEditingUser(null);
    setIsDialogOpen(false);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2>User Management</h2>
          <p className="text-muted-foreground">
            Add users and manage their account status.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingUser(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'Edit User' : 'Add New User'}
              </DialogTitle>
              <DialogDescription>
                {editingUser 
                  ? 'Update the user information below.' 
                  : 'Fill in the details to create a new user account.'
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Enter first name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Enter last name"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email address"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((department) => (
                      <SelectItem key={department} value={department}>
                        {department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingUser ? 'Update User' : 'Add User'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-semibold">{users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <UserPlus className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-2xl font-semibold">
                  {users.filter(u => u.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <UserMinus className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inactive Users</p>
                <p className="text-2xl font-semibold">
                  {users.filter(u => u.status === 'inactive').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users Overview
          </CardTitle>
          <CardDescription>
            Manage user accounts and their access levels.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="" alt={`${user.firstName} ${user.lastName}`} />
                        <AvatarFallback>
                          {getInitials(user.firstName, user.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.role}</Badge>
                  </TableCell>
                  <TableCell>{user.department}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={user.status === 'active' ? 'default' : 'secondary'}
                      className="cursor-pointer"
                      onClick={() => toggleUserStatus(user.id)}
                    >
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{user.lastLogin}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(user.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}