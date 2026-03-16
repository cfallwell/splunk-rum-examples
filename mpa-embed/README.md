# mpa-embed

App-team example for embedding the SignalFx RUM and session-recorder scripts directly inside an application repository.

Files in this folder mirror the `mpa-script` bootstrap shape, but the intent is different:

- `mpa-embed/rumbootstrap.js` is the generated bootstrap your app repo would check in.
- `mpa-embed/src/rumbootstrap.template.js` is the editable template.
- `mpa-embed/src/signalfx/` stores the local minified SignalFx browser SDK files plus release metadata.

## Refresh local SignalFx sources

This example expects available versions to be listed from an internal object store:

`https://artifactory.company.com/signalfx/rum-scripts/releases/`

From the repo root:

```bash
npm run mpa-embed:update
```

Or specify a concrete release:

```bash
npm run mpa-embed:update -- v2.3.0
```

To regenerate the checked-in bootstrap without downloading new files:

```bash
npm run mpa-embed:generate
```
