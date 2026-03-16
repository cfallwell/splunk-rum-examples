(() => {
  const LOCAL_RUM_BOOTSTRAP_VERSION = "__LOCAL_RUM_BOOTSTRAP_VERSION__";
  const SIGNALFX_RELEASE = "__SIGNALFX_RELEASE__";
  const SIGNALFX_SOURCE = "__SIGNALFX_SOURCE__";
  const SIGNALFX_FETCHED_AT = "__SIGNALFX_FETCHED_AT__";
  const SIGNALFX_RUM_SCRIPT_BASE64 = "__SIGNALFX_RUM_SCRIPT_BASE64__";
  const SIGNALFX_SESSION_REPLAY_SCRIPT_BASE64 = "__SIGNALFX_SESSION_REPLAY_SCRIPT_BASE64__";

  const RUM_INIT_OPTIONS = {
    realm: "your-realm",
    rumAccessToken: "your-splunk-rum-token",
    applicationName: "your-app-name",
    deploymentEnvironment: "production",
    version: "your-app-version"
  };

  const SESSION_RECORDER_OPTIONS = {
    realm: RUM_INIT_OPTIONS.realm,
    rumAccessToken: RUM_INIT_OPTIONS.rumAccessToken,
    recorder: "splunk",
    maskAllInputs: true,
    maskAllText: true,
    maxExportIntervalMs: 5000,
    sensitivityRules: [],
    features: {
      backgroundServiceSrc: undefined,
      canvas: false,
      video: false,
      iframes: false,
      packAssets: {
        fonts: false,
        images: false,
        styles: false
      },
      cacheAssets: false
    }
  };

  const SESSION_KEY = "splunk-session-replay-enabled";

  const decodeBase64 = (value) => window.atob(value);

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

  const loadEmbeddedScript = (id, sourceBase64, upstreamVersion) =>
    new Promise((resolve, reject) => {
      if (document.querySelector(`script[data-rum-embed="${id}"]`)) {
        resolve();
        return;
      }

      const s = document.createElement("script");
      s.async = false;
      s.defer = false;
      s.dataset.rumEmbed = id;
      s.dataset.rumBootstrapVersion = LOCAL_RUM_BOOTSTRAP_VERSION;
      s.dataset.rumSignalfxRelease = upstreamVersion;
      s.dataset.rumSignalfxSource = SIGNALFX_SOURCE;
      s.dataset.rumSignalfxFetchedAt = SIGNALFX_FETCHED_AT;
      s.text = decodeBase64(sourceBase64);
      s.onerror = (err) => {
        console.error("[Splunk Loader] Failed to load embedded script", id, err);
        reject(err);
      };
      document.head.appendChild(s);
      resolve();
    });

  let rumInitialized = false;

  const initRUM = async () => {
    if (rumInitialized) return;
    rumInitialized = true;

    await loadEmbeddedScript("splunk-rum", SIGNALFX_RUM_SCRIPT_BASE64, SIGNALFX_RELEASE);

    if (window.SplunkRum && typeof window.SplunkRum.init === "function") {
      window.SplunkRum.init(RUM_INIT_OPTIONS);
    } else {
      console.warn("[Splunk RUM] SplunkRum.init() not found.");
    }
  };

  let recorderScriptLoaded = false;
  let recorderEnabled = false;

  const loadSessionRecorderScript = async () => {
    if (recorderScriptLoaded) return;
    await loadEmbeddedScript(
      "splunk-session-replay",
      SIGNALFX_SESSION_REPLAY_SCRIPT_BASE64,
      SIGNALFX_RELEASE
    );
    recorderScriptLoaded = true;
  };

  const enableSessionRecorder = async () => {
    if (recorderEnabled) return;
    recorderEnabled = true;
    await loadSessionRecorderScript();

    if (window.SplunkSessionRecorder && typeof window.SplunkSessionRecorder.init === "function") {
      window.SplunkSessionRecorder.init(SESSION_RECORDER_OPTIONS);
    } else if (window.SplunkRum && typeof window.SplunkRum.enableSessionReplay === "function") {
      window.SplunkRum.enableSessionReplay();
    } else if (window.SessionReplay && typeof window.SessionReplay.init === "function") {
      window.SessionReplay.init();
    } else {
      console.warn("[Session Recorder] No known init API found.");
    }
  };

  (async () => {
    await initRUM();

    const sessionEnabled = sessionStorage.getItem(SESSION_KEY) === "on";
    const urlEnable = urlRequestsReplay();

    if (urlEnable) {
      sessionStorage.setItem(SESSION_KEY, "on");
      await enableSessionRecorder();
      return;
    }

    if (sessionEnabled) {
      await enableSessionRecorder();
    }
  })();

  window.enableReplayPersist = () => {
    sessionStorage.setItem(SESSION_KEY, "on");
    enableSessionRecorder();
  };

  window.enableReplayNow = () => {
    enableSessionRecorder();
  };
})();
