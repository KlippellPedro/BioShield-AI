import { useSyncExternalStore } from 'react';
import { api, SessionResponse } from '../api/endpoints';
import { setCsrfToken, setUnauthorizedHandler } from '../api/http';
import { Permission, User } from '../types';

// Estado da sessão. A verdade fica no backend (cookie httpOnly); aqui só o perfil que a tela exibe.
// Nada é gravado em localStorage/sessionStorage.

export interface AuthState {
  status: 'loading' | 'anonymous' | 'authenticated';
  user: User | null;
  // Segundo fator pendente: o mfa_token vale poucos minutos e a senha não fica no navegador.
  mfaToken: string | null;
  notice: string | null;
}

let state: AuthState = { status: 'loading', user: null, mfaToken: null, notice: null };
const listeners = new Set<() => void>();

function setState(next: Partial<AuthState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function applySession(res: SessionResponse) {
  setCsrfToken(res.csrf_token);
  setState({ status: 'authenticated', user: res.user, mfaToken: null, notice: null });
}

function clearSession(notice: string | null = null) {
  setCsrfToken(null);
  setState({ status: 'anonymous', user: null, mfaToken: null, notice });
}

setUnauthorizedHandler(() => {
  if (state.status === 'authenticated') clearSession('Sua sessão expirou. Entre novamente.');
});

export const authStore = {
  getState: () => state,

  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  // Descobre se já existe sessão (cookie) ao abrir a página.
  bootstrap: async () => {
    try {
      applySession(await api.auth.me());
    } catch {
      clearSession();
    }
  },

  // Devolve 'mfa' quando falta o segundo fator.
  login: async (username: string, password: string): Promise<'ok' | 'mfa'> => {
    const res = await api.auth.login(username, password);
    if ('mfa_required' in res) {
      setState({ mfaToken: res.mfa_token, notice: null });
      return 'mfa';
    }
    applySession(res);
    return 'ok';
  },

  verifyMfa: async (code: string) => {
    if (!state.mfaToken) throw new Error('Segundo fator não solicitado.');
    applySession(await api.auth.mfa(state.mfaToken, code));
  },

  cancelMfa: () => setState({ mfaToken: null }),

  logout: async () => {
    try {
      await api.auth.logout();
    } finally {
      clearSession();
    }
  },
};

export function useAuth(): AuthState & { can: (p: Permission) => boolean } {
  const s = useSyncExternalStore(authStore.subscribe, authStore.getState);
  return { ...s, can: (p) => s.user?.permissions.includes(p) ?? false };
}
