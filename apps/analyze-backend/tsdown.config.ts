import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "src/server.ts",
  format: ["esm"],
  deps: {
    alwaysBundle: ["@japanese-tts-analyzer/accent-ir"],
  },
  clean: true,
  dts: false,
});
