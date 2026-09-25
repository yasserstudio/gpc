import { describe, it, expect } from "vitest";
import protobuf from "protobufjs";
import { isInstallTimeModule } from "../src/preflight/manifest-parser";

const DIST = "http://schemas.android.com/apk/distribution";

interface El {
  name: string;
  attrs?: Array<{ name: string; value: string; bool?: boolean }>;
  children?: El[];
}

/** Encode a module manifest with the AAPT2 XmlNode field numbers the parser decodes. */
function encode(root: El): Buffer {
  const pb = protobuf.Root.fromJSON({
    nested: {
      Primitive: { fields: { booleanValue: { type: "bool", id: 8 } } },
      Item: { fields: { prim: { type: "Primitive", id: 7 } } },
      XmlAttribute: {
        fields: {
          namespaceUri: { type: "string", id: 1 },
          name: { type: "string", id: 2 },
          value: { type: "string", id: 3 },
          compiledItem: { type: "Item", id: 6 },
        },
      },
      XmlElement: {
        fields: {
          namespaceUri: { type: "string", id: 2 },
          name: { type: "string", id: 3 },
          attribute: { rule: "repeated", type: "XmlAttribute", id: 4 },
          child: { rule: "repeated", type: "XmlNode", id: 5 },
        },
      },
      XmlNode: { fields: { element: { type: "XmlElement", id: 1 } } },
    },
  });
  const toNode = (el: El): object => ({
    element: {
      namespaceUri: el.name === "manifest" ? "" : DIST,
      name: el.name,
      attribute: (el.attrs ?? []).map((a) => ({
        namespaceUri: DIST,
        name: a.name,
        value: a.value,
        ...(a.bool !== undefined ? { compiledItem: { prim: { booleanValue: a.bool } } } : {}),
      })),
      child: (el.children ?? []).map(toNode),
    },
  });
  const XmlNode = pb.lookupType("XmlNode");
  return Buffer.from(XmlNode.encode(XmlNode.fromObject(toNode(root))).finish());
}

const manifest = (module?: El): Buffer =>
  encode({ name: "manifest", children: module ? [module] : [] });
const delivery = (...modes: El[]): El => ({ name: "delivery", children: modes });

describe("isInstallTimeModule", () => {
  it("treats <dist:install-time> as part of the first download", () => {
    const buf = manifest({ name: "module", children: [delivery({ name: "install-time" })] });
    expect(isInstallTimeModule(buf)).toBe(true);
  });

  it("treats conditional install-time delivery as part of the first download", () => {
    const buf = manifest({
      name: "module",
      children: [delivery({ name: "install-time", children: [{ name: "conditions" }] })],
    });
    expect(isInstallTimeModule(buf)).toBe(true);
  });

  it("excludes a module with an empty <dist:delivery> (bundletool: no initial install)", () => {
    expect(isInstallTimeModule(manifest({ name: "module", children: [delivery()] }))).toBe(false);
  });

  it("excludes on-demand modules", () => {
    const buf = manifest({ name: "module", children: [delivery({ name: "on-demand" })] });
    expect(isInstallTimeModule(buf)).toBe(false);
  });

  it("excludes fast-follow asset packs", () => {
    const buf = manifest({
      name: "module",
      attrs: [{ name: "type", value: "asset-pack" }],
      children: [delivery({ name: "fast-follow" })],
    });
    expect(isInstallTimeModule(buf)).toBe(false);
  });

  it("honors the legacy dist:onDemand attribute", () => {
    expect(
      isInstallTimeModule(
        manifest({ name: "module", attrs: [{ name: "onDemand", value: "true", bool: true }] }),
      ),
    ).toBe(false);
    expect(
      isInstallTimeModule(
        manifest({ name: "module", attrs: [{ name: "onDemand", value: "false", bool: false }] }),
      ),
    ).toBe(true);
  });

  it("defaults to install-time when no delivery is declared", () => {
    expect(isInstallTimeModule(manifest({ name: "module" }))).toBe(true);
    expect(isInstallTimeModule(manifest())).toBe(true);
  });

  it("throws on a buffer that is not a manifest", () => {
    expect(() => isInstallTimeModule(encode({ name: "resources" }))).toThrow();
  });
});
