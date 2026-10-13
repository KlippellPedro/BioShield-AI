import React, { useState, useEffect } from 'react';
import { VisualEvidence } from '../types';
import { eventsStore } from '../store/eventsStore';
import { authStore, DEMO_USERS } from '../store/authStore';
import { DEMO_MODE } from '../config/app';
import { 
  CameraIcon, 
  LockIcon, 
  EyeIcon, 
  EyeOffIcon, 
  CheckCircleIcon
} from '../components/icons';

interface EvidenceViewerProps {
  evidenceId: string;
  eventId?: string;
  onBack: () => void;
}

export const EvidenceViewer: React.FC<EvidenceViewerProps> = ({
  evidenceId,
  eventId,
  onBack,
}) => {
  const [evidence] = useState<VisualEvidence | undefined>(
    eventsStore.getEvidenceById(evidenceId)
  );
  const [showUnblurred, setShowUnblurred] = useState<boolean>(true);
  const [hasAuditLogged, setHasAuditLogged] = useState<boolean>(false);

  const canView = authStore.canViewEvidence();
  const currentUser = authStore.getUser();

  useEffect(() => {
    if (canView && !hasAuditLogged && evidence) {
      eventsStore.recordEvidenceView(evidence.evidence_id, eventId);
      setHasAuditLogged(true);
    }
  }, [canView, hasAuditLogged, evidence, eventId]);

  if (!evidence) {
    return (
      <div className="medical-card p-10 text-center space-y-3">
        <h3 className="text-base font-bold text-white">Evidência não encontrada</h3>
        <button onClick={onBack} className="btn-medical-primary px-5 py-2.5 rounded-xl text-xs font-bold">
          Voltar
        </button>
      </div>
    );
  }

  // Access Control Check (RNF-19 & LGPD)
  if (!canView) {
    return (
      <div className="max-w-xl mx-auto my-12 medical-card p-8 rounded-2xl border-cyan-500/40 shadow-2xl space-y-6 text-center animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-cyan-400/40 mx-auto flex items-center justify-center text-cyan-400">
          <LockIcon className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full bg-white text-blue-900 text-xs font-bold uppercase tracking-wider">
            Acesso Restrito por Segurança Hospitalar
          </span>
          <h2 className="text-xl font-bold text-white">
            Visualização de Imagens Restrita a Perfis com Segundo Fator (MFA)
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
            Por determinação da LGPD e norma interna de biossegurança (RNF-19), apenas a Enfermagem-chefe ou o Encarregado de Dados com autenticação em duas etapas podem abrir fotos nítidas dos profissionais.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#07132e] text-left text-xs text-slate-300 space-y-1.5 border border-white/10">
          <div className="text-cyan-300 font-bold">Usuário atual: <span className="text-white">{currentUser?.full_name}</span></div>
          {DEMO_MODE && (
            <p className="text-[11px] text-slate-400">
              Para testar a abertura da evidência visual, utilize o perfil de demonstração da Enfermagem-chefe.
            </p>
          )}
        </div>

        <div className="flex items-center justify-center gap-4 pt-2">
          <button
            onClick={onBack}
            className="px-5 py-2.5 rounded-xl bg-white/10 text-slate-200 hover:text-white text-xs font-semibold"
          >
            Voltar ao Painel
          </button>
          {DEMO_MODE && (
            <button
              onClick={() => authStore.login(DEMO_USERS[0])}
              className="btn-medical-primary px-5 py-2.5 rounded-xl text-xs font-bold shadow-md"
            >
              Acessar como Ana (Enfermagem-chefe)
            </button>
          )}
        </div>
      </div>
    );
  }

  const retentionDate = new Date(evidence.retention_until);
  const daysRemaining = Math.max(0, Math.ceil((retentionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1.5"
        >
          ← Voltar para a Ocorrência
        </button>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5">
            <CheckCircleIcon className="w-4 h-4" />
            <span>MFA Validado</span>
          </span>
          <span className="px-3 py-1 rounded-full bg-white text-blue-900 text-xs font-bold shadow-sm">
            Retenção: {daysRemaining} dias restantes
          </span>
        </div>
      </div>

      {/* Main Evidence Viewer Panel */}
      <div className="medical-card rounded-2xl overflow-hidden border border-cyan-400/40 shadow-xl">
        {/* Header */}
        <div className="p-5 bg-[#091738] border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 flex items-center justify-center text-cyan-400">
              <CameraIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">
                Registro Fotográfico do Instante da Infração
              </h2>
              <span className="text-xs text-slate-300">
                Identificador: {evidence.track_id} • Câmera: UTI Leste Adulto
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowUnblurred(!showUnblurred)}
            className="btn-medical-primary flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
          >
            {showUnblurred ? <EyeIcon className="w-4 h-4" /> : <EyeOffIcon className="w-4 h-4" />}
            <span>{showUnblurred ? 'Exibindo Imagem Nítida' : 'Exibindo com Desfoque'}</span>
          </button>
        </div>

        {/* Camera Viewport Canvas */}
        <div className="relative bg-[#040a18] min-h-[400px] flex items-center justify-center p-8 overflow-hidden">
          {/* Central Camera Silhouette & Evidence Frame */}
          <div className="relative w-full max-w-md h-72 rounded-2xl bg-[#091530] border border-cyan-500/30 flex flex-col items-center justify-center shadow-2xl overflow-hidden">
            <div className="relative flex flex-col items-center justify-center">
              {/* Head / Face */}
              <div className="relative w-24 h-24 rounded-full border-2 border-dashed border-cyan-400/60 flex items-center justify-center bg-blue-950/40">
                {showUnblurred ? (
                  <div className="relative flex flex-col items-center justify-center text-center">
                    <div className="w-14 h-16 rounded-full bg-slate-800 border border-cyan-400/50 flex items-center justify-center shadow-md">
                      <span className="text-[10px] text-white font-bold">ROSTO NÍTIDO</span>
                    </div>
                    {/* Bounding Box: Mask Missing */}
                    <div className="absolute -bottom-2 w-20 h-7 border-2 border-red-500 rounded-lg bg-red-500/30 flex items-center justify-center shadow-lg animate-pulse">
                      <span className="text-[9px] font-bold text-white bg-red-600 px-1 rounded">
                        SEM MÁSCARA
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-slate-800/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-2">
                    <EyeOffIcon className="w-5 h-5 text-slate-400 mb-0.5" />
                    <span className="text-[9px] text-slate-300">Desfocado</span>
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="w-40 h-28 rounded-t-3xl bg-slate-800/80 border border-cyan-500/20 mt-2 flex items-center justify-center relative">
                <span className="text-xs text-slate-300 font-medium">
                  Profissional em Atendimento
                </span>
                <div className="absolute bottom-2 left-2 border border-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded text-[9px] font-bold text-emerald-300">
                  LUVAS: OK
                </div>
                <div className="absolute bottom-2 right-2 border border-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded text-[9px] font-bold text-emerald-300">
                  AVENTAL: OK
                </div>
              </div>
            </div>

            <div className="absolute bottom-2 left-3 text-[10px] text-cyan-300 bg-black/60 px-2 py-0.5 rounded font-mono">
              IA Confiança: 94.2% • Resolução: 1080p
            </div>
          </div>

          {/* Audit Stamp */}
          <div className="absolute bottom-4 right-4 text-xs text-slate-300 bg-black/70 px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Acesso registrado em auditoria • Usuário: {currentUser?.username}</span>
          </div>
        </div>

        {/* Security & Cryptography Footer */}
        <div className="p-5 bg-[#061026] border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-slate-400 block font-medium">Armazenamento Cifrado:</span>
            <div className="text-cyan-300 bg-[#040a18] p-2 rounded-lg border border-white/10 truncate font-mono">
              {evidence.file_reference}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 block font-medium">Integridade Digital (SHA-256):</span>
            <div className="text-emerald-400 bg-[#040a18] p-2 rounded-lg border border-white/10 truncate font-mono">
              {evidence.storage_checksum}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
