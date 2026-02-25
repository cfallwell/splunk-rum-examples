import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const packageJsonPath = path.join(rootDir, "package.json");

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const version = String(packageJson.version || "").trim().replace(/^v/, "");
const changelogPath = path.join(rootDir, packageJson.changelog || "CHANGELOG.md");
const readmePath = path.join(rootDir, "README.md");

if (!version) {
  throw new Error("package.json version is missing.");
}

if (!fs.existsSync(changelogPath)) {
  throw new Error(`Changelog not found: ${changelogPath}`);
}

const changelog = fs.readFileSync(changelogPath, "utf8");
const lines = changelog.split(/\r?\n/);
const versionHeading = `## ${version}`;
const versionHeadingAlt = `## v${version}`;

const startIndex = lines.findIndex((line) => {
  const trimmed = line.trim();
  return trimmed === versionHeading || trimmed === versionHeadingAlt;
});

if (startIndex < 0) {
  throw new Error(`No changelog heading found for version ${version}.`);
}

const sectionLines = [];
for (let i = startIndex + 1; i < lines.length; i += 1) {
  const line = lines[i].trim();
  if (line.startsWith("## ")) break;
  if (!line) continue;
  sectionLines.push(line);
}

const bulletLines = sectionLines
  .filter((line) => line.startsWith("- "))
  .map((line) => line.replace(/^- /, "").replace(/`/g, "").trim());

const summarySource = bulletLines.length > 0 ? bulletLines : sectionLines;
if (summarySource.length === 0) {
  throw new Error(`No release notes found for version ${version} in changelog.`);
}

const primary = summarySource[0].replace(/\s+/g, " ").trim();
const extraCount = Math.max(0, summarySource.length - 1);

let description = `v${version}: ${primary}`;
if (extraCount > 0) {
  description += ` (+${extraCount} more updates in CHANGELOG.md)`;
}

const maxDescriptionLength = 240;
if (description.length > maxDescriptionLength) {
  description = `${description.slice(0, maxDescriptionLength - 3).trim()}...`;
}

if (packageJson.description !== description) {
  packageJson.description = description;
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
  // eslint-disable-next-line no-console
  console.log(`Updated package description for v${version}`);
}

if (fs.existsSync(readmePath)) {
  const releaseBlock = [
    "<!-- release:auto:start -->",
    `- Current version: \`v${version}\``,
    `- Latest update: ${primary}`,
    `- Additional updates: ${extraCount} (see \`CHANGELOG.md\`)`,
    "<!-- release:auto:end -->",
  ].join("\n");

  const readme = fs.readFileSync(readmePath, "utf8");
  const blockRegex = /<!-- release:auto:start -->[\s\S]*?<!-- release:auto:end -->/m;

  let nextReadme;
  if (blockRegex.test(readme)) {
    nextReadme = readme.replace(blockRegex, releaseBlock);
  } else {
    const anchor = "## Changelog";
    const anchorIndex = readme.indexOf(anchor);
    if (anchorIndex >= 0) {
      const insertAt = readme.indexOf("\n", anchorIndex);
      const splitIndex = insertAt >= 0 ? insertAt + 1 : readme.length;
      nextReadme = `${readme.slice(0, splitIndex)}\n${releaseBlock}\n${readme.slice(splitIndex)}`;
    } else {
      nextReadme = `${readme}\n\n${releaseBlock}\n`;
    }
  }

  if (nextReadme !== readme) {
    fs.writeFileSync(readmePath, nextReadme, "utf8");
    // eslint-disable-next-line no-console
    console.log(`Updated README release block for v${version}`);
  }
}
