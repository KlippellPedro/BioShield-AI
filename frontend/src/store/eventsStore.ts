import { 
  Event, 
  Zone, 
  VisualEvidence, 
  IncidentDossier, 
  AuditLog, 
  ComplianceMetrics,
  EPIType,
  EventType,
  AuditAction
} from '../types';
import { authStore } from './authStore';

// Zonas de risco iniciais (modo demonstração) — um hospital por instalação
const ALL_ZONES: Zone[] = [
  {
    zone_id: 'b0000000-0000-0000-0000-000000000001',
    code: 'EX-UTI-LESTE',
    name: 'UTI Leste Adulto — Leitos 01 a 12',
    category: 'UTI',
    t_remocao_seconds: 5,
    required_epi: ['MASCARA', 'AVENTAL', 'LUVAS'],
    is_active: true,
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    zone_id: 'b0000000-0000-0000-0000-000000000002',
    code: 'EX-CC-SALA-03',
    name: 'Centro Cirúrgico Bloco B — Sala 03 (Transplantes)',
    category: 'CENTRO_CIRURGICO',
    t_remocao_seconds: 3,
    required_epi: ['MASCARA', 'AVENTAL', 'LUVAS', 'TOUCA', 'PROTETOR_FACIAL'],
    is_active: true,
    created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    zone_id: 'b0000000-0000-0000-0000-000000000003',
    code: 'EX-ISO-RESP',
    name: 'Isolamento Respiratório e Gotículas B',
    category: 'ISOLAMENTO',
    t_remocao_seconds: 4,
    required_epi: ['MASCARA', 'AVENTAL', 'LUVAS', 'PROTETOR_FACIAL'],
    is_active: true,
    created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    zone_id: 'b0000000-0000-0000-0000-000000000004',
    code: 'EX-EMERG-VERM',
    name: 'Emergência Geral Adulto — Sala Vermelha',
    category: 'EMERGENCIA',
    t_remocao_seconds: 6,
    required_epi: ['MASCARA', 'LUVAS', 'AVENTAL'],
    is_active: true,
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
];

// Evidências iniciais (modo demonstração)
const ALL_EVIDENCES: VisualEvidence[] = [
  {
    evidence_id: 'c0000000-0000-0000-0000-000000000001',
    track_id: 'track_00427',
    file_reference: 's3://evidencias-cifradas/2026/10/track_00427.enc',
    storage_checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    encryption_key_ref: 'vault://kms/exemplo/key-001',
    captured_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    retention_until: new Date(Date.now() + 86400000 * 90).toISOString(),
    blurred_preview: 'blurred-sim',
    unblurred_snapshot: 'unblurred-sim',
  },
  {
    evidence_id: 'c0000000-0000-0000-0000-000000000002',
    track_id: 'track_00994',
    file_reference: 's3://evidencias-cifradas/2026/10/track_00994.enc',
    storage_checksum: '4a6b281b376d215320c904e28031599a099a896d8e87858c2f1f0a1d4791b10a',
    encryption_key_ref: 'vault://kms/exemplo/key-002',
    captured_at: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    retention_until: new Date(Date.now() + 86400000 * 90).toISOString(),
    blurred_preview: 'blurred-sim',
    unblurred_snapshot: 'unblurred-sim',
  },
  {
    evidence_id: 'c0000000-0000-0000-0000-000000000003',
    track_id: 'track_00351',
    file_reference: 's3://evidencias-cifradas/2026/10/track_00351.enc',
    storage_checksum: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    encryption_key_ref: 'vault://kms/exemplo/key-003',
    captured_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    retention_until: new Date(Date.now() + 86400000 * 90).toISOString(),
    blurred_preview: 'blurred-sim',
    unblurred_snapshot: 'unblurred-sim',
  },
];

// Eventos iniciais (modo demonstração)
const ALL_EVENTS: Event[] = [
  {
    event_id: 'd0000000-0000-0000-0000-000000000003',
    zone_id: 'b0000000-0000-0000-0000-000000000002',
    zone_code: 'EX-CC-SALA-03',
    zone_name: 'Centro Cirúrgico Bloco B — Sala 03 (Transplantes)',
    track_id: 'track_00351',
    event_type: 'TIPO_B',
    epi_type: 'PROTETOR_FACIAL',
    occurred_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    detected_at: new Date(Date.now() - 1000 * 60 * 2 + 1200).toISOString(),
    status: 'PENDENTE',
    evidence_id: 'c0000000-0000-0000-0000-000000000003',
    evidence: ALL_EVIDENCES[2],
    audited_professional_name: null,
    audited_professional_registration: null,
    acknowledged_by: null,
    acknowledged_at: null,
  },
  {
    event_id: 'd0000000-0000-0000-0000-000000000002',
    zone_id: 'b0000000-0000-0000-0000-000000000003',
    zone_code: 'EX-ISO-RESP',
    zone_name: 'Isolamento Respiratório e Gotículas B',
    track_id: 'track_00994',
    event_type: 'TIPO_A',
    epi_type: 'AVENTAL',
    occurred_at: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    detected_at: new Date(Date.now() - 1000 * 60 * 8 + 1400).toISOString(),
    status: 'PENDENTE',
    evidence_id: 'c0000000-0000-0000-0000-000000000002',
    evidence: ALL_EVIDENCES[1],
    audited_professional_name: 'Enf. Camila Prado',
    audited_professional_registration: 'COREN-RS 87211',
    identification: {
      identification_id: 'id-002',
      evidence_id: 'c0000000-0000-0000-0000-000000000002',
      source: 'AI',
      identified_by: null,
      subject_reference: 'Enf. Camila Prado / COREN-RS 87211',
      justification: 'Face match automático com 98.4% de confiança no cadastro do hospital.',
      status: 'CONFIRMADA',
      identified_at: new Date(Date.now() - 1000 * 60 * 7).toISOString(),
    },
  },
  {
    event_id: 'd0000000-0000-0000-0000-000000000001',
    zone_id: 'b0000000-0000-0000-0000-000000000001',
    zone_code: 'EX-UTI-LESTE',
    zone_name: 'UTI Leste Adulto — Leitos 01 a 12',
    track_id: 'track_00427',
    event_type: 'TIPO_B',
    epi_type: 'MASCARA',
    occurred_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    detected_at: new Date(Date.now() - 1000 * 60 * 35 + 1100).toISOString(),
    status: 'RECONHECIDO',
    evidence_id: 'c0000000-0000-0000-0000-000000000001',
    evidence: ALL_EVIDENCES[0],
    audited_professional_name: 'Dr. João da Silva',
    audited_professional_registration: 'CRM-RS 123456',
    acknowledged_by: 'a0000000-0000-0000-0000-000000000001',
    acknowledged_by_name: 'Ana Carolina (Enfermagem-chefe)',
    acknowledged_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    identification: {
      identification_id: 'id-001',
      evidence_id: 'c0000000-0000-0000-0000-000000000001',
      source: 'HUMAN',
      identified_by: 'a0000000-0000-0000-0000-000000000001',
      identified_by_name: 'Ana Carolina',
      subject_reference: 'Dr. João da Silva / CRM-RS 123456',
      justification: 'Reconhecido pela enfermagem-chefe via auditoria visual.',
      status: 'CONFIRMADA',
      identified_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
  },
];

// Dossiês iniciais (modo demonstração)
const ALL_DOSSIERS: IncidentDossier[] = [
  {
    dossier_id: 'e0000000-0000-0000-0000-000000000001',
    event_id: 'd0000000-0000-0000-0000-000000000001',
    pdf_file_reference: 's3://dossies/2026/10/incidente_001_consolidado.pdf',
    status: 'CONSOLIDADO',
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 29).toISOString(),
    event: ALL_EVENTS[2],
  },
  {
    dossier_id: 'e0000000-0000-0000-0000-000000000002',
    event_id: 'd0000000-0000-0000-0000-000000000002',
    pdf_file_reference: 's3://dossies/2026/10/incidente_002_pendente.pdf',
    status: 'PENDENTE',
    created_at: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    event: ALL_EVENTS[1],
  },
  {
    dossier_id: 'e0000000-0000-0000-0000-000000000003',
    event_id: 'd0000000-0000-0000-0000-000000000003',
    pdf_file_reference: 's3://dossies/2026/10/incidente_003_pendente.pdf',
    status: 'PENDENTE',
    created_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    event: ALL_EVENTS[0],
  },
];

// Initial Audit Logs
const ALL_AUDIT_LOGS: AuditLog[] = [
  {
    log_id: 1042,
    user_id: 'a0000000-0000-0000-0000-000000000001',
    user_name: 'Ana Carolina (Enfermagem-chefe)',
    action: 'LOGIN',
    target_event_id: null,
    target_evidence_id: null,
    ip_address: '10.150.22.45',
    user_agent: 'BioShield Client v1.4',
    details: { method: 'MFA_TOTP_VERIFIED' },
    occurred_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    log_id: 1043,
    user_id: 'a0000000-0000-0000-0000-000000000001',
    user_name: 'Ana Carolina (Enfermagem-chefe)',
    action: 'EVIDENCE_VIEW',
    target_event_id: 'd0000000-0000-0000-0000-000000000001',
    target_evidence_id: 'c0000000-0000-0000-0000-000000000001',
    ip_address: '10.150.22.45',
    user_agent: 'BioShield Client v1.4',
    details: { reason: 'Auditoria visual de remoção de máscara', zone: 'EX-UTI-LESTE' },
    occurred_at: new Date(Date.now() - 1000 * 60 * 32).toISOString(),
  },
  {
    log_id: 1044,
    user_id: 'a0000000-0000-0000-0000-000000000001',
    user_name: 'Ana Carolina (Enfermagem-chefe)',
    action: 'IDENTIFICATION_CREATE',
    target_event_id: 'd0000000-0000-0000-0000-000000000001',
    target_evidence_id: 'c0000000-0000-0000-0000-000000000001',
    ip_address: '10.150.22.45',
    user_agent: 'BioShield Client v1.4',
    details: { professional: 'Dr. João da Silva', registration: 'CRM-RS 123456' },
    occurred_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
];

type StoreListener = () => void;
const listeners: Set<StoreListener> = new Set();

let zones: Zone[] = ALL_ZONES;
let events: Event[] = ALL_EVENTS;
let evidences: VisualEvidence[] = ALL_EVIDENCES;
let dossiers: IncidentDossier[] = ALL_DOSSIERS;
let auditLogs: AuditLog[] = ALL_AUDIT_LOGS;
let isSimulationRunning: boolean = true;
let simulationTimer: any = null;
let newAlertPulse: boolean = false;

function notify() {
  listeners.forEach((fn) => fn());
}

export const eventsStore = {
  getZones: () => zones,

  getEvents: () => events,

  getEvidences: () => evidences,

  getDossiers: () => dossiers,

  getAuditLogs: () => auditLogs,

  isSimulationActive: () => isSimulationRunning,
  hasNewAlertPulse: () => newAlertPulse,

  clearPulse: () => {
    newAlertPulse = false;
    notify();
  },

  getMetrics: (): ComplianceMetrics => {
    const allEvents = eventsStore.getEvents();
    const allEvidences = eventsStore.getEvidences();
    const allDossiers = eventsStore.getDossiers();

    const pendingCount = allEvents.filter((e) => e.status === 'PENDENTE').length;
    const ackCount = allEvents.filter((e) => e.status === 'RECONHECIDO').length;
    const pendingDossiers = allDossiers.filter((d) => d.status === 'PENDENTE').length;

    return {
      overall_compliance_rate: 97.4,
      active_alerts_count: pendingCount,
      acknowledged_today_count: ackCount,
      avg_acknowledgment_time_seconds: 1.8,
      dossiers_pending_count: pendingDossiers,
      retention_active_count: allEvidences.length,
      system_latency_ms: 18,
    };
  },

  getEventById: (id: string): Event | undefined => {
    return events.find((e) => e.event_id === id);
  },

  getEvidenceById: (id: string): VisualEvidence | undefined => {
    return evidences.find((ev) => ev.evidence_id === id);
  },

  acknowledgeEvent: (eventId: string, notes?: string) => {
    const user = authStore.getUser();
    events = events.map((ev) => {
      if (ev.event_id === eventId) {
        return {
          ...ev,
          status: 'RECONHECIDO',
          acknowledged_by: user ? user.user_id : 'anonymous',
          acknowledged_by_name: user ? user.full_name : 'Operador',
          acknowledged_at: new Date().toISOString(),
        };
      }
      return ev;
    });

    eventsStore.logAudit('EVENT_ACK', eventId, null, {
      status: 'RECONHECIDO',
      notes: notes || 'Alerta tratado e validado pelo gestor',
    });

    notify();
  },

  discardEvent: (eventId: string, reason: string) => {
    const user = authStore.getUser();
    events = events.map((ev) => {
      if (ev.event_id === eventId) {
        return {
          ...ev,
          status: 'DESCARTADO',
          acknowledged_by: user ? user.user_id : 'anonymous',
          acknowledged_by_name: user ? user.full_name : 'Operador',
          acknowledged_at: new Date().toISOString(),
        };
      }
      return ev;
    });

    eventsStore.logAudit('EVENT_ACK', eventId, null, {
      status: 'DESCARTADO',
      reason,
    });

    notify();
  },

  identifyEventHuman: (
    eventId: string, 
    professionalName: string, 
    professionalReg: string, 
    justification: string
  ) => {
    const user = authStore.getUser();
    const event = events.find((e) => e.event_id === eventId);
    if (!event) return;

    const evidenceId = event.evidence_id || 'c0000000-0000-0000-0000-000000000001';

    events = events.map((ev) => {
      if (ev.event_id === eventId) {
        return {
          ...ev,
          audited_professional_name: professionalName,
          audited_professional_registration: professionalReg,
          status: 'RECONHECIDO',
          acknowledged_by: user ? user.user_id : null,
          acknowledged_by_name: user ? user.full_name : 'Gestor',
          acknowledged_at: new Date().toISOString(),
          identification: {
            identification_id: `id-${Date.now()}`,
            evidence_id: evidenceId,
            source: 'HUMAN',
            identified_by: user ? user.user_id : null,
            identified_by_name: user ? user.full_name : 'Gestor',
            subject_reference: `${professionalName} / ${professionalReg}`,
            justification,
            status: 'CONFIRMADA',
            identified_at: new Date().toISOString(),
          },
        };
      }
      return ev;
    });

    dossiers = dossiers.map((d) => {
      if (d.event_id === eventId) {
        return {
          ...d,
          status: 'CONSOLIDADO',
          pdf_file_reference: d.pdf_file_reference.replace('pendente', 'consolidado'),
          updated_at: new Date().toISOString(),
        };
      }
      return d;
    });

    eventsStore.logAudit('IDENTIFICATION_CREATE', eventId, evidenceId, {
      source: 'HUMAN',
      professional: professionalName,
      registration: professionalReg,
      justification,
    });

    notify();
  },

  contestIdentification: (eventId: string, justification: string) => {
    const event = events.find((e) => e.event_id === eventId);
    if (!event || !event.identification) return;

    events = events.map((ev) => {
      if (ev.event_id === eventId && ev.identification) {
        return {
          ...ev,
          identification: {
            ...ev.identification,
            status: 'CONTESTADA',
            contested_at: new Date().toISOString(),
            justification: `${ev.identification.justification || ''} | Contestação: ${justification}`,
          },
        };
      }
      return ev;
    });

    eventsStore.logAudit('IDENTIFICATION_CONTEST', eventId, event.evidence_id, {
      status: 'CONTESTADA',
      justification,
    });

    notify();
  },

  revokeIdentification: (eventId: string, justification: string) => {
    const event = events.find((e) => e.event_id === eventId);
    if (!event || !event.identification) return;

    events = events.map((ev) => {
      if (ev.event_id === eventId && ev.identification) {
        return {
          ...ev,
          audited_professional_name: null,
          audited_professional_registration: null,
          identification: {
            ...ev.identification,
            status: 'REVOGADA',
            contested_at: new Date().toISOString(),
            justification: `Revogado: ${justification}`,
          },
        };
      }
      return ev;
    });

    dossiers = dossiers.map((d) => {
      if (d.event_id === eventId) {
        return {
          ...d,
          status: 'PENDENTE',
          updated_at: new Date().toISOString(),
        };
      }
      return d;
    });

    eventsStore.logAudit('IDENTIFICATION_REVOKE', eventId, event.evidence_id, {
      status: 'REVOGADA',
      justification,
    });

    notify();
  },

  recordEvidenceView: (evidenceId: string, eventId?: string) => {
    eventsStore.logAudit('EVIDENCE_VIEW', eventId || null, evidenceId, {
      client: 'EvidenceViewer',
      timestamp: new Date().toISOString(),
    });
  },

  createZone: (zoneData: Omit<Zone, 'zone_id' | 'created_at' | 'updated_at'>) => {
    const newZone: Zone = {
      ...zoneData,
      zone_id: `b0000000-0000-0000-0000-${Date.now().toString().slice(-12)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    zones = [newZone, ...zones];

    eventsStore.logAudit('ZONE_CREATE', null, null, {
      code: newZone.code,
      name: newZone.name,
      t_remocao: newZone.t_remocao_seconds,
    });

    notify();
  },

  updateZone: (zoneId: string, updates: Partial<Zone>) => {
    zones = zones.map((z) => {
      if (z.zone_id === zoneId) {
        return { ...z, ...updates, updated_at: new Date().toISOString() };
      }
      return z;
    });

    eventsStore.logAudit('ZONE_UPDATE', null, null, {
      zone_id: zoneId,
      updates,
    });

    notify();
  },

  logAudit: (
    action: AuditAction, 
    targetEventId: string | null, 
    targetEvidenceId: string | null, 
    details: Record<string, any>
  ) => {
    const user = authStore.getUser();
    const newLog: AuditLog = {
      log_id: auditLogs.length > 0 ? Math.max(...auditLogs.map((l) => l.log_id)) + 1 : 1000,
      user_id: user ? user.user_id : null,
      user_name: user ? user.full_name : 'Sistema / Edge AI',
      action,
      target_event_id: targetEventId,
      target_evidence_id: targetEvidenceId,
      ip_address: '10.150.22.' + (Math.floor(Math.random() * 50) + 10),
      user_agent: 'BioShield Client v1.4',
      details,
      occurred_at: new Date().toISOString(),
    };

    auditLogs = [newLog, ...auditLogs];
    notify();
  },

  toggleSimulation: () => {
    isSimulationRunning = !isSimulationRunning;
    if (isSimulationRunning) {
      startSimulationLoop();
    } else if (simulationTimer) {
      clearInterval(simulationTimer);
      simulationTimer = null;
    }
    notify();
  },

  triggerSimulatedAlert: () => {
    generateRandomIncident();
  },

  subscribe: (listener: StoreListener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

function generateRandomIncident() {
  const zonesAtivas = eventsStore.getZones();
  if (zonesAtivas.length === 0) return;

  const zone = zonesAtivas[Math.floor(Math.random() * zonesAtivas.length)];
  const possibleEpis: EPIType[] = zone.required_epi.length > 0 
    ? zone.required_epi 
    : ['MASCARA', 'LUVAS', 'AVENTAL'];
  const epi = possibleEpis[Math.floor(Math.random() * possibleEpis.length)];
  const eventType: EventType = Math.random() > 0.4 ? 'TIPO_B' : 'TIPO_A';
  const trackNum = Math.floor(Math.random() * 899) + 100;
  const trackId = `track_00${trackNum}`;

  const evidenceId = `c0000000-0000-0000-0000-${Date.now().toString().slice(-12)}`;
  const eventId = `d0000000-0000-0000-0000-${Date.now().toString().slice(-12)}`;
  const dossierId = `e0000000-0000-0000-0000-${Date.now().toString().slice(-12)}`;

  const newEvidence: VisualEvidence = {
    evidence_id: evidenceId,
    track_id: trackId,
    file_reference: `s3://evidencias-cifradas/2026/10/${trackId}_auto.enc`,
    storage_checksum: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    encryption_key_ref: 'vault://kms/exemplo/key-edge',
    captured_at: new Date().toISOString(),
    retention_until: new Date(Date.now() + 86400000 * 90).toISOString(),
    blurred_preview: 'blurred-sim',
    unblurred_snapshot: 'unblurred-sim',
  };

  const newEvent: Event = {
    event_id: eventId,
    zone_id: zone.zone_id,
    zone_code: zone.code,
    zone_name: zone.name,
    track_id: trackId,
    event_type: eventType,
    epi_type: epi,
    occurred_at: new Date().toISOString(),
    detected_at: new Date(Date.now() + 850).toISOString(),
    status: 'PENDENTE',
    evidence_id: evidenceId,
    evidence: newEvidence,
    audited_professional_name: null,
    audited_professional_registration: null,
    acknowledged_by: null,
    acknowledged_at: null,
  };

  const newDossier: IncidentDossier = {
    dossier_id: dossierId,
    event_id: eventId,
    pdf_file_reference: `s3://dossies/2026/10/incidente_${eventId.slice(-6)}_pendente.pdf`,
    status: 'PENDENTE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    event: newEvent,
  };

  evidences = [newEvidence, ...evidences];
  events = [newEvent, ...events];
  dossiers = [newDossier, ...dossiers];
  newAlertPulse = true;

  notify();
}

function startSimulationLoop() {
  if (simulationTimer) clearInterval(simulationTimer);
  simulationTimer = setInterval(() => {
    if (isSimulationRunning && Math.random() > 0.45) {
      generateRandomIncident();
    }
  }, 16000);
}

startSimulationLoop();
