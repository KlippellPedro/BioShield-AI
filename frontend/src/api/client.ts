import { authStore } from '../store/authStore';
import { eventsStore } from '../store/eventsStore';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export const apiClient = {
  getHeaders: () => {
    const user = authStore.getUser();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (user?.token) {
      headers['Authorization'] = `Bearer ${user.token}`;
    }
    return headers;
  },

  // Auth routes
  async login(username: string, passwordHashOrPlain: string, mfaCode?: string) {
    // If backend is active, try fetch; fallback to store
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: passwordHashOrPlain, mfa_code: mfaCode }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Backend not running yet - use local store
    }
    return null;
  },

  // Events routes
  async getEvents() {
    try {
      const res = await fetch('/api/events', { headers: this.getHeaders() });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return eventsStore.getEvents();
  },

  async acknowledgeEvent(eventId: string, notes?: string) {
    try {
      const res = await fetch(`/api/events/${eventId}/ack`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ notes }),
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    eventsStore.acknowledgeEvent(eventId, notes);
    return { success: true };
  },

  // Evidence snapshot retrieval (RNF-19 check)
  async getEvidence(evidenceId: string) {
    // Check local RBAC / MFA before even querying
    if (!authStore.canViewEvidence()) {
      throw new Error('Acesso negado: Visualização de evidência requer papel com can_view_evidence e MFA ativo (RNF-19).');
    }

    try {
      const res = await fetch(`/api/evidence/${evidenceId}`, { headers: this.getHeaders() });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    const ev = eventsStore.getEvidenceById(evidenceId);
    if (ev) {
      eventsStore.recordEvidenceView(evidenceId);
    }
    return ev;
  },
};
