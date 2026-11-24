const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const sourcePath = path.join(root, "docs", "BIMS_DATABASE_DIAGRAMS.md");
const outputDirectory = path.join(root, "docs", "diagram-png");
const mermaidCli = path.join(
  __dirname,
  "node_modules",
  "@mermaid-js",
  "mermaid-cli",
  "src",
  "cli.js"
);
const source = fs.readFileSync(sourcePath, "utf8");
const lines = source.split(/\r?\n/);
const diagrams = [];
let section = "";
let diagramLines = null;

for (const line of lines) {
  if (diagramLines === null) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      section = heading[1];
    }

    if (line.trim() === "```mermaid") {
      diagramLines = [];
    }
    continue;
  }

  if (line.trim() === "```") {
    const diagram = diagramLines.join("\n");
    const kind = diagram.match(/^\s*(erDiagram|flowchart)\b/);
    if (!kind) {
      throw new Error(`Unknown Mermaid diagram in section "${section}".`);
    }

    const sectionSlug = section
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const kindSlug = kind[1] === "erDiagram" ? "erd" : "flowchart";
    diagrams.push({
      name: sectionSlug === "whole-database-erd"
        ? sectionSlug
        : `${sectionSlug}-${kindSlug}`,
      source: diagram,
    });
    diagramLines = null;
    continue;
  }

  diagramLines.push(line);
}

if (diagramLines !== null) {
  throw new Error("Unclosed Mermaid code block in the diagrams document.");
}
if (diagrams.length !== 25) {
  throw new Error(`Expected 25 Mermaid diagrams, found ${diagrams.length}.`);
}

fs.mkdirSync(outputDirectory, { recursive: true });
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bims-diagrams-"));

try {
  for (const [index, diagram] of diagrams.entries()) {
    const inputPath = path.join(temporaryDirectory, `${index}.mmd`);
    const outputPath = path.join(outputDirectory, `${diagram.name}.png`);
    fs.writeFileSync(inputPath, diagram.source, "utf8");
    execFileSync(
      process.execPath,
      [
        mermaidCli,
        "--input",
        inputPath,
        "--output",
        outputPath,
        "--scale",
        "4",
        "--backgroundColor",
        "white",
      ],
      { stdio: "inherit" }
    );
    console.log(`Exported ${path.relative(root, outputPath)}`);
  }
} finally {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
}
