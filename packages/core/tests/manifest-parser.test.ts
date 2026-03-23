import { describe, it, expect } from "vitest";
import * as protobuf from "protobufjs";
import { decodeManifest } from "../src/preflight/manifest-parser";

/**
 * Build a minimal protobuf-encoded AndroidManifest.xml for testing.
 * This creates the same protobuf structure that the AAPT2 toolchain produces.
 */
function buildTestManifest(
  opts: {
    packageName?: string;
    versionCode?: number;
    versionName?: string;
    minSdk?: number;
    targetSdk?: number;
    debuggable?: boolean;
    testOnly?: boolean;
    usesCleartextTraffic?: boolean;
    permissions?: string[];
    activities?: Array<{ name: string; exported?: boolean; hasIntentFilter?: boolean }>;
    services?: Array<{ name: string; foregroundServiceType?: string }>;
  } = {},
): Buffer {
  const root = new protobuf.Root();
  const ns = root.define("aapt.pb");

  const Position = new protobuf.Type("Position")
    .add(new protobuf.Field("lineNumber", 1, "uint32"))
    .add(new protobuf.Field("columnNumber", 2, "uint32"));
  const Source = new protobuf.Type("Source")
    .add(new protobuf.Field("pathIdx", 1, "uint32"))
    .add(new protobuf.Field("position", 2, "Position"));
  const Primitive = new protobuf.Type("Primitive").add(
    new protobuf.OneOf("oneofValue")
      .add(new protobuf.Field("intDecimalValue", 6, "int32"))
      .add(new protobuf.Field("intHexadecimalValue", 7, "uint32"))
      .add(new protobuf.Field("booleanValue", 8, "bool"))
      .add(new protobuf.Field("floatValue", 11, "float")),
  );
  const Reference = new protobuf.Type("Reference")
    .add(new protobuf.Field("id", 1, "uint32"))
    .add(new protobuf.Field("name", 2, "string"));
  const StringMsg = new protobuf.Type("String").add(new protobuf.Field("value", 1, "string"));
  const Item = new protobuf.Type("Item").add(
    new protobuf.OneOf("value")
      .add(new protobuf.Field("ref", 1, "Reference"))
      .add(new protobuf.Field("str", 2, "String"))
      .add(new protobuf.Field("prim", 4, "Primitive")),
  );
  const XmlAttribute = new protobuf.Type("XmlAttribute")
    .add(new protobuf.Field("namespaceUri", 1, "string"))
    .add(new protobuf.Field("name", 2, "string"))
    .add(new protobuf.Field("value", 3, "string"))
    .add(new protobuf.Field("source", 4, "Source"))
    .add(new protobuf.Field("resourceId", 5, "uint32"))
    .add(new protobuf.Field("compiledItem", 6, "Item"));
  const XmlNamespace = new protobuf.Type("XmlNamespace")
    .add(new protobuf.Field("prefix", 1, "string"))
    .add(new protobuf.Field("uri", 2, "string"))
    .add(new protobuf.Field("source", 3, "Source"));
  const XmlElement = new protobuf.Type("XmlElement")
    .add(new protobuf.Field("namespaceDeclaration", 1, "XmlNamespace", "repeated"))
    .add(new protobuf.Field("namespaceUri", 2, "string"))
    .add(new protobuf.Field("name", 3, "string"))
    .add(new protobuf.Field("attribute", 4, "XmlAttribute", "repeated"))
    .add(new protobuf.Field("child", 5, "XmlNode", "repeated"));
  const XmlNode = new protobuf.Type("XmlNode")
    .add(
      new protobuf.OneOf("node")
        .add(new protobuf.Field("element", 1, "XmlElement"))
        .add(new protobuf.Field("text", 2, "string")),
    )
    .add(new protobuf.Field("source", 3, "Source"));

  ns.add(Position)
    .add(Source)
    .add(Primitive)
    .add(Reference)
    .add(StringMsg)
    .add(Item)
    .add(XmlAttribute)
    .add(XmlNamespace)
    .add(XmlElement)
    .add(XmlNode);

  function attr(name: string, resourceId: number, value: string, compiled?: object): object {
    const a: Record<string, unknown> = {
      namespaceUri: "http://schemas.android.com/apk/res/android",
      name,
      value,
      resourceId,
    };
    if (compiled) a["compiledItem"] = compiled;
    return a;
  }

  function intPrim(val: number): object {
    return { prim: { intDecimalValue: val } };
  }

  function boolPrim(val: boolean): object {
    return { prim: { booleanValue: val } };
  }

  function strItem(val: string): object {
    return { str: { value: val } };
  }

  // Build manifest tree
  const children: object[] = [];

  // <uses-sdk>
  children.push({
    element: {
      name: "uses-sdk",
      attribute: [
        attr("minSdkVersion", 0x0101020c, String(opts.minSdk ?? 24), intPrim(opts.minSdk ?? 24)),
        attr(
          "targetSdkVersion",
          0x01010270,
          String(opts.targetSdk ?? 35),
          intPrim(opts.targetSdk ?? 35),
        ),
      ],
      child: [],
    },
  });

  // <uses-permission>
  for (const perm of opts.permissions ?? []) {
    children.push({
      element: {
        name: "uses-permission",
        attribute: [attr("name", 0x01010003, perm, strItem(perm))],
        child: [],
      },
    });
  }

  // <application>
  const appAttrs: object[] = [];
  if (opts.debuggable !== undefined) {
    appAttrs.push(
      attr("debuggable", 0x0101001e, String(opts.debuggable), boolPrim(opts.debuggable)),
    );
  }
  if (opts.usesCleartextTraffic !== undefined) {
    appAttrs.push(
      attr(
        "usesCleartextTraffic",
        0x010103f0,
        String(opts.usesCleartextTraffic),
        boolPrim(opts.usesCleartextTraffic),
      ),
    );
  }

  const appChildren: object[] = [];

  // Activities
  for (const act of opts.activities ?? []) {
    const actAttrs: object[] = [attr("name", 0x01010003, act.name, strItem(act.name))];
    if (act.exported !== undefined) {
      actAttrs.push(attr("exported", 0x0101002b, String(act.exported), boolPrim(act.exported)));
    }
    const actChildren: object[] = [];
    if (act.hasIntentFilter) {
      actChildren.push({
        element: {
          name: "intent-filter",
          attribute: [],
          child: [],
        },
      });
    }
    appChildren.push({
      element: { name: "activity", attribute: actAttrs, child: actChildren },
    });
  }

  // Services
  for (const svc of opts.services ?? []) {
    const svcAttrs: object[] = [attr("name", 0x01010003, svc.name, strItem(svc.name))];
    if (svc.foregroundServiceType) {
      svcAttrs.push(
        attr(
          "foregroundServiceType",
          0x010104d1,
          svc.foregroundServiceType,
          strItem(svc.foregroundServiceType),
        ),
      );
    }
    appChildren.push({
      element: { name: "service", attribute: svcAttrs, child: [] },
    });
  }

  children.push({
    element: { name: "application", attribute: appAttrs, child: appChildren },
  });

  // Root <manifest> node
  const manifestAttrs: object[] = [
    {
      namespaceUri: "",
      name: "package",
      value: opts.packageName ?? "com.example.test",
      resourceId: 0,
    },
    attr("versionCode", 0x0101000f, String(opts.versionCode ?? 1), intPrim(opts.versionCode ?? 1)),
    attr("versionName", 0x01010010, opts.versionName ?? "1.0", strItem(opts.versionName ?? "1.0")),
  ];

  if (opts.testOnly) {
    manifestAttrs.push(attr("testOnly", 0x01010272, "true", boolPrim(true)));
  }

  const manifestNode = {
    element: {
      name: "manifest",
      namespaceDeclaration: [
        { prefix: "android", uri: "http://schemas.android.com/apk/res/android" },
      ],
      attribute: manifestAttrs,
      child: children,
    },
  };

  const NodeType = root.lookupType("aapt.pb.XmlNode");
  const msg = NodeType.create(manifestNode);
  return Buffer.from(NodeType.encode(msg).finish());
}

