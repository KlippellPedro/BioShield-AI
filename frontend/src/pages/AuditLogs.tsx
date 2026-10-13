import React, { useState } from 'react';
import { api } from '../api/endpoints';
import { usePagedList } from '../hooks/usePagedList';
import { AuditAction, AuditLog } from '../types';
import { DataTable, Column } from '../components/DataTable';
import { ErrorMessage, Loading } from '../components/StateMessage';
import { DatabaseIcon, LockIcon } from '../components/icons';

const ACTION_LABELS: Record<AuditAction, { label: string; color: string }> = {
  LOGIN: { label: 'Acesso ao Sistema', color: 'bg-white/10 text-white border-white/20' },
  LOGOUT: { label: 'Saída do Sistema', color: 'bg-white/10 text-white border-white/20' },
  EVENT_VIEW: { label: 'Consulta de Ocorrência', color: 'bg-white/10 text-white border-white/20' },
  EVENT_ACK: { label: 'Atendimento do Alerta', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  EVIDENCE_VIEW: { label: 'Visualização de Fotografia', color: 'bg-red-500/20 text-red-300 border-red-500/40' },
  EVIDENCE_EXPORT: { label: 'Exportação de Evidência', color: 'bg-red-500/20 text-red-300 border-red-500/40' },
  EVIDENCE_PURGE: { label: 'Expurgo de Evidência', color: 'bg-slate-700 text-slate-200 border-slate-500/40' },
  ZONE_CREATE: { label: 'Novo Setor Cadastrado', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  ZONE_UPDATE: { label: 'Alteração de Parâmetros', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
  ZONE_DELETE: { label: 'Setor Removido', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
  USER_CREATE: { label: 'Usuário Criado', color: 'bg-slate-700 text-slate-200 border-slate-500/40' },
  USER_UPDATE: { label: 'Usuário Alterado', color: 'bg-slate-700 text-slate-200 border-slate-500/40' },
  USER_DEACTIVATE: { label: 'Usuário Desativado', color: 'bg-slate-700 text-slate-200 border-slate-500/40' },
  ROLE_ASSIGN: { label: 'Papel Atribuído', color: 'bg-slate-700 text-slate-200 border-slate-500/40' },
  ROLE_REVOKE: { label: 'Papel Retirado', color: 'bg-slate-700 text-slate-200 border-slate-500/40' },
  CONFIG_UPDATE: { label: 'Configuração Alterada', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
  IDENTIFICATION_CREATE: { label: 'Identificação do Profissional', color: 'bg-blue-600/30 text-cyan-300 border-cyan-400/40' },
  IDENTIFICATION_CONTEST: { label: 'Contestação do Titular', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  IDENTIFICATION_REVOKE: { label: 'Revogação de Identificação', color: 'bg-red-500/20 text-red-300 border-red-500/40' },
};

const FILTERS: { id: 'TODAS' | AuditAction; label: string }[] = [
  { id: 'TODAS', label: 'Todas as Ações' },
  { id: 'EVIDENCE_VIEW', label: 'Fotos Acessadas' },
  { id: 'IDENTIFICATION_CREATE', label: 'Identificações' },
  { id: 'IDENTIFICATION_CONTEST', label: 'Contestações' },
  { id: 'EVENT_ACK', label: 'Atendimentos' },
  { id: 'LOGIN', label: 'Acessos' },
];

const describe = (details: Record<string, unknown>) =>
  Object.entries(details)
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join(' • ');

export const AuditLogs: React.FC = () => {
  const [selectedAction, setSelectedAction] = useState<'TODAS' | AuditAction>('TODAS');

  const { items, loading, error, hasMore, loadMore, reload } = usePagedList(
    (cursor) => api.audit.list({ action: selectedAction === 'TODAS' ? undefined : selectedAction, limit: 50, cursor }),
    [selectedAction],
  );

  const columns: Column<AuditLog>[] = [
    {
      key: 'log_id',
      header: 'Registro #',
      render: (l) => <span className="font-bold text-white text-sm">#{l.log_id}</span>,
      width: '110px',
    },
    {
      key: 'action',
      header: 'Operação Registrada',
      render: (l) => {
        const item = ACTION_LABELS[l.action] ?? { label: l.action, color: 'bg-slate-800 text-slate-300' };
        return <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${item.color}`}>{item.label}</span>;
      },
    },
    {
      key: 'user_name',
      header: 'Responsável',
      render: (l) => (
        <div>
          <div className="text-white font-bold text-sm">{l.user_name ?? 'Sistema'}</div>
          <div className="text-xs text-slate-400">IP: {l.ip_address}</div>
        </div>
      ),
    },
    {
      key: 'details',
      header: 'Descrição do Ato',
      render: (l) => {
        const text = describe(l.details);
        return (
          <div className="text-xs text-slate-300 max-w-sm truncate" title={text}>
            {text || '—'}
          </div>
        );
      },
    },
    {
      key: 'occurred_at',
      header: 'Horário do Registro',
      render: (l) => (
        <span className="text-slate-300 text-xs font-medium">{new Date(l.occurred_at).toLocaleString('pt-BR')}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="medical-card p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <DatabaseIcon className="w-6 h-6 text-cyan-400" />
            <span>Trilha de Auditoria (LGPD)</span>
          </h2>
          <p className="text-sm text-slate-300 mt-1">
            Histórico das ações executadas no sistema, gravado pelo servidor, para prestação de contas.
          </p>
        </div>

        <span className="px-3 py-1.5 rounded-full bg-white text-blue-900 text-xs font-bold flex items-center gap-2 shadow-sm self-start sm:self-auto">
          <LockIcon className="w-3.5 h-3.5" />
          <span>Somente leitura</span>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 bg-[#07132e] p-2.5 rounded-2xl border border-white/10 text-xs font-medium">
        <span className="text-slate-300 font-semibold mr-2">Filtrar por tipo de ação:</span>
        {FILTERS.map((act) => (
          <button
            key={act.id}
            onClick={() => setSelectedAction(act.id)}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              selectedAction === act.id ? 'bg-blue-600 text-white font-bold shadow-md' : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            {act.label}
          </button>
        ))}
      </div>

      {error && items.length === 0 ? (
        <ErrorMessage message={error} onRetry={reload} />
      ) : loading && items.length === 0 ? (
        <Loading label="Carregando registros…" />
      ) : (
        <>
          <DataTable
            data={items}
            columns={columns}
            keyExtractor={(l) => l.log_id.toString()}
            searchPlaceholder="Buscar por responsável, IP ou descrição..."
            searchFilter={(l, q) =>
              (l.user_name ?? '').toLowerCase().includes(q) ||
              l.ip_address.toLowerCase().includes(q) ||
              l.action.toLowerCase().includes(q) ||
              describe(l.details).toLowerCase().includes(q)
            }
          />
          {hasMore && (
            <div className="text-center">
              <button
                onClick={() => void loadMore()}
                disabled={loading}
                className="btn-medical-secondary px-5 py-2.5 rounded-xl text-xs font-semibold disabled:opacity-60"
              >
                {loading ? 'Carregando…' : 'Carregar mais'}
              </button>
            </div>
          )}
          {error && <ErrorMessage message={error} onRetry={reload} />}
        </>
      )}
    </div>
  );
};
