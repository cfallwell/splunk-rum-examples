import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(here);

const releaseArg = process.argv[2];
const githubApiUrl =
  "https://api.github.com/repos/signalfx/rum-browser-js/releases?per_page=100";

const fetchReleaseOptions = async () => {
  const response = await fetch(githubApiUrl, {
    headers: { "User-Agent": "splunk-rum-examples-updater" },
  });
  if (!response.ok) {
    throw new Error(
      `Failed to load SignalFx releases: ${response.status} ${response.statusText}`
    );
  }

  const releases = await response.json();
  return releases
    .filter((release) => !release.draft && !release.prerelease && release.tag_name !== "latest")
    .map((release) => release.tag_name);
};

const selectRelease = async (availableReleases) => {
  console.log("Available SignalFx RUM releases:");
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
    throw new Error("No SignalFx releases were returned from GitHub.");
  }

  let release;
  if (!releaseArg) {
    if (!input.isTTY || !output.isTTY) {
      throw new Error(
        "No release was provided and no interactive terminal is available. Re-run with a concrete release like v2.3.0."
      );
    }
    release = await selectRelease(availableReleases);
  } else {
    const normalizedRelease = releaseArg.startsWith("v") ? releaseArg : `v${releaseArg}`;
    if (normalizedRelease === "latest") {
      throw new Error('The "latest" alias is not supported. Choose a concrete release instead.');
    }
    if (!availableReleases.includes(normalizedRelease)) {
      throw new Error(
        `Unknown SignalFx release "${releaseArg}". Run the script without arguments to choose from the published list.`
      );
    }
    release = normalizedRelease;
  }

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

  console.log(`Updated embedded SignalFx scripts to ${release}.`);
};

await main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
