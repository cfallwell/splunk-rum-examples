# @cfallwell/rumbootstrap

TypeScript utilities to bootstrap Splunk RUM + Session Replay for React SPAs.

## Changelog

Latest release notes live in `CHANGELOG.md`.

<!-- release:auto:start -->
- Current version: `v1.0.0`
- Latest update: Reset the release line so GitHub Releases, the npm package, and the MPA bootstrap all publish under the same version.
- Additional updates: 4 (see `CHANGELOG.md`)

Release notes for this version:
- Reset the release line so GitHub Releases, the npm package, and the MPA bootstrap all publish under the same version.
- Replaced the split release automation with a single workflow that reads spa-npm/package.json, publishes the npm package, and creates the matching GitHub release with the MPA assets attached.
- Added a release-notes extraction step so the GitHub Release body and the package README can show the full set of notes for the shipped version.
- Added a helper script to set the release version in one place and regenerate the embedded/bootstrap artifacts from that same value.
- Embedded the local SignalFx RUM and session-recorder bundles for the MPA bootstrap flow and tracked their upstream release metadata.
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

The repo now uses `spa-npm/package.json` as the single source of truth for release versions.

Recommended flow from the repo root:

```bash
npm run release:set-version -- 1.0.0
git add .
git commit -m "feat: prepare v1.0.0 release"
git push
```

After that PR merges to `main`, GitHub Actions will:

- publish `@cfallwell/rumbootstrap` to GitHub Packages
- create the matching GitHub Release tag `vX.Y.Z`
- upload `rumbootstrap.js` and `rumbootstrap.min.js` as MPA assets

Release notes come from the matching section in `CHANGELOG.md`.

Optional checks before opening the PR:

```bash
npm run build
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
