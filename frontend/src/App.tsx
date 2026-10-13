import React, { useEffect, useState } from 'react';
import { Navbar, NAV_ITEMS } from './components/Navbar';
import { PdfModal } from './components/PdfModal';
import { Dashboard } from './pages/Dashboard';
import { Zones } from './pages/Zones';
import { EventDetail } from './pages/EventDetail';
import { EvidenceViewer } from './pages/EvidenceViewer';
import { Dossiers } from './pages/Dossiers';
import { AuditLogs } from './pages/AuditLogs';
import { Login } from './pages/Login';
import { AlertsProvider, useAlerts } from './hooks/useRealtimeAlerts';
import { authStore, useAuth } from './store/authStore';

const Shell: React.FC = () => {
  const { can } = useAuth();
  const { metrics, hasPulse } = useAlerts();

  const allowedTabs = NAV_ITEMS.filter((item) => can(item.permission)).map((item) => item.id);
  const [requestedTab, setRequestedTab] = useState<string>(allowedTabs[0] ?? 'dashboard');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);
  const [pdfDossierId, setPdfDossierId] = useState<string | null>(null);

  const isDetailTab = requestedTab === 'event-detail' || requestedTab === 'evidence';
  const activeTab = isDetailTab || allowedTabs.includes(requestedTab) ? requestedTab : allowedTabs[0];

  const handleSelectEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    setRequestedTab('event-detail');
  };

  const handleViewEvidence = (evidenceId: string, eventId?: string) => {
    setSelectedEvidenceId(evidenceId);
    setSelectedEventId(eventId ?? null);
    setRequestedTab('evidence');
  };

  const backToEvent = () => setRequestedTab(selectedEventId ? 'event-detail' : (allowedTabs[0] ?? 'dashboard'));
  const backToList = () => setRequestedTab(allowedTabs[0] ?? 'dashboard');

  let content: React.ReactNode;
  if (!activeTab) {
    content = (
      <div className="medical-card p-10 rounded-2xl text-center text-sm text-slate-300">
        Seu perfil não tem acesso a nenhuma tela do painel. Procure o administrador do sistema.
      </div>
    );
  } else if (activeTab === 'dashboard') {
    content = <Dashboard onSelectEvent={handleSelectEvent} onViewEvidence={handleViewEvidence} />;
  } else if (activeTab === 'zones') {
    content = <Zones />;
  } else if (activeTab === 'event-detail' && selectedEventId) {
    content = (
      <EventDetail
        eventId={selectedEventId}
        onBack={backToList}
        onViewEvidence={handleViewEvidence}
        onOpenDossier={setPdfDossierId}
      />
    );
  } else if (activeTab === 'evidence' && selectedEvidenceId) {
    content = <EvidenceViewer evidenceId={selectedEvidenceId} eventId={selectedEventId ?? undefined} onBack={backToEvent} />;
  } else if (activeTab === 'dossiers') {
    content = <Dossiers onOpenDossier={setPdfDossierId} />;
  } else if (activeTab === 'audit') {
    content = <AuditLogs />;
  } else {
    content = <Dashboard onSelectEvent={handleSelectEvent} onViewEvidence={handleViewEvidence} />;
  }

  return (
    <>
      <Navbar
        activeTab={activeTab ?? ''}
        setActiveTab={setRequestedTab}
        hasPulse={hasPulse}
        pendingAlertsCount={metrics?.pending_events ?? 0}
      />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">{content}</main>
      <PdfModal dossierId={pdfDossierId} onClose={() => setPdfDossierId(null)} />
    </>
  );
};

export const App: React.FC = () => {
  const { status } = useAuth();

  useEffect(() => {
    void authStore.bootstrap();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#050914] text-slate-100 font-sans selection:bg-cyan-500 selection:text-black">
      {status === 'loading' ? (
        <main className="flex-1 flex items-center justify-center text-sm text-slate-300" role="status">
          Carregando…
        </main>
      ) : status === 'anonymous' ? (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Login />
        </main>
      ) : (
        <AlertsProvider>
          <Shell />
        </AlertsProvider>
      )}

      <footer className="border-t border-white/10 bg-[#050c1e] py-4 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:text-left">
          <span className="text-white font-bold">BioShield AI</span> • Painel do gestor
        </div>
      </footer>
    </div>
  );
};

export default App;
