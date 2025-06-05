import fs from "fs";
import path from "path";

const filesToCopy = [
  { src: "package.build.json", dest: "package.json" },
  { src: "README.md", dest: "README.md" },
  { src: "LICENSE", dest: "LICENSE" },
];

const destDir = path.resolve("build");

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

for (const file of filesToCopy) {
  const srcPath = path.resolve(file.src);
  const destPath = path.join(destDir, file.dest);

  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${file.src} → build/${file.dest}`);
  } else {
    console.warn(`Skipped: ${file.src} does not exist.`);
  }
}