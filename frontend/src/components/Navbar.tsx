import React, { useState, useEffect } from 'react';
import { 
  ShieldIcon, 
  ActivityIcon, 
  FileTextIcon, 
  DatabaseIcon, 
  UserIcon, 
  LogOutIcon 
} from './icons';
import { authStore } from '../store/authStore';
import { User } from '../types';
import { HOSPITAL } from '../config/app';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  hasPulse: boolean;
  pendingAlertsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  hasPulse,
  pendingAlertsCount,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(authStore.getUser());
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    return authStore.subscribe((user) => {
      setCurrentUser(user);
    });
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Monitoramento & Alertas', icon: ActivityIcon, badge: pendingAlertsCount },
    { id: 'zones', label: 'Zonas do Hospital', icon: ShieldIcon },
    { id: 'dossiers', label: 'Dossiês de Incidente', icon: FileTextIcon },
    { id: 'audit', label: 'Auditoria LGPD', icon: DatabaseIcon },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#07132e]/95 backdrop-blur-md border-b border-cyan-500/20 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3 flex items-center justify-between">
        {/* Brand & Hospital Tenant Badge */}
        <div 
          className="flex items-center gap-3.5 cursor-pointer select-none" 
          onClick={() => setActiveTab('dashboard')}
        >
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-400 border border-white/30 shadow-[0_0_15px_rgba(0,195,255,0.35)]">
            <ShieldIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white font-sans">
                BioShield <span className="text-cyan-400">AI</span>
              </span>
              {/* Active Hospital Badge */}
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-blue-900 shadow-sm border border-white">
                {HOSPITAL.code}
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              {HOSPITAL.name}
            </p>
          </div>
        </div>

        {/* Clean, Uncluttered Central Navigation */}
        <nav className="hidden md:flex items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'text-white bg-blue-600 shadow-[0_0_15px_rgba(0,119,255,0.4)] border border-cyan-300/40'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-cyan-400'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`px-2 py-0.2 rounded-full text-[11px] font-bold ${
                    hasPulse 
                      ? 'bg-red-500 text-white animate-bounce' 
                      : 'bg-white text-blue-900 shadow-sm'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile & Quick Logout */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 transition-all shadow-sm border border-white/60"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold leading-tight">
                  {currentUser ? currentUser.full_name.split('—')[0].trim() : 'Usuário'}
                </div>
                <div className="text-[10px] text-blue-700 font-semibold leading-tight">
                  {currentUser?.roles[0]?.name || 'Hospitalar'}
                </div>
              </div>
            </button>

            {/* User Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#091533] border border-cyan-500/30 shadow-2xl p-3 z-50 animate-fadeIn text-slate-200">
                <div className="px-3 py-2 border-b border-white/10 mb-2">
                  <div className="text-xs font-bold text-white">
                    {HOSPITAL.name}
                  </div>
                  <div className="text-[11px] text-cyan-300 font-semibold">
                    {currentUser?.full_name}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Perfil: {currentUser?.roles[0]?.name}
                  </div>
                </div>

                <button
                  onClick={() => {
                    authStore.logout();
                    setShowUserMenu(false);
                    setActiveTab('login');
                  }}
                  className="w-full flex items-center gap-2 p-2.5 rounded-xl text-xs text-red-400 hover:bg-red-500/10 font-semibold transition-colors"
                >
                  <LogOutIcon className="w-4 h-4" />
                  <span>Sair do Hospital ({HOSPITAL.code})</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bar */}
      <div className="md:hidden border-t border-white/10 bg-[#060e22] px-2 py-2 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 p-1.5 rounded-lg text-xs ${
                isActive ? 'text-white font-bold' : 'text-slate-400'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span className="text-[10px]">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
