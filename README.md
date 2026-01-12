# SplunkRum-Examples

Collection of Splunk RUM session-recording examples for multi-page apps (MPA) and single-page apps (SPA) that enable on-demand session recording with url parameters. The code lives in the folders below; this README explains what each script does and how to deploy it.

## Contents

- `mpa-script/rumbootstrap.js`: lightweight bootstrapper for classic multi-page sites.
- `spa-npm/`: reusable TypeScript package for SPA routing-aware tracking.
- `spa-demo/`: Vite demo app showing the SPA package in a real React flow.

## Deployment overview

- Choose MPA or SPA integration.
- Configure Splunk RUM settings (realm, access token, app name, environment) in the script/package.
- Deploy with your normal release pipeline so the bootstrapper is versioned and cacheable.

## Recommendations

- Load the bootstrapper early so it can capture the full session once recording is enabled.
- Use feature flags or runtime config to control when recording starts.
- In SPAs, hook routing events so navigation changes are reflected in session recordings.
- Validate in staging to confirm ingestion and playback quality.

## MPA bootstrap: overview

### Goals

- Provide a single shared JS entry point for RUM + Session Recorder.
- Enable Session Recorder on demand per session:
  - `?Replay=on` or `?Replay=true` enables recorder and persists for the current browser session.
  - No param keeps the recorder off unless previously enabled in the session.
- Expose Session Recorder parameters as top-level config so teams can tune masking, rules, and features.
- Avoid requiring application teams for deployment changes.
- Work for both SPAs and MPAs (React-specific hooks are optional).

### Behavior

- Included from HTML (for example `index.html`).
- Always loads and initializes Splunk RUM.
- Conditionally loads and initializes Session Recorder when requested.

### Responsibilities

- RUM initialization:
  - Dynamically loads the RUM bundle.
  - Calls `SplunkRum.init` with app options (realm, access token, app name, environment).
- Configuration management:
  - Exposes a configuration object with required fields and common options.
  - Loads the Session Recorder script and calls `SplunkSessionRecorder.init` when enabled.
- Replay enablement:
  - Reads `Replay`/`replay` query params.
  - Persists enablement using `sessionStorage` key `splunk-session-replay-enabled`.
- Optional SPA hooks:
  - `window.enableReplayPersist()` to set the session flag and enable recorder.
  - `window.enableReplayNow()` to enable recorder immediately without a session flag.

## Recorder parameters

The recorder accepts these optional params:

- `maskAllInputs` (boolean, default `true`)
- `maskAllText` (boolean, default `true`)
- `maxExportIntervalMs` (number, default `5000`)
- `sensitivityRules` (array of rule objects)
- `features` (object) with keys like `backgroundServiceSrc`, `canvas`, `video`, `iframes`, `packAssets`, `cacheAssets`

URL-driven overrides in the MPA script (query params):

- `replay=on|true` enables the recorder for the session.
- `canvas=true|false`, `video=true|false`, `iframes=true|false`, `cacheAssets=true|false`
- `assets=true|false` to toggle all `packAssets` entries.
- `assetsStyles=true|false`, `assetsFonts=true|false`, `assetsImages=true|false` for per-asset control.
- `backgroundServiceSrc=<url>` to set the background service worker URL.

Complete example (comma-separated params are supported):

```
https://app.company.com/?replay=on,canvas=true,video=true,iframes=true,assets=true,assetsStyles=true,assetsFonts=true,assetsImages=true,cacheAssets=true,backgroundServiceSrc=https%3A%2F%2Fexample.xyz%2Fbackground-service.html
```

Turn on full-text and input capture:

```js
maskAllInputs: false,
maskAllText: false,
```

Add fine-grained masking/exclusion:

```js
sensitivityRules: [
  { rule: "unmask", selector: "p" },
  { rule: "exclude", selector: "img" },
  { rule: "mask", selector: ".user-class" }
],
```

Enable advanced features:

```js
features: {
  backgroundServiceSrc: "https://example.xyz/background-service.html",
  canvas: true,
  video: true,
  iframes: true,
  packAssets: { fonts: true, images: true, styles: true },
  cacheAssets: true
}
```

For additional configuration options, see the Splunk documentation:
https://help.splunk.com/en/splunk-observability-cloud/monitor-end-user-experience/real-user-monitoring/replay-user-sessions/record-browser-sessions

## SPA and MPA usage without app code changes

### SPAs (Single Page Apps)

- Base `rumBootstrap.js` behavior works even without touching the SPA repo.
- On initial load:
  - Script is injected at the edge.
  - RUM is initialized.
  - `?Replay=on` sets `sessionStorage['splunk-session-replay-enabled'] = 'on'`.
  - Session Recorder is enabled for that browser session.
- SPA route changes do not require repo code changes as long as you can start with `?Replay=on`.
- You can use the MPA script in SPAs, but it is a baseline bootstrap only:
  - No router-aware tracking or SPA-specific helpers from the NPM package.
  - Replay enablement is limited to the URL/session logic and the optional global hooks.
  - No typed config override or React context helpers.

Example flow:

- `https://app.company.com/?Replay=on` → user navigates around → sessions are recorded.

### MPAs (Multi-Page Apps)

Every HTML page served by that host includes:

```html
<script src="https://cdn.internal.company.com/rum-bootstrap/0.1.0-beta/rumBootstrap.min.js"></script>
```

If the user starts with `?Replay=on`:

