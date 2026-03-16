import fs from "node:fs";
import path from "node:path";

const [changelogArg, versionArg, outputArg] = process.argv.slice(2);

if (!changelogArg || !versionArg || !outputArg) {
  console.error(
    "Usage: node scripts/extract-changelog-section.mjs <changelog-path> <version> <output-path>"
  );
  process.exit(1);
}

const changelogPath = path.resolve(changelogArg);
const outputPath = path.resolve(outputArg);
const version = versionArg.replace(/^v/, "");

const changelog = fs.readFileSync(changelogPath, "utf8");
const lines = changelog.split(/\r?\n/);
const headings = new Set([`## ${version}`, `## v${version}`]);
const startIndex = lines.findIndex((line) => headings.has(line.trim()));

if (startIndex < 0) {
  console.error(`No changelog heading found for version ${version}.`);
  process.exit(1);
}

const sectionLines = [];
for (let i = startIndex + 1; i < lines.length; i += 1) {
  const line = lines[i];
  if (line.trim().startsWith("## ")) break;
  sectionLines.push(line);
}

const body = sectionLines.join("\n").trim();
if (!body) {
  console.error(`No changelog content found for version ${version}.`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `## v${version}\n\n${body}\n`, "utf8");
