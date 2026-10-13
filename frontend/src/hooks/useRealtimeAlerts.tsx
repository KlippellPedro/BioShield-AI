import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { api } from '../api/endpoints';
import { useAuth } from '../store/authStore';
import { Event, Metrics, Zone } from '../types';

// Alertas em tempo real: carga inicial pela API e atualizações pelo canal Socket.IO (/alerts).
// Meta: até 3 s entre a detecção e o aviso no painel (RNF-05).

interface AlertsContextValue {
  events: Event[];
  zones: Zone[];
  metrics: Metrics | null;
  loading: boolean;
  error: string | null;
  connected: boolean;
  hasPulse: boolean;
  audioEnabled: boolean;
  setAudioEnabled: (on: boolean) => void;
  applyEvent: (event: Event) => void;
  refresh: () => void;
}

const AlertsContext = createContext<AlertsContextValue | null>(null);

const PAGE_SIZE = 100;

export const AlertsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { can } = useAuth();
  const canEvents = can('events:read');
  const canMetrics = can('metrics:read');
  const canZones = can('zones:read');

  const [events, setEvents] = useState<Event[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [hasPulse, setHasPulse] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const audioEnabledRef = useRef(audioEnabled);
  audioEnabledRef.current = audioEnabled;
  const audioCtx = useRef<AudioContext | null>(null);
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chime = useCallback(() => {
    if (!audioEnabledRef.current) return;
    try {
      const Ctx =
        window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      audioCtx.current ??= new Ctx();
      const ctx = audioCtx.current;
      void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      // o navegador pode bloquear o áudio até haver interação do usuário
    }
  }, []);

  const applyEvent = useCallback((event: Event) => {
    setEvents((prev) => {
      const i = prev.findIndex((e) => e.event_id === event.event_id);
      if (i === -1) return [event, ...prev];
      const next = [...prev];
      next[i] = event;
      return next;
    });
  }, []);

  const refreshMetrics = useCallback(() => {
    if (!canMetrics) return;
    api
      .metrics()
      .then(setMetrics)
      .catch(() => undefined);
  }, [canMetrics]);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    const tasks: Promise<unknown>[] = [];
    if (canEvents) tasks.push(api.events.list({ limit: PAGE_SIZE }).then((p) => setEvents(p.items)));
    if (canZones) tasks.push(api.zones.list().then(setZones));
    if (canMetrics) tasks.push(api.metrics().then(setMetrics));
    Promise.all(tasks)
      .catch((e) => setError(e instanceof Error ? e.message : 'Falha ao carregar os alertas.'))
      .finally(() => setLoading(false));
  }, [canEvents, canZones, canMetrics]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!canEvents) return;
    const socket: Socket = io('/alerts', { path: '/socket.io', withCredentials: true });
    socket.on('connect', () => {
      setConnected(true);
      // Reconexão: recupera o que pode ter sido perdido enquanto estava fora.
      api.events
        .list({ limit: PAGE_SIZE })
        .then((p) => setEvents(p.items))
        .catch(() => undefined);
      refreshMetrics();
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('event.created', (event: Event) => {
      applyEvent(event);
      refreshMetrics();
      chime();
      setHasPulse(true);
      if (pulseTimer.current) clearTimeout(pulseTimer.current);
      pulseTimer.current = setTimeout(() => setHasPulse(false), 3000);
    });
    socket.on('event.updated', (event: Event) => {
      applyEvent(event);
      refreshMetrics();
    });
    return () => {
      socket.disconnect();
      if (pulseTimer.current) clearTimeout(pulseTimer.current);
    };
  }, [canEvents, applyEvent, refreshMetrics, chime]);

  const value = useMemo<AlertsContextValue>(
    () => ({
      events,
      zones,
      metrics,
      loading,
      error,
      connected,
      hasPulse,
      audioEnabled,
      setAudioEnabled,
      applyEvent,
      refresh,
    }),
    [events, zones, metrics, loading, error, connected, hasPulse, audioEnabled, applyEvent, refresh],
  );

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
};

export function useAlerts(): AlertsContextValue {
  const ctx = useContext(AlertsContext);
  if (!ctx) throw new Error('useAlerts precisa estar dentro de <AlertsProvider>.');
  return ctx;
}
