import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface ScaffoldOptions {
  name: string;
  dir: string;
  description?: string;
}

export interface ScaffoldResult {
  dir: string;
  files: string[];
}

/**
 * Scaffold a new GPC plugin project.
 */
export async function scaffoldPlugin(options: ScaffoldOptions): Promise<ScaffoldResult> {
  const { name, dir, description = `GPC plugin: ${name}` } = options;

  // Ensure name follows convention
  const pluginName = name.startsWith("gpc-plugin-") ? name : `gpc-plugin-${name}`;
  const shortName = pluginName.replace(/^gpc-plugin-/, "");

  const srcDir = join(dir, "src");
  const testDir = join(dir, "tests");

  await mkdir(srcDir, { recursive: true });
  await mkdir(testDir, { recursive: true });

  const files: string[] = [];

  // package.json
  const pkg = {
    name: pluginName,
    version: "0.1.0",
    description,
    type: "module",
    main: "./dist/index.js",
    types: "./dist/index.d.ts",
    exports: {
      ".": {
        import: "./dist/index.js",
        types: "./dist/index.d.ts",
      },
    },
    files: ["dist"],
    scripts: {
      build: "tsup src/index.ts --format esm --dts",
      dev: "tsup src/index.ts --format esm --dts --watch",
      test: "vitest run",
      "test:watch": "vitest",
    },
    keywords: ["gpc", "gpc-plugin", "google-play"],
    license: "MIT",
    peerDependencies: {
      "@gpc/plugin-sdk": ">=0.8.0",
    },
    devDependencies: {
      "@gpc/plugin-sdk": "^0.8.0",
      tsup: "^8.0.0",
      typescript: "^5.0.0",
      vitest: "^3.0.0",
    },
  };
  await writeFile(join(dir, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
  files.push("package.json");

  // tsconfig.json
  const tsconfig = {
    compilerOptions: {
      target: "ES2022",
      module: "ESNext",
      moduleResolution: "bundler",
      declaration: true,
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      outDir: "./dist",
      rootDir: "./src",
    },
    include: ["src"],
  };
  await writeFile(join(dir, "tsconfig.json"), JSON.stringify(tsconfig, null, 2) + "\n");
  files.push("tsconfig.json");

  // src/index.ts
  const srcContent = `import { definePlugin } from "@gpc/plugin-sdk";
import type { CommandEvent, CommandResult } from "@gpc/plugin-sdk";

export const plugin = definePlugin({
  name: "${pluginName}",
  version: "0.1.0",

  register(hooks) {
    hooks.beforeCommand(async (event: CommandEvent) => {
      // Called before every gpc command
      // Example: log command usage, validate prerequisites, etc.
    });

    hooks.afterCommand(async (event: CommandEvent, result: CommandResult) => {
      // Called after every successful gpc command
      // Example: send notifications, update dashboards, etc.
    });

    // Uncomment to add custom commands:
    // hooks.registerCommands((registry) => {
    //   registry.add({
    //     name: "${shortName}",
    //     description: "${description}",
    //     action: async (args, opts) => {
    //       console.log("Hello from ${pluginName}!");
    //     },
    //   });
    // });
  },
});
`;
  await writeFile(join(srcDir, "index.ts"), srcContent);
  files.push("src/index.ts");

  // tests/plugin.test.ts
  const testContent = `import { describe, it, expect, vi } from "vitest";
import { plugin } from "../src/index";

describe("${pluginName}", () => {
  it("has correct name and version", () => {
    expect(plugin.name).toBe("${pluginName}");
    expect(plugin.version).toBe("0.1.0");
  });

  it("registers without errors", () => {
    const hooks = {
      beforeCommand: vi.fn(),
      afterCommand: vi.fn(),
      onError: vi.fn(),
      beforeRequest: vi.fn(),
      afterResponse: vi.fn(),
      registerCommands: vi.fn(),
    };

    expect(() => plugin.register(hooks)).not.toThrow();
  });
});
`;
  await writeFile(join(testDir, "plugin.test.ts"), testContent);
  files.push("tests/plugin.test.ts");

  return { dir, files };
}
