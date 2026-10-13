import React from 'react';
import { IncidentDossier } from '../types';
import { 
  FileTextIcon, 
  ShieldIcon, 
  DownloadIcon, 
  AlertTriangleIcon, 
  CpuIcon, 
  UserIcon 
} from './icons';

interface DossierModalProps {
  dossier: IncidentDossier | null;
  onClose: () => void;
}

export const DossierModal: React.FC<DossierModalProps> = ({ dossier, onClose }) => {
  if (!dossier) return null;

  const event = dossier.event;
  const isConsolidated = dossier.status === 'CONSOLIDADO';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#091533] border border-cyan-400/40 rounded-3xl shadow-2xl flex flex-col text-slate-100">
        {/* Modal Top Bar */}
        <div className="p-5 bg-[#061028] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <FileTextIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-sm block">
                Dossiê Oficial de Incidente Hospitalar
              </span>
              <span className="text-xs text-slate-300">BioShield AI — Campanha de Saúde</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="btn-medical-primary flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
            >
              <DownloadIcon className="w-4 h-4" />
              <span>Imprimir / Exportar</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Dossier Document Sheet - Clean High Contrast Document */}
        <div className="p-6 sm:p-10 space-y-6">
          {/* Official Letterhead */}
          <div className="border-b-2 border-cyan-500/30 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-md">
                <ShieldIcon className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Hospital de Clínicas & Segurança do Trabalho
                </h3>
                <p className="text-xs text-slate-300">
                  Comissão de Controle de Infecção Hospitalar (CCIH) • NR-32
                </p>
              </div>
            </div>

            <div className="sm:text-right">
              <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                isConsolidated
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}>
                {isConsolidated ? 'Dossiê Consolidado' : 'Dossiê Pendente'}
              </span>
              <div className="text-xs text-slate-400 mt-1">
                Protocolo: {dossier.dossier_id.slice(0, 16)}...
              </div>
            </div>
          </div>

          {/* Incident Overview Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#061026] p-5 rounded-2xl border border-white/10 text-xs">
            <div>
              <span className="text-slate-400 block mb-1">Setor Hospitalar:</span>
              <strong className="text-white text-sm">{event?.zone_name || 'UTI Leste Adulto'} ({event?.zone_code})</strong>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Código Anônimo de Gravação:</span>
              <strong className="text-cyan-300 text-sm">{event?.track_id || 'track_00427'}</strong>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Data e Hora do Registro:</span>
              <span className="text-slate-200">
                {event ? new Date(event.occurred_at).toLocaleString('pt-BR') : 'Hoje às 10:14'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Status de Encaminhamento:</span>
              <span className="text-emerald-400 font-semibold">
                {isConsolidated ? 'Pronto para envio à Diretoria' : 'Aguardando validação nominal'}
              </span>
            </div>
          </div>

          {/* Infraction Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
              Detalhamento da Ocorrência de EPI
            </h4>

            <div className="p-5 rounded-2xl bg-[#061026] border border-red-500/30 flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400 flex-shrink-0">
                <AlertTriangleIcon className="w-5 h-5" />
              </div>
              <div className="text-xs space-y-1.5">
                <div className="text-sm font-bold text-white">
                  {event?.event_type === 'TIPO_A' 
                    ? 'Entrada no setor sem equipamento obrigatório' 
                    : 'Remoção indevida de equipamento durante procedimento'}
                </div>
                <div className="text-slate-200">
                  Equipamento: <strong className="text-cyan-300">{event?.epi_type || 'MASCARA'}</strong>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  O sistema de visão computacional constatou a ausência do equipamento além da tolerância permitida.
                </p>
              </div>
            </div>
          </div>

          {/* Professional Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
              Identificação do Profissional
            </h4>

            {isConsolidated ? (
              <div className="p-5 rounded-2xl bg-[#061026] border border-cyan-500/30 space-y-3 text-xs">
                <div className="flex items-center gap-2">
                  {event?.identification?.source === 'AI' ? (
                    <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-semibold flex items-center gap-1.5">
                      <CpuIcon className="w-3.5 h-3.5" /> Identificação por Reconhecimento Facial
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-white text-blue-900 font-bold flex items-center gap-1.5">
                      <UserIcon className="w-3.5 h-3.5" /> Validação Manual da Enfermagem-chefe
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Nome do Profissional:</span>
                    <strong className="text-white text-base">
                      {event?.audited_professional_name || 'Dr. João da Silva'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Registro de Classe / Matrícula:</span>
                    <strong className="text-cyan-300 text-base">
                      {event?.audited_professional_registration || 'CRM-RS 123456'}
                    </strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-[#061026] border border-amber-500/30 text-xs text-slate-300 space-y-1">
                <strong className="text-amber-300 block">Dossiê Pré-Consolidação</strong>
                <p className="text-[11px] text-slate-400">
                  Por regra de integridade do banco de dados, o dossiê oficial só recebe o selo consolidado após a conferência e inclusão do nome e registro profissional.
                </p>
              </div>
            )}
          </div>

          {/* LGPD & Legal Statement */}
          <div className="p-4 rounded-xl bg-[#050c1e] border border-white/10 text-xs text-slate-400 leading-relaxed">
            <strong className="text-slate-200 block mb-1">Aviso de Privacidade e Finalidade Médica (LGPD Art. 20):</strong>
            Este registro é confidencial e emitido exclusivamente para garantir a segurança dos pacientes e colaboradores do hospital. Ao profissional é assegurado o direito de solicitar esclarecimentos e revisão humana deste parecer.
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 bg-[#061028] border-t border-white/10 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-white text-blue-900 font-bold text-xs shadow-md"
          >
            Fechar Visualização
          </button>
        </div>
      </div>
    </div>
  );
};