describe("decodeManifest", () => {
  it("parses package name and version", () => {
    const buf = buildTestManifest({
      packageName: "com.example.myapp",
      versionCode: 42,
      versionName: "2.1.0",
    });
    const m = decodeManifest(buf);
    expect(m.packageName).toBe("com.example.myapp");
    expect(m.versionCode).toBe(42);
    expect(m.versionName).toBe("2.1.0");
  });

  it("parses SDK versions", () => {
    const buf = buildTestManifest({ minSdk: 21, targetSdk: 34 });
    const m = decodeManifest(buf);
    expect(m.minSdk).toBe(21);
    expect(m.targetSdk).toBe(34);
  });

  it("parses debuggable flag", () => {
    const bufTrue = buildTestManifest({ debuggable: true });
    expect(decodeManifest(bufTrue).debuggable).toBe(true);

    const bufFalse = buildTestManifest({ debuggable: false });
    expect(decodeManifest(bufFalse).debuggable).toBe(false);
  });

  it("defaults debuggable to false when not set", () => {
    const buf = buildTestManifest({});
    expect(decodeManifest(buf).debuggable).toBe(false);
  });

  it("parses testOnly flag", () => {
    const buf = buildTestManifest({ testOnly: true });
    expect(decodeManifest(buf).testOnly).toBe(true);
  });

  it("parses usesCleartextTraffic flag", () => {
    const buf = buildTestManifest({ usesCleartextTraffic: true });
    expect(decodeManifest(buf).usesCleartextTraffic).toBe(true);

    const bufFalse = buildTestManifest({ usesCleartextTraffic: false });
    expect(decodeManifest(bufFalse).usesCleartextTraffic).toBe(false);
  });

  it("parses permissions list", () => {
    const buf = buildTestManifest({
      permissions: [
        "android.permission.INTERNET",
        "android.permission.CAMERA",
        "android.permission.ACCESS_FINE_LOCATION",
      ],
    });
    const m = decodeManifest(buf);
    expect(m.permissions).toEqual([
      "android.permission.INTERNET",
      "android.permission.CAMERA",
      "android.permission.ACCESS_FINE_LOCATION",
    ]);
  });

  it("parses activities with intent filters and exported", () => {
    const buf = buildTestManifest({
      activities: [
        { name: ".MainActivity", exported: true, hasIntentFilter: true },
        { name: ".SettingsActivity", exported: false, hasIntentFilter: false },
      ],
    });
    const m = decodeManifest(buf);
    expect(m.activities).toHaveLength(2);
    expect(m.activities[0]!.name).toBe(".MainActivity");
    expect(m.activities[0]!.exported).toBe(true);
    expect(m.activities[0]!.hasIntentFilter).toBe(true);
    expect(m.activities[1]!.name).toBe(".SettingsActivity");
    expect(m.activities[1]!.exported).toBe(false);
    expect(m.activities[1]!.hasIntentFilter).toBe(false);
  });

  it("parses services with foregroundServiceType", () => {
    const buf = buildTestManifest({
      services: [
        { name: ".LocationService", foregroundServiceType: "location" },
        { name: ".SyncService" },
      ],
    });
    const m = decodeManifest(buf);
    expect(m.services).toHaveLength(2);
    expect(m.services[0]!.foregroundServiceType).toBe("location");
    expect(m.services[1]!.foregroundServiceType).toBeUndefined();
  });

  it("throws on non-manifest root element", () => {
    // Build a protobuf node that isn't <manifest>
    const root = new protobuf.Root();
    const ns = root.define("aapt.pb");
    const XmlElement = new protobuf.Type("XmlElement")
      .add(new protobuf.Field("namespaceDeclaration", 1, "XmlNamespace", "repeated"))
      .add(new protobuf.Field("namespaceUri", 2, "string"))
      .add(new protobuf.Field("name", 3, "string"))
      .add(new protobuf.Field("attribute", 4, "XmlAttribute", "repeated"))
      .add(new protobuf.Field("child", 5, "XmlNode", "repeated"));
    const XmlNamespace = new protobuf.Type("XmlNamespace")
      .add(new protobuf.Field("prefix", 1, "string"))
      .add(new protobuf.Field("uri", 2, "string"));
    const XmlAttribute = new protobuf.Type("XmlAttribute").add(
      new protobuf.Field("name", 2, "string"),
    );
    const XmlNode = new protobuf.Type("XmlNode").add(
      new protobuf.OneOf("node")
        .add(new protobuf.Field("element", 1, "XmlElement"))
        .add(new protobuf.Field("text", 2, "string")),
    );
    ns.add(XmlElement).add(XmlNamespace).add(XmlAttribute).add(XmlNode);

    const NodeType = root.lookupType("aapt.pb.XmlNode");
    const msg = NodeType.create({ element: { name: "notmanifest" } });
    const buf = Buffer.from(NodeType.encode(msg).finish());

    expect(() => decodeManifest(buf)).toThrow("root element is not <manifest>");
  });
});
