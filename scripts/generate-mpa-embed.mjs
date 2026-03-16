import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(here);

const readUtf8 = (relativePath) => readFileSync(join(repoRoot, relativePath), "utf8");
const readJson = (relativePath) => JSON.parse(readUtf8(relativePath));
const readBase64 = (relativePath) => readFileSync(join(repoRoot, relativePath)).toString("base64");
const writeUtf8 = (relativePath, value) => writeFileSync(join(repoRoot, relativePath), value);

const signalfxManifest = readJson("mpa-embed/src/signalfx/manifest.json");
const localBootstrapVersion = readJson("spa-npm/package.json").version;

const signalfxRumBase64 = readBase64("mpa-embed/src/signalfx/splunk-otel-web.min.js");
const signalfxSessionReplayBase64 = readBase64(
  "mpa-embed/src/signalfx/splunk-otel-web-session-recorder.min.js"
);

const mpaTemplate = readUtf8("mpa-embed/src/rumbootstrap.template.js");
const mpaOutput = mpaTemplate
  .replace("__LOCAL_RUM_BOOTSTRAP_VERSION__", localBootstrapVersion)
  .replace("__SIGNALFX_RELEASE__", signalfxManifest.release)
  .replace("__SIGNALFX_SOURCE__", signalfxManifest.source)
  .replace("__SIGNALFX_FETCHED_AT__", signalfxManifest.fetchedAt)
  .replace("__SIGNALFX_RUM_SCRIPT_BASE64__", signalfxRumBase64)
  .replace("__SIGNALFX_SESSION_REPLAY_SCRIPT_BASE64__", signalfxSessionReplayBase64);

writeUtf8("mpa-embed/rumbootstrap.js", mpaOutput);