- `sessionStorage` flag is set for that tab.
- Every subsequent page load in the same tab will re-enable Session Recorder.
- No app code involved, just platform-side injection.

Caveats:

- New tab/window is a new session (no `sessionStorage`).

## SPA integration examples

### Include bootstrap in `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>My SPA</title>
    <script src="/lib/rumBootstrap.js"></script>
    <script src="/dist/app.bundle.js" defer></script>
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>
```

### React Router: auto-enable when `?Replay=on`

```tsx
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
```

In your app root:

```tsx
function App() {
  return (
    <>
      <ReplayParamWatcher />
      {/* your routes/components */}
    </>
  );
}
```

### Vue Router: `afterEach` hook

```js
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
```

### Manual enable in SPA (for a debug menu)

```js
button.addEventListener("click", () => {
  window.enableReplayPersist?.();
});
```

## Recommendations for Enterprise Hosting and Versioning

### Repo and versioning (platform teams own the repos and code)

- Create a dedicated repo, for example:
  - `platform-rum-bootstrap/`
  - `rumBootstrap.js`
  - `package.json` (optional)
  - `CHANGELOG.md`
  - `README.md`
- Maintain semantic versions; start with `0.1.0-beta`.
- Tag releases in Git:

```bash
git tag -a v0.1.0-beta -m "Initial shared Splunk RUM + Session Recorder bootstrap"
git push origin v0.1.0-beta
```

### Build and publish to Artifactory/CDN

CI pipeline (owned by platform team):

- On tag `vX.Y.Z`:
  - Optionally run lint/tests.
  - Optionally minify → `rumBootstrap.min.js`.
  - Publish artifacts to Artifactory (or internal object store):
    - `/rum-bootstrap/0.1.0-beta/rumBootstrap.js`
    - `/rum-bootstrap/0.1.0-beta/rumBootstrap.min.js`
    - `/rum-bootstrap/latest/rumBootstrap.js` (optional)
- Expose via CDN/edge URL, for example:
  - `https://cdn.internal.company.com/rum-bootstrap/0.1.0-beta/rumBootstrap.min.js`

Platform team controls:

- What version is published.
- When a version is promoted from beta to stable.
- What URL apps load from.

## Edge/ingress script injection (no app repo changes)

### NGINX/Envoy/Ingress filter pattern

Inject the script tag before `</head>` or `</body>`:

```html
<script src="https://cdn.internal.company.com/rum-bootstrap/0.1.0-beta/rumBootstrap.min.js"></script>
```

Example (NGINX `sub_filter` style pseudo-config):

```nginx
# Only for HTML responses
sub_filter_types text/html;

# Only for selected host/app
server {
    server_name app1.company.com;

    # ... upstream/proxy_pass config ...

    sub_filter '</head>' '<script src="https://cdn.internal.company.com/rum-bootstrap/0.1.0-beta/rumBootstrap.min.js"></script></head>';
    sub_filter_once on;
}
```

Result: product teams do not touch HTML. Platform flips a config switch to enable RUM + Recorder per app.

### Per-app/per-env mapping without code access

Maintain a simple mapping in infra config:

```yaml
rum_onboarded_apps:
  - host: app1.company.com
    version: 0.1.0-beta
  - host: app2.company.com
    version: 0.2.0-beta
```

Use it to generate injection rules:

```html
<script src="https://cdn.internal.company.com/rum-bootstrap/0.2.0-beta/rumBootstrap.min.js"></script>
```

## Configuration management without app changes

### Environment-specific builds

Build one artifact per environment with baked-in config:

- `rumBootstrap.dev.js` (dev realm + dev token)
- `rumBootstrap.stg.js` (staging realm + token)
- `rumBootstrap.prod.js` (prod realm + token)

Publish to CDN:

- `https://cdn.internal.company.com/rum-bootstrap/0.1.0-beta/rumBootstrap.dev.min.js`
- `https://cdn.internal.company.com/rum-bootstrap/0.1.0-beta/rumBootstrap.stg.min.js`
- `https://cdn.internal.company.com/rum-bootstrap/0.1.0-beta/rumBootstrap.prod.min.js`

Example mapping:

- `app1-dev.company.com` → `rumBootstrap.dev.min.js`
- `app1.company.com` → `rumBootstrap.prod.min.js`

### Per-app sensitivity rules without repo access

Option 1: generate different `rumBootstrap.js` per app.

Option 2: build a central config endpoint and fetch overrides at runtime:

```js
const host = window.location.host;

fetch(`https://config.internal.company.com/rum/recorder-config?host=${encodeURIComponent(host)}`)
  .then((res) => res.json())
  .then((cfg) => {
    Object.assign(SESSION_RECORDER_OPTIONS, cfg);
    // then init as normal
  });
```

## Alternate no-code options

If edge injection is not available but you control another shared entrypoint:

- Tag manager (GTM, Tealium, Adobe Launch): add a tag that injects the script early.
- Shared layout/theme system: add the script in the shared template.
- Internal browser extension (internal tools only): inject scripts into specified domains.

## Where you do need code access

You only need repo access if you want:

- SPA router hooks for enabling replay based on internal route state.
- App code calling `window.enableReplayPersist()` from custom UI.
- Per-component data attributes that control masking/unmasking.

For the core use case, the combination of:

- Shared versioned `rumBootstrap.js`
- Central hosting (Artifactory/CDN)
- Edge/ingress/tag-manager injection

lets the platform team solve it end-to-end.
