import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  createVoiceEngine,
  loadVoiceSettings,
  saveVoiceSettings,
  type VoiceEngine,
  type VoiceSettings,
} from "../services/speech";

interface VoiceContextValue {
  settings: VoiceSettings;
  updateSettings: (patch: Partial<VoiceSettings>) => void;
  engine: VoiceEngine;
  /** True if the browser exposes the Web Speech API. */
  supported: boolean;
}

const VoiceContext = createContext<VoiceContextValue | null>(null);

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<VoiceSettings>(loadVoiceSettings);
  const engineRef = useRef<VoiceEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = createVoiceEngine(settings);
  }

  useEffect(() => {
    saveVoiceSettings(settings);
    engineRef.current?.applySettings(settings);
  }, [settings]);

  const updateSettings = useCallback((patch: Partial<VoiceSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const value = useMemo<VoiceContextValue>(
    () => ({
      settings,
      updateSettings,
      engine: engineRef.current as VoiceEngine,
      supported:
        (typeof window !== "undefined" &&
          (("SpeechRecognition" in window) || ("webkitSpeechRecognition" in window))) ||
        "speechSynthesis" in window,
    }),
    [settings, updateSettings],
  );

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

export function useVoice(): VoiceContextValue {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error("useVoice must be used inside VoiceProvider");
  return ctx;
}
