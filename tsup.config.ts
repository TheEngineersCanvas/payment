import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/public-api/index.ts",
    "adapters/nestjs/index": "src/adapters/nestjs/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
});
