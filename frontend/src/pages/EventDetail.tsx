import React, { useState } from 'react';
import { api } from '../api/endpoints';
import { useAsync } from '../hooks/useAsync';
import { useAlerts } from '../hooks/useRealtimeAlerts';
import { useEscape } from '../hooks/useEscape';
import { useAuth } from '../store/authStore';
import { ErrorMessage, InlineError, Loading } from '../components/StateMessage';
import { Event } from '../types';
import {
  CameraIcon,
  CheckCircleIcon,
  CpuIcon,
  FileTextIcon,
  ShieldIcon,
  UserIcon,
} from '../components/icons';

const EPI_LABELS: Record<string, string> = {
  MASCARA: 'Máscara',
  LUVAS: 'Luvas',
  AVENTAL: 'Avental',
  TOUCA: 'Touca',
  PROTETOR_FACIAL: 'Protetor facial',
};

interface EventDetailProps {
  eventId: string;
  onBack: () => void;
  onViewEvidence: (evidenceId: string, eventId: string) => void;
  onOpenDossier: (dossierId: string) => void;
}

type ModalKind = 'identify' | 'contest' | 'revoke' | 'discard' | null;

const MODAL_TEXT = {
  contest: {
    title: 'Registrar Contestação do Profissional',
    label: 'Relato / Justificativa da Contestação:',
    placeholder: 'Descreva o motivo informado pelo profissional...',
    submit: 'Salvar Contestação',
    border: 'border-amber-500/40',
    button: 'bg-amber-500 text-slate-900',
  },
  revoke: {
    title: 'Revogar Identificação',
    label: 'Motivo da Revogação:',
    placeholder: 'Informe o motivo da anulação do vínculo...',
    submit: 'Confirmar Revogação',
    border: 'border-red-500/40',
    button: 'bg-red-600 text-white',
  },
  discard: {
    title: 'Descartar Alerta (Falso Positivo)',
    label: 'Motivo do Descarte:',
    placeholder: 'Explique por que esta ocorrência não é uma infração...',
    submit: 'Descartar Alerta',
    border: 'border-slate-500/40',
    button: 'bg-slate-600 text-white',
  },
} as const;

