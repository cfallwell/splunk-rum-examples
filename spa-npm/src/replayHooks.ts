// src/replayHooks.ts
import { enableReplayForSession, getRumConfig, RumConfig, SessionReplayConfig } from "./rumBootstrap";

export const useEnableReplayPersist = (replayConfigOverride?: SessionReplayConfig): (() => void) => {
  return () => {
    void enableReplayForSession(replayConfigOverride);
  };
};

export const getGlobalRumConfig = (): RumConfig | null => getRumConfig();
