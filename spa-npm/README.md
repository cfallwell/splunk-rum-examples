# @cfallwell/rumbootstrap

TypeScript utilities to bootstrap Splunk RUM + Session Replay for React SPAs.

## Changelog

Latest release notes live in `CHANGELOG.md`.

<!-- release:auto:start -->
- Current version: `v5.0.0`
- Latest update: Removed the godmode URL override from both bootstrap flows.
- Additional updates: 2 (see `CHANGELOG.md`)
<!-- release:auto:end -->

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

## URL parameters

Only the following URL param is supported for enabling Session Replay:

- `replay=on|true`

Legacy params like `godmode`, `canvas`, or `assets` are not supported.

## Local SignalFx SDK source

The package stores the minified Splunk browser SDK files in `spa-npm/src/signalfx/` and embeds them locally when the bootstrap initializes. This avoids runtime CDN fetches while keeping the source artifacts in-repo.

The generated embedded script tags include:

- `data-rum-bootstrap-version` for the local bootstrap version
- `data-rum-signalfx-release` for the embedded upstream SignalFx release
- `data-rum-signalfx-source` and `data-rum-signalfx-fetched-at` for traceability

To refresh the SignalFx SDK:

- Run `node ../scripts/update-signalfx-scripts.mjs` and choose a published release from the numbered list.
- If you already know the exact release, run `node ../scripts/update-signalfx-scripts.mjs v2.3.0`.
- Rebuild the package with `npm run build`.
