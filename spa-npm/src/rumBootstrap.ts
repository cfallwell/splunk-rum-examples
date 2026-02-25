// src/rumBootstrap.ts
export interface RumConfig {
  realm: string;
  rumAccessToken: string;
  applicationName: string;
  environment: string; // mapped to deploymentEnvironment in browser SDK
  debug?: boolean;
  ignoreUrls?: (string | RegExp)[];
}

/**
 * Session Replay configuration supported by SplunkSessionRecorder.init().
 * Keep this type permissive; Splunk may add fields.
 */
export type SessionReplayConfig = Record<string, unknown>;

declare global {
  interface Window {
    SplunkRum?: any;
    SplunkSessionRecorder?: any;
    SplunkRumConfig?: RumConfig;
    SplunkSessionReplayConfig?: SessionReplayConfig;
  }
}

// ----------------------------------------------------
// CONSTANTS (defaults only; apps should override via configOverride)
// ----------------------------------------------------
export const DEFAULT_RUM_CONFIG: RumConfig = {
  realm: "your_realm",
  rumAccessToken: "your_access_token",
  applicationName: "shopping-spa-demo",
  environment: "development",
  debug: true,
  ignoreUrls: ["http://sampleurl.org"],
};

// Splunk docs CDN URLs
const RUM_VERSION = "1.1.0";

export const RUM_SCRIPT_URL =
  `https://cdn.signalfx.com/o11y-gdi-rum/v${RUM_VERSION}/splunk-otel-web.js`;

export const SESSION_REPLAY_SCRIPT_URL =
  `https://cdn.signalfx.com/o11y-gdi-rum/v${RUM_VERSION}/splunk-otel-web-session-recorder.js`;

// Session-scoped enablement
const SESSION_STATE_KEY = "splunk-session-replay-enabled";
const REPLAY_ENABLE_VALUES = new Set(["on", "true"]);

// ----------------------------------------------------
// HELPERS
// ----------------------------------------------------
const loadScript = (src: string): Promise<void> =>
  new Promise((resolve, reject) => {
    // IMPORTANT: only call this when you truly want to load the script.
    const el = document.createElement("script");
    el.async = true;
    el.defer = true;
    el.src = src;
    el.crossOrigin = "anonymous";
    el.onload = () => resolve();
    el.onerror = (err) => reject(err);
    document.head.appendChild(el);
  });

const urlRequestsReplayEnable = (): boolean => {
  try {
    const params = getUrlParams();
    const val = params.get("Replay") ?? params.get("replay");
    return val ? REPLAY_ENABLE_VALUES.has(val.toLowerCase()) : false;
  } catch {
    return false;
  }
};

const getUrlParams = (): URLSearchParams => {
  const raw = window.location.search || "";
  const normalized = raw.startsWith("?") ? raw.slice(1).replace(/,/g, "&") : raw.replace(/,/g, "&");
  return new URLSearchParams(normalized);
};

const isPlaceholderValue = (value: string): boolean => {
  const v = value.trim().toLowerCase();
  return v.startsWith("your_") || v.startsWith("your-");
};

const hasValidReplayCredentials = (config: RumConfig): boolean => {
  const realm = config.realm?.trim();
  const token = config.rumAccessToken?.trim();
  if (!realm || !token) return false;
  if (isPlaceholderValue(realm) || isPlaceholderValue(token)) return false;
  return true;
};

const isEnabledParam = (value: string | null): boolean => {
  if (value == null) return false;
  const v = value.toLowerCase();
  return v === "true" || v === "on";
};

const applyGodmodeParamFromUrl = (config: SessionReplayConfig): void => {
  try {
    const params = getUrlParams();
    const godmode = isEnabledParam(params.get("godmode"));
    if (!godmode) return;

    const cfg = config as Record<string, unknown>;
    const currentFeatures = cfg.features;
    const features =
      typeof currentFeatures === "object" && currentFeatures !== null
        ? { ...(currentFeatures as Record<string, unknown>) }
        : {};

    cfg.maskAllInputs = false;
    cfg.maskAllText = false;
    features.canvas = true;
    features.video = true;
    features.iframes = true;
    features.cacheAssets = true;
    features.packAssets = { styles: true, fonts: true, images: true };
    cfg.features = features;
  } catch {
    // Ignore malformed URL params; fall back to provided config.
  }
};

