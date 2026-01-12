// src/RumContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  initRumBootstrap,
  isReplayEnabledInSession,
  getRumConfig,
  RumConfig,
  SessionReplayConfig,
} from "./rumBootstrap";

export interface SplunkRumState {
  isReady: boolean;
  isReplayEnabled: boolean;
  config: RumConfig | null;
  error?: Error;
}

const SplunkRumContext = createContext<SplunkRumState | undefined>(undefined);

export interface SplunkRumProviderProps {
  children: ReactNode;
  configOverride?: Partial<RumConfig>;
  replayConfigOverride?: SessionReplayConfig;
}

export const SplunkRumProvider: React.FC<SplunkRumProviderProps> = ({
  children,
  configOverride,
  replayConfigOverride,
}) => {
  const [state, setState] = useState<SplunkRumState>({
    isReady: false,
    isReplayEnabled: false,
    config: null,
  });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        await initRumBootstrap(configOverride, replayConfigOverride);
        if (cancelled) return;

        setState({
          isReady: true,
          isReplayEnabled: isReplayEnabledInSession(),
          config: getRumConfig(),
        });
      } catch (err) {
        if (cancelled) return;
        setState((prev) => ({ ...prev, isReady: false, error: err as Error }));
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [configOverride, replayConfigOverride]);

  return <SplunkRumContext.Provider value={state}>{children}</SplunkRumContext.Provider>;
};

export const useSplunkRum = (): SplunkRumState => {
  const ctx = useContext(SplunkRumContext);
  if (!ctx) throw new Error("useSplunkRum must be used within a SplunkRumProvider");
  return ctx;
};
