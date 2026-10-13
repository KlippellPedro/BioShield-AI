import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { Zones } from './pages/Zones';
import { EventDetail } from './pages/EventDetail';
import { EvidenceViewer } from './pages/EvidenceViewer';
import { Dossiers } from './pages/Dossiers';
import { AuditLogs } from './pages/AuditLogs';
import { Login } from './pages/Login';
import { DossierModal } from './components/DossierModal';
import { useRealtimeAlerts } from './hooks/useRealtimeAlerts';
import { authStore } from './store/authStore';
import { eventsStore } from './store/eventsStore';
import { IncidentDossier } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);
  const [selectedDossier, setSelectedDossier] = useState<IncidentDossier | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(authStore.isAuthenticated());

  const {
    isSimulationActive,
    toggleSimulation,
    triggerManualAlert,
    audioEnabled,
    setAudioEnabled,
    hasPulse,
    metrics,
  } = useRealtimeAlerts();

  useEffect(() => {
    return authStore.subscribe((user) => {
      setIsAuthenticated(user !== null);
      if (!user) {
        setActiveTab('login');
      }
    });
  }, []);

  // Navigation handlers
  const handleSelectEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    setActiveTab('event-detail');
  };

  const handleViewEvidence = (evidenceId: string, eventId?: string) => {
    setSelectedEvidenceId(evidenceId);
    setSelectedEventId(eventId || null);
    setActiveTab('evidence');
  };

  const handleOpenDossier = (eventId: string) => {
    const dossiers = eventsStore.getDossiers();
    const found = dossiers.find((d) => d.event_id === eventId);
    if (found) {
      setSelectedDossier(found);
    } else {
      setActiveTab('dossiers');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#050914] text-slate-100 font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Navigation - Clean & Hospital Centric */}
      {isAuthenticated && activeTab !== 'login' && (
        <Navbar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            if (tab === 'evidence' && !selectedEvidenceId) {
              const evs = eventsStore.getEvidences();
              if (evs.length > 0) setSelectedEvidenceId(evs[0].evidence_id);
            }
          }}
          hasPulse={hasPulse}
          pendingAlertsCount={metrics.active_alerts_count}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!isAuthenticated || activeTab === 'login' ? (
          <Login onLoginSuccess={() => setActiveTab('dashboard')} />
        ) : activeTab === 'dashboard' ? (
          <Dashboard
            onSelectEvent={handleSelectEvent}
            onViewEvidence={handleViewEvidence}
          />
        ) : activeTab === 'zones' ? (
          <Zones />
        ) : activeTab === 'event-detail' && selectedEventId ? (
          <EventDetail
            eventId={selectedEventId}
            onBack={() => setActiveTab('dashboard')}
            onViewEvidence={handleViewEvidence}
            onOpenDossier={handleOpenDossier}
          />
        ) : activeTab === 'evidence' ? (
          <EvidenceViewer
            evidenceId={selectedEvidenceId || 'c0000000-0000-0000-0000-000000000001'}
            eventId={selectedEventId || undefined}
            onBack={() => setActiveTab('dashboard')}
          />
        ) : activeTab === 'dossiers' ? (
          <Dossiers />
        ) : activeTab === 'audit' ? (
          <AuditLogs />
        ) : (
          <Dashboard
            onSelectEvent={handleSelectEvent}
            onViewEvidence={handleViewEvidence}
          />
        )}
      </main>

      {/* Global Dossier Modal */}
      <DossierModal
        dossier={selectedDossier}
        onClose={() => setSelectedDossier(null)}
      />

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#050c1e] py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-sm">BioShield AI</span>
            <span>•</span>
            <span className="text-slate-300">Campanha Senac & Sesc Saúde</span>
            <span>•</span>
            <span className="text-cyan-400 font-medium">Senac-RS</span>
          </div>

          <div className="text-xs text-slate-300">
            Frente de Interface: <strong className="text-white">Carlos Eduardo Cavalcante da Rocha</strong> • Versão 1.4
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
