import { authStore } from '../store/authStore';
import { eventsStore } from '../store/eventsStore';
import { DEMO_MODE } from '../config/app';
import { User, Event, VisualEvidence } from '../types';

// Cliente da API do backend. A sessão é um cookie httpOnly, por isso `credentials: 'include'`
// e nenhum token passa pelo JavaScript.
//
// Fora do modo demonstração, falha de rede ou de servidor vira erro: não existe mais o
// "plano B" silencioso com dados locais. O contrato exato das rotas ainda será fixado
// no OpenAPI do backend (docs/openapi.yaml); o formato abaixo é a proposta inicial.

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    });
  } catch {
    throw new ApiError(0, 'Não foi possível contatar o servidor.');
  }
  if (!res.ok) {
    let message = `Erro ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // resposta sem corpo JSON
    }
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}

export type LoginResult = { user: User } | { mfa_required: true };

export const apiClient = {
  // Em duas etapas: sem mfa_code, o backend responde { mfa_required: true } para quem exige o 2º fator.
  async login(username: string, password: string, mfaCode?: string): Promise<LoginResult> {
    return request<LoginResult>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, mfa_code: mfaCode }),
    });
  },

  async logout(): Promise<void> {
    if (DEMO_MODE) return;
    await request('/api/auth/logout', { method: 'POST' });
  },

  async getEvents(): Promise<Event[]> {
    if (DEMO_MODE) return eventsStore.getEvents();
    return request<Event[]>('/api/events');
  },

  async acknowledgeEvent(eventId: string, notes?: string): Promise<void> {
    if (DEMO_MODE) {
      eventsStore.acknowledgeEvent(eventId, notes);
      return;
    }
    await request(`/api/events/${eventId}/ack`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },

  // A checagem local só poupa uma viagem à rede; a regra (papel + MFA, RNF-19) é imposta pelo backend.
  async getEvidence(evidenceId: string): Promise<VisualEvidence | undefined> {
    if (!authStore.canViewEvidence()) {
      throw new Error('Acesso negado: visualizar evidência exige papel autorizado e MFA ativo (RNF-19).');
    }
    if (DEMO_MODE) {
      const ev = eventsStore.getEvidenceById(evidenceId);
      if (ev) eventsStore.recordEvidenceView(evidenceId);
      return ev;
    }
    return request<VisualEvidence>(`/api/evidence/${evidenceId}`);
  },
};
