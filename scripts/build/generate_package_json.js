import fs from "fs";
import path from "path";

const distDir = "build/dist";
const packageJsonPath = path.join("build", "package.json");

/**
 * Recursively finds all `index.js` files and returns a map of export paths
 */
function collectExports(dir, baseDir = dir) {
  const exportsMap = {};
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      Object.assign(exportsMap, collectExports(fullPath, baseDir));
    } else if (entry.isFile() && entry.name === "index.js") {
      const relDir = path.relative(baseDir, path.dirname(fullPath)).replace(/\\/g, "/");
      const subpath = relDir === "" ? "." : `./${relDir}`;
      const filePrefix = relDir === "" ? "dist/" : `dist/${relDir}/`;

      exportsMap[subpath] = {
        import: `./${filePrefix}index.js`,
        require: `./${filePrefix}index.cjs`,
        types: `./${filePrefix}index.d.ts`,
      };
    }
  }

  return exportsMap;
}

/**
 * Main script to update the `exports` field
 */
function updatePackageJson() {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const updatedExports = collectExports(distDir);
  pkg.exports = updatedExports;
  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2));
  console.log("✅ package.json exports field updated.");
}

updatePackageJson();
