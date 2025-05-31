const config = {
  compilationOptions: {
    preferredConfigPath: "./tsconfig.json",
  },
  entries: [
    {
      filePath: "./src/index.ts",
      outFile: "./build/index.d.ts",
      noCheck: false,
      output: { exportReferencedTypes: false },
    },
    {
      filePath: "./src/samplers/index.ts",
      outFile: "./build/samplers/index.d.ts",
      noCheck: false,
      output: { exportReferencedTypes: false },
    },
    {
      filePath: "./src/utils/index.ts",
      outFile: "./build/utils/index.d.ts",
      noCheck: false,
      output: { exportReferencedTypes: false },
    },
    {
      filePath: "./src/frames/index.ts",
      outFile: "./build/frames/index.d.ts",
      noCheck: false,
      output: { exportReferencedTypes: false },
    },
    {
      filePath: "./src/constraints/index.ts",
      outFile: "./build/constraints/index.d.ts",
      noCheck: false,
      output: { exportReferencedTypes: false },
    },
    {
      filePath: "./src/constraints/forces/index.ts",
      outFile: "./build/constraints/forces/index.d.ts",
      noCheck: false,
      output: { exportReferencedTypes: false },
    },
  ],
};

module.exports = config;
