import React, { useState } from 'react';
import { useAlerts } from '../hooks/useRealtimeAlerts';
import { AlertCard } from '../components/AlertCard';
import { ErrorMessage, Loading } from '../components/StateMessage';
import {
  ActivityIcon,
  ShieldIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  CameraIcon,
  SearchIcon,
  RadioIcon,
} from '../components/icons';
import { api } from '../api/endpoints';
import { HOSPITAL_NAME } from '../config/app';
import { useAuth } from '../store/authStore';

interface DashboardProps {
  onSelectEvent: (eventId: string) => void;
  onViewEvidence: (evidenceId: string, eventId: string) => void;
}

const formatSeconds = (value: number | null | undefined) =>
  value === null || value === undefined ? '—' : `${value.toFixed(1).replace('.', ',')}s`;

export const Dashboard: React.FC<DashboardProps> = ({ onSelectEvent, onViewEvidence }) => {
  const { can } = useAuth();
  const { events, zones, metrics, loading, error, connected, hasPulse, audioEnabled, setAudioEnabled, applyEvent, refresh } =
    useAlerts();

  const [selectedStatus, setSelectedStatus] = useState<string>('TODOS');
  const [selectedZone, setSelectedZone] = useState<string>('TODAS');
  const [selectedEpi, setSelectedEpi] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const activeZones = zones.filter((z) => z.is_active);

  const filteredEvents = events.filter((ev) => {
    if (selectedStatus !== 'TODOS' && ev.status !== selectedStatus) return false;
    if (selectedZone !== 'TODAS' && ev.zone_id !== selectedZone) return false;
    if (selectedEpi !== 'TODOS' && ev.epi_type !== selectedEpi) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTrack = ev.track_id.toLowerCase().includes(q);
      const matchZone = ev.zone_name.toLowerCase().includes(q);
      const matchSubject = (ev.audited_professional_name ?? '').toLowerCase().includes(q);
      if (!matchTrack && !matchZone && !matchSubject) return false;
    }
    return true;
  });

  const acknowledge = async (eventId: string) => {
    applyEvent(await api.events.ack(eventId));
  };

  if (loading && events.length === 0 && !metrics) return <Loading label="Carregando alertas…" />;
  if (error && events.length === 0) return <ErrorMessage message={error} onRetry={refresh} />;

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      <div
        className={`p-5 rounded-2xl transition-all duration-300 border ${
          hasPulse
            ? 'bg-[#1a0f26] border-red-500 shadow-[0_0_35px_rgba(239,68,68,0.4)]'
            : 'bg-[#0a1738] border-cyan-500/30 shadow-lg'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-4 h-4 rounded-full flex-shrink-0 ${
                hasPulse ? 'bg-red-500 animate-ping' : 'bg-cyan-400 animate-pulse shadow-[0_0_12px_#00c3ff]'
              }`}
            />
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>{HOSPITAL_NAME ? `${HOSPITAL_NAME} • ` : ''}Monitoramento de EPI</span>
                {hasPulse && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs bg-red-600 text-white font-bold animate-bounce shadow">
                    Nova Ocorrência Detectada
                  </span>
                )}
              </h2>
              <p className="text-sm text-slate-300 mt-0.5">Zonas e câmeras ativas da unidade.</p>
            </div>
          </div>

          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            aria-pressed={audioEnabled}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
              audioEnabled ? 'bg-blue-600 text-white border-cyan-300 shadow-md' : 'bg-white/5 border-white/20 text-slate-300'
            }`}
          >
            {audioEnabled ? 'Aviso sonoro ligado' : 'Aviso sonoro desligado'}
          </button>
        </div>
      </div>

      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="medical-card p-6 rounded-2xl relative overflow-hidden border-cyan-500/40">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">Ocorrências Pendentes</span>
              <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400">
                <AlertTriangleIcon className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight flex items-baseline gap-2">
              {metrics.pending_events}
              <span className="text-xs font-semibold text-slate-300">
                {metrics.pending_events === 1 ? 'alerta ativo' : 'alertas ativos'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-2">Aguardando reconhecimento ou auditoria pela equipe responsável.</p>
          </div>

          <div className="medical-card p-6 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">Atendidas Hoje</span>
              <div className="w-9 h-9 rounded-xl bg-blue-600/30 flex items-center justify-center text-cyan-400">
                <CheckCircleIcon className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight flex items-baseline gap-2">
              {metrics.acknowledged_today}
              <span className="text-xs font-semibold text-slate-300">ocorrências</span>
            </div>
            <p className="text-xs text-slate-300 mt-2">
              Tempo médio até o atendimento: <strong className="text-white">{formatSeconds(metrics.avg_ack_seconds)}</strong>
            </p>
          </div>

          <div className="medical-card p-6 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">Tempo de Aviso</span>
              <div className="w-9 h-9 rounded-xl bg-blue-600/30 flex items-center justify-center text-cyan-400">
                <ActivityIcon className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight flex items-baseline gap-2">
              {formatSeconds(metrics.avg_detection_latency_seconds)}
              <span className="text-xs font-semibold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full">
                Meta ≤ 3,0s
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-2">Tempo médio entre a detecção pela câmera e o registro no servidor, hoje.</p>
          </div>

          <div className="medical-card p-6 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">Evidências Guardadas</span>
              <div className="w-9 h-9 rounded-xl bg-blue-600/30 flex items-center justify-center text-cyan-400">
                <CameraIcon className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight flex items-baseline gap-2">
              {metrics.evidences_retained}
              <span className="text-xs font-semibold text-slate-300">imagens</span>
            </div>
            <p className="text-xs text-slate-300 mt-2">
              Cifradas, com prazo de retenção limitado. Dossiês pendentes:{' '}
              <strong className="text-white">{metrics.dossiers_pending}</strong>.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-5">
          <div className="medical-card p-5 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por setor, profissional..."
                  aria-label="Buscar ocorrências"
                  className="w-full bg-[#07132e] text-sm text-white placeholder-slate-400 pl-10 pr-3 py-2.5 rounded-xl border border-white/20 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-[#07132e] p-1 rounded-xl border border-white/10 text-xs font-medium w-full sm:w-auto justify-between sm:justify-start">
                {[
                  { id: 'TODOS', label: 'Todos' },
                  { id: 'PENDENTE', label: 'Pendentes' },
                  { id: 'RECONHECIDO', label: 'Atendidos' },
                  { id: 'DESCARTADO', label: 'Descartados' },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setSelectedStatus(st.id)}
                    className={`px-3 py-2 rounded-lg transition-all ${
                      selectedStatus === st.id ? 'bg-blue-600 text-white font-bold shadow-md' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-white/10 text-xs">
              <div>
                <label htmlFor="filter-zone" className="text-slate-300 font-medium block mb-1.5">
                  Filtrar por Setor:
                </label>
                <select
                  id="filter-zone"
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className="w-full bg-[#07132e] text-white p-2.5 rounded-xl border border-white/20 focus:border-cyan-400 text-xs font-medium"
                >
                  <option value="TODAS">Todos os Setores</option>
                  {zones.map((z) => (
                    <option key={z.zone_id} value={z.zone_id}>
                      {z.code} — {z.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="filter-epi" className="text-slate-300 font-medium block mb-1.5">
                  Filtrar por Equipamento (EPI):
                </label>
                <select
                  id="filter-epi"
                  value={selectedEpi}
                  onChange={(e) => setSelectedEpi(e.target.value)}
                  className="w-full bg-[#07132e] text-white p-2.5 rounded-xl border border-white/20 focus:border-cyan-400 text-xs font-medium"
                >
                  <option value="TODOS">Todos os Equipamentos</option>
                  <option value="MASCARA">Máscara Facial</option>
                  <option value="LUVAS">Luvas</option>
                  <option value="AVENTAL">Avental</option>
                  <option value="TOUCA">Touca</option>
                  <option value="PROTETOR_FACIAL">Protetor Facial</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-300 px-1 font-medium">
              <span>
                Exibindo <strong className="text-white">{filteredEvents.length}</strong>{' '}
                {filteredEvents.length === 1 ? 'ocorrência' : 'ocorrências'} recentes
              </span>
              <span className={`flex items-center gap-1.5 ${connected ? 'text-cyan-400' : 'text-amber-300'}`}>
                <RadioIcon className={`w-3.5 h-3.5 ${connected ? 'animate-pulse' : ''}`} />
                <span>{connected ? 'Atualização em tempo real conectada' : 'Sem conexão em tempo real — reconectando…'}</span>
              </span>
            </div>

            {filteredEvents.length === 0 ? (
              <div className="medical-card p-10 rounded-2xl text-center space-y-3">
                <CheckCircleIcon className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="text-base font-bold text-white">Nenhuma ocorrência encontrada</h4>
                <p className="text-xs text-slate-300 max-w-sm mx-auto">
                  Não há ocorrências com os filtros selecionados.
                </p>
              </div>
            ) : (
              filteredEvents.map((event) => (
                <AlertCard
                  key={event.event_id}
                  event={event}
                  onSelectEvent={onSelectEvent}
                  onAcknowledge={acknowledge}
                  onViewEvidence={onViewEvidence}
                />
              ))
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="medical-card p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldIcon className="w-4 h-4 text-cyan-400" />
                Setores Monitorados
              </h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white text-blue-900">
                {activeZones.length} {activeZones.length === 1 ? 'Unidade' : 'Unidades'}
              </span>
            </div>

            <div className="space-y-3">
              {activeZones.length === 0 && <p className="text-xs text-slate-400">Nenhuma zona ativa cadastrada.</p>}
              {activeZones.map((zone) => {
                const pending = events.filter((e) => e.zone_id === zone.zone_id && e.status === 'PENDENTE').length;
                return (
                  <div
                    key={zone.zone_id}
                    className="p-4 rounded-xl bg-[#07132e] border border-white/10 hover:border-cyan-400/50 transition-all space-y-2.5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-sm text-white">{zone.name}</div>
                        <span className="text-xs text-cyan-300 font-medium">
                          {zone.code} • Categoria: {zone.category}
                        </span>
                      </div>

                      {pending > 0 ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500 text-white animate-pulse">
                          {pending} {pending === 1 ? 'Alerta' : 'Alertas'}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          Sem pendências
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-300 pt-2 border-t border-white/5">
                      <span>
                        Tolerância: <strong className="text-white">{zone.t_remocao_seconds} segundos</strong>
                      </span>
                      <span>
                        EPIs: <strong className="text-cyan-300">{zone.required_epi.length} itens</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="medical-card p-5 rounded-2xl text-xs space-y-2.5 bg-[#091738]">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <ShieldIcon className="w-4 h-4 text-cyan-400" />
              <span>Privacidade</span>
            </h4>
            <p className="text-slate-300 leading-relaxed text-xs">
              O sistema observa a presença e a permanência dos equipamentos de proteção. Rostos ficam desfocados na
              operação normal; só o instante da infração é guardado, cifrado e com prazo de retenção limitado.
              {can('evidence:view') && ' Cada abertura de imagem fica registrada na trilha de auditoria.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
