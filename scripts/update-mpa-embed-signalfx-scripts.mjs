import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(here);

const releaseArg = process.argv[2];
const objectStoreBaseUrl = "https://artifactory.company.com/signalfx/rum-scripts/releases/";

const normalizeBaseUrl = (value) => (value.endsWith("/") ? value : `${value}/`);

const parseReleaseOptions = (html) => {
  const matches = [...html.matchAll(/href="([^"]+)"/g)];
  const releases = matches
    .map((match) => match[1])
    .filter((href) => href && href !== "../")
    .map((href) => href.replace(/\/$/, ""))
    .filter((href) => /^v?\d+\.\d+\.\d+$/.test(href))
    .map((href) => (href.startsWith("v") ? href : `v${href}`));

  return [...new Set(releases)].sort((left, right) =>
    right.localeCompare(left, undefined, { numeric: true, sensitivity: "base" })
  );
};

const fetchReleaseOptions = async () => {
  const response = await fetch(objectStoreBaseUrl, {
    headers: { "User-Agent": "splunk-rum-examples-mpa-embed-updater" },
  });
  if (!response.ok) {
    throw new Error(
      `Failed to load internal SignalFx releases from ${objectStoreBaseUrl}: ${response.status} ${response.statusText}`
    );
  }

  return parseReleaseOptions(await response.text());
};

const selectRelease = async (availableReleases) => {
  console.log("Available internal SignalFx RUM releases:");
  availableReleases.forEach((release, index) => {
    console.log(`${index + 1}. ${release}`);
  });

  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question("Select a release number: ");
    const selectedIndex = Number.parseInt(answer, 10);
    if (
      !Number.isInteger(selectedIndex) ||
      selectedIndex < 1 ||
      selectedIndex > availableReleases.length
    ) {
      throw new Error(
        `Invalid selection "${answer}". Choose a number between 1 and ${availableReleases.length}.`
      );
    }

    return availableReleases[selectedIndex - 1];
  } finally {
    rl.close();
  }
};

const main = async () => {
  const availableReleases = await fetchReleaseOptions();
  if (availableReleases.length === 0) {
    throw new Error("No internal SignalFx releases were returned from the object store.");
  }

  let release;
  if (!releaseArg) {
    if (!input.isTTY || !output.isTTY) {
      throw new Error(
        "No release was provided and no interactive terminal is available. Re-run with a concrete release like v1.0.0."
      );
    }
    release = await selectRelease(availableReleases);
  } else {
    const normalizedRelease = releaseArg.startsWith("v") ? releaseArg : `v${releaseArg}`;
    if (!availableReleases.includes(normalizedRelease)) {
      throw new Error(
        `Unknown internal SignalFx release "${releaseArg}". Run the script without arguments to choose from the available list.`
      );
    }
    release = normalizedRelease;
  }

  const releaseBaseUrl = `${normalizeBaseUrl(objectStoreBaseUrl)}${release}`;
  const fetchedAt = new Date().toISOString().slice(0, 10);
  const targets = {
    rum: {
      url: `${releaseBaseUrl}/splunk-otel-web.js`,
      path: join(repoRoot, "mpa-embed/src/signalfx/splunk-otel-web.min.js"),
    },
    sessionReplay: {
      url: `${releaseBaseUrl}/splunk-otel-web-session-recorder.js`,
      path: join(repoRoot, "mpa-embed/src/signalfx/splunk-otel-web-session-recorder.min.js"),
    },
  };

  mkdirSync(join(repoRoot, "mpa-embed/src/signalfx"), { recursive: true });

  const download = async (url, outputPath) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
    }

    const body = await response.text();
    writeFileSync(outputPath, body);
  };

  await download(targets.rum.url, targets.rum.path);
  await download(targets.sessionReplay.url, targets.sessionReplay.path);

  const manifest = {
    release,
    source: releaseBaseUrl,
    fetchedAt,
  };

  writeFileSync(
    join(repoRoot, "mpa-embed/src/signalfx/manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`
  );

  const generate = spawnSync("node", ["scripts/generate-mpa-embed.mjs"], {
    cwd: repoRoot,
    stdio: "inherit",
  });

  if (generate.status !== 0) {
    process.exit(generate.status ?? 1);
  }

  console.log(`Updated mpa-embed SignalFx scripts to ${release}.`);
};

await main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
