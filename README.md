# splunk-rum-examples

This repo shows three ways to deliver Splunk RUM and on-demand Session Replay:

- App teams can embed the bootstrap and SignalFx browser scripts directly in their own frontend repositories.
- Platform teams can host and inject a shared browser bootstrap through a central delivery point.
- React teams can install a shared npm package for router-aware SPA tracking.

The goal is to let a platform team host, version, and roll out RUM internally without forcing every product team to build its own bootstrap.

In all supported models, the RUM bootstrap should be the first script that loads so the session is captured from the earliest possible point in the application lifecycle.

## What to use

- [`mpa-script/rumbootstrap.js`](./mpa-script/rumbootstrap.js): standalone browser bootstrap for MPAs and simple SPAs.
- [`mpa-embed/rumbootstrap.js`](./mpa-embed/rumbootstrap.js): app-team example for embedding the SignalFx scripts locally inside an application repo.
- [`spa-npm/README.md`](./spa-npm/README.md): React SPA package, build, publish, and package-usage instructions.
- [`spa-demo/README.md`](./spa-demo/README.md): local demo app showing the SPA package in use.

## Internal Hosting Quick Start

1. Choose your delivery model.
   Use the MPA bootstrap when you want central hosting and injection with little or no app-code change. Use the SPA package when app teams need router-aware tracking inside React.
2. Set your Splunk values.
   Update `realm`, `rumAccessToken`, `applicationName`, and environment settings in the hosted script or the SPA package config override.
3. Publish internally.
   Host the browser bootstrap on your internal CDN or artifact store, and publish the SPA package to your internal npm registry if you support React consumers. In this repo, both are published from the same GitHub Actions release workflow using the version in `spa-npm/package.json`.
4. Wire it into apps.
   For MPAs, inject the hosted script from your edge, ingress, shared layout, or tag manager. For SPAs, install the package and initialize it near the app root.
5. Validate replay enablement.
   Start a session with `?replay=on` or `?replay=true` and confirm the session is captured. Replay enablement is persisted only for the current browser tab session.
6. Version and roll out deliberately.
   Pin a versioned script or package, test in staging, then promote per app or per environment through your normal release pipeline. The intended source of truth is the version in `spa-npm/package.json`.

## Replay Controls

Only one URL toggle is supported across the MPA bootstrap and SPA package:

- `replay=on|true` enables Session Replay.

Legacy URL params like `godmode`, `canvas`, or `assets` are not supported.

Example:

<https://app.company.com/?replay=on>

## Deployment Overview

- Choose MPA or SPA integration.
- Configure Splunk RUM settings such as realm, access token, app name, and environment in the hosted script or package config.
- The repo stores the minified SignalFx browser SDK files in `src/signalfx` and embeds them locally, so the bootstrap does not fetch the SDK from the CDN at runtime.
- Deploy with your normal release pipeline so the bootstrap or package is versioned and cacheable.

## Recommended Internal Distribution Model

### Option 1: App-team local embed

Use this when an application team wants the SignalFx browser scripts stored directly in its own frontend repository and deployment pipeline.

- Check the generated bootstrap and the minified SignalFx script files into the application repo.
- Refresh the local script files from the internal object-store release path when a new version is approved.
- Keep the bootstrap and the embedded SignalFx files versioned in the app repo like any other frontend asset.
- Load the bootstrap as the first script in the main HTML launch point.

See [`mpa-embed/README.md`](./mpa-embed/README.md) for the app-team example.

### Option 2: Platform-hosted browser bootstrap

Use this when the platform team wants the fastest rollout path for many apps and can inject or centrally host the bootstrap.

- Keep a versioned copy of [`mpa-script/rumbootstrap.js`](./mpa-script/rumbootstrap.js) in an internal repo or release pipeline.
- Publish it to an internal CDN or object store.
- Inject it into HTML responses from the edge or shared layout.
- Follow the deployment scenarios later in this README for edge, ingress, or central-entrypoint rollout patterns.
- Load it before any other application scripts.

Example script tag:

```html
<script src="https://cdn.internal.company.com/rum-bootstrap/0.1.0/rumBootstrap.min.js"></script>
```

### Option 3: Internal SPA package

Use this when React apps need route tracking and typed integration points.

