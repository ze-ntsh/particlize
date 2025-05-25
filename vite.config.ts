import path from "path";
import { defineConfig } from "vite";
import packageJson from "./package.json";

export default defineConfig({
  build: {
    outDir: "build",
    target: "esnext",
    lib: {
      entry: {
        index: path.resolve(__dirname, "src/index.ts"),
        utils: path.resolve(__dirname, "src/utils/index.ts"),
        samplers: path.resolve(__dirname, "src/samplers/index.ts"),
      },
      formats: ["es", "cjs"],
      fileName: (format, entryName) => {
        const ext = format === "es" ? "js" : "cjs";
        return entryName === "index"
          ? `index.${ext}` // ✅ root-level output
          : `${entryName}/index.${ext}`;
      },
    },
    rollupOptions: {
      external: Object.keys(packageJson.dependencies || {}),
    },
  },
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "src") },
      { find: "@@", replacement: path.resolve(__dirname) },
    ],
  },
});
