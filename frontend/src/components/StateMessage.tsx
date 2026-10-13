import React from 'react';
import { AlertTriangleIcon } from './icons';

export const Loading: React.FC<{ label?: string }> = ({ label = 'Carregando…' }) => (
  <div role="status" className="medical-card p-10 rounded-2xl text-center text-sm text-slate-300">
    {label}
  </div>
);

export const ErrorMessage: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div role="alert" className="medical-card p-8 rounded-2xl text-center space-y-3 border-red-500/40">
    <AlertTriangleIcon className="w-8 h-8 text-red-400 mx-auto" />
    <p className="text-sm text-red-200">{message}</p>
    {onRetry && (
      <button onClick={onRetry} className="btn-medical-secondary px-5 py-2.5 rounded-xl text-xs font-semibold">
        Tentar novamente
      </button>
    )}
  </div>
);

// Erro de uma ação (salvar, reconhecer…) dentro de um formulário ou modal.
export const InlineError: React.FC<{ message: string | null }> = ({ message }) =>
  message ? (
    <div role="alert" className="p-3 rounded-xl bg-red-500/10 border border-red-400/40 text-xs text-red-200">
      {message}
    </div>
  ) : null;
