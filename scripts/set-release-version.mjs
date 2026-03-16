import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.dirname(here);
const packageJsonPath = path.join(repoRoot, "spa-npm/package.json");

const nextVersion = process.argv[2]?.trim().replace(/^v/, "");

if (!nextVersion) {
  console.error("Usage: node scripts/set-release-version.mjs <version>");
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
packageJson.version = nextVersion;
fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");

const run = (cmd, args, cwd) => {
  const result = spawnSync(cmd, args, { cwd, stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

run("node", ["scripts/generate-rum-embeds.mjs"], repoRoot);
run("npm", ["run", "sync:description"], path.join(repoRoot, "spa-npm"));
