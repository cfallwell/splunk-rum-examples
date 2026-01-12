# SplunkRum-Examples

Collection of Splunk RUM session-recording examples for both multi-page apps (MPA) and single-page apps (SPA). The code lives in the referenced folders below; this README focuses on what each script does and how to deploy it.

## What is included

- `MPA Script/rumbootstrap.js` provides a lightweight bootstrapper you can drop into classic multi-page sites to control when session recording starts.
- `SPA rumBootstrap NPM/` contains a reusable TypeScript package that wires session recording into a SPA with routing-aware tracking.
- `spa-demo/` is a Vite-based demo app showing how to use the SPA package in a real React flow.

## Deployment methodology

1. Decide on the integration path based on your app type:
   - MPA: copy `MPA Script/rumbootstrap.js` into your static asset pipeline and include it on every page.
   - SPA: install/build the package from `SPA rumBootstrap NPM/` and import it in your application bootstrap.
2. Configure your Splunk RUM settings (beacon endpoint, realm, application name) within the script/package entry points.
3. Deploy the scripts with your normal release pipeline so the bootstrapper is versioned and cacheable like any other frontend asset.

## Recommendations

- Keep the bootstrapper loaded early in the page so it can capture the full user session once recording is enabled.
- Use feature flags or runtime configuration to control when recording is started for targeted sessions.
- In SPAs, hook routing events so navigation changes are correctly reflected in session recordings.
- Validate in a staging environment first to confirm data ingestion and session playback quality.
1. Overview

This document describes a bootstrap script, rumBootstrap.js, that standardizes the way we deploy:

Splunk Real User Monitoring (RUM) for browser applications

Splunk Session Recorder / Replay (Session Recorder)

1.1. The goals

Provide a single shared JS entry point for RUM + Session Recorder.

Allow enabling Session Recorder on demand per session:

?Replay=on or ?Replay=true → enable recorder and persist for the current browser session.

No param → recorder remains off unless previously enabled in this session.

Expose all important Session Recorder parameters as top-level config in the script, so teams can adjust masking, rules, and features without changing logic.

Ensure the application teams do not have to be involved in deployment

Work for both:

Single Page Apps (SPAs)

Multi-Page Apps (MPAs)

ReactJS excluded (does require application teams)

It is included from HTML (e.g. index.html) and will:

Load and initialize Splunk RUM for every page.

Conditionally load and initialize Session Recorder when requested.

1.2. The script is responsible for:

1.2.1. RUM Initialization

Dynamically loads the Splunk RUM JS bundle.

Calls SplunkRum.init with application-specific options (realm, access token, app name, environment, etc.).

Session Recorder Initialization

1.2.2. Configuration Management

Exposes a configuration object containing:

Required recorder fields (realm, rumAccessToken, recorder).

Masking flags (maskAllInputs, maskAllText).

maxExportIntervalMs.

sensitivityRules.

features (background service, canvas, video, iframes, packAssets, cacheAssets).

Dynamically loads the Session Recorder script.

Calls SplunkSessionRecorder.init(SESSION_RECORDER_OPTIONS) when enabled.

1.2.3. Replay Enablement

Uses the URL parameter Replay/replay:

on / true → enable Session Recorder for this session.

Uses sessionStorage key splunk-session-replay-enabled to:

Persist the “replay enabled” state within a single browser session (tab/window).

1.2.4. SPA Hooks (Optional)

Provides the following globals for SPA frameworks:

window.enableReplayPersist() – sets the session flag and enables recorder.

window.enableReplayNow() – enables recorder immediately at runtime.

2. Script Code

