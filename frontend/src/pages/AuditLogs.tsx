import React, { useState } from 'react';
import { AuditLog } from '../types';
import { eventsStore } from '../store/eventsStore';
import { DataTable, Column } from '../components/DataTable';
import { DatabaseIcon, LockIcon } from '../components/icons';

export const AuditLogs: React.FC = () => {
  const [logs] = useState<AuditLog[]>(eventsStore.getAuditLogs());
  const [selectedAction, setSelectedAction] = useState<string>('TODAS');

  const filteredLogs = logs.filter((l) => {
    if (selectedAction !== 'TODAS' && l.action !== selectedAction) return false;
    return true;
  });

  const columns: Column<AuditLog>[] = [
    {
      key: 'log_id',
      header: 'Registro #',
      render: (l) => (
        <span className="font-bold text-white text-sm">
          #{l.log_id}
        </span>
      ),
      width: '110px',
    },
    {
      key: 'action',
      header: 'Operação Registrada',
      render: (l) => {
        const actionLabels: Record<string, { label: string; color: string }> = {
          EVIDENCE_VIEW: { label: 'Visualização de Fotografia', color: 'bg-red-500/20 text-red-300 border-red-500/40' },
          IDENTIFICATION_CREATE: { label: 'Vínculo do Profissional', color: 'bg-blue-600/30 text-cyan-300 border-cyan-400/40' },
          IDENTIFICATION_CONTEST: { label: 'Contestação do Titular', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
          IDENTIFICATION_REVOKE: { label: 'Revogação de Identificação', color: 'bg-red-500/20 text-red-300 border-red-500/40' },
          EVENT_ACK: { label: 'Atendimento do Alerta', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
          LOGIN: { label: 'Acesso ao Sistema', color: 'bg-white/10 text-white border-white/20' },
          ZONE_CREATE: { label: 'Novo Setor Cadastrado', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
          ZONE_UPDATE: { label: 'Alteração de Parâmetros', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
        };
        const item = actionLabels[l.action] || { label: l.action, color: 'bg-slate-800 text-slate-300' };
        return (
          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${item.color}`}>
            {item.label}
          </span>
        );
      },
    },
    {
      key: 'user_name',
      header: 'Responsável',
      render: (l) => (
        <div>
          <div className="text-white font-bold text-sm">{l.user_name || 'Sistema'}</div>
          <div className="text-xs text-slate-400">
            IP: {l.ip_address}
          </div>
        </div>
      ),
    },
    {
      key: 'details',
      header: 'Descrição do Ato',
      render: (l) => (
        <div className="text-xs text-slate-300 max-w-sm truncate" title={JSON.stringify(l.details)}>
          {l.details.reason || l.details.status || l.details.professional || JSON.stringify(l.details)}
        </div>
      ),
    },
    {
      key: 'occurred_at',
      header: 'Horário do Registro',
      render: (l) => (
        <span className="text-slate-300 text-xs font-medium">
          {new Date(l.occurred_at).toLocaleString('pt-BR')}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner */}
      <div className="medical-card p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <DatabaseIcon className="w-6 h-6 text-cyan-400" />
            <span>Trilha de Auditoria Imutável (LGPD)</span>
          </h2>
          <p className="text-sm text-slate-300 mt-1">
            Histórico permanente e inviolável de todas as ações executadas no sistema para prestação de contas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full bg-white text-blue-900 text-xs font-bold flex items-center gap-2 shadow-sm">
            <LockIcon className="w-3.5 h-3.5" />
            <span>Registros Inalteráveis (Garantido pelo Banco)</span>
          </span>
        </div>
      </div>

      {/* Action Filters */}
      <div className="flex flex-wrap items-center gap-2 bg-[#07132e] p-2.5 rounded-2xl border border-white/10 text-xs font-medium">
        <span className="text-slate-300 font-semibold mr-2">Filtrar por tipo de ação:</span>
        {[
          { id: 'TODAS', label: 'Todas as Ações' },
          { id: 'EVIDENCE_VIEW', label: 'Fotos Acessadas' },
          { id: 'IDENTIFICATION_CREATE', label: 'Identificações' },
          { id: 'IDENTIFICATION_CONTEST', label: 'Contestações' },
          { id: 'EVENT_ACK', label: 'Atendimentos' },
          { id: 'LOGIN', label: 'Acessos' },
        ].map((act) => (
          <button
            key={act.id}
            onClick={() => setSelectedAction(act.id)}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              selectedAction === act.id
                ? 'bg-blue-600 text-white font-bold shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            {act.label}
          </button>
        ))}
      </div>

      {/* Audit Table */}
      <DataTable
        data={filteredLogs}
        columns={columns}
        keyExtractor={(l) => l.log_id.toString()}
        searchPlaceholder="Buscar por responsável, IP ou descrição..."
        searchFilter={(l, q) => {
          const matchUser = (l.user_name || '').toLowerCase().includes(q);
          const matchIp = l.ip_address.toLowerCase().includes(q);
          const matchAction = l.action.toLowerCase().includes(q);
          const matchDetails = JSON.stringify(l.details).toLowerCase().includes(q);
          return matchUser || matchIp || matchAction || matchDetails;
        }}
      />
    </div>
  );
};
