import { User, Role, Hospital } from '../types';

export const HOSPITALS: Hospital[] = [
  {
    hospital_id: 'hosp-hcpa-poa',
    code: 'HCPA',
    name: 'Hospital de Clínicas de Porto Alegre',
    short_name: 'HCPA • Porto Alegre',
    city: 'Porto Alegre',
    state: 'RS',
  },
  {
    hospital_id: 'hosp-santacasa-poa',
    code: 'SANTA_CASA',
    name: 'Hospital Santa Casa de Misericórdia de Porto Alegre',
    short_name: 'Santa Casa • POA',
    city: 'Porto Alegre',
    state: 'RS',
  },
  {
    hospital_id: 'hosp-moinhos-poa',
    code: 'HMV',
    name: 'Hospital Moinhos de Vento',
    short_name: 'Moinhos de Vento • POA',
    city: 'Porto Alegre',
    state: 'RS',
  },
];

export const DEMO_ROLES: Record<string, Role> = {
  ENFERMAGEM_CHEFE: {
    role_id: 'r0000000-0000-0000-0000-000000000001',
    code: 'ENFERMAGEM_CHEFE',
    name: 'Enfermagem-chefe',
    description: 'Trata alertas em tempo real e conduz revisão visual da evidência (MFA obrigatório).',
    can_view_evidence: true,
  },
  OPERADOR: {
    role_id: 'r0000000-0000-0000-0000-000000000002',
    code: 'OPERADOR_SEGURANCA',
    name: 'Operador de Monitoramento',
    description: 'Monitoramento de conformidade em tempo real (sem visualização de evidência desocultada sem MFA).',
    can_view_evidence: false,
  },
  GESTOR_CCIH: {
    role_id: 'r0000000-0000-0000-0000-000000000003',
    code: 'GESTOR_CCIH',
    name: 'Gestor de Qualidade / CCIH',
    description: 'Comissão de Controle de Infecção Hospitalar e indicadores de conformidade de EPI.',
    can_view_evidence: false,
  },
  DPO: {
    role_id: 'r0000000-0000-0000-0000-000000000004',
    code: 'DPO',
    name: 'Encarregado de Dados (DPO)',
    description: 'Auditoria LGPD, conformidade e governança de ciclo de vida das evidências.',
    can_view_evidence: true,
  },
};

export const DEMO_USERS: User[] = [
  {
    user_id: 'a0000000-0000-0000-0000-000000000001',
    hospital_id: 'hosp-hcpa-poa',
    username: 'ana.chefe',
    email: 'ana.chefe@hcpa.ufrgs.br',
    full_name: 'Ana Carolina — Enfermagem-chefe (HCPA)',
    is_active: true,
    mfa_enabled: true,
    roles: [DEMO_ROLES.ENFERMAGEM_CHEFE],
    token: 'jwt-token-ana-hcpa-verified-mfa',
  },
  {
    user_id: 'a0000000-0000-0000-0000-000000000002',
    hospital_id: 'hosp-hcpa-poa',
    username: 'bruno.op',
    email: 'bruno.op@hcpa.ufrgs.br',
    full_name: 'Bruno Ramos — Monitoramento (HCPA)',
    is_active: true,
    mfa_enabled: false,
    roles: [DEMO_ROLES.OPERADOR],
    token: 'jwt-token-bruno-hcpa',
  },
  {
    user_id: 'a0000000-0000-0000-0000-000000000003',
    hospital_id: 'hosp-hcpa-poa',
    username: 'roberto.ccih',
    email: 'roberto.ccih@hcpa.ufrgs.br',
    full_name: 'Dr. Roberto Duarte — CCIH (HCPA)',
    is_active: true,
    mfa_enabled: true,
    roles: [DEMO_ROLES.GESTOR_CCIH],
    token: 'jwt-token-roberto-ccih',
  },
  {
    user_id: 'a0000000-0000-0000-0000-000000000004',
    hospital_id: 'hosp-hcpa-poa',
    username: 'mariana.dpo',
    email: 'mariana.dpo@hcpa.ufrgs.br',
    full_name: 'Mariana Fontes — Encarregada LGPD (HCPA)',
    is_active: true,
    mfa_enabled: true,
    roles: [DEMO_ROLES.DPO],
    token: 'jwt-token-mariana-dpo-mfa',
  },
];

const USER_STORAGE_KEY = 'bioshield_auth_user';
const HOSP_STORAGE_KEY = 'bioshield_active_hospital';

type AuthListener = (user: User | null, hospital: Hospital) => void;
const listeners: Set<AuthListener> = new Set();

function getInitialHospital(): Hospital {
  try {
    const saved = localStorage.getItem(HOSP_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const found = HOSPITALS.find((h) => h.hospital_id === parsed.hospital_id);
      if (found) return found;
    }
  } catch (e) {
    console.error(e);
  }
  // Default directly to Hospital de Clínicas de Porto Alegre (HCPA)
  return HOSPITALS[0];
}

function getInitialUser(): User | null {
  try {
    const saved = localStorage.getItem(USER_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error(e);
  }
  return DEMO_USERS[0];
}

let activeHospital: Hospital = getInitialHospital();
let activeUser: User | null = getInitialUser();

function notify() {
  listeners.forEach((listener) => listener(activeUser, activeHospital));
}

export const authStore = {
  getUser: (): User | null => activeUser,
  getHospital: (): Hospital => activeHospital,
  getAvailableHospitals: (): Hospital[] => HOSPITALS,
  isAuthenticated: (): boolean => activeUser !== null,

  canViewEvidence: (): boolean => {
    if (!activeUser) return false;
    const hasEvidenceRole = activeUser.roles.some((r) => r.can_view_evidence);
    return hasEvidenceRole && activeUser.mfa_enabled;
  },

  hasRole: (roleCode: string): boolean => {
    if (!activeUser) return false;
    return activeUser.roles.some((r) => r.code === roleCode);
  },

  setHospital: (hospitalId: string) => {
    const found = HOSPITALS.find((h) => h.hospital_id === hospitalId);
    if (found) {
      activeHospital = found;
      try {
        localStorage.setItem(HOSP_STORAGE_KEY, JSON.stringify(found));
      } catch (e) {
        console.error(e);
      }
      notify();
    }
  },

  login: (user: User, hospital?: Hospital) => {
    activeUser = user;
    if (hospital) {
      activeHospital = hospital;
      try {
        localStorage.setItem(HOSP_STORAGE_KEY, JSON.stringify(hospital));
      } catch (e) {
        console.error(e);
      }
    }
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }
    notify();
  },

  logout: () => {
    activeUser = null;
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch (e) {
      console.error(e);
    }
    notify();
  },

  switchUserById: (userId: string) => {
    const found = DEMO_USERS.find((u) => u.user_id === userId);
    if (found) {
      authStore.login(found, activeHospital);
    }
  },

  subscribe: (listener: AuthListener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
