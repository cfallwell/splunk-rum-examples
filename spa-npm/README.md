# @cfallwell/rumbootstrap

TypeScript utilities to bootstrap Splunk RUM + Session Replay for React SPAs.

## Install

From npm:

```bash
npm install @cfallwell/rumbootstrap
```

Local file dependency (use when developing or testing the library alongside a local app):

- Use this when the app repo and this repo live side-by-side on disk and you want changes in the library to be picked up immediately.
- Prefer this for local development or CI smoke tests; use the npm install from the registry for production consumption.

```jsonc
{
  "dependencies": {
    "@cfallwell/rumbootstrap": "file:../spa-npm"
  }
}
```

## Build

```bash
npm install
npm run build
```

Notes:

- `prepare` runs automatically for file dependencies so the library builds on install.
- React packages are devDependencies to satisfy TypeScript builds.

## Publish

From `spa-npm/`:

```bash
npm login
npm run build
npm version patch # or minor/major
npm publish
```

Optional checks before publish:

```bash
npm pack
```

## Usage (SPA)

```tsx
import { SplunkRumProvider, RumRouterTracker, useEnableReplayPersist } from "@cfallwell/rumbootstrap";
```

## Configuration defaults

The library ships with a minimal default config so it can bootstrap without app input. For real usage, provide your own app-specific values via `configOverride` (for example, in a `rum.config.ts` file like the demo). This avoids editing the library source and removes the need to customize the scripts directly. The demo config is intentionally separate so teams can manage realm/token/environment per app and per environment.

## Version pinning

This build pins both RUM and Session Recorder to v1.1.0 to avoid version mismatch with `latest`.

Where it is set:

- `spa-npm/src/rumBootstrap.ts` (`RUM_VERSION` constant).

How to manage it:

- Update `RUM_VERSION` to the desired Splunk release.
- Ensure both CDN URLs (RUM + Session Recorder) still reference the same version.
- Rebuild the package (`npm run build`) and publish a new version.
