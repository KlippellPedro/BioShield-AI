import { useState, useEffect, useCallback } from 'react';
import { eventsStore } from '../store/eventsStore';
import { Event, ComplianceMetrics } from '../types';

export function useRealtimeAlerts() {
  const [events, setEvents] = useState<Event[]>(eventsStore.getEvents());
  const [metrics, setMetrics] = useState<ComplianceMetrics>(eventsStore.getMetrics());
  const [isSimulationActive, setIsSimulationActive] = useState<boolean>(eventsStore.isSimulationActive());
  const [hasPulse, setHasPulse] = useState<boolean>(eventsStore.hasNewAlertPulse());
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);

  // High-tech neon telemetry chime using Web Audio API
  const playAlertChime = useCallback(() => {
    if (!audioEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
      
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      // Audio autoplay might be suspended by browser until interaction
    }
  }, [audioEnabled]);

  useEffect(() => {
    const unsubscribe = eventsStore.subscribe(() => {
      setEvents([...eventsStore.getEvents()]);
      setMetrics({ ...eventsStore.getMetrics() });
      setIsSimulationActive(eventsStore.isSimulationActive());
      
      if (eventsStore.hasNewAlertPulse()) {
        setHasPulse(true);
        playAlertChime();
        setTimeout(() => {
          eventsStore.clearPulse();
          setHasPulse(false);
        }, 3000);
      }
    });

    return unsubscribe;
  }, [playAlertChime]);

  return {
    events,
    metrics,
    isSimulationActive,
    hasPulse,
    audioEnabled,
    setAudioEnabled,
    toggleSimulation: eventsStore.toggleSimulation,
    triggerManualAlert: eventsStore.triggerSimulatedAlert,
    acknowledgeEvent: eventsStore.acknowledgeEvent,
    discardEvent: eventsStore.discardEvent,
    identifyEventHuman: eventsStore.identifyEventHuman,
    contestIdentification: eventsStore.contestIdentification,
    revokeIdentification: eventsStore.revokeIdentification,
  };
}
