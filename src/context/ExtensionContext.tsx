import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import type { ExtensionState, FocusSessionState, BlockedAttempt } from '../types';
import { extensionBridge } from '../lib/extensionBridge';
import { uid } from '../lib/utils';

interface ExtensionCtx extends ExtensionState {
  startFocusSession: (durationMinutes: number, blockedSites: string[], strictMode: boolean) => Promise<boolean>;
  stopFocusSession: () => Promise<boolean>;
  addBlockedSite: (site: string) => void;
  removeBlockedSite: (site: string) => void;
  setBlockedSites: (sites: string[]) => void;
  setStrictMode: (enabled: boolean) => void;
  reconnect: () => void;
  clearBlockedAttempts: () => void;
}

const ExtensionContext = createContext<ExtensionCtx | undefined>(undefined);

const defaultState: ExtensionState = {
  connectionState: 'checking',
  blockedSites: ['youtube.com', 'instagram.com', 'reddit.com', 'twitter.com', 'facebook.com', 'tiktok.com', 'netflix.com'],
  focusSession: { active: false, startTime: null, durationMinutes: 25, remainingSeconds: 0, strictMode: false, blockedSites: [] },
  blockedAttempts: [],
  totalFocusMinutes: 0,
  strictMode: false,
  wasConnectedDuringSession: false,
};

const STORAGE_KEY = 'studyshield:extension:data';

