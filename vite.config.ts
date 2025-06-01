import { defineConfig } from "vite";
import path from "path";
import fs from "fs";
import packageJson from "./package.json";

function getEntryPoints(dir = "src") {
  const entries: Record<string, string> = {};

  function walk(currentDir: string) {
    const items = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(currentDir, item.name);
      if (item.isDirectory()) {
        walk(fullPath);
      } else if (item.isFile() && item.name === "index.ts") {
        const rel = path.relative(dir, path.dirname(fullPath));
        const key = rel === "" ? "index" : rel.replace(/\\/g, "/");
        entries[key] = path.resolve(fullPath);
      }
    }
  }

  walk(dir);
  return entries;
}

export default defineConfig({
  build: {
    outDir: "build/dist",
    target: "esnext",
    lib: {
      entry: getEntryPoints("src"),
      formats: ["es", "cjs"],
      fileName: (format, entryName) => {
        const ext = format === "es" ? "js" : "cjs";
        return entryName === "index" ? `index.${ext}` : `${entryName}/index.${ext}`;
      },
    },
    minify: false,
    rollupOptions: {
      external: Object.keys(packageJson.dependencies || {}),
    },
    emptyOutDir: false,
  },
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "src") },
      { find: "@@", replacement: path.resolve(__dirname) },
    ],
  },
});
