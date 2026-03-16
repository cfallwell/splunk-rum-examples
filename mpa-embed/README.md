# mpa-embed

App-team example for embedding the SignalFx RUM and session-recorder scripts directly inside an application repository.

The bootstrap should be the first script loaded by the application. A typical MPA launch point looks like this:

```html
<!doctype html>
<html lang="en">
  <head>
    <script src="/rum/rumbootstrap.js"></script>
    <script src="/assets/app.js" defer></script>
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>
```

Place `rumbootstrap.js` first in the `<head>` of the main entry page, such as `index.html`.

Files in this folder mirror the `mpa-script` bootstrap shape, but the intent is different:

- `mpa-embed/rumbootstrap.js` is the generated bootstrap your app repo would check in.
- `mpa-embed/src/rumbootstrap.template.js` is the editable template.
- `mpa-embed/src/signalfx/` stores the local minified SignalFx browser SDK files plus release metadata.

## Refresh local SignalFx sources

This example expects available versions to be listed from an internal object store:

`https://artifactory.company.com/signalfx/rum-scripts/releases/`

The matching platform-side publish example lives in:

- [`mpa-script`](../mpa-script)
- [`scripts/stage-mpa-signalfx-release.mjs`](../scripts/stage-mpa-signalfx-release.mjs)
- [`jenkins/Jenkinsfile.mpa-signalfx-artifactory`](../jenkins/Jenkinsfile.mpa-signalfx-artifactory)

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
