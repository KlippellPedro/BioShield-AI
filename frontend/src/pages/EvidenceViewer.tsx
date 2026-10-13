import React, { useEffect, useState } from 'react';
import { api } from '../api/endpoints';
import { ApiError } from '../api/http';
import { useAlerts } from '../hooks/useRealtimeAlerts';
import { useAuth } from '../store/authStore';
import { Evidence } from '../types';
import { Loading } from '../components/StateMessage';
import { CameraIcon, LockIcon, EyeIcon, EyeOffIcon, CheckCircleIcon } from '../components/icons';

interface EvidenceViewerProps {
  evidenceId: string;
  eventId?: string;
  onBack: () => void;
}

interface Loaded {
  evidence: Evidence;
  imageUrl: string;
}

// A imagem é dado pessoal. O backend só a entrega a quem tem papel autorizado e MFA ativo (RNF-19),
// com Cache-Control: no-store, e grava EVIDENCE_VIEW na trilha de auditoria. Aqui ela vive só na
// memória: o endereço do blob é revogado ao sair da tela e nenhuma URL pública é usada.
export const EvidenceViewer: React.FC<EvidenceViewerProps> = ({ evidenceId, eventId, onBack }) => {
  const { user } = useAuth();
  const { events } = useAlerts();
  const event = eventId ? events.find((e) => e.event_id === eventId) : undefined;

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<{ message: string; denied: boolean } | null>(null);
  const [blurred, setBlurred] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    let objectUrl: string | null = null;
    setLoaded(null);
    setError(null);

    Promise.all([api.evidence.get(evidenceId, ctrl.signal), api.evidence.image(evidenceId, ctrl.signal)])
      .then(([evidence, blob]) => {
        objectUrl = URL.createObjectURL(blob);
        if (ctrl.signal.aborted) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setLoaded({ evidence, imageUrl: objectUrl });
      })
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        const denied = e instanceof ApiError && e.status === 403;
        setError({ message: e instanceof Error ? e.message : 'Não foi possível abrir a evidência.', denied });
      });

    return () => {
      ctrl.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [evidenceId]);

  if (error) {
    return (
      <div className="max-w-xl mx-auto my-12 medical-card p-8 rounded-2xl border-cyan-500/40 shadow-2xl space-y-6 text-center animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-cyan-400/40 mx-auto flex items-center justify-center text-cyan-400">
          <LockIcon className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">
            {error.denied ? 'Acesso restrito' : 'Não foi possível abrir a evidência'}
          </h2>
          <p role="alert" className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
            {error.message}
          </p>
          {error.denied && (
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              A imagem nítida só pode ser aberta por perfis autorizados com autenticação em dois fatores (LGPD, RNF-19).
            </p>
          )}
        </div>

        <button onClick={onBack} className="px-5 py-2.5 rounded-xl bg-white/10 text-slate-200 hover:text-white text-xs font-semibold">
          Voltar
        </button>
      </div>
    );
  }

  if (!loaded) return <Loading label="Abrindo evidência…" />;

  const { evidence, imageUrl } = loaded;
  const daysRemaining = Math.max(
    0,
    Math.ceil((new Date(evidence.retention_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12">
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
            <span>Acesso registrado em auditoria</span>
          </span>
          <span className="px-3 py-1 rounded-full bg-white text-blue-900 text-xs font-bold shadow-sm">
            Retenção: {daysRemaining} {daysRemaining === 1 ? 'dia restante' : 'dias restantes'}
          </span>
        </div>
      </div>

      <div className="medical-card rounded-2xl overflow-hidden border border-cyan-400/40 shadow-xl">
        <div className="p-5 bg-[#091738] border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 flex items-center justify-center text-cyan-400">
              <CameraIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Registro Fotográfico do Instante da Infração</h2>
              <span className="text-xs text-slate-300">
                {evidence.track_id ? `Identificador: ${evidence.track_id}` : 'Sem identificador de rastreio'}
                {event ? ` • Setor: ${event.zone_name}` : ''}
              </span>
            </div>
          </div>

          <button
            onClick={() => setBlurred(!blurred)}
            aria-pressed={blurred}
            className="btn-medical-primary flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
          >
            {blurred ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
            <span>{blurred ? 'Exibir imagem nítida' : 'Ocultar imagem'}</span>
          </button>
        </div>

        <div className="relative bg-[#040a18] flex items-center justify-center p-4 overflow-hidden">
          <img
            src={imageUrl}
            alt="Registro da infração de EPI"
            className={`max-h-[70vh] w-auto rounded-xl transition-all ${blurred ? 'blur-2xl' : ''}`}
            draggable={false}
          />
          <div className="absolute bottom-4 right-4 text-xs text-slate-300 bg-black/70 px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Aberto por {user?.username}</span>
          </div>
        </div>

        <div className="p-5 bg-[#061026] border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-slate-400 block font-medium">Captura:</span>
            <div className="text-cyan-300 bg-[#040a18] p-2 rounded-lg border border-white/10">
              {new Date(evidence.captured_at).toLocaleString('pt-BR')}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 block font-medium">Integridade (SHA-256 do arquivo cifrado):</span>
            <div className="text-emerald-400 bg-[#040a18] p-2 rounded-lg border border-white/10 truncate font-mono">
              {evidence.storage_checksum}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