Save the following as lib/rumBootstrap.js (no <script> tags):



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
        styles: true
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
  const urlRequestsReplay = () => {
    try {
      const params = new URLSearchParams(window.location.search);
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

2.1.1. How you use the parameters

The recorder accepts these optional params:

maskAllInputs (boolean, default true)

maskAllText (boolean, default true)

maxExportIntervalMs (number, default 5000)

sensitivityRules (array of rule objects)

features (object) with keys like backgroundServiceSrc, canvas, video, iframes, packAssets, cacheAssets

Turn on full-text & input capture:

maskAllInputs: false,
maskAllText: false,

Add fine-grained masking/exclusion:

sensitivityRules: [
  { rule: "unmask", selector: "p" },
  { rule: "exclude", selector: "img" },
  { rule: "mask", selector: ".user-class" }
],

Enable advanced features:

features: {
  backgroundServiceSrc: "https://example.xyz/background-service.html",
  canvas: true,
  video: true,
  iframes: true,
  packAssets: { fonts: true, images: true, styles: true },
  cacheAssets: true
}



2.1. How This Works for SPAs & MPAs Without Engineering

2.1.1. SPAs (Single Page Apps)

For SPAs, the existing rumBootstrap.js behavior is enough even if you never touch the SPA repo:

On initial full page load:

Script is injected at the edge.

RUM is initialized.

If the user comes in with ?Replay=on:

Bootstrap sets sessionStorage['splunk-session-replay-enabled'] = 'on'.

Session Recorder is enabled for that browser session.

SPA route changes (React/Vue/Angular) don’t require any repo code changes:

As long as you can start a session with ?Replay=on, you get replay for that session.

This covers support flows like:
https://app.company.com/?Replay=on → user navigates around → sessions are recorded.

You could do fancy router-based toggling, but that does require repo access. For a “platform-only” solution, the URL-driven behavior is enough.  SPA extras like router hooks are “nice to have”; the base model (URL ?Replay=on → sessionStorage flag + bootstrap) works fine without any repo changes. See: SPA Examples

2.1.2. MPAs (Multi-Page Apps)

For MPAs, edge injection is even more straightforward:

Every HTML page served by that host includes:

<script src="https://cdn.internal.company.com/rum-bootstrap/0.1.0-beta/rumBootstrap.min.js"></script>


If the user starts with ?Replay=on:

sessionStorage flag is set for that tab.

Every subsequent page load in the same tab will:

Load bootstrap again.

See the sessionStorage flag.

Re-enable Session Recorder.

No app code involved. Just platform-side injection.

Caveats:

New tab/window is a new session (no sessionStorage).

That’s usually desired; if not, you can design org-specific patterns, but they’ll almost always be infra-side.



2.1.3. SPA Integration Examples

2.1.3.1. Including the bootstrap in an SPA index.html

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>My SPA</title>

    <!-- RUM + Session Recorder bootstrap -->
    <script src="/lib/rumBootstrap.js"></script>

    <!-- Main SPA bundle -->
    <script src="/dist/app.bundle.js" defer></script>
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>

2.1.3.2. React Router: auto-enable when ?Replay=on

// ReplayParamWatcher.tsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function ReplayParamWatcher() {
  const { search } = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const value = params.get("Replay") ?? params.get("replay");
    if (!value) return;

    const v = value.toLowerCase();
    if (v === "on" || v === "true") {
      // Persist for the rest of the session and enable now
      window.enableReplayPersist?.();
    }
  }, [search]);

  return null;
}

In your app root:

function App() {
  return (
    <>
      <ReplayParamWatcher />
      {/* your routes/components */}
    </>
  );
}


2.1.3.3. Vue Router: afterEach hook

// router.js
import { createRouter, createWebHistory } from "vue-router";

const routes = [/* ... */];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.afterEach((to) => {
  const replay = (to.query.Replay || to.query.replay || "").toString().toLowerCase();
  if (replay === "on" || replay === "true") {
    window.enableReplayPersist && window.enableReplayPersist();
  }
});

export default router;


2.1.3.4. Manual enable in SPA (e.g. from a debug menu)

// Somewhere in your SPA UI
button.addEventListener("click", () => {
  window.enableReplayPersist?.();
});


2.2. Host the Bootstrap as a Central, Versioned Asset

2.2.1. Repo & Versioning (Platform-owned)

Create a dedicated repo, e.g.:

platform-rum-bootstrap/
  rumBootstrap.js
  package.json (optional)
  CHANGELOG.md
  README.md


Maintain semantic versions; you’re starting with:

rumBootstrap.js version: 0.1.0-beta


Tag releases in Git:

git tag -a v0.1.0-beta -m "Initial shared Splunk RUM + Session Recorder bootstrap"
git push origin v0.1.0-beta


2.2.2. Build & Publish to Artifactory / CDN

CI pipeline (owned by platform team):

On tag vX.Y.Z:

Optionally run lint/tests.

Optionally minify → rumBootstrap.min.js.

Publish artifacts to Artifactory (or internal object store):

/rum-bootstrap/0.1.0-beta/rumBootstrap.js
/rum-bootstrap/0.1.0-beta/rumBootstrap.min.js
/rum-bootstrap/latest/rumBootstrap.js (optional pointer)


Expose them via CDN or edge URL, e.g.:

https://cdn.internal.company.com/rum-bootstrap/0.1.0-beta/rumBootstrap.min.js


Platform team fully controls:

What version is published.

When a version is promoted from beta to stable.

What URL apps will ultimately load from.

2.3. Edge / Ingress Script Injection (No App Repo Changes)

This is the key pattern: inject the script tag at the edge.

2.3.1. NGINX / Envoy / Ingress Filter Pattern

