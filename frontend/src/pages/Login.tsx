import React, { useState } from 'react';
import { authStore, useAuth } from '../store/authStore';
import { HOSPITAL_NAME } from '../config/app';
import { ShieldIcon, LockIcon, UserIcon, KeyIcon } from '../components/icons';
import { InlineError } from '../components/StateMessage';

// Login em duas etapas. A senha só vale para a primeira chamada; o segundo fator usa um
// mfa_token de curta duração, então a senha não fica na memória do navegador.
export const Login: React.FC = () => {
  const { mfaToken, notice } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao entrar.');
    } finally {
      setBusy(false);
    }
  };

  const handleCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await authStore.login(username.trim(), password);
      setPassword('');
    });
  };

  const handleMfa = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await authStore.verifyMfa(mfaCode);
      setMfaCode('');
    });
  };

  return (
    <div className="min-h-[82vh] flex items-center justify-center p-4">
      <div className="w-full max-w-lg medical-card rounded-3xl p-8 sm:p-10 border border-cyan-400/40 shadow-2xl space-y-6">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400 mx-auto flex items-center justify-center text-white shadow-[0_0_25px_rgba(0,195,255,0.4)]">
            <ShieldIcon className="w-9 h-9" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              BioShield <span className="text-cyan-400">AI</span>
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">{HOSPITAL_NAME || 'Acesso exclusivo da equipe autorizada'}</p>
          </div>
        </div>

        {notice && !error && (
          <div role="status" className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/40 text-xs text-amber-200">
            {notice}
          </div>
        )}
        <InlineError message={error} />

        {!mfaToken ? (
          <form onSubmit={handleCredentials} className="space-y-4 text-xs">
            <div>
              <label htmlFor="username" className="text-slate-200 font-semibold block mb-1.5">
                Usuário:
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                <input
                  id="username"
                  type="text"
                  required
                  autoComplete="username"
                  maxLength={60}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#07132e] text-white pl-10 pr-4 py-3 rounded-xl border border-white/20 focus:border-cyan-400 focus:outline-none text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="text-slate-200 font-semibold block mb-1.5">
                Senha:
              </label>
              <div className="relative">
                <LockIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  maxLength={256}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#07132e] text-white pl-10 pr-4 py-3 rounded-xl border border-white/20 focus:border-cyan-400 focus:outline-none text-sm font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3.5 rounded-xl btn-medical-primary text-sm font-bold shadow-md transition-all mt-2 disabled:opacity-60"
            >
              {busy ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleMfa} className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-[#07132e] border border-cyan-500/30 text-center space-y-1">
              <KeyIcon className="w-6 h-6 mx-auto text-cyan-400" />
              <strong className="text-white block text-sm">Autenticação em dois fatores (MFA)</strong>
              <p className="text-xs text-slate-300">Digite o código de 6 dígitos do seu aplicativo autenticador.</p>
            </div>

            <div>
              <label htmlFor="mfa" className="text-slate-200 font-semibold block mb-1.5 text-center">
                Código de segurança:
              </label>
              <input
                id="mfa"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                autoFocus
                pattern="[0-9]{6}"
                maxLength={6}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-[#07132e] text-cyan-300 text-center text-2xl tracking-widest font-extrabold py-3 rounded-xl border border-cyan-400 focus:outline-none shadow-md"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMfaCode('');
                  authStore.cancelMfa();
                }}
                className="w-1/3 py-3 rounded-xl bg-white/10 text-slate-200 text-xs font-semibold hover:text-white"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={busy || mfaCode.length !== 6}
                className="w-2/3 py-3 rounded-xl btn-medical-primary text-xs font-bold shadow-md disabled:opacity-60"
              >
                {busy ? 'Validando…' : 'Validar e entrar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
