import { defineConfig } from "tsup";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pkg = require("./package.json") as { version: string };

export default defineConfig({
  entry: ["src/index.ts", "src/bin.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
  define: {
    "process.env.__GPC_VERSION": JSON.stringify(pkg.version),
    // The npm build is never the standalone binary; pin this so an env var
    // cannot switch off proxy setup or change install detection.
    "process.env.__GPC_BINARY": '"0"',
  },
});
