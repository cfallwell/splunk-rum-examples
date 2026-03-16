import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(here);

const manifestPath = join(repoRoot, "mpa-script/src/signalfx/manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

const releaseDir = join(
  repoRoot,
  "dist/signalfx/rum-scripts/releases",
  manifest.release
);

mkdirSync(releaseDir, { recursive: true });

copyFileSync(
  join(repoRoot, "mpa-script/src/signalfx/splunk-otel-web.min.js"),
  join(releaseDir, "splunk-otel-web.js")
);
copyFileSync(
  join(repoRoot, "mpa-script/src/signalfx/splunk-otel-web-session-recorder.min.js"),
  join(releaseDir, "splunk-otel-web-session-recorder.js")
);
copyFileSync(manifestPath, join(releaseDir, "manifest.json"));

const summary = {
  release: manifest.release,
  source: manifest.source,
  fetchedAt: manifest.fetchedAt,
  objectStorePath: `signalfx/rum-scripts/releases/${manifest.release}/`,
  files: [
    "splunk-otel-web.js",
    "splunk-otel-web-session-recorder.js",
    "manifest.json",
  ],
};

writeFileSync(
  join(releaseDir, "release.json"),
  `${JSON.stringify(summary, null, 2)}\n`,
  "utf8"
);

console.log(`Staged SignalFx release assets in ${releaseDir}`);
