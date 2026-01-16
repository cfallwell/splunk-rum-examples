# splunk-rum-examples

This repo contains an NPM package for SPA apps, and Splunk RUM examples for both multi-page apps (MPA) and single-page apps (SPA) that enable on-demand session recording via url parameters.

## Goals

- Provide a single shared JS entry point for RUM + Session Recorder.
- Enable Session Recorder on demand per session with a simple URL parameter.
  - `?Replay=on` or `?Replay=true` enables recorder and persists for the current browser session.
- Avoid requiring application teams for deployment changes.
- Work for both SPAs and MPAs (React-specific hooks are optional).

## Recorder parameters

URL-parameter editable (MPA + SPA) — only the options below are supported:

- `replay=on|true` enables the recorder for the session.
- `godmode=on|true` enables all features and sets `maskAllInputs=false` and `maskAllText=false`.
  - Breaking change: legacy URL params like `canvas` or `assets` are no longer supported.

Not editable via URL (set in config for security and consistency):

- `maskAllInputs` (boolean, default `true`)
- `maskAllText` (boolean, default `true`)
- `maxExportIntervalMs` (number, default `5000`)
- `sensitivityRules` (array of rule objects)

Note: `godmode=on|true` overrides masking defaults for debugging.

Example:

<https://app.company.com/?replay=on&godmode=on>

Turn on full-text and input capture (this configuration should be made in the bootstraps):

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

For additional configuration options, see the Splunk documentation:
<https://github.com/signalfx/splunk-otel-js-web/blob/main/packages/session-recorder/README.md>

## Contents

- `mpa-script/rumbootstrap.js`: lightweight bootstrapper for classic multi-page sites. Can be used for SPA sites that do not need to capture routes
- `spa-npm/`: reusable TypeScript package for SPA routing-aware tracking.
- `spa-demo/`: Vite demo app showing the SPA package in a real React flow.

## Deployment overview

- Choose MPA or SPA integration.
- Configure Splunk RUM settings (realm, access token, app name, environment) in the script/package.
- Deploy with your normal release pipeline so the bootstrapper is versioned and cacheable.

## Common URL controls (MPA + SPA)

Both the MPA script and the SPA package support the same URL parameter for enabling replay. See the Recorder parameters section for the example URL.

## Recommendations

- Load the bootstrapper early so it can capture the full session once recording is enabled.
- Use feature flags or runtime config to control when recording starts.
- In SPAs, hook routing events so navigation changes are reflected in session recordings.
- Validate in staging to confirm ingestion and playback quality.

## MPA bootstrap: overview

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
<script src="https://cdn.company.com/rum-bootstrap/0.1.0/rumBootstrap.min.js"></script>
```

If the user starts with `?Replay=on`:

- `sessionStorage` flag is set for that tab.
- Every subsequent page load in the same tab will re-enable Session Recorder.
- No app code involved, just platform-side injection.

Caveats:

- New tab/window is a new session (no `sessionStorage`).

## SPA integration examples

### Install and initialize in a SPA and capture Route changes as events

Recommend hosting the NPM package example in this repo in your company's package repository and calling it (for SPA apps that require route change awareness).  See github workflow for example.

```bash
npm install @{yourcompany}/rumbootstrap
```

```tsx
import { SplunkRumProvider, RumRouterTracker } from "@{yourcompany}/rumbootstrap";

function App() {
  return (
    <SplunkRumProvider configOverride={rumConfig}>
      <RumRouterTracker />
      {/* your routes/components */}
    </SplunkRumProvider>
  );
}
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

### Envoy filter example (Lua)

```yaml
http_filters:
  - name: envoy.filters.http.lua
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
      inline_code: |
        function envoy_on_response(response_handle)
          local content_type = response_handle:headers():get("content-type") or ""
          if string.find(content_type, "text/html") then
            local body = response_handle:body()
            if body:length() > 0 then
              local script = '<script src="https://cdn.internal.company.com/rum-bootstrap/0.1.0-beta/rumBootstrap.min.js"></script>'
              local updated = string.gsub(body:getBytes(0, body:length()), "</head>", script .. "</head>")
              body:setBytes(updated)
            end
          end
        end
```