function loadStoredState(): Partial<ExtensionState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveStoredState(state: ExtensionState): void {
  try {
    const toSave = { blockedSites: state.blockedSites, totalFocusMinutes: state.totalFocusMinutes, strictMode: state.strictMode };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch { /* ignore */ }
}

export function ExtensionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ExtensionState>(() => {
    const stored = loadStoredState();
    return { ...defaultState, ...stored, connectionState: 'checking', focusSession: defaultState.focusSession, blockedAttempts: [] };
  });
  const stateRef = useRef(state);
  stateRef.current = state;
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateState = useCallback((partial: Partial<ExtensionState>) => {
    setState((prev) => {
      const next = { ...prev, ...partial };
      saveStoredState(next);
      return next;
    });
  }, []);

  // Heartbeat + message listener
  useEffect(() => {
    const onConnected = () => {
      if (stateRef.current.connectionState !== 'connected') {
        updateState({ connectionState: 'connected', wasConnectedDuringSession: stateRef.current.focusSession.active });
      }
    };
    const onDisconnected = () => {
      if (stateRef.current.connectionState === 'connected') {
        updateState({ connectionState: 'disconnected' });
      }
    };

    extensionBridge.startHeartbeat(onConnected, onDisconnected);

    const unsub = extensionBridge.onMessage((message) => {
      switch (message.type) {
        case 'SS_BLOCKED_ATTEMPT': {
          const payload = message.payload as { url: string; domain: string; sessionId: string | null };
          const attempt: BlockedAttempt = { id: uid(), url: payload.url, domain: payload.domain, timestamp: new Date().toISOString(), sessionId: payload.sessionId };
          setState((prev) => {
            const next = { ...prev, blockedAttempts: [attempt, ...prev.blockedAttempts].slice(0, 500) };
            saveStoredState(next);
            return next;
          });
          break;
        }
        case 'SS_PONG':
          updateState({ connectionState: 'connected' });
          break;
        case 'SS_SESSION_ACTIVE': {
          const payload = message.payload as FocusSessionState;
          updateState({ focusSession: payload });
          break;
        }
        default:
          break;
      }
    });

    return () => { unsub(); extensionBridge.stopHeartbeat(); };
  }, [updateState]);

  // Session countdown timer
  useEffect(() => {
    if (state.focusSession.active && state.focusSession.remainingSeconds > 0) {
      sessionTimerRef.current = setInterval(() => {
        setState((prev) => {
          if (!prev.focusSession.active) return prev;
          const remaining = prev.focusSession.remainingSeconds - 1;
          if (remaining <= 0) {
            const newTotal = prev.totalFocusMinutes + prev.focusSession.durationMinutes;
            const next: ExtensionState = {
              ...prev,
              focusSession: { ...prev.focusSession, active: false, remainingSeconds: 0 },
              totalFocusMinutes: newTotal,
            };
            saveStoredState(next);
            extensionBridge.sendNoWait('SS_STOP_SESSION');
            return next;
          }
          return { ...prev, focusSession: { ...prev.focusSession, remainingSeconds: remaining } };
        });
      }, 1000);
      return () => { if (sessionTimerRef.current) clearInterval(sessionTimerRef.current); };
    }
  }, [state.focusSession.active, state.focusSession.remainingSeconds]);

  const startFocusSession = useCallback(async (durationMinutes: number, blockedSites: string[], strictMode: boolean) => {
    const session: FocusSessionState = {
      active: true,
      startTime: new Date().toISOString(),
      durationMinutes,
      remainingSeconds: durationMinutes * 60,
      strictMode,
      blockedSites,
    };
    updateState({ focusSession: session, strictMode, wasConnectedDuringSession: stateRef.current.connectionState === 'connected' });
    try {
      await extensionBridge.send('SS_START_SESSION', { durationMinutes, blockedSites, strictMode });
    } catch { /* extension may not be installed — session still runs on website */ }
    return true;
  }, [updateState]);

  const stopFocusSession = useCallback(async () => {
    const completedMinutes = stateRef.current.focusSession.active
      ? stateRef.current.focusSession.durationMinutes - Math.ceil(stateRef.current.focusSession.remainingSeconds / 60)
      : 0;
    updateState({
      focusSession: { ...stateRef.current.focusSession, active: false, remainingSeconds: 0 },
      totalFocusMinutes: stateRef.current.totalFocusMinutes + completedMinutes,
    });
    try { await extensionBridge.send('SS_STOP_SESSION'); } catch { /* ignore */ }
    return true;
  }, [updateState]);

  const addBlockedSite = useCallback((site: string) => {
    const normalized = site.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!normalized) return;
    setState((prev) => {
      if (prev.blockedSites.includes(normalized)) return prev;
      const next = { ...prev, blockedSites: [...prev.blockedSites, normalized] };
      saveStoredState(next);
      extensionBridge.sendNoWait('SS_UPDATE_BLOCKED_SITES', { blockedSites: next.blockedSites });
      return next;
    });
  }, []);

  const removeBlockedSite = useCallback((site: string) => {
    setState((prev) => {
      const next = { ...prev, blockedSites: prev.blockedSites.filter((s) => s !== site) };
      saveStoredState(next);
      extensionBridge.sendNoWait('SS_UPDATE_BLOCKED_SITES', { blockedSites: next.blockedSites });
      return next;
    });
  }, []);

  const setBlockedSites = useCallback((sites: string[]) => {
    const normalized = sites.map((s) => s.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, ''));
    updateState({ blockedSites: normalized });
    extensionBridge.sendNoWait('SS_UPDATE_BLOCKED_SITES', { blockedSites: normalized });
  }, [updateState]);

  const setStrictMode = useCallback((enabled: boolean) => {
    updateState({ strictMode: enabled });
    extensionBridge.sendNoWait('SS_STRICT_MODE', { strictMode: enabled });
  }, [updateState]);

  const reconnect = useCallback(() => {
    updateState({ connectionState: 'checking' });
    extensionBridge.sendNoWait('SS_RECONNECT');
    extensionBridge.send('SS_PING').then(() => updateState({ connectionState: 'connected' })).catch(() => updateState({ connectionState: 'disconnected' }));
  }, [updateState]);

  const clearBlockedAttempts = useCallback(() => {
    updateState({ blockedAttempts: [] });
  }, [updateState]);

  return (
    <ExtensionContext.Provider value={{
      ...state,
      startFocusSession,
      stopFocusSession,
      addBlockedSite,
      removeBlockedSite,
      setBlockedSites,
      setStrictMode,
      reconnect,
      clearBlockedAttempts,
    }}>
      {children}
    </ExtensionContext.Provider>
  );
}

export function useExtension() {
  const ctx = useContext(ExtensionContext);
  if (!ctx) throw new Error('useExtension must be used within ExtensionProvider');
  return ctx;
}
