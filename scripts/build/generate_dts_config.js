import fs from "fs";
import path from "path";

const dts_entries = [];
const buildDir = "./build/dist";
const dir = "src";
const dtsFilePath = path.join("dts-bundle-generator.config.json");

function walk(currentDir) {
  const items = fs.readdirSync(currentDir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(currentDir, item.name);
    if (item.isDirectory()) {
      walk(fullPath);
    } else if (item.isFile() && item.name === "index.ts") {
      const rel = path.relative(dir, path.dirname(fullPath));
      const key = rel.replace(/\\/g, "/");
      const outfile = key ? path.join(buildDir, key, "index.d.ts") : path.join(buildDir, "index.d.ts");
      dts_entries.push({
        filePath: fullPath.replace(/\\/g, "/"),
        outFile: outfile.replace(/\\/g, "/"),
        noCheck: false,
        output: { exportReferencedTypes: false },
      });
    }
  }
}

walk(dir);

const dtsConfigFile = JSON.parse(fs.readFileSync(dtsFilePath, "utf8"));
dtsConfigFile.entries = dts_entries;
fs.writeFileSync(dtsFilePath, JSON.stringify(dtsConfigFile, null, 2));
