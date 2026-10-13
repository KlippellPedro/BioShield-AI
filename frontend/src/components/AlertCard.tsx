import React from 'react';
import { Event } from '../types';
import { 
  AlertTriangleIcon, 
  ClockIcon, 
  CameraIcon, 
  CheckCircleIcon, 
  ChevronRightIcon, 
  CpuIcon, 
  UserIcon,
  ShieldIcon 
} from './icons';

interface AlertCardProps {
  event: Event;
  onSelectEvent: (eventId: string) => void;
  onAcknowledge: (eventId: string) => void;
  onViewEvidence: (evidenceId: string, eventId: string) => void;
}

export const AlertCard: React.FC<AlertCardProps> = ({
  event,
  onSelectEvent,
  onAcknowledge,
  onViewEvidence,
}) => {
  const isPending = event.status === 'PENDENTE';
  const isAck = event.status === 'RECONHECIDO';

  // Calculate elapsed time formatted in simple terms
  const elapsedMinutes = Math.floor((Date.now() - new Date(event.occurred_at).getTime()) / 60000);
  const timeDisplay = elapsedMinutes <= 0 ? 'Agora mesmo' : `Há ${elapsedMinutes} minutos`;

  // Human-friendly EPI labels
  const epiLabels: Record<string, string> = {
    MASCARA: 'Máscara de Proteção (PFF2 / Cirúrgica)',
    LUVAS: 'Luvas de Procedimento',
    AVENTAL: 'Avental Impermeável',
    TOUCA: 'Touca Hospitalar',
    PROTETOR_FACIAL: 'Protetor Facial (Face Shield)',
  };

  const breachTypeLabel = event.event_type === 'TIPO_A' 
    ? 'Entrada no setor sem o equipamento' 
    : 'Equipamento retirado durante a permanência';

  return (
    <div
      className={`medical-card relative p-5 transition-all duration-200 border ${
        isPending
          ? 'medical-card-active border-cyan-400/60 shadow-[0_4px_25px_rgba(0,195,255,0.2)]'
          : isAck
          ? 'border-emerald-500/30'
          : 'border-slate-800 opacity-90'
      }`}
    >
      {/* Top Header: Hospital Area & Time */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-3.5 h-3.5 rounded-full ${
            isPending ? 'bg-cyan-400 animate-pulse shadow-[0_0_10px_#00c3ff]' : 'bg-emerald-400'
          }`} />
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              {event.zone_name || 'Área Hospitalar'}
            </h3>
            <span className="text-xs text-cyan-300 font-medium">
              Código da Unidade: {event.zone_code || 'ZONA'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <ClockIcon className="w-4 h-4 text-cyan-400" />
            <span>{timeDisplay}</span>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              isPending
                ? 'bg-red-500 text-white shadow-sm'
                : isAck
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'bg-slate-700 text-slate-200'
            }`}
          >
            {isPending ? 'Alerta Pendente' : isAck ? 'Atendido pelo Gestor' : 'Descartado'}
          </span>
        </div>
      </div>

      {/* Main Breach Box - Clean & High Contrast */}
      <div className="bg-[#07132e] rounded-xl p-4 border border-cyan-500/20 mb-4 space-y-2">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg mt-0.5 ${
            isPending ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-800 text-slate-400'
          }`}>
            <AlertTriangleIcon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-white">
              {epiLabels[event.epi_type] || event.epi_type} não detectado
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Motivo: <strong className="text-cyan-300">{breachTypeLabel}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Professional Attribution - Clean & Reassuring */}
      <div className="mb-4">
        {event.identification ? (
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#091738] border border-cyan-500/30 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                {event.identification.source === 'AI' ? (
                  <CpuIcon className="w-4 h-4" />
                ) : (
                  <UserIcon className="w-4 h-4" />
                )}
              </div>
              <div>
                <span className="text-[11px] text-cyan-300 font-semibold block">
                  {event.identification.source === 'AI' ? 'Identificação Automática (IA)' : 'Validação do Gestor'}
                </span>
                <span className="font-bold text-white text-sm">
                  {event.identification.subject_reference}
                </span>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              {event.identification.status === 'CONFIRMADA' ? 'Confirmado' : event.identification.status}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#07132e]/70 border border-white/10 text-xs text-slate-300">
            <span className="flex items-center gap-2">
              <ShieldIcon className="w-4 h-4 text-cyan-400" />
              <span>Profissional sob proteção de privacidade (Anônimo)</span>
            </span>
            <span className="text-cyan-400 text-xs font-medium">Aguardando auditoria</span>
          </div>
        )}
      </div>

      {/* Action Buttons - Large, Clear & Accessible */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/10">
        {isPending && (
          <button
            onClick={() => onAcknowledge(event.event_id)}
            className="btn-medical-primary flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl text-xs font-bold transition-all shadow-md"
          >
            <CheckCircleIcon className="w-4 h-4" />
            <span>Reconhecer e Atender</span>
          </button>
        )}

        {event.evidence_id && (
          <button
            onClick={() => onViewEvidence(event.evidence_id!, event.event_id)}
            className="btn-medical-secondary flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all"
            title="Visualizar a imagem da infração"
          >
            <CameraIcon className="w-4 h-4 text-cyan-400" />
            <span>Ver Fotografia</span>
          </button>
        )}

        <button
          onClick={() => onSelectEvent(event.event_id)}
          className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-200 hover:text-white bg-white/5 hover:bg-white/15 transition-all ml-auto border border-white/10"
        >
          <span>Detalhes e Revisão</span>
          <ChevronRightIcon className="w-4 h-4 text-cyan-400" />
        </button>
      </div>
    </div>
  );
};
