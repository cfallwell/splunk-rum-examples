(() => {
  // ----------------------------------
  // VERSION / CDN CONFIG
  // ----------------------------------
  const SPLUNK_RUM_VERSION = "v1.1.0"; // adjust if you upgrade later

  const RUM_SCRIPT_URL =
    `https://cdn.signalfx.com/o11y-gdi-rum/${SPLUNK_RUM_VERSION}/splunk-otel-web.js`;

  const SESSION_RECORDER_SCRIPT_URL =
    `https://cdn.signalfx.com/o11y-gdi-rum/${SPLUNK_RUM_VERSION}/splunk-otel-web-session-recorder.js`;

  // ----------------------------------
  // RUM INIT CONFIG (v1.x API)
  // ----------------------------------
  // Replace these with your real values
  const RUM_INIT_OPTIONS = {
    // Required
    realm: "your-realm",
    rumAccessToken: "your-splunk-rum-token",
    applicationName: "your-app-name",
    deploymentEnvironment: "production",

    // Optional but common
    version: "your-app-version" // e.g. "1.0.0"
  };

  // ----------------------------------
  // SESSION RECORDER CONFIG
  // ----------------------------------
  // All optional parameters from Splunk docs exposed here.
  // You can change these defaults without touching the core logic.
  const SESSION_RECORDER_OPTIONS = {
    // Required recorder fields
    realm: RUM_INIT_OPTIONS.realm,
    rumAccessToken: RUM_INIT_OPTIONS.rumAccessToken,
    recorder: "splunk", // which-session-recorder-to-use

    // ---- Sensitivity / masking ----
    // Show or hide values of input elements.
    // true => mask all inputs (default)
    maskAllInputs: true,

    // Show or hide text in the replay.
    // true => mask all text (default)
    maskAllText: true,

    // Time in ms after which you will always get a segment if there is data.
    // Default: 5000
    maxExportIntervalMs: 5000,

    // Fine-grained control over what is recorded.
    // Example:
    // sensitivityRules: [
    //   { rule: "unmask", selector: "p" },
    //   { rule: "exclude", selector: "img" },
    //   { rule: "mask", selector: ".user-class" }
    // ]
    sensitivityRules: [],

    // ---- Features object ----
    features: {
      // Link to published background-service.html
      // Helps avoid blocking main thread during processing.
      // e.g. "https://example.xyz/background-service.html"
      backgroundServiceSrc: undefined,

      // Optional: record canvas elements
      canvas: false,

      // Optional: record video elements
      video: false,

      // Optional: record same-origin iframes
      iframes: false,

      // Pack assets (images, CSS, fonts) into recording.
      // Can be boolean or object. Default in docs: { styles: true }.
      // Example object:
      // packAssets: { fonts: true, images: true, styles: true }
      packAssets: {
        fonts: false,
        images: false,
        styles: false
      },

      // Cache assets in local storage to avoid re-processing.
      cacheAssets: false
    }
  };

  // ----------------------------------
  // SESSION KEY FOR “ONCE PER BROWSER SESSION”
  // ----------------------------------
  const SESSION_KEY = "splunk-session-replay-enabled"; // stores "on"

  // ----------------------------------
  // URL helper — only checks for ON
  // ----------------------------------
  const getUrlParams = () => {
    const raw = window.location.search || "";
    const normalized = raw.startsWith("?") ? raw.slice(1).replace(/,/g, "&") : raw.replace(/,/g, "&");
    return new URLSearchParams(normalized);
  };

  const urlRequestsReplay = () => {
    try {
      const params = getUrlParams();
      const raw = params.get("Replay") ?? params.get("replay");
      if (!raw) return false;

      const v = raw.toLowerCase();
      return v === "on" || v === "true";
    } catch {
      return false;
    }
  };

  // ----------------------------------
  // Generic script loader
  // ----------------------------------
  const loadScript = (src) =>
    new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.async = true;
      s.src = src;
      s.crossOrigin = "anonymous";
      s.onload = resolve;
      s.onerror = (err) => {
        console.error("[Splunk Loader] Failed to load", src, err);
        reject(err);
      };
      document.head.appendChild(s);
    });

  // ----------------------------------
  // RUM (always enabled)
  // ----------------------------------
  let rumInitialized = false;

  const initRUM = async () => {
    if (rumInitialized) return;
    rumInitialized = true;

    await loadScript(RUM_SCRIPT_URL);

    if (window.SplunkRum && typeof window.SplunkRum.init === "function") {
      window.SplunkRum.init(RUM_INIT_OPTIONS);
    } else {
      console.warn("[Splunk RUM] SplunkRum.init() not found. Check version/API.");
    }
  };

  // ----------------------------------
  // Session Recorder (enable-only)
  // ----------------------------------
  let recorderScriptLoaded = false;
  let recorderEnabled = false;

  const loadSessionRecorderScript = async () => {
    if (recorderScriptLoaded) return;
    await loadScript(SESSION_RECORDER_SCRIPT_URL);
    recorderScriptLoaded = true;
  };

  const enableSessionRecorder = async () => {
    if (recorderEnabled) return;
    recorderEnabled = true;
    await loadSessionRecorderScript();

    if (window.SplunkSessionRecorder && typeof window.SplunkSessionRecorder.init === "function") {
      window.SplunkSessionRecorder.init(SESSION_RECORDER_OPTIONS);
    } else if (window.SplunkRum && typeof window.SplunkRum.enableSessionReplay === "function") {
      // Fallback for older/alt APIs
      window.SplunkRum.enableSessionReplay();
    } else if (window.SessionReplay && typeof window.SessionReplay.init === "function") {
      window.SessionReplay.init();
    } else {
      console.warn("[Session Recorder] No known init API found.");
    }
  };

  // ----------------------------------
  // Main logic — enable-only model
  // ----------------------------------
  (async () => {
    await initRUM();

    const sessionEnabled = sessionStorage.getItem(SESSION_KEY) === "on";
    const urlEnable = urlRequestsReplay();

    // URL flag wins, and persists for this browser session
    if (urlEnable) {
      sessionStorage.setItem(SESSION_KEY, "on");
      await enableSessionRecorder();
      return;
    }

    // Otherwise, rely on session state
    if (sessionEnabled) {
      await enableSessionRecorder();
    }
    // If neither, recorder stays off.
  })();

  // ----------------------------------
  // OPTIONAL SPA HOOKS (if you want to use them)
  // ----------------------------------
  // Call window.enableReplayPersist() from your SPA when you want
  // to flip replay ON for the rest of this tab’s session.
  window.enableReplayPersist = () => {
    sessionStorage.setItem(SESSION_KEY, "on");
    // You can reload to force bootstrap to re-run, if desired:
    // window.location.reload();
    // Or just enable immediately:
    enableSessionRecorder();
  };

  // For immediate runtime-only enabling (no sessionStorage change):
  window.enableReplayNow = () => {
    enableSessionRecorder();
  };
})();
