import { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router';
import { getCurrentUser, logout } from '../lib/auth';
import { Button } from './ui/button';
import { 
  LogOut, 
  User, 
  FileText,
  Plus,
  QrCode,
  Users,
  ChevronDown,
  Menu,
  X,
  Clock
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

import { mockDispenseEvents, mockAuditLogs } from '../lib/mockData';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) navigate('/');
  }, [user, navigate]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  if (!user) return null;

  const handleLogout = () => { logout(); navigate('/'); };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const roleLabel = user.role === 'super_admin' ? 'Super Admin' 
    : user.role.charAt(0).toUpperCase() + user.role.slice(1);

  const navItems = user.role === 'doctor'
    ? [
        { to: '/dashboard/doctor', icon: FileText, label: 'Prescriptions' },
        { to: '/dashboard/doctor/create', icon: Plus, label: 'New Prescription' },
        { to: '/dashboard/activity', icon: Clock, label: 'Recent Activity' },
      ]
    : user.role === 'pharmacist'
    ? [
        { to: '/dashboard/pharmacist', icon: QrCode, label: 'Dispense' },
        { to: '/dashboard/activity', icon: Clock, label: 'Recent Activity' },
      ]
    : [
        { to: '/dashboard/admin', icon: Users, label: 'Users' },
        { to: '/dashboard/activity', icon: Clock, label: 'Recent Activity' },
      ];

  const NavLink = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => {
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] transition-all ${
          isActive
            ? 'bg-[#1f2937] text-white'
            : 'text-gray-400 hover:text-gray-200 hover:bg-[#1f2937]/60'
        }`}
      >
        <Icon className="size-[18px]" />
        <span>{label}</span>
      </Link>
    );
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="px-5 py-4 border-b border-[#1f2937]">
        <div className="flex items-center gap-2.5">
          <div className="relative w-7 h-7">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/40 to-cyan-500/30 rounded-md rotate-12 scale-95" />
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/60 to-emerald-600/50 rounded-md rotate-6 scale-[0.97]" />
            <div className="relative w-full h-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-700 rounded-md flex items-center justify-center">
              <svg width="15" height="15" viewBox="0 0 26 26" fill="none">
                <path d="M5 13.5C5 9.5 7.5 7 11 7C14.5 7 16.5 9.5 16.5 13H7C7 16 9 18 12 18C14 18 15.5 17 16 15.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <line x1="7" y1="13" x2="16" y2="13" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
                <path d="M17 11L21 19M19.5 15L22 11" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <span className="text-white text-[14px]"><span className="text-emerald-400">e</span>Prescription</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] uppercase tracking-widest text-gray-600">
          Menu
        </p>
        <div className="space-y-1">
          {navItems.map(item => (
            <NavLink key={item.to} {...item} />
          ))}
        </div>
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-[#1f2937]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-[#1f2937] transition-colors text-left">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-[12px] shrink-0">
                {getInitials(user.fullName)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-[13px] truncate">{user.fullName}</p>
                <p className="text-gray-500 text-[11px]">{roleLabel}</p>
              </div>
              <ChevronDown className="size-3.5 text-gray-500 shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-48">
            <DropdownMenuItem onClick={() => navigate('/dashboard/profile')}>
              <User className="mr-2 size-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
              <LogOut className="mr-2 size-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );

  return (
    <div className="flex h-screen h-[100dvh]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[240px] bg-[#111827] flex-col shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#111827] border-b border-[#1f2937] px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative w-7 h-7">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/40 to-cyan-500/30 rounded-md rotate-12 scale-95" />
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/60 to-emerald-600/50 rounded-md rotate-6 scale-[0.97]" />
            <div className="relative w-full h-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-700 rounded-md flex items-center justify-center">
              <svg width="15" height="15" viewBox="0 0 26 26" fill="none">
                <path d="M5 13.5C5 9.5 7.5 7 11 7C14.5 7 16.5 9.5 16.5 13H7C7 16 9 18 12 18C14 18 15.5 17 16 15.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <line x1="7" y1="13" x2="16" y2="13" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
                <path d="M17 11L21 19M19.5 15L22 11" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <span className="text-white text-[14px]"><span className="text-emerald-400">e</span>Prescription</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-gray-400 hover:text-white p-1.5 transition-colors"
        >
          {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-[280px] bg-[#111827] flex flex-col mt-14 h-[calc(100dvh-3.5rem)]">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-[#f5f6f8] md:pt-0 pt-14">
        <Outlet />
      </main>
    </div>
  );
}