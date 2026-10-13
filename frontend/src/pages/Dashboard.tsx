import React, { useState } from 'react';
import { useRealtimeAlerts } from '../hooks/useRealtimeAlerts';
import { AlertCard } from '../components/AlertCard';
import { 
  ActivityIcon, 
  ShieldIcon, 
  ClockIcon, 
  AlertTriangleIcon, 
  CheckCircleIcon, 
  CameraIcon, 
  SearchIcon, 
  ZapIcon, 
  RadioIcon 
} from '../components/icons';
import { eventsStore } from '../store/eventsStore';
import { HOSPITAL } from '../config/app';

interface DashboardProps {
  onSelectEvent: (eventId: string) => void;
  onViewEvidence: (evidenceId: string, eventId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectEvent, onViewEvidence }) => {
  const {
    events,
    metrics,
    hasPulse,
    isSimulationActive,
    toggleSimulation,
    triggerManualAlert,
    acknowledgeEvent,
  } = useRealtimeAlerts();

  const zones = eventsStore.getZones();

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string>('TODOS');
  const [selectedZone, setSelectedZone] = useState<string>('TODAS');
  const [selectedEpi, setSelectedEpi] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredEvents = events.filter((ev) => {
    if (selectedStatus !== 'TODOS' && ev.status !== selectedStatus) return false;
    if (selectedZone !== 'TODAS' && ev.zone_code !== selectedZone && ev.zone_id !== selectedZone) return false;
    if (selectedEpi !== 'TODOS' && ev.epi_type !== selectedEpi) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTrack = ev.track_id.toLowerCase().includes(q);
      const matchZone = (ev.zone_name || '').toLowerCase().includes(q);
      const matchSubject = (ev.audited_professional_name || '').toLowerCase().includes(q);
      if (!matchTrack && !matchZone && !matchSubject) return false;
    }
    return true;
  });

  const pendingEvents = events.filter((e) => e.status === 'PENDENTE');

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Hospital Welcome & Notification Banner */}
      <div className={`p-5 rounded-2xl transition-all duration-300 border ${
        hasPulse 
          ? 'bg-[#1a0f26] border-red-500 shadow-[0_0_35px_rgba(239,68,68,0.4)]'
          : 'bg-[#0a1738] border-cyan-500/30 shadow-lg'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-4 h-4 rounded-full flex-shrink-0 ${
              hasPulse ? 'bg-red-500 animate-ping' : 'bg-cyan-400 animate-pulse shadow-[0_0_12px_#00c3ff]'
            }`} />
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>{HOSPITAL.name} • Monitoramento de EPI</span>
                {hasPulse && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs bg-red-600 text-white font-bold animate-bounce shadow">
                    Nova Ocorrência Detectada
                  </span>
                )}
              </h2>
              <p className="text-sm text-slate-300 mt-0.5">
                Zonas e câmeras ativas da unidade <strong className="text-cyan-300">{HOSPITAL.short_name}</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={triggerManualAlert}
              className="btn-medical-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
              title="Gera uma detecção simulada no painel"
            >
              <ZapIcon className="w-4 h-4 text-blue-600" />
              <span>Simular Alerta de Teste</span>
            </button>
            <button
              onClick={toggleSimulation}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                isSimulationActive
                  ? 'bg-blue-600 text-white border-cyan-300 shadow-md'
                  : 'bg-white/5 border-white/20 text-slate-300'
              }`}
            >
              {isSimulationActive ? 'Detecção Automática Ativa' : 'Detecção Pausada'}
            </button>
          </div>
        </div>
      </div>

      {/* Hospital KPI Cards - High Contrast & Clean White Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Compliance Rate */}
        <div className="medical-card p-6 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
              Taxa de Conformidade
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 flex items-center justify-center text-cyan-400">
              <ShieldIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight flex items-baseline gap-2">
            {metrics.overall_compliance_rate}%
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              Meta atingida
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-2">
            Índice geral de uso correto de EPIs nas áreas monitoradas.
          </p>
          <div className="w-full bg-slate-800 rounded-full h-2 mt-4 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2 rounded-full" 
              style={{ width: `${metrics.overall_compliance_rate}%` }}
            />
          </div>
        </div>

        {/* Pending Alerts */}
        <div className="medical-card p-6 rounded-2xl relative overflow-hidden border-cyan-500/40">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
              Ocorrências Pendentes
            </span>
            <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400">
              <AlertTriangleIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight flex items-baseline gap-2">
            {metrics.active_alerts_count}
            <span className="text-xs font-semibold text-slate-300">
              {metrics.active_alerts_count === 1 ? 'alerta ativo' : 'alertas ativos'}
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-2">
            Aguardando reconhecimento ou auditoria pela equipe responsável.
          </p>
        </div>

        {/* Response Time */}
        <div className="medical-card p-6 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
              Tempo de Resposta
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 flex items-center justify-center text-cyan-400">
              <ActivityIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight flex items-baseline gap-2">
            {metrics.avg_acknowledgment_time_seconds}s
            <span className="text-xs font-semibold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full">
              Meta ≤ 3,0s
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-2">
            Tempo médio entre a detecção pela câmera e o aviso no painel.
          </p>
        </div>

        {/* Protected Visual Evidence */}
        <div className="medical-card p-6 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
              Evidências Cifradas
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 flex items-center justify-center text-cyan-400">
              <CameraIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight flex items-baseline gap-2">
            {metrics.retention_active_count}
            <span className="text-xs font-semibold text-slate-300">imagens salvas</span>
          </div>
          <p className="text-xs text-slate-300 mt-2">
            Protegidas por criptografia e retenção automática de 90 dias.
          </p>
        </div>
      </div>

      {/* Main Operational Section: Alerts (2/3) + Sectors Health (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Live Alerts Stream & Filters */}
        <div className="lg:col-span-2 space-y-5">
          {/* Filter Bar - Clean & Accessible */}
          <div className="medical-card p-5 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative w-full sm:w-72">
                <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por setor, profissional..."
                  className="w-full bg-[#07132e] text-sm text-white placeholder-slate-400 pl-10 pr-3 py-2.5 rounded-xl border border-white/20 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1.5 bg-[#07132e] p-1 rounded-xl border border-white/10 text-xs font-medium w-full sm:w-auto justify-between sm:justify-start">
                {[
                  { id: 'TODOS', label: 'Todos' },
                  { id: 'PENDENTE', label: 'Pendentes' },
                  { id: 'RECONHECIDO', label: 'Atendidos' },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setSelectedStatus(st.id)}
                    className={`px-3 py-2 rounded-lg transition-all ${
                      selectedStatus === st.id
                        ? 'bg-blue-600 text-white font-bold shadow-md'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Area and PPE Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-white/10 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1.5">Filtrar por Setor:</label>
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className="w-full bg-[#07132e] text-white p-2.5 rounded-xl border border-white/20 focus:border-cyan-400 text-xs font-medium"
                >
                  <option value="TODAS">Todos os Setores do Hospital</option>
                  {zones.map((z) => (
                    <option key={z.zone_id} value={z.code}>
                      {z.code} — {z.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1.5">Filtrar por Equipamento (EPI):</label>
                <select
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

          {/* Alert Cards Stream */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-300 px-1 font-medium">
              <span>
                Exibindo <strong className="text-white">{filteredEvents.length}</strong> {filteredEvents.length === 1 ? 'ocorrência' : 'ocorrências'}
              </span>
              <span className="text-cyan-400 flex items-center gap-1.5">
                <RadioIcon className="w-3.5 h-3.5 animate-pulse" />
                <span>Atualização instantânea conectada</span>
              </span>
            </div>

            {filteredEvents.length === 0 ? (
              <div className="medical-card p-10 rounded-2xl text-center space-y-3">
                <CheckCircleIcon className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="text-base font-bold text-white">Nenhum Alerta Pendente</h4>
                <p className="text-xs text-slate-300 max-w-sm mx-auto">
                  Todos os setores selecionados estão operando em total conformidade com o uso dos equipamentos obrigatórios.
                </p>
              </div>
            ) : (
              filteredEvents.map((event) => (
                <AlertCard
                  key={event.event_id}
                  event={event}
                  onSelectEvent={onSelectEvent}
                  onAcknowledge={acknowledgeEvent}
                  onViewEvidence={onViewEvidence}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Column: Hospital Units Status */}
        <div className="space-y-5">
          <div className="medical-card p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldIcon className="w-4 h-4 text-cyan-400" />
                Setores Monitorados
              </h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white text-blue-900">
                {zones.length} Unidades
              </span>
            </div>

            <div className="space-y-3">
              {zones.map((zone) => {
                const zoneBreaches = events.filter((e) => e.zone_code === zone.code && e.status === 'PENDENTE');
                return (
                  <div
                    key={zone.zone_id}
                    className="p-4 rounded-xl bg-[#07132e] border border-white/10 hover:border-cyan-400/50 transition-all space-y-2.5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-sm text-white">
                          {zone.name}
                        </div>
                        <span className="text-xs text-cyan-300 font-medium">
                          {zone.code} • Categoria: {zone.category}
                        </span>
                      </div>

                      {zoneBreaches.length > 0 ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500 text-white animate-pulse">
                          {zoneBreaches.length} Alerta
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          Conforme
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-300 pt-2 border-t border-white/5">
                      <span>Tolerância: <strong className="text-white">{zone.t_remocao_seconds} segundos</strong></span>
                      <span>EPIs: <strong className="text-cyan-300">{zone.required_epi.length} itens</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hospital Guidelines & Privacy Card */}
          <div className="medical-card p-5 rounded-2xl text-xs space-y-2.5 bg-[#091738]">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <ShieldIcon className="w-4 h-4 text-cyan-400" />
              <span>Garantia de Privacidade Hospitalar</span>
            </h4>
            <p className="text-slate-300 leading-relaxed text-xs">
              O sistema observa exclusivamente a presença e permanência dos equipamentos de proteção. As imagens de rotina permanecem com desfoque facial contínuo e apenas o momento da infração é gravado, com descarte obrigatório em 90 dias.
            </p>
            <div className="text-[11px] text-slate-400 pt-2 border-t border-white/10">
              Em conformidade com a Norma NR-32 e a Lei Geral de Proteção de Dados (LGPD).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
