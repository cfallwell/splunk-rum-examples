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

## Script Usage and Scenarios

All commands below are intended to run from the repo root unless a package-local path is shown.

### End-to-end release flow

Use these scripts in this order when you are cutting a new internal release from a newer SignalFx browser SDK:

1. Refresh the checked-in SignalFx assets with `npm run signalfx:update -- <release>`.
2. Bump the package/bootstrap version with `npm run release:set-version -- <version>`.
3. Stage the MPA SignalFx artifacts for internal publishing with `npm run mpa-script:stage-signalfx-release`.
4. If an app-team local embed is maintained from the internal object store, refresh that copy with `npm run mpa-embed:update -- <release>`.

### `signalfx:update`

Scenario:
Use this when the platform team wants to pull a newer published SignalFx RUM browser release from GitHub/CDN into the repo and regenerate all checked-in embedded outputs that depend on it.

Usage:

```bash
npm run signalfx:update -- v2.15.0
```

Direct invocation:

```bash
node scripts/update-signalfx-scripts.mjs v2.15.0
```

What it does:

- Downloads `splunk-otel-web.js` and `splunk-otel-web-session-recorder.js` for the selected upstream release.
- Updates both `spa-npm/src/signalfx/*` and `mpa-script/src/signalfx/*`.
- Writes matching `manifest.json` files in both locations.
- Runs `scripts/generate-rum-embeds.mjs` to regenerate `spa-npm/src/signalfx/embeddedSources.ts` and `mpa-script/rumbootstrap.js`.

Notes:

- Pass a concrete version such as `v2.15.0` or `2.15.0`.
- If you omit the version in an interactive terminal, the script shows a numbered release picker.
- The `latest` alias is intentionally rejected so releases stay explicit and reproducible.

### `release:set-version`

Scenario:
Use this when you are publishing a new internal version of the hosted bootstrap and SPA package after code or asset changes are ready.

Usage:

```bash
npm run release:set-version -- 1.0.3
```

Direct invocation:

```bash
node scripts/set-release-version.mjs 1.0.3
```

What it does:

- Updates `spa-npm/package.json` to the requested version.
- Regenerates embedded outputs by running `scripts/generate-rum-embeds.mjs`.
- Runs `npm --prefix spa-npm run sync:description` so the package description and README release block reflect the new changelog entry.

Notes:

- Provide the final package/bootstrap version only; the script strips a leading `v` if present.
- Run this after the changelog entry for the new version exists so the generated description and README metadata stay meaningful.

### `mpa-script:stage-signalfx-release`

Scenario:
Use this when you need a ready-to-publish folder of SignalFx browser SDK artifacts for your internal object store, Artifactory, or CDN release job.

Usage:

```bash
npm run mpa-script:stage-signalfx-release
```

Direct invocation:

```bash
node scripts/stage-mpa-signalfx-release.mjs
```

What it does:

- Reads the current release metadata from `mpa-script/src/signalfx/manifest.json`.
- Creates `dist/signalfx/rum-scripts/releases/<release>/`.
- Copies the two browser SDK files into that directory.
- Writes `manifest.json` and a `release.json` summary with the expected object-store path.

Notes:

- Run this after `signalfx:update` so the staged folder matches the checked-in manifest and SDK files.
- This script stages files locally only; the actual upload is handled by your CI or release job.

### `mpa-embed:update`

Scenario:
Use this when an app-team-local embed should be refreshed from the internally approved SignalFx release artifacts instead of downloading directly from the public SignalFx CDN.

Usage:

```bash
npm run mpa-embed:update -- v1.2.0
```

Direct invocation:

```bash
node scripts/update-mpa-embed-signalfx-scripts.mjs v1.2.0
```

What it does:

- Lists available releases from the internal object-store path `https://artifactory.company.com/signalfx/rum-scripts/releases/`.
- Downloads the selected release into `mpa-embed/src/signalfx/`.
- Rewrites `mpa-embed/src/signalfx/manifest.json`.
- Runs `scripts/generate-mpa-embed.mjs` to regenerate `mpa-embed/rumbootstrap.js`.

Notes:

- In an interactive shell, you can omit the version and choose from the numbered list.
- In CI or other non-interactive environments, provide the release explicitly.
- Use this for the `mpa-embed` example only; it does not update `spa-npm` or `mpa-script`.

### `mpa-embed:generate`

Scenario:
Use this when you already updated files under `mpa-embed/src/signalfx/` or changed the `mpa-embed` bootstrap template and only need to rebuild the generated standalone output.

Usage:

```bash
npm run mpa-embed:generate
```

Direct invocation:

```bash
node scripts/generate-mpa-embed.mjs
```

What it does:

- Reads `mpa-embed/src/signalfx/manifest.json`.
- Base64-embeds the checked-in SignalFx browser scripts from `mpa-embed/src/signalfx/`.
- Applies those values to `mpa-embed/src/rumbootstrap.template.js`.
- Writes the generated output to `mpa-embed/rumbootstrap.js`.

Notes:

- This is a local regeneration helper; it does not download anything.
- `mpa-embed:update` already calls this script automatically after downloading a release.

### `generate-rum-embeds.mjs`

Scenario:
Use this when you changed shared embedded assets or the main MPA template and need to regenerate the derived files without bumping versions or downloading new SDKs.

Usage:

```bash
node scripts/generate-rum-embeds.mjs
```

What it does:

- Reads `spa-npm/src/signalfx/manifest.json` and the checked-in browser SDK files under `spa-npm/src/signalfx/`.
- Regenerates `spa-npm/src/signalfx/embeddedSources.ts`.
- Applies the same embedded values to `mpa-script/src/rumbootstrap.template.js`.
- Writes the generated MPA output to `mpa-script/rumbootstrap.js`.

Notes:

- This script is called automatically by `signalfx:update` and `release:set-version`.
- Run it directly only when you intentionally edited the template or embedded source files by hand.

### `extract-changelog-section.mjs`

Scenario:
Use this in release automation when you need a standalone markdown fragment for one specific version, such as GitHub release notes or an artifact attached to a pipeline.

Usage:

```bash
node scripts/extract-changelog-section.mjs spa-npm/CHANGELOG.md 1.0.3 dist/release-notes.md
```

What it does:

- Finds the `## 1.0.3` or `## v1.0.3` section in the target changelog.
- Extracts only that version's body until the next `##` heading.
- Writes a normalized markdown file beginning with `## v1.0.3`.

Notes:

- This script is intended for automation and is not exposed as a root npm alias today.
- It exits with an error if the changelog section is missing or empty.

### `spa-npm/scripts/sync-package-description.mjs`

Scenario:
Use this when the `spa-npm` changelog has been updated and you want package metadata and the package README release summary block to match the current `spa-npm/package.json` version.

Usage:

```bash
npm --prefix spa-npm run sync:description
```

Direct invocation from `spa-npm/`:

```bash
node scripts/sync-package-description.mjs
```

What it does:

- Reads the current version from `spa-npm/package.json`.
- Pulls the matching section from `spa-npm/CHANGELOG.md`.
- Updates the package `description` field with a short summary for that version.
- Rewrites the auto-managed release block inside `spa-npm/README.md`.

Notes:

- `release:set-version` and the `spa-npm` build flow already call this for you.
- If the changelog heading for the current version is missing, the script leaves metadata unchanged and exits successfully after a warning.

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
