import React, { useState } from 'react';
import { api } from '../api/endpoints';
import { usePagedList } from '../hooks/usePagedList';
import { Dossier, DossierStatus } from '../types';
import { DataTable, Column } from '../components/DataTable';
import { ErrorMessage, Loading } from '../components/StateMessage';
import { FileTextIcon, EyeIcon } from '../components/icons';

interface DossiersProps {
  onOpenDossier: (dossierId: string) => void;
}

export const Dossiers: React.FC<DossiersProps> = ({ onOpenDossier }) => {
  const [statusFilter, setStatusFilter] = useState<'TODOS' | DossierStatus>('TODOS');

  const { items, loading, error, hasMore, loadMore, reload } = usePagedList(
    (cursor) => api.dossiers.list({ status: statusFilter === 'TODOS' ? undefined : statusFilter, limit: 50, cursor }),
    [statusFilter],
  );

  const columns: Column<Dossier>[] = [
    {
      key: 'dossier_id',
      header: 'Protocolo do Dossiê',
      render: (d) => <div className="font-bold text-white text-sm font-mono">{d.dossier_id.slice(0, 8)}</div>,
    },
    {
      key: 'event_id',
      header: 'Setor Hospitalar',
      render: (d) => (
        <div>
          <span className="font-semibold text-white">{d.event.zone_name}</span>
          <div className="text-xs text-cyan-300">EPI: {d.event.epi_type}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Situação',
      render: (d) => {
        const isConsolidated = d.status === 'CONSOLIDADO';
        return (
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              isConsolidated
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            }`}
          >
            {isConsolidated ? 'Consolidado' : 'Pendente'}
          </span>
        );
      },
    },
    {
      key: 'professional',
      header: 'Profissional Auditado',
      render: (d) => {
        const name = d.event.audited_professional_name;
        const reg = d.event.audited_professional_registration;
        if (name && reg) {
          return (
            <div>
              <div className="font-bold text-white text-sm">{name}</div>
              <div className="text-xs text-cyan-300 font-semibold">{reg}</div>
            </div>
          );
        }
        return <span className="text-xs text-slate-400 italic">Aguardando identificação</span>;
      },
    },
    {
      key: 'created_at',
      header: 'Data de Emissão',
      render: (d) => (
        <span className="text-slate-300 text-xs font-medium">{new Date(d.created_at).toLocaleString('pt-BR')}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Ação',
      render: (d) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenDossier(d.dossier_id);
          }}
          className="btn-medical-primary flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm"
        >
          <EyeIcon className="w-3.5 h-3.5" />
          <span>Abrir</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="medical-card p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <FileTextIcon className="w-6 h-6 text-cyan-400" />
            <span>Dossiês de Incidente para Auditoria</span>
          </h2>
          <p className="text-sm text-slate-300 mt-1">
            Relatórios com o registro de cada infração, para envio à diretoria e arquivamento.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-[#07132e] p-1.5 rounded-xl border border-white/10 text-xs font-semibold">
          {[
            { id: 'TODOS', label: 'Todos os Dossiês' },
            { id: 'PENDENTE', label: 'Pendentes' },
            { id: 'CONSOLIDADO', label: 'Consolidados' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id as 'TODOS' | DossierStatus)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === st.id ? 'bg-blue-600 text-white font-bold shadow-md' : 'text-slate-300 hover:text-white'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {error && items.length === 0 ? (
        <ErrorMessage message={error} onRetry={reload} />
      ) : loading && items.length === 0 ? (
        <Loading label="Carregando dossiês…" />
      ) : (
        <>
          <DataTable
            data={items}
            columns={columns}
            keyExtractor={(d) => d.dossier_id}
            searchPlaceholder="Buscar por nome do profissional, setor ou protocolo..."
            searchFilter={(d, query) => {
              const matchId = d.dossier_id.toLowerCase().includes(query);
              const matchName = (d.event.audited_professional_name ?? '').toLowerCase().includes(query);
              const matchZone = d.event.zone_name.toLowerCase().includes(query);
              return matchId || matchName || matchZone;
            }}
            onRowClick={(d) => onOpenDossier(d.dossier_id)}
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