### F5 iRule example

```tcl
when HTTP_RESPONSE {
  if {[HTTP::header value "Content-Type"] contains "text/html"} {
    set payload [HTTP::payload]
    if {$payload ne ""} {
      set script "<script src=\"https://cdn.internal.company.com/rum-bootstrap/0.1.0-beta/rumBootstrap.min.js\"></script>"
      regsub -all "</head>" $payload "${script}</head>" payload
      HTTP::payload replace 0 [string length [HTTP::payload]] $payload
    }
  }
}
```

### WAF rule example (ModSecurity-style response edit)

```apache
SecResponseBodyAccess On
SecRule RESPONSE_CONTENT_TYPE "@contains text/html" \
  "id:100001,phase:4,pass,nolog,ctl:ruleEngine=On, \
  t:none, \
  setvar:tx.inject_script=|<script src=\\\"https://cdn.internal.company.com/rum-bootstrap/0.1.0-beta/rumBootstrap.min.js\\\"></script>|, \
  append:'%{tx.inject_script}'"
```

## Configuration management without app changes

### Per-app/per-env mapping without code access

Maintain a simple mapping in infra config that ties hostnames (and optionally environments) to a specific bootstrap version or build. This lets the platform team control exactly what each app loads without touching app repos.

Recommended approach:

- Treat the mapping as the single source of truth.
- Use it to generate edge/CDN injection rules per host.
- Pin versions per app so upgrades are deliberate and reversible.
- Include per-app tokens so each team has isolated data and access control.

```yaml
rum_onboarded_apps:
  - host: app1.company.com
    env: prod
    version: 0.1.0-beta
    rumAccessToken: "app1-token"
  - host: app2.company.com
    env: stg
    version: 0.2.0-beta
    rumAccessToken: "app2-token"
```

Use it to generate injection rules like:

```html
<script src="https://cdn.internal.company.com/rum-bootstrap/0.2.0-beta/rumBootstrap.min.js"></script>
```

Common patterns:

- Split by environment with separate hostnames (dev/stg/prod) mapped to different builds.
- Roll forward by updating the version for one host at a time.
- Roll back by reverting the version in the mapping (no app deploy needed).
- If tokens differ per app, either bake them into per-app builds or have the bootstrap fetch a token from a platform-owned config endpoint before init.

Example CI job that generates per-app scripts from the mapping:

```bash
# pseudo-CI step (bash + jq)
set -euo pipefail

CONFIG=rum_onboarded_apps.yaml
OUT_DIR=dist/rum-bootstrap
VERSION=0.2.0-beta

mkdir -p "$OUT_DIR"

# For each app/env, inject host-specific token into a template and publish.
yq -o=json ".rum_onboarded_apps[]" "$CONFIG" | jq -c '.' | while read -r app; do
  host=$(echo "$app" | jq -r '.host')
  env=$(echo "$app" | jq -r '.env')
  token=$(echo "$app" | jq -r '.rumAccessToken')

  out="$OUT_DIR/${host}/${env}/${VERSION}/rumBootstrap.min.js"
  mkdir -p "$(dirname "$out")"

  # Replace placeholders in a template; minify as needed.
  sed -e "s/__RUM_ACCESS_TOKEN__/${token}/g" \
      -e "s/__RUM_VERSION__/${VERSION}/g" \
      -e "s/__RUM_ENV__/${env}/g" \
      templates/rumBootstrap.template.js > "$out"
done
```

Injection layer then maps each host to its generated script URL:

```html
<script src="https://cdn.internal.company.com/rum-bootstrap/app1.company.com/prod/0.2.0-beta/rumBootstrap.min.js"></script>
```

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

lets a central platform team solve RUM deployments end-to-end without involving app teams.
