import { request, requestBlob } from './http';
import {
  AuditAction,
  AuditLog,
  Dossier,
  DossierStatus,
  Evidence,
  Event,
  Metrics,
  Page,
  User,
  Zone,
  ZoneInput,
} from '../types';

export interface SessionResponse {
  user: User;
  csrf_token: string;
}
export interface MfaRequired {
  mfa_required: true;
  mfa_token: string;
}
export type LoginResponse = SessionResponse | MfaRequired;

const qs = (params: Record<string, string | number | undefined | null>) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
};

export const api = {
  auth: {
    login: (username: string, password: string) =>
      request<LoginResponse>('/auth/login', { method: 'POST', body: { username, password }, public: true }),
    mfa: (mfa_token: string, code: string) =>
      request<SessionResponse>('/auth/mfa', { method: 'POST', body: { mfa_token, code }, public: true }),
    me: () => request<SessionResponse>('/auth/me', { public: true }),
    logout: () => request<void>('/auth/logout', { method: 'POST', public: true }),
  },

  events: {
    list: (p: { limit?: number; cursor?: string } = {}) => request<Page<Event>>(`/events${qs(p)}`),
    get: (id: string) => request<Event>(`/events/${id}`),
    ack: (id: string, notes?: string) => request<Event>(`/events/${id}/ack`, { method: 'POST', body: { notes } }),
    discard: (id: string, reason: string) =>
      request<Event>(`/events/${id}/discard`, { method: 'POST', body: { reason } }),
    identify: (
      id: string,
      body: { professional_name: string; professional_registration: string; justification: string },
    ) => request<Event>(`/events/${id}/identification`, { method: 'POST', body }),
    contest: (id: string, justification: string) =>
      request<Event>(`/events/${id}/identification/contest`, { method: 'POST', body: { justification } }),
    revoke: (id: string, justification: string) =>
      request<Event>(`/events/${id}/identification/revoke`, { method: 'POST', body: { justification } }),
  },

  metrics: () => request<Metrics>('/metrics'),

  evidence: {
    get: (id: string, signal?: AbortSignal) => request<Evidence>(`/evidence/${id}`, { signal }),
    image: (id: string, signal?: AbortSignal) => requestBlob(`/evidence/${id}/image`, signal),
  },

  zones: {
    list: () => request<Zone[]>('/zones'),
    create: (body: ZoneInput) => request<Zone>('/zones', { method: 'POST', body }),
    update: (id: string, body: ZoneInput) => request<Zone>(`/zones/${id}`, { method: 'PATCH', body }),
  },

  dossiers: {
    list: (p: { status?: DossierStatus; limit?: number; cursor?: string } = {}) =>
      request<Page<Dossier>>(`/dossiers${qs(p)}`),
    pdf: (id: string, signal?: AbortSignal) => requestBlob(`/dossiers/${id}/pdf`, signal),
  },

  audit: {
    list: (p: { action?: AuditAction; limit?: number; cursor?: string } = {}) =>
      request<Page<AuditLog>>(`/audit-logs${qs(p)}`),
  },
};
