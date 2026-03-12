import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const PACKAGES_DIR = join(import.meta.dirname, "..", "..", "..");
const DEV_ONLY_DEPS = ["vitest", "tsup", "typescript", "eslint", "prettier", "@types/node"];

interface PackageJson {
  name: string;
  type?: string;
  exports?: Record<string, unknown>;
  files?: string[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  publishConfig?: { access?: string };
  [key: string]: unknown;
}

function loadPackageJsons(): PackageJson[] {
  const packages: PackageJson[] = [];

  // packages/*
  const packagesDir = join(PACKAGES_DIR, "packages");
  for (const dir of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    try {
      const raw = readFileSync(join(packagesDir, dir.name, "package.json"), "utf-8");
      packages.push(JSON.parse(raw));
    } catch {
      // skip if no package.json
    }
  }

  // plugins/*
  const pluginsDir = join(PACKAGES_DIR, "plugins");
  try {
    for (const dir of readdirSync(pluginsDir, { withFileTypes: true })) {
      if (!dir.isDirectory()) continue;
      try {
        const raw = readFileSync(join(pluginsDir, dir.name, "package.json"), "utf-8");
        packages.push(JSON.parse(raw));
      } catch {
        // skip
      }
    }
  } catch {
    // plugins dir may not exist
  }

  return packages;
}

describe("package.json validation", () => {
  const packages = loadPackageJsons();

  it("found packages to validate", () => {
    expect(packages.length).toBeGreaterThanOrEqual(6);
  });

  it("every package has publishConfig.access set to public", () => {
    for (const pkg of packages) {
      expect(
        pkg.publishConfig?.access,
        `${pkg.name} missing publishConfig.access: "public"`,
      ).toBe("public");
    }
  });

  it('every package has "type": "module"', () => {
    for (const pkg of packages) {
      expect(pkg.type, `${pkg.name} missing "type": "module"`).toBe("module");
    }
  });

  it("every package has an exports field", () => {
    for (const pkg of packages) {
      expect(pkg.exports, `${pkg.name} missing "exports" field`).toBeDefined();
      expect(typeof pkg.exports, `${pkg.name} exports should be an object`).toBe("object");
    }
  });

  it('every package has "files" including "dist"', () => {
    for (const pkg of packages) {
      expect(pkg.files, `${pkg.name} missing "files" field`).toBeDefined();
      expect(Array.isArray(pkg.files), `${pkg.name} files should be an array`).toBe(true);
      expect(pkg.files, `${pkg.name} files should include "dist"`).toContain("dist");
    }
  });

  it("no devDependencies leak into dependencies", () => {
    for (const pkg of packages) {
      const deps = pkg.dependencies ?? {};
      for (const devDep of DEV_ONLY_DEPS) {
        expect(
          deps[devDep],
          `${pkg.name} has dev-only dependency "${devDep}" in dependencies`,
        ).toBeUndefined();
      }
    }
  });

  it("every package has a description", () => {
    for (const pkg of packages) {
      expect(
        typeof pkg.description === "string" && pkg.description.length > 0,
        `${pkg.name} missing or empty description`,
      ).toBe(true);
    }
  });

  it("every package has a license field", () => {
    for (const pkg of packages) {
      expect(pkg.license, `${pkg.name} missing license field`).toBe("MIT");
    }
  });
});
