export type EventType = 'TIPO_A' | 'TIPO_B';
// TIPO_A = Entrada não conforme | TIPO_B = Remoção indevida durante procedimento

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

export interface Hospital {
  hospital_id: string;
  code: string;
  name: string;
  short_name: string;
  city: string;
  state: string;
}

export interface Role {
  role_id: string;
  code: string;
  name: string;
  description?: string;
  can_view_evidence: boolean;
}

export interface User {
  user_id: string;
  hospital_id: string;
  username: string;
  email: string;
  full_name: string;
  is_active: boolean;
  mfa_enabled: boolean;
  roles: Role[];
  token?: string;
}

export interface Zone {
  zone_id: string;
  hospital_id: string;
  code: string;
  name: string;
  category: ZoneCategory;
  t_remocao_seconds: number;
  required_epi: EPIType[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VisualEvidence {
  evidence_id: string;
  hospital_id: string;
  track_id: string;
  file_reference: string;
  storage_checksum: string;
  encryption_key_ref: string;
  captured_at: string;
  retention_until: string;
  blurred_preview?: string;
  unblurred_snapshot?: string;
}

export interface Identification {
  identification_id: string;
  evidence_id: string;
  source: IdentificationSource; // 'HUMAN' (gestor) ou 'AI' (face match)
  identified_by: string | null; // NULL se AI (chk_identification_source)
  identified_by_name?: string | null;
  subject_reference: string; // Ex: 'Dr. João da Silva / CRM-RS 123456'
  justification?: string | null;
  status: IdentificationStatus;
  identified_at: string;
  contested_at?: string | null;
}

export interface Event {
  event_id: string;
  hospital_id: string;
  zone_id: string;
  zone_code?: string;
  zone_name?: string;
  track_id: string;
  event_type: EventType;
  epi_type: EPIType;
  occurred_at: string;
  detected_at: string;
  status: EventStatus;
  evidence_id: string | null;
  evidence?: VisualEvidence | null;
  audited_professional_name?: string | null;
  audited_professional_registration?: string | null;
  acknowledged_by?: string | null;
  acknowledged_by_name?: string | null;
  acknowledged_at?: string | null;
  identification?: Identification | null;
}

export interface IncidentDossier {
  dossier_id: string;
  hospital_id: string;
  event_id: string;
  pdf_file_reference: string;
  status: DossierStatus;
  created_at: string;
  updated_at: string;
  event?: Event;
}

export interface AuditLog {
  log_id: number;
  hospital_id: string;
  user_id: string | null;
  user_name?: string;
  action: AuditAction;
  target_event_id: string | null;
  target_evidence_id: string | null;
  ip_address: string;
  user_agent: string | null;
  details: Record<string, any>;
  occurred_at: string;
}

export interface ComplianceMetrics {
  overall_compliance_rate: number;
  active_alerts_count: number;
  acknowledged_today_count: number;
  avg_acknowledgment_time_seconds: number;
  dossiers_pending_count: number;
  retention_active_count: number;
  system_latency_ms: number;
}