Suppose you have:

Ingress / LB / gateway that terminates TLS and forwards to app.

Platform team controls that layer.

You can:

Inspect outgoing responses with Content-Type: text/html.

Inject:

<script src="https://cdn.internal.company.com/rum-bootstrap/0.1.0-beta/rumBootstrap.min.js"></script>


just before </head> (or </body>).

Example (NGINX sub_filter style pseudo-config):

# Only for HTML responses
sub_filter_types text/html;

# Only for selected host/app
server {
    server_name app1.company.com;

    # ... upstream/proxy_pass config ...

    sub_filter '</head>' '<script src="https://cdn.internal.company.com/rum-bootstrap/0.1.0-beta/rumBootstrap.min.js"></script></head>';
    sub_filter_once on;
}


Or for Envoy/LB/CDN equivalents (Envoy filters, Lambda@Edge, CloudFront Functions, Akamai EdgeWorkers, F5 iRules, etc.) you can do the same thing: "find </head> → insert script tag."

✅ Result: Product teams don’t touch their HTML at all.
Platform flips a config switch to “turn on RUM+Recorder for app X.”

2.3.2. Per-App / Per-Env Mapping Without Code Access

You can onboard apps like this:

Maintain a simple mapping in infra config:

rum_onboarded_apps:
  - host: app1.company.com
    version: 0.1.0-beta
  - host: app2.company.com
    version: 0.2.0-beta


Use that to generate NGINX/Envoy/CDN rules:

<script src="https://cdn.internal.company.com/rum-bootstrap/0.2.0-beta/rumBootstrap.min.js"></script>


per host/environment, without touching app code.

2.4. Configuration Management Without App Changes

Platform team also needs to manage realm, tokens, environments etc. without touching each repo.

2.4.1. Environment-Specific Builds of rumBootstrap.js

You can build one artifact per environment, each with baked-in config:

rumBootstrap.dev.js (dev realm + dev token)

rumBootstrap.stg.js (staging realm + token)

rumBootstrap.prod.js (prod realm + token)

Publish each to your CDN:

https://cdn.internal.company.com/rum-bootstrap/0.1.0-beta/rumBootstrap.dev.min.js
https://cdn.internal.company.com/rum-bootstrap/0.1.0-beta/rumBootstrap.stg.min.js
https://cdn.internal.company.com/rum-bootstrap/0.1.0-beta/rumBootstrap.prod.min.js


Then:

Use hostnames / paths to choose which version to inject.

Example:

app1-dev.company.com → inject rumBootstrap.dev.min.js

app1.company.com → inject rumBootstrap.prod.min.js

All controlled by platform.

2.4.2. Per-App Sensitivity Rules Without Repo Access

If you need per-app sensitivityRules, you can either:

Generate different rumBootstrap.js per app (less ideal), or

Build a central config endpoint plus a little dynamic fetch.

Example approach (still no app changes):

In rumBootstrap.js, on startup:

const host = window.location.host;

fetch(`https://config.internal.company.com/rum/recorder-config?host=${encodeURIComponent(host)}`)
  .then(res => res.json())
  .then(cfg => {
    Object.assign(SESSION_RECORDER_OPTIONS, cfg);
    // then init as normal
  });


Platform team maintains that config service / JSON store.

Engineering teams don’t touch their apps.

2.5. Alternate No-Code Options (If Edge Injection Isn’t Available)

If you don’t control the ingress but you do control some other shared entrypoint:

Tag Manager (GTM, Tealium, Adobe Launch, etc.):

Add a tag that injects <script src="...rumBootstrap.min.js"> at page start.

Many orgs already centralize JS includes this way.

Still no changes inside app repos.

Shared Layout / Theme System:

If apps use a central layout system controlled by platform (e.g., shared Razor/JSP/Thymeleaf layout):

Add the script there.

Product teams that consume that layout automatically get RUM/Recorder.

Internal Browser Extension (for internal tools only):

For purely internal tooling, a browser extension can inject scripts into specified domains.

Not great for Internet-facing users, but useful for internal user/session testing.

2.6. Reality Check: Where You Do Need Code Access

With this design, you don’t need engineering for:

Including bootstrap.

Version upgrades.

Realm/token/env changes.

Turning recorder on via URL param.

You only need repo access if you want:

Deep app-specific behaviors:

SPA router hooks for enabling replay based on internal route state.

App code calling window.enableReplayPersist() from custom UI.

Per-component data attributes that control masking/unmasking.

But for the core use case the combination of:

Shared versioned rumBootstrap.js

Central hosting (Artifactory/CDN)

Edge/Ingress/Tag-manager injection

lets the platform team solve it end-to-end.