- Build and publish the package from [`spa-npm`](./spa-npm).
- Ask app teams to install it from your internal package registry.
- Initialize it once near the app root and include router tracking where needed.
- Load it before the rest of the SPA app tree. See [`spa-demo/src/main.tsx`](./spa-demo/src/main.tsx) for the reference integration point.

Minimal example:

```tsx
import { SplunkRumProvider, RumRouterTracker } from "@yourcompany/rumbootstrap";

function App() {
  return (
    <SplunkRumProvider configOverride={rumConfig}>
      <RumRouterTracker />
    </SplunkRumProvider>
  );
}
```

Package-specific build and publish steps live in [`spa-npm/README.md`](./spa-npm/README.md).

## Internal Rollout Checklist

- Decide whether each app uses the hosted bootstrap or the SPA package.
- Pin one internal version per environment or per host.
- Keep tokens and environment-specific values under platform-team control.
- Validate masking behavior and replay quality in staging.
- Roll forward and back by updating the injected script or published package version, not by editing app code.

## Further Instructions

- SPA package build, publish, and usage: [`spa-npm/README.md`](./spa-npm/README.md)
- Demo app setup and local testing: [`spa-demo/README.md`](./spa-demo/README.md)
- Standalone hosted bootstrap source: [`mpa-script/rumbootstrap.js`](./mpa-script/rumbootstrap.js)
- App-team local embed example: [`mpa-embed/rumbootstrap.js`](./mpa-embed/rumbootstrap.js)
- Example Jenkins Artifactory publish job for the shared SignalFx release files: [`jenkins/Jenkinsfile.mpa-signalfx-artifactory`](./jenkins/Jenkinsfile.mpa-signalfx-artifactory)

## Optional Recorder Settings

Set these in the hosted script or package config, not from URL parameters:

- `maskAllInputs` defaults to `true`
- `maskAllText` defaults to `true`
- `maxExportIntervalMs` defaults to `5000`
- `sensitivityRules` defaults to an empty array
- `features.backgroundServiceSrc`, `features.canvas`, `features.video`, `features.iframes`, `features.packAssets`, and `features.cacheAssets` can be enabled per deployment

Turn on full-text and input capture:

```js
maskAllInputs: false,
maskAllText: false,
```

Add fine-grained masking or exclusions:

```js
sensitivityRules: [
  { rule: "unmask", selector: "p" },
  { rule: "exclude", selector: "img" },
  { rule: "mask", selector: ".user-class" }
],
```

For the full recorder option surface, see the Splunk Session Recorder docs:
<https://github.com/signalfx/splunk-otel-js-web/blob/main/packages/session-recorder/README.md>

## Deployment Scenarios

### Edge or ingress injection with no app repo changes

Inject the hosted bootstrap before `</head>` or `</body>`:

```html
<script src="https://cdn.internal.company.com/rum-bootstrap/0.1.0-beta/rumBootstrap.min.js"></script>
```

Example NGINX pattern:

```nginx
sub_filter_types text/html;

server {
    server_name app1.company.com;

    sub_filter '</head>' '<script src="https://cdn.internal.company.com/rum-bootstrap/0.1.0-beta/rumBootstrap.min.js"></script></head>';
    sub_filter_once on;
}
```

This is the simplest path when the platform team owns ingress or HTML injection.

### Shared layout, tag manager, or other central entrypoint

If edge injection is not available, use another centrally managed entrypoint:

- Shared HTML layout or theme template
- Tag manager such as GTM, Tealium, or Adobe Launch
- Internal browser extension for controlled internal domains

### Per-app and per-environment mapping

Maintain a small platform-owned mapping so each host loads a pinned script version and token set.

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

Use that mapping to drive your injection rules or generated script URLs:

```html
<script src="https://cdn.internal.company.com/rum-bootstrap/app1.company.com/prod/0.2.0-beta/rumBootstrap.min.js"></script>
```

### Environment-specific builds

If you want strict separation by environment, publish one build per environment:

- `rumBootstrap.dev.min.js`
- `rumBootstrap.stg.min.js`
- `rumBootstrap.prod.min.js`

Then map each hostname to the correct build in the edge or delivery layer.

### When app-code access is needed

You usually do not need app-repo changes for the baseline MPA-style rollout. App-code changes are only needed when a team wants:

- React router tracking through the SPA package
- UI-driven calls such as `window.enableReplayPersist()`
- Per-component masking or unmasking rules implemented in app markup

That combination of a shared bootstrap, internal hosting, and central injection is enough for most internal deployments.
