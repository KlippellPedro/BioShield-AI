// Tipos do painel. Espelham docs/openapi.yaml e os tipos do banco (database/schema.sql).

export type EventType = 'TIPO_A' | 'TIPO_B';
// TIPO_A = entrada sem o EPI | TIPO_B = remoção do EPI durante a permanência

export type EPIType = 'MASCARA' | 'LUVAS' | 'AVENTAL' | 'TOUCA' | 'PROTETOR_FACIAL';

export type EventStatus = 'PENDENTE' | 'RECONHECIDO' | 'DESCARTADO';

export type ZoneCategory = 'UTI' | 'CENTRO_CIRURGICO' | 'ISOLAMENTO' | 'EMERGENCIA' | 'OUTRO';

export type IdentificationSource = 'HUMAN' | 'AI';

export type IdentificationStatus = 'CONFIRMADA' | 'CONTESTADA' | 'REVOGADA';

export type DossierStatus = 'PENDENTE' | 'CONSOLIDADO';

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'EVENT_VIEW'
  | 'EVENT_ACK'
  | 'EVIDENCE_VIEW'
  | 'EVIDENCE_EXPORT'
  | 'EVIDENCE_PURGE'
  | 'ZONE_CREATE'
  | 'ZONE_UPDATE'
  | 'ZONE_DELETE'
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_DEACTIVATE'
  | 'ROLE_ASSIGN'
  | 'ROLE_REVOKE'
  | 'CONFIG_UPDATE'
  | 'IDENTIFICATION_CREATE'
  | 'IDENTIFICATION_CONTEST'
  | 'IDENTIFICATION_REVOKE';

// O backend calcula as permissões a partir dos papéis; a tela só as usa para se montar.
export type Permission =
  | 'events:read'
  | 'events:ack'
  | 'metrics:read'
  | 'evidence:view'
  | 'identification:read'
  | 'identification:write'
  | 'identification:review'
  | 'zones:read'
  | 'zones:write'
  | 'dossiers:read'
  | 'audit:read';

export interface Role {
  code: string;
  name: string;
}

export interface User {
  user_id: string;
  username: string;
  full_name: string;
  mfa_enabled: boolean;
  roles: Role[];
  permissions: Permission[];
}

export interface Zone {
  zone_id: string;
  code: string;
  name: string;
  category: ZoneCategory;
  t_remocao_seconds: number;
  required_epi: EPIType[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ZoneInput = Omit<Zone, 'zone_id' | 'created_at' | 'updated_at'>;

export interface Evidence {
  evidence_id: string;
  track_id: string | null;
  captured_at: string;
  retention_until: string;
  storage_checksum: string;
}

export interface Identification {
  identification_id: string;
  source: IdentificationSource; // 'HUMAN' (gestor) ou 'AI' (reconhecimento facial)
  identified_by_name?: string | null; // null quando source = AI
  subject_reference: string; // nome e matrícula (dado pessoal)
  justification?: string | null;
  status: IdentificationStatus;
  identified_at: string;
  contested_at?: string | null;
}

export interface Event {
  event_id: string;
  zone_id: string;
  zone_code: string;
  zone_name: string;
  track_id: string;
  event_type: EventType;
  epi_type: EPIType;
  occurred_at: string;
  detected_at: string;
  status: EventStatus;
  evidence_id?: string | null;
  dossier_id?: string | null;
  audited_professional_name?: string | null;
  audited_professional_registration?: string | null;
  acknowledged_by_name?: string | null;
  acknowledged_at?: string | null;
  identification?: Identification | null;
}

export interface Dossier {
  dossier_id: string;
  event_id: string;
  status: DossierStatus;
  created_at: string;
  updated_at: string;
  event: Event;
}

export interface AuditLog {
  log_id: number;
  user_id: string | null;
  user_name?: string | null;
  action: AuditAction;
  target_event_id: string | null;
  target_evidence_id: string | null;
  ip_address: string;
  user_agent: string | null;
  details: Record<string, unknown>;
  occurred_at: string;
}

export interface Metrics {
  pending_events: number;
  acknowledged_today: number;
  avg_ack_seconds?: number | null;
  avg_detection_latency_seconds?: number | null;
  dossiers_pending: number;
  evidences_retained: number;
}

export interface Page<T> {
  items: T[];
  next_cursor: string | null;
}
