import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(here);

const releaseArg = process.argv[2];

if (!releaseArg) {
  console.error("Usage: node scripts/update-signalfx-scripts.mjs <release>");
  process.exit(1);
}

const release =
  releaseArg === "latest" || releaseArg.startsWith("v") ? releaseArg : `v${releaseArg}`;
const signalfxBaseUrl = `https://cdn.signalfx.com/o11y-gdi-rum/${release}`;
const fetchedAt = new Date().toISOString().slice(0, 10);
const targets = {
  rum: {
    url: `${signalfxBaseUrl}/splunk-otel-web.js`,
    spaPath: join(repoRoot, "spa-npm/src/signalfx/splunk-otel-web.min.js"),
    mpaPath: join(repoRoot, "mpa-script/src/signalfx/splunk-otel-web.min.js"),
  },
  sessionReplay: {
    url: `${signalfxBaseUrl}/splunk-otel-web-session-recorder.js`,
    spaPath: join(repoRoot, "spa-npm/src/signalfx/splunk-otel-web-session-recorder.min.js"),
    mpaPath: join(repoRoot, "mpa-script/src/signalfx/splunk-otel-web-session-recorder.min.js"),
  },
};

mkdirSync(join(repoRoot, "spa-npm/src/signalfx"), { recursive: true });
mkdirSync(join(repoRoot, "mpa-script/src/signalfx"), { recursive: true });

const download = async (url, outputPath) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  const body = await response.text();
  writeFileSync(outputPath, body);
};

await download(targets.rum.url, targets.rum.spaPath);
await download(targets.sessionReplay.url, targets.sessionReplay.spaPath);
copyFileSync(targets.rum.spaPath, targets.rum.mpaPath);
copyFileSync(targets.sessionReplay.spaPath, targets.sessionReplay.mpaPath);

const manifest = {
  release,
  source: signalfxBaseUrl,
  fetchedAt,
};

writeFileSync(
  join(repoRoot, "spa-npm/src/signalfx/manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`
);
writeFileSync(
  join(repoRoot, "mpa-script/src/signalfx/manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`
);

const generate = spawnSync("node", ["scripts/generate-rum-embeds.mjs"], {
  cwd: repoRoot,
  stdio: "inherit",
});

if (generate.status !== 0) {
  process.exit(generate.status ?? 1);
}
