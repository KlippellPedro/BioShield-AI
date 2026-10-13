import React, { useEffect, useState } from 'react';
import { api } from '../api/endpoints';
import { useEscape } from '../hooks/useEscape';
import { DownloadIcon, FileTextIcon } from './icons';

interface PdfModalProps {
  dossierId: string | null;
  onClose: () => void;
}

// Exibe o PDF real do dossiê, gerado e cifrado pelo backend. O arquivo é dado pessoal:
// vem por requisição autenticada (nunca por URL pública) e só existe na memória do navegador.
export const PdfModal: React.FC<PdfModalProps> = ({ dossierId, onClose }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dossierId) return;
    const ctrl = new AbortController();
    let objectUrl: string | null = null;
    setUrl(null);
    setError(null);
    api.dossiers
      .pdf(dossierId, ctrl.signal)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((e) => {
        if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : 'Falha ao abrir o dossiê.');
      });
    return () => {
      ctrl.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [dossierId]);

  useEscape(dossierId !== null, onClose);

  if (!dossierId) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Dossiê de incidente" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-4xl h-[90vh] bg-[#091533] border border-cyan-400/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        <div className="p-4 bg-[#061028] border-b border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-white text-sm font-bold">
            <FileTextIcon className="w-5 h-5 text-cyan-400" />
            <span>Dossiê de Incidente</span>
          </div>
          <div className="flex items-center gap-3">
            {url && (
              <a
                href={url}
                download={`dossie-${dossierId}.pdf`}
                className="btn-medical-primary flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
              >
                <DownloadIcon className="w-4 h-4" />
                <span>Baixar PDF</span>
              </a>
            )}
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="w-8 h-8 rounded-lg bg-white/10 text-slate-300 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 bg-[#040a18]">
          {error ? (
            <div role="alert" className="h-full flex items-center justify-center p-8 text-sm text-red-200 text-center">
              {error}
            </div>
          ) : url ? (
            <iframe src={url} title="Dossiê de incidente" className="w-full h-full border-0" />
          ) : (
            <div role="status" className="h-full flex items-center justify-center text-sm text-slate-300">
              Carregando o dossiê…
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
