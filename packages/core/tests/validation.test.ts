import { describe, it, expect } from "vitest";
import {
  validatePackageName,
  validateVersionCode,
  validateLanguageCode,
  validateTrackName,
  validateSku,
} from "../src/utils/validation.js";
import { GpcError } from "../src/errors.js";

describe("validatePackageName", () => {
  it("accepts valid package names", () => {
    expect(() => validatePackageName("com.example.myapp")).not.toThrow();
    expect(() => validatePackageName("com.example.app123")).not.toThrow();
    expect(() => validatePackageName("io.github.user.app")).not.toThrow();
    expect(() => validatePackageName("com.example.my_app")).not.toThrow();
  });

  it("rejects empty string", () => {
    expect(() => validatePackageName("")).toThrow(GpcError);
  });

  it("rejects single segment", () => {
    expect(() => validatePackageName("myapp")).toThrow(GpcError);
  });

  it("rejects names starting with number", () => {
    expect(() => validatePackageName("1com.example.app")).toThrow(GpcError);
  });

  it("rejects names with spaces", () => {
    expect(() => validatePackageName("com.example. app")).toThrow(GpcError);
  });

  it("includes suggestion in error", () => {
    try {
      validatePackageName("invalid");
    } catch (e) {
      expect((e as GpcError).code).toBe("INVALID_PACKAGE_NAME");
      expect((e as GpcError).exitCode).toBe(2);
      expect((e as GpcError).suggestion).toContain("com.example.myapp");
    }
  });
});

describe("validateVersionCode", () => {
  it("accepts valid version codes", () => {
    expect(() => validateVersionCode(1)).not.toThrow();
    expect(() => validateVersionCode(142)).not.toThrow();
    expect(() => validateVersionCode("100")).not.toThrow();
  });

  it("rejects zero", () => {
    expect(() => validateVersionCode(0)).toThrow(GpcError);
  });

  it("rejects negative numbers", () => {
    expect(() => validateVersionCode(-1)).toThrow(GpcError);
  });

  it("rejects non-integer strings", () => {
    expect(() => validateVersionCode("abc")).toThrow(GpcError);
  });

  it("rejects float values", () => {
    expect(() => validateVersionCode(1.5)).toThrow(GpcError);
  });
});

describe("validateLanguageCode", () => {
  it("accepts valid Google Play language codes", () => {
    expect(() => validateLanguageCode("en-US")).not.toThrow();
    expect(() => validateLanguageCode("ja-JP")).not.toThrow();
    expect(() => validateLanguageCode("fr-FR")).not.toThrow();
    expect(() => validateLanguageCode("af")).not.toThrow();
  });

  it("rejects empty string", () => {
    expect(() => validateLanguageCode("")).toThrow(GpcError);
  });

  it("rejects unsupported codes", () => {
    expect(() => validateLanguageCode("xx-YY")).toThrow(GpcError);
  });

  it("includes suggestion in error", () => {
    try {
      validateLanguageCode("invalid");
    } catch (e) {
      expect((e as GpcError).code).toBe("INVALID_LANGUAGE_CODE");
      expect((e as GpcError).suggestion).toContain("BCP-47");
    }
  });
});

describe("validateTrackName", () => {
  it("accepts standard tracks", () => {
    expect(() => validateTrackName("internal")).not.toThrow();
    expect(() => validateTrackName("alpha")).not.toThrow();
    expect(() => validateTrackName("beta")).not.toThrow();
    expect(() => validateTrackName("production")).not.toThrow();
  });

  it("accepts custom track names", () => {
    expect(() => validateTrackName("my-custom-track")).not.toThrow();
    expect(() => validateTrackName("qa_team")).not.toThrow();
    expect(() => validateTrackName("stage01")).not.toThrow();
  });

  it("rejects empty string", () => {
    expect(() => validateTrackName("")).toThrow(GpcError);
  });

  it("rejects names with spaces", () => {
    expect(() => validateTrackName("my track")).toThrow(GpcError);
  });

  it("rejects names with special characters", () => {
    expect(() => validateTrackName("track@1")).toThrow(GpcError);
  });
});

describe("validateSku", () => {
  it("accepts valid SKUs", () => {
    expect(() => validateSku("premium_upgrade")).not.toThrow();
    expect(() => validateSku("com.example.coins100")).not.toThrow();
    expect(() => validateSku("monthly.plan.v2")).not.toThrow();
  });

  it("rejects empty string", () => {
    expect(() => validateSku("")).toThrow(GpcError);
  });

  it("rejects SKUs with spaces", () => {
    expect(() => validateSku("my product")).toThrow(GpcError);
  });

  it("rejects SKUs with special characters", () => {
    expect(() => validateSku("product@1")).toThrow(GpcError);
  });

  it("includes suggestion in error", () => {
    try {
      validateSku("");
    } catch (e) {
      expect((e as GpcError).code).toBe("INVALID_SKU");
      expect((e as GpcError).suggestion).toContain("premium_upgrade");
    }
  });
});
