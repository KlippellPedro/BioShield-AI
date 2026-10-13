import React, { useState } from 'react';
import { Event } from '../types';
import { eventsStore } from '../store/eventsStore';
import { 
  AlertTriangleIcon, 
  CheckCircleIcon, 
  CameraIcon, 
  FileTextIcon, 
  CpuIcon, 
  UserIcon, 
  ClockIcon, 
  ShieldIcon 
} from '../components/icons';

interface EventDetailProps {
  eventId: string;
  onBack: () => void;
  onViewEvidence: (evidenceId: string, eventId: string) => void;
  onOpenDossier: (eventId: string) => void;
}

export const EventDetail: React.FC<EventDetailProps> = ({
  eventId,
  onBack,
  onViewEvidence,
  onOpenDossier,
}) => {
  const [event, setEvent] = useState<Event | undefined>(eventsStore.getEventById(eventId));

  const [showIdentifyModal, setShowIdentifyModal] = useState<boolean>(false);
  const [showContestModal, setShowContestModal] = useState<boolean>(false);
  const [showRevokeModal, setShowRevokeModal] = useState<boolean>(false);

  const [profName, setProfName] = useState('');
  const [profReg, setProfReg] = useState('');
  const [justification, setJustification] = useState('');

  if (!event) {
    return (
      <div className="medical-card p-10 text-center space-y-3">
        <h3 className="text-base font-bold text-white">Ocorrência não encontrada</h3>
        <button onClick={onBack} className="btn-medical-primary px-5 py-2.5 rounded-xl text-xs font-bold">
          Voltar ao Painel
        </button>
      </div>
    );
  }

  const handleIdentify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profName.trim() || !profReg.trim()) return;

    eventsStore.identifyEventHuman(event.event_id, profName, profReg, justification);
    setEvent(eventsStore.getEventById(eventId));
    setShowIdentifyModal(false);
  };

  const handleContest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!justification.trim()) return;

    eventsStore.contestIdentification(event.event_id, justification);
    setEvent(eventsStore.getEventById(eventId));
    setShowContestModal(false);
  };

  const handleRevoke = (e: React.FormEvent) => {
    e.preventDefault();
    if (!justification.trim()) return;

    eventsStore.revokeIdentification(event.event_id, justification);
    setEvent(eventsStore.getEventById(eventId));
    setShowRevokeModal(false);
  };

  const isAck = event.status === 'RECONHECIDO';
  const isPending = event.status === 'PENDENTE';

  return (
    <div className="space-y-6 animate-fadeIn pb-12 max-w-4xl mx-auto">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1.5 self-start"
        >
          ← Voltar para a Lista de Alertas
        </button>

        <div className="flex items-center gap-3">
          {event.evidence_id && (
            <button
              onClick={() => onViewEvidence(event.evidence_id!, event.event_id)}
              className="btn-medical-secondary flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold"
            >
              <CameraIcon className="w-4 h-4 text-cyan-400" />
              <span>Ver Fotografia</span>
            </button>
          )}

          <button
            onClick={() => onOpenDossier(event.event_id)}
            className="btn-medical-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-md"
          >
            <FileTextIcon className="w-4 h-4" />
            <span>Consultar Dossiê do Incidente</span>
          </button>
        </div>
      </div>

      {/* Main Incident Card */}
      <div className="medical-card p-6 sm:p-8 rounded-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-lg text-xs font-bold bg-white text-blue-900 shadow-sm">
                {event.zone_code}
              </span>
              <span className="text-xs text-slate-300">
                Código de Rastreio Anônimo: <strong className="text-white">{event.track_id}</strong>
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {event.zone_name || 'Setor Hospitalar'}
            </h1>
          </div>

          <span
            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider self-start sm:self-auto ${
              isPending
                ? 'bg-red-500 text-white shadow-md'
                : isAck
                ? 'bg-emerald-500 text-white shadow-md'
                : 'bg-slate-700 text-slate-200'
            }`}
          >
            {isPending ? 'Alerta Pendente' : isAck ? 'Atendido pelo Gestor' : 'Descartado'}
          </span>
        </div>

        {/* Technical Attributes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#07132e] border border-white/10 space-y-1">
            <span className="text-xs text-slate-300 font-medium block">Tipo da Ocorrência:</span>
            <span className="text-sm font-bold text-white">
              {event.event_type === 'TIPO_A' ? 'Entrada sem o equipamento' : 'Remoção do equipamento'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#07132e] border border-white/10 space-y-1">
            <span className="text-xs text-slate-300 font-medium block">Equipamento Ausente:</span>
            <span className="text-base font-bold text-cyan-300">
              {event.epi_type}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#07132e] border border-white/10 space-y-1">
            <span className="text-xs text-slate-300 font-medium block">Horário da Detecção:</span>
            <span className="text-sm font-semibold text-white">
              {new Date(event.occurred_at).toLocaleString('pt-BR')}
            </span>
          </div>
        </div>
      </div>

      {/* LGPD Nominal Identification Section (Art. 20) */}
      <div className="medical-card p-6 sm:p-8 rounded-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <h3 className="font-bold text-white text-lg flex items-center gap-2.5">
              <ShieldIcon className="w-5 h-5 text-cyan-400" />
              <span>Identificação do Profissional & Revisão Humana (LGPD Art. 20)</span>
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Garantia legal: o profissional identificado tem pleno direito a revisão humana de qualquer decisão tomada por IA.
            </p>
          </div>

          {event.identification && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white text-blue-900 shadow-sm self-start sm:self-auto">
              {event.identification.status === 'CONFIRMADA' ? 'Identificação Confirmada' : event.identification.status}
            </span>
          )}
        </div>

        {event.identification ? (
          <div className="space-y-4">
            <div className="p-5 rounded-xl bg-[#07132e] border border-cyan-500/30 space-y-4">
              <div className="flex items-center gap-2">
                {event.identification.source === 'AI' ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold">
                    <CpuIcon className="w-4 h-4" />
                    <span>Identificado por Reconhecimento Facial (IA)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white text-blue-900 text-xs font-bold">
                    <UserIcon className="w-4 h-4" />
                    <span>Identificado Manualmente por Gestor</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <span className="text-xs text-slate-300 block mb-1">Nome e Registro do Profissional:</span>
                  <span className="text-lg font-bold text-white">
                    {event.identification.subject_reference}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-300 block mb-1">Responsável pela Validação:</span>
                  <span className="text-sm font-semibold text-cyan-300">
                    {event.identification.source === 'AI' ? 'Algoritmo de Visão Computacional' : event.identification.identified_by_name || 'Gestor'}
                  </span>
                </div>
              </div>

              {event.identification.justification && (
                <div className="p-4 rounded-xl bg-[#050e22] border border-white/10 text-xs text-slate-200">
                  <strong className="text-cyan-300 block mb-1">Justificativa Registrada:</strong>
                  {event.identification.justification}
                </div>
              )}
            </div>

            {/* Actions: Contest or Revoke */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {event.identification.status === 'CONFIRMADA' && (
                <button
                  onClick={() => setShowContestModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 text-xs font-semibold transition-all"
                >
                  ⚠ Registrar Contestação do Profissional
                </button>
              )}

              {event.identification.status !== 'REVOGADA' && (
                <button
                  onClick={() => setShowRevokeModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 text-xs font-semibold transition-all"
                >
                  ✕ Revogar Vínculo Nominal
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-xl bg-[#07132e] text-center space-y-3">
            <h4 className="text-base font-bold text-white">
              Profissional Ainda Não Vinculado
            </h4>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              O evento permanece anônimo sob o código <strong className="text-white">{event.track_id}</strong>. Para gerar o dossiê formal à diretoria, vincule o nome e o número de registro após a conferência visual.
            </p>
            <button
              onClick={() => setShowIdentifyModal(true)}
              className="btn-medical-primary px-6 py-3 rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-md"
            >
              <UserIcon className="w-4 h-4" />
              <span>Realizar Identificação Humana</span>
            </button>
          </div>
        )}
      </div>

      {/* Manual Identification Modal */}
      {showIdentifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-[#0a1838] border border-cyan-400/40 rounded-2xl p-6 shadow-2xl space-y-4 text-slate-200">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-cyan-400" />
              <span>Vincular Profissional à Ocorrência</span>
            </h3>

            <form onSubmit={handleIdentify} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-200 font-semibold block mb-1">Nome Completo do Profissional:</label>
                <input
                  type="text"
                  required
                  value={profName}
                  onChange={(e) => setProfName(e.target.value)}
                  placeholder="Ex: Dr. João da Silva ou Enf. Mariana"
                  className="w-full bg-[#07132e] text-white p-3 rounded-xl border border-white/20 focus:border-cyan-400 text-sm"
                />
              </div>

              <div>
                <label className="text-slate-200 font-semibold block mb-1">Registro Profissional (CRM / COREN / Matrícula):</label>
                <input
                  type="text"
                  required
                  value={profReg}
                  onChange={(e) => setProfReg(e.target.value)}
                  placeholder="Ex: CRM-RS 123456 ou COREN-RS 87211"
                  className="w-full bg-[#07132e] text-white p-3 rounded-xl border border-white/20 focus:border-cyan-400 text-sm"
                />
              </div>

              <div>
                <label className="text-slate-200 font-semibold block mb-1">Parecer / Justificativa da Conferência:</label>
                <textarea
                  rows={3}
                  required
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Informe os detalhes da verificação..."
                  className="w-full bg-[#07132e] text-white p-3 rounded-xl border border-white/20 focus:border-cyan-400 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowIdentifyModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-medical-primary px-6 py-2.5 rounded-xl font-bold text-sm shadow-md"
                >
                  Confirmar Vínculo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contestation Modal */}
      {showContestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-[#0a1838] border border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-4 text-slate-200">
            <h3 className="font-bold text-amber-300 text-base">
              Registrar Contestação do Profissional
            </h3>

            <form onSubmit={handleContest} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-200 font-semibold block mb-1">Relato / Justificativa da Contestação:</label>
                <textarea
                  rows={4}
                  required
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Descreva o motivo informado pelo profissional (ex: oclusão momentânea por equipamento cirúrgico)..."
                  className="w-full bg-[#07132e] text-white p-3 rounded-xl border border-amber-500/30 focus:border-amber-400 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowContestModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 text-slate-900 font-bold text-sm shadow-md"
                >
                  Salvar Contestação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revocation Modal */}
      {showRevokeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-[#0a1838] border border-red-500/40 rounded-2xl p-6 shadow-2xl space-y-4 text-slate-200">
            <h3 className="font-bold text-red-400 text-base">
              Revogar Identificação
            </h3>

            <form onSubmit={handleRevoke} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-200 font-semibold block mb-1">Motivo do Cancelamento:</label>
                <textarea
                  rows={4}
                  required
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Informe o motivo da anulação do vínculo (ex: equívoco comprovado)..."
                  className="w-full bg-[#07132e] text-white p-3 rounded-xl border border-red-500/30 focus:border-red-400 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRevokeModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm shadow-md"
                >
                  Confirmar Revogação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