export const isReplayEnabledInSession = (): boolean =>
  typeof sessionStorage !== "undefined" &&
  sessionStorage.getItem(SESSION_STATE_KEY) === "on";

export const setReplayEnabledForSession = (): void => {
  sessionStorage.setItem(SESSION_STATE_KEY, "on");
};

// ----------------------------------------------------
// RUM INITIALIZATION
// ----------------------------------------------------
let rumInitialized = false;
let activeRumConfig: RumConfig = DEFAULT_RUM_CONFIG;

export const initRUM = async (overrideConfig?: Partial<RumConfig>): Promise<void> => {
  const config: RumConfig = { ...DEFAULT_RUM_CONFIG, ...overrideConfig };
  activeRumConfig = config;
  window.SplunkRumConfig = config;

  if (rumInitialized) return;
  rumInitialized = true;

  await loadScript(RUM_SCRIPT_URL);

  if (!window.SplunkRum?.init) {
    console.warn("[Splunk RUM] init() not found. Check script URL.");
    return;
  }

  window.SplunkRum.init({
    realm: config.realm,
    rumAccessToken: config.rumAccessToken,
    applicationName: config.applicationName,
    deploymentEnvironment: config.environment,
    debug: config.debug,
    ignoreUrls: config.ignoreUrls,
  });
};

// ----------------------------------------------------
// SESSION REPLAY (explicit init)
// ----------------------------------------------------
let replayScriptLoaded = false;
let replayInitialized = false;

const loadReplayScript = async (): Promise<void> => {
  if (replayScriptLoaded) return;
  await loadScript(SESSION_REPLAY_SCRIPT_URL);
  replayScriptLoaded = true;
};

/**
 * Initialize the Session Recorder package.
 * For the Splunk CDN script, the global should be window.SplunkSessionRecorder.
 */
export const initSessionReplay = async (
  replayConfigOverride?: SessionReplayConfig
): Promise<void> => {
  if (replayInitialized) return;

  // Ensure RUM is initialized first so tokens/realm are available.
  const rumConfig = window.SplunkRumConfig ?? activeRumConfig ?? DEFAULT_RUM_CONFIG;
  if (!hasValidReplayCredentials(rumConfig)) {
    console.warn("[Session Replay] Skipping init because realm/token are not configured.");
    return;
  }

  await loadReplayScript();

  const recorder = window.SplunkSessionRecorder;
  if (!recorder?.init) {
    console.warn("[Session Replay] SplunkSessionRecorder.init() not found. Check script URL/version.");
    return;
  }

  const replayConfig: SessionReplayConfig = {
    // Required identifiers:
    realm: rumConfig.realm,
    rumAccessToken: rumConfig.rumAccessToken,

    // Recommended in docs for the new recorder:
    recorder: "splunk",

    // Allow caller overrides (masking, sampling, privacy, etc.):
    ...(replayConfigOverride ?? {}),
  };

  applyGodmodeParamFromUrl(replayConfig);

  recorder.init(replayConfig);
  window.SplunkSessionReplayConfig = replayConfig;
  replayInitialized = true;

  if (rumConfig.debug) {
    // eslint-disable-next-line no-console
    console.debug("[Session Replay] initialized", replayConfig);
  }
};

// ----------------------------------------------------
// MAIN ENTRY: RUM always, Replay only when enabled (URL or sessionStorage)
// ----------------------------------------------------
export const initRumBootstrap = async (
  overrideConfig?: Partial<RumConfig>,
  replayConfigOverride?: SessionReplayConfig
): Promise<void> => {
  await initRUM(overrideConfig);

  const urlEnabled = urlRequestsReplayEnable();
  if (urlEnabled) {
    setReplayEnabledForSession();
    await initSessionReplay(replayConfigOverride);
    return;
  }

  const sessionEnabled = isReplayEnabledInSession();
  if (sessionEnabled) {
    await initSessionReplay(replayConfigOverride);
  }
};

// ----------------------------------------------------
// SPA HELPERS (call from UI / route action)
// ----------------------------------------------------
export const enableReplayForSession = async (
  replayConfigOverride?: SessionReplayConfig
): Promise<void> => {
  setReplayEnabledForSession();
  await initSessionReplay(replayConfigOverride);
};

export const getRumConfig = (): RumConfig | null => window.SplunkRumConfig ?? null;