export const EventDetail: React.FC<EventDetailProps> = ({ eventId, onBack, onViewEvidence, onOpenDossier }) => {
  const { can } = useAuth();
  const { events, applyEvent } = useAlerts();
  const fetched = useAsync(() => api.events.get(eventId), [eventId]);

  const [modal, setModal] = useState<ModalKind>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [profName, setProfName] = useState('');
  const [profReg, setProfReg] = useState('');
  const [justification, setJustification] = useState('');

  useEscape(modal !== null && !busy, () => setModal(null));

  const event: Event | null = events.find((e) => e.event_id === eventId) ?? fetched.data;

  if (!event) {
    if (fetched.error) return <ErrorMessage message={fetched.error} onRetry={fetched.reload} />;
    return <Loading label="Carregando ocorrência…" />;
  }

  const openModal = (kind: ModalKind) => {
    setJustification('');
    setProfName('');
    setProfReg('');
    setActionError(null);
    setModal(kind);
  };

  const run = async (action: () => Promise<Event>) => {
    setBusy(true);
    setActionError(null);
    try {
      applyEvent(await action());
      setModal(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Não foi possível concluir a ação.');
    } finally {
      setBusy(false);
    }
  };

  const handleAck = () => void run(() => api.events.ack(event.event_id));

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const reason = justification.trim();
    if (!reason) return;
    if (modal === 'identify') {
      if (!profName.trim() || !profReg.trim()) return;
      void run(() =>
        api.events.identify(event.event_id, {
          professional_name: profName.trim(),
          professional_registration: profReg.trim(),
          justification: reason,
        }),
      );
    } else if (modal === 'contest') {
      void run(() => api.events.contest(event.event_id, reason));
    } else if (modal === 'revoke') {
      void run(() => api.events.revoke(event.event_id, reason));
    } else if (modal === 'discard') {
      void run(() => api.events.discard(event.event_id, reason));
    }
  };

  const isAck = event.status === 'RECONHECIDO';
  const isPending = event.status === 'PENDENTE';
  const ident = event.identification;
  const showIdentification = can('identification:read');

  return (
    <div className="space-y-6 animate-fadeIn pb-12 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1.5 self-start"
        >
          ← Voltar para a Lista de Alertas
        </button>

        <div className="flex flex-wrap items-center gap-3">
          {event.evidence_id && can('evidence:view') && (
            <button
              onClick={() => onViewEvidence(event.evidence_id!, event.event_id)}
              className="btn-medical-secondary flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold"
            >
              <CameraIcon className="w-4 h-4 text-cyan-400" />
              <span>Ver Fotografia</span>
            </button>
          )}

          {event.dossier_id && can('dossiers:read') && (
            <button
              onClick={() => onOpenDossier(event.dossier_id!)}
              className="btn-medical-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-md"
            >
              <FileTextIcon className="w-4 h-4" />
              <span>Consultar Dossiê do Incidente</span>
            </button>
          )}
        </div>
      </div>

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
            <h1 className="text-2xl font-bold text-white tracking-tight">{event.zone_name}</h1>
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#07132e] border border-white/10 space-y-1">
            <span className="text-xs text-slate-300 font-medium block">Tipo da Ocorrência:</span>
            <span className="text-sm font-bold text-white">
              {event.event_type === 'TIPO_A' ? 'Entrada sem o equipamento' : 'Remoção do equipamento'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#07132e] border border-white/10 space-y-1">
            <span className="text-xs text-slate-300 font-medium block">Equipamento Ausente:</span>
            <span className="text-base font-bold text-cyan-300">{EPI_LABELS[event.epi_type] ?? event.epi_type}</span>
          </div>

          <div className="p-4 rounded-xl bg-[#07132e] border border-white/10 space-y-1">
            <span className="text-xs text-slate-300 font-medium block">Horário da Detecção:</span>
            <span className="text-sm font-semibold text-white">{new Date(event.occurred_at).toLocaleString('pt-BR')}</span>
          </div>
        </div>

        {!isPending && event.acknowledged_at && (
          <p className="text-xs text-slate-300">
            {isAck ? 'Atendido' : 'Descartado'} por <strong className="text-white">{event.acknowledged_by_name ?? 'gestor'}</strong> em{' '}
            {new Date(event.acknowledged_at).toLocaleString('pt-BR')}.
          </p>
        )}

        {isPending && can('events:ack') && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/10">
            <button
              onClick={handleAck}
              disabled={busy}
              className="btn-medical-primary flex items-center gap-2 py-2.5 px-5 rounded-xl text-xs font-bold shadow-md disabled:opacity-60"
            >
              <CheckCircleIcon className="w-4 h-4" />
              <span>{busy ? 'Registrando…' : 'Reconhecer e Atender'}</span>
            </button>
            <button
              onClick={() => openModal('discard')}
              disabled={busy}
              className="px-4 py-2.5 rounded-xl bg-white/10 text-slate-200 hover:text-white text-xs font-semibold border border-white/10"
            >
              Descartar (falso positivo)
            </button>
          </div>
        )}
        {modal === null && <InlineError message={actionError} />}
      </div>

      {showIdentification && (
        <div className="medical-card p-6 sm:p-8 rounded-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h3 className="font-bold text-white text-lg flex items-center gap-2.5">
                <ShieldIcon className="w-5 h-5 text-cyan-400" />
                <span>Identificação do Profissional e Revisão Humana (LGPD art. 20)</span>
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                O profissional identificado tem direito à revisão humana de qualquer decisão tomada por IA.
              </p>
            </div>

            {ident && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-white text-blue-900 shadow-sm self-start sm:self-auto">
                {ident.status === 'CONFIRMADA' ? 'Identificação Confirmada' : ident.status === 'CONTESTADA' ? 'Contestada' : 'Revogada'}
              </span>
            )}
          </div>

          {ident ? (
            <div className="space-y-4">
              <div className="p-5 rounded-xl bg-[#07132e] border border-cyan-500/30 space-y-4">
                <div className="flex items-center gap-2">
                  {ident.source === 'AI' ? (
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
                    <span className="text-lg font-bold text-white">{ident.subject_reference}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-300 block mb-1">Responsável pela Validação:</span>
                    <span className="text-sm font-semibold text-cyan-300">
                      {ident.source === 'AI' ? 'Algoritmo de Reconhecimento Facial' : ident.identified_by_name ?? 'Gestor'}
                    </span>
                  </div>
                </div>

                {ident.justification && (
                  <div className="p-4 rounded-xl bg-[#050e22] border border-white/10 text-xs text-slate-200">
                    <strong className="text-cyan-300 block mb-1">Justificativa Registrada:</strong>
                    {ident.justification}
                  </div>
                )}
              </div>

              {can('identification:review') && ident.status !== 'REVOGADA' && (
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  {ident.status === 'CONFIRMADA' && (
                    <button
                      onClick={() => openModal('contest')}
                      className="px-4 py-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 text-xs font-semibold transition-all"
                    >
                      ⚠ Registrar Contestação do Profissional
                    </button>
                  )}
                  <button
                    onClick={() => openModal('revoke')}
                    className="px-4 py-2.5 rounded-xl bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 text-xs font-semibold transition-all"
                  >
                    ✕ Revogar Identificação
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-[#07132e] text-center space-y-3">
              <h4 className="text-base font-bold text-white">Profissional Ainda Não Identificado</h4>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                O evento permanece anônimo sob o código <strong className="text-white">{event.track_id}</strong>. Para
                consolidar o dossiê, identifique o profissional após a conferência visual.
              </p>
              {can('identification:write') && (
                <button
                  onClick={() => openModal('identify')}
                  className="btn-medical-primary px-6 py-3 rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-md"
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Realizar Identificação Humana</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div
            role="dialog"
            aria-modal="true"
            className={`w-full max-w-md bg-[#0a1838] border rounded-2xl p-6 shadow-2xl space-y-4 text-slate-200 ${
              modal === 'identify' ? 'border-cyan-400/40' : MODAL_TEXT[modal].border
            }`}
          >
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              {modal === 'identify' && <UserIcon className="w-5 h-5 text-cyan-400" />}
              <span>{modal === 'identify' ? 'Identificar Profissional' : MODAL_TEXT[modal].title}</span>
            </h3>

            <form onSubmit={handleModalSubmit} className="space-y-4 text-xs">
              <InlineError message={actionError} />

              {modal === 'identify' && (
                <>
                  <div>
                    <label htmlFor="prof-name" className="text-slate-200 font-semibold block mb-1">
                      Nome Completo do Profissional:
                    </label>
                    <input
                      id="prof-name"
                      type="text"
                      required
                      minLength={3}
                      maxLength={150}
                      value={profName}
                      onChange={(e) => setProfName(e.target.value)}
                      className="w-full bg-[#07132e] text-white p-3 rounded-xl border border-white/20 focus:border-cyan-400 text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="prof-reg" className="text-slate-200 font-semibold block mb-1">
                      Registro Profissional (CRM / COREN / Matrícula):
                    </label>
                    <input
                      id="prof-reg"
                      type="text"
                      required
                      maxLength={30}
                      value={profReg}
                      onChange={(e) => setProfReg(e.target.value)}
                      className="w-full bg-[#07132e] text-white p-3 rounded-xl border border-white/20 focus:border-cyan-400 text-sm"
                    />
                  </div>
                </>
              )}

              <div>
                <label htmlFor="justification" className="text-slate-200 font-semibold block mb-1">
                  {modal === 'identify' ? 'Parecer / Justificativa da Conferência:' : MODAL_TEXT[modal].label}
                </label>
                <textarea
                  id="justification"
                  rows={4}
                  required
                  minLength={3}
                  maxLength={1000}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder={modal === 'identify' ? 'Informe os detalhes da verificação...' : MODAL_TEXT[modal].placeholder}
                  className="w-full bg-[#07132e] text-white p-3 rounded-xl border border-white/20 focus:border-cyan-400 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className={`px-6 py-2.5 rounded-xl font-bold text-sm shadow-md disabled:opacity-60 ${
                    modal === 'identify' ? 'btn-medical-primary' : MODAL_TEXT[modal].button
                  }`}
                >
                  {busy ? 'Enviando…' : modal === 'identify' ? 'Confirmar Identificação' : MODAL_TEXT[modal].submit}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
