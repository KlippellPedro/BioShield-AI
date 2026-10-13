import React, { useState } from 'react';
import { authStore, DEMO_USERS, HOSPITALS } from '../store/authStore';
import { ShieldIcon, LockIcon, UserIcon, KeyIcon } from '../components/icons';
import { Hospital } from '../types';

interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [selectedHospital, setSelectedHospital] = useState<Hospital>(HOSPITALS[0]); // Default: HCPA
  const [username, setUsername] = useState('ana.chefe');
  const [password, setPassword] = useState('••••••••••••');
  const [mfaCode, setMfaCode] = useState('849201');
  const [step, setStep] = useState<'CREDENTIALS' | 'MFA'>('CREDENTIALS');
  const [selectedUser, setSelectedUser] = useState(DEMO_USERS[0]);

  const handleSelectHospital = (hosp: Hospital) => {
    setSelectedHospital(hosp);
    authStore.setHospital(hosp.hospital_id);
  };

  const handleSelectDemoUser = (user: typeof DEMO_USERS[0]) => {
    setSelectedUser(user);
    setUsername(user.username);
    setPassword('••••••••••••');
    if (user.mfa_enabled) {
      setMfaCode('849201');
    }
  };

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser.mfa_enabled) {
      setStep('MFA');
    } else {
      authStore.login(selectedUser, selectedHospital);
      onLoginSuccess();
    }
  };

  const handleMfaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    authStore.login(selectedUser, selectedHospital);
    onLoginSuccess();
  };

  return (
    <div className="min-h-[82vh] flex items-center justify-center p-4">
      <div className="w-full max-w-lg medical-card rounded-3xl p-8 sm:p-10 border border-cyan-400/40 shadow-2xl space-y-6">
        {/* Brand & Hospital Banner */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400 mx-auto flex items-center justify-center text-white shadow-[0_0_25px_rgba(0,195,255,0.4)]">
            <ShieldIcon className="w-9 h-9" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              BioShield <span className="text-cyan-400">AI</span>
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Portal de Acesso Exclusivo da Unidade Hospitalar
            </p>
          </div>

          {/* Hospital Tenant Selector Pill */}
          <div className="bg-[#061026] p-3 rounded-2xl border border-white/10 text-left space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-cyan-300 block">
              Hospital Selecionado para Acesso:
            </label>
            <div className="flex items-center gap-2">
              <select
                value={selectedHospital.hospital_id}
                onChange={(e) => {
                  const h = HOSPITALS.find((item) => item.hospital_id === e.target.value);
                  if (h) handleSelectHospital(h);
                }}
                className="w-full bg-[#0a1838] text-white p-2.5 rounded-xl border border-white/20 focus:border-cyan-400 font-semibold text-xs"
              >
                {HOSPITALS.map((h) => (
                  <option key={h.hospital_id} value={h.hospital_id}>
                    {h.name} ({h.city} - {h.state})
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-slate-400">
              Ao entrar, apenas os setores e alertas do <strong className="text-white">{selectedHospital.short_name}</strong> serão carregados.
            </p>
          </div>
        </div>

        {/* Form */}
        {step === 'CREDENTIALS' ? (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4 text-xs">
            <div>
              <label className="text-slate-200 font-semibold block mb-1.5">Usuário ou E-mail Institucional:</label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#07132e] text-white pl-10 pr-4 py-3 rounded-xl border border-white/20 focus:border-cyan-400 focus:outline-none text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-200 font-semibold block mb-1.5">Senha de Acesso:</label>
              <div className="relative">
                <LockIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#07132e] text-white pl-10 pr-4 py-3 rounded-xl border border-white/20 focus:border-cyan-400 focus:outline-none text-sm font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl btn-medical-primary text-sm font-bold shadow-md transition-all mt-2"
            >
              {selectedUser.mfa_enabled ? 'Continuar com Segundo Fator (MFA)' : 'Entrar no Hospital'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleMfaSubmit} className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-[#07132e] border border-cyan-500/30 text-center space-y-1">
              <KeyIcon className="w-6 h-6 mx-auto text-cyan-400" />
              <strong className="text-white block text-sm">Autenticação em Dois Fatores (MFA)</strong>
              <p className="text-xs text-slate-300">
                Digite o token numérico temporário (TOTP)
              </p>
            </div>

            <div>
              <label className="text-slate-200 font-semibold block mb-1.5 text-center">Código de Segurança:</label>
              <input
                type="text"
                required
                maxLength={6}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                className="w-full bg-[#07132e] text-cyan-300 text-center text-2xl tracking-widest font-extrabold py-3 rounded-xl border border-cyan-400 focus:outline-none shadow-md"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setStep('CREDENTIALS')}
                className="w-1/3 py-3 rounded-xl bg-white/10 text-slate-200 text-xs font-semibold hover:text-white"
              >
                Voltar
              </button>
              <button
                type="submit"
                className="w-2/3 py-3 rounded-xl btn-medical-primary text-xs font-bold shadow-md"
              >
                Validar e Entrar
              </button>
            </div>
          </form>
        )}

        {/* Quick Demo Accounts Selection */}
        <div className="pt-4 border-t border-white/10 space-y-2.5">
          <span className="text-xs font-bold text-white uppercase tracking-wider block">
            Acessos Demonstrativos Rápidos ({selectedHospital.code}):
          </span>

          <div className="space-y-2">
            {DEMO_USERS.map((u) => {
              const isSelected = selectedUser.user_id === u.user_id;
              return (
                <button
                  key={u.user_id}
                  type="button"
                  onClick={() => handleSelectDemoUser(u)}
                  className={`w-full text-left p-3 rounded-xl text-xs transition-all flex items-center justify-between border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-cyan-300 shadow-md font-medium'
                      : 'bg-[#07132e] border-white/10 text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <div>
                    <div className="font-bold text-sm leading-tight">{u.full_name.split('—')[0].trim()}</div>
                    <div className={`text-[11px] ${isSelected ? 'text-cyan-100' : 'text-slate-400'}`}>
                      {u.roles[0]?.name}
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                    u.mfa_enabled ? 'bg-white text-blue-900 shadow-sm' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {u.mfa_enabled ? 'MFA Ativo' : 'Sem MFA'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
