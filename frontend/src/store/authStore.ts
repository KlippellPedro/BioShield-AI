import { User, Role } from '../types';
import { DEMO_MODE } from '../config/app';

// Papéis iguais aos de database/schema.sql (tabela roles). role_id é gerado pelo banco,
// então os ids abaixo só existem no modo demonstração.
export const DEMO_ROLES: Record<string, Role> = {
  OPERADOR: {
    role_id: 'r0000000-0000-0000-0000-000000000001',
    code: 'OPERADOR',
    name: 'Operador de Segurança',
    description: 'Recebe e trata notificações em tempo real.',
    can_view_evidence: true,
  },
  ENFERMAGEM_CHEFE: {
    role_id: 'r0000000-0000-0000-0000-000000000002',
    code: 'ENFERMAGEM_CHEFE',
    name: 'Enfermagem-chefe',
    description: 'Trata notificações e conduz a auditoria visual da evidência.',
    can_view_evidence: true,
  },
  GESTOR_CCIH: {
    role_id: 'r0000000-0000-0000-0000-000000000003',
    code: 'GESTOR_CCIH',
    name: 'Gestor de Qualidade / CCIH',
    description: 'Analisa relatórios agregados de conformidade.',
    can_view_evidence: false,
  },
  ADMIN_TI: {
    role_id: 'r0000000-0000-0000-0000-000000000004',
    code: 'ADMIN_TI',
    name: 'Administrador de TI',
    description: 'Configura câmeras, zonas e parâmetros.',
    can_view_evidence: false,
  },
  DPO: {
    role_id: 'r0000000-0000-0000-0000-000000000005',
    code: 'DPO',
    name: 'Encarregado de Dados',
    description: 'Audita conformidade LGPD e o ciclo de vida da evidência.',
    can_view_evidence: true,
  },
};

// Contas do modo demonstração. As duas primeiras espelham database/seed.sql.
// As demais ainda não existem no seed. Respeitam a regra do banco: quem tem papel com
// can_view_evidence precisa de MFA (RNF-19); por isso o Bruno tem papel sem acesso à evidência.
export const DEMO_USERS: User[] = [
  {
    user_id: 'a0000000-0000-0000-0000-000000000001',
    username: 'ana.chefe',
    email: 'ana.chefe@hospital.exemplo',
    full_name: 'Ana — Enfermagem-chefe',
    is_active: true,
    mfa_enabled: true,
    roles: [DEMO_ROLES.ENFERMAGEM_CHEFE],
  },
  {
    user_id: 'a0000000-0000-0000-0000-000000000002',
    username: 'bruno.op',
    email: 'bruno.op@hospital.exemplo',
    full_name: 'Bruno — Operador (sem MFA)',
    is_active: true,
    mfa_enabled: false,
    roles: [DEMO_ROLES.GESTOR_CCIH],
  },
  {
    user_id: 'a0000000-0000-0000-0000-000000000003',
    username: 'roberto.seg',
    email: 'roberto.seg@hospital.exemplo',
    full_name: 'Roberto — Operador de Segurança',
    is_active: true,
    mfa_enabled: true,
    roles: [DEMO_ROLES.OPERADOR],
  },
  {
    user_id: 'a0000000-0000-0000-0000-000000000004',
    username: 'mariana.dpo',
    email: 'mariana.dpo@hospital.exemplo',
    full_name: 'Mariana — Encarregada de Dados',
    is_active: true,
    mfa_enabled: true,
    roles: [DEMO_ROLES.DPO],
  },
];

// A sessão real vive num cookie httpOnly (o JavaScript não enxerga o token). Aqui só
// guardamos o perfil exibido na tela, e apenas no modo demonstração.
const USER_STORAGE_KEY = 'bioshield_demo_user';

type AuthListener = (user: User | null) => void;
const listeners: Set<AuthListener> = new Set();

function getInitialUser(): User | null {
  if (!DEMO_MODE) return null;
  try {
    const saved = sessionStorage.getItem(USER_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error(e);
  }
  return null;
}

let activeUser: User | null = getInitialUser();

function notify() {
  listeners.forEach((listener) => listener(activeUser));
}

export const authStore = {
  getUser: (): User | null => activeUser,
  isAuthenticated: (): boolean => activeUser !== null,

  // Só para a interface ficar coerente. Quem de fato bloqueia o acesso é o backend (RNF-19).
  canViewEvidence: (): boolean => {
    if (!activeUser) return false;
    const hasEvidenceRole = activeUser.roles.some((r) => r.can_view_evidence);
    return hasEvidenceRole && activeUser.mfa_enabled;
  },

  hasRole: (roleCode: string): boolean => {
    if (!activeUser) return false;
    return activeUser.roles.some((r) => r.code === roleCode);
  },

  login: (user: User) => {
    activeUser = user;
    if (DEMO_MODE) {
      try {
        sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      } catch (e) {
        console.error(e);
      }
    }
    notify();
  },

  logout: () => {
    activeUser = null;
    try {
      sessionStorage.removeItem(USER_STORAGE_KEY);
    } catch (e) {
      console.error(e);
    }
    notify();
  },

  subscribe: (listener: AuthListener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
