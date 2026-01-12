# rumbootstrap

TypeScript utilities to bootstrap Splunk RUM + Session Replay for React SPAs.

## Install

From npm:

```bash
npm install rumbootstrap
```

Local file dependency (use when developing or testing the library alongside a local app):

- Use this when the app repo and this repo live side-by-side on disk and you want changes in the library to be picked up immediately.
- Prefer this for local development or CI smoke tests; use the npm install from the registry for production consumption.

```jsonc
{
  "dependencies": {
    "rumbootstrap": "file:../spa_npm"
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

From `spa_npm/`:

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
import { SplunkRumProvider, RumRouterTracker, useEnableReplayPersist } from "rumbootstrap";
```

## Version pinning

This build pins both RUM and Session Recorder to v1.1.0 to avoid version mismatch with `latest`.

Where it is set:

- `spa_npm/src/rumBootstrap.ts` (`RUM_VERSION` constant).

How to manage it:

- Update `RUM_VERSION` to the desired Splunk release.
- Ensure both CDN URLs (RUM + Session Recorder) still reference the same version.
- Rebuild the package (`npm run build`) and publish a new version.
