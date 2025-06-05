import fs from "fs";
import path from "path";

const esmRoot = "build/dist/esm";
const cjsRoot = "build/dist/cjs";
const outRoot = "build/dist";

function copyFiles(srcDir, ext, replaceExt = null, baseRoot = esmRoot) {
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const relPath = path.relative(baseRoot, srcPath);
    const destPath = path.join(outRoot, replaceExt ? relPath.replace(new RegExp(`${ext}$`), replaceExt) : relPath);

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyFiles(srcPath, ext, replaceExt, baseRoot);
    } else if (entry.isFile() && entry.name.endsWith(ext)) {
      const targetDir = path.dirname(destPath);
      fs.mkdirSync(targetDir, { recursive: true });
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy esm .js → .js
copyFiles(esmRoot, ".js");

// Copy cjs .js → .cjs
copyFiles(cjsRoot, ".js", ".cjs", cjsRoot);

// Copy types
copyFiles(esmRoot, ".d.ts");
copyFiles(esmRoot, ".d.ts.map");
