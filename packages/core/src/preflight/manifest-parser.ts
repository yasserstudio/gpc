// Named exports only. No default export.

import protobuf from "protobufjs";
import type { ParsedManifest, ManifestComponent, ManifestFeature } from "./types.js";

/**
 * Android resource IDs for common manifest attributes.
 * These map protobuf resource_id fields to human-readable names.
 */
const RESOURCE_IDS: Record<number, string> = {
  0x01010000: "theme",
  0x01010001: "label",
  0x01010002: "icon",
  0x01010003: "name",
  0x0101000f: "versionCode",
  0x0101021b: "versionCode",
  0x01010010: "versionName",
  0x0101021c: "versionName",
  0x0101020c: "minSdkVersion",
  0x01010270: "targetSdkVersion",
  0x0101001e: "debuggable",
  0x01010022: "permission",
  0x0101002b: "exported",
  0x01010272: "testOnly",
  0x010103f0: "usesCleartextTraffic",
  0x010104ea: "extractNativeLibs",
  0x010104d1: "foregroundServiceType",
  0x0101028a: "required",
  0x01010281: "allowBackup",
};

/**
 * Build the AAPT2 XmlNode protobuf schema programmatically.
 * This matches the structure in frameworks/base/tools/aapt2/Resources.proto.
 */
function buildXmlSchema(): protobuf.Root {
  const root = new protobuf.Root();
  const ns = root.define("aapt.pb");

  // SourcePosition (line/column info) appears on XmlNode, XmlAttribute, and
  // XmlNamespace as field "source". Not needed for manifest analysis, so
  // omitted from the schema. protobufjs safely skips unknown fields via
  // skipType(). This also avoids a decode overflow: the official proto uses
  // SourcePosition (two uint32 fields) on XML types, but the older Source
  // message (path_idx + embedded SourcePosition) exists elsewhere in
  // Resources.proto — conflating the two caused protobufjs to misread
  // varint fields as embedded messages on large manifests.

  // Empty types used as oneof markers in Primitive
  const NullType = new protobuf.Type("NullType");
  const EmptyType = new protobuf.Type("EmptyType");

  // Primitive item — used for compiled attribute values
  // Full AAPT2 Resources.proto: null, empty, float, dimension, fraction, int, hex, bool, colors
  const Primitive = new protobuf.Type("Primitive").add(
    new protobuf.OneOf("oneofValue")
      .add(new protobuf.Field("nullValue", 1, "NullType"))
      .add(new protobuf.Field("emptyValue", 2, "EmptyType"))
      .add(new protobuf.Field("floatValue", 3, "float"))
      .add(new protobuf.Field("intDecimalValue", 6, "int32"))
      .add(new protobuf.Field("intHexadecimalValue", 7, "uint32"))
      .add(new protobuf.Field("booleanValue", 8, "bool"))
      .add(new protobuf.Field("colorArgb8Value", 9, "uint32"))
      .add(new protobuf.Field("colorRgb8Value", 10, "uint32"))
      .add(new protobuf.Field("colorArgb4Value", 11, "uint32"))
      .add(new protobuf.Field("colorRgb4Value", 12, "uint32"))
      .add(new protobuf.Field("dimensionValue", 13, "uint32"))
      .add(new protobuf.Field("fractionValue", 14, "uint32")),
  );

  // Reference — points to another resource
  // Full AAPT2 Resources.proto: type enum, id, name, private, is_dynamic, type_flags, allow_raw
  const Reference = new protobuf.Type("Reference")
    .add(new protobuf.Field("type", 1, "uint32"))
    .add(new protobuf.Field("id", 2, "uint32"))
    .add(new protobuf.Field("name", 3, "string"))
    .add(new protobuf.Field("isPrivate", 4, "bool"))
    .add(new protobuf.Field("isDynamic", 5, "Boolean"))
    .add(new protobuf.Field("typeFlags", 6, "uint32"))
    .add(new protobuf.Field("allowRaw", 7, "bool"));

  const StringMsg = new protobuf.Type("String").add(new protobuf.Field("value", 1, "string"));

  // RawString — unprocessed string value
  const RawString = new protobuf.Type("RawString").add(new protobuf.Field("value", 1, "string"));

  // StyledString — string with styling spans
  const StyledString = new protobuf.Type("StyledString")
    .add(new protobuf.Field("value", 1, "string"))
    .add(new protobuf.Field("span", 2, "Span", "repeated"));
  const Span = new protobuf.Type("Span")
    .add(new protobuf.Field("tag", 1, "string"))
    .add(new protobuf.Field("firstChar", 2, "uint32"))
    .add(new protobuf.Field("lastChar", 3, "uint32"));

  // FileReference — points to a file in the APK/AAB
  const FileReference = new protobuf.Type("FileReference")
    .add(new protobuf.Field("path", 1, "string"))
    .add(new protobuf.Field("type", 2, "uint32"));

  // Id — empty marker for ID resources
  const Id = new protobuf.Type("Id");

  // Boolean wrapper (used by Reference.is_dynamic)
  const BooleanMsg = new protobuf.Type("Boolean").add(new protobuf.Field("value", 1, "bool"));

  // Item — compiled value of an attribute
  // Full AAPT2 Resources.proto: 7 oneof variants + 3 flag fields
  const Item = new protobuf.Type("Item")
    .add(
      new protobuf.OneOf("value")
        .add(new protobuf.Field("ref", 1, "Reference"))
        .add(new protobuf.Field("str", 2, "String"))
        .add(new protobuf.Field("rawStr", 3, "RawString"))
        .add(new protobuf.Field("styledStr", 4, "StyledString"))
        .add(new protobuf.Field("file", 5, "FileReference"))
        .add(new protobuf.Field("id", 6, "Id"))
        .add(new protobuf.Field("prim", 7, "Primitive")),
    )
    .add(new protobuf.Field("flagStatus", 8, "uint32"))
    .add(new protobuf.Field("flagNegated", 9, "bool"))
    .add(new protobuf.Field("flagName", 10, "string"));

  // XmlAttribute (source field 4 omitted — see Source comment above)
  const XmlAttribute = new protobuf.Type("XmlAttribute")
    .add(new protobuf.Field("namespaceUri", 1, "string"))
    .add(new protobuf.Field("name", 2, "string"))
    .add(new protobuf.Field("value", 3, "string"))
    .add(new protobuf.Field("resourceId", 5, "uint32"))
    .add(new protobuf.Field("compiledItem", 6, "Item"));

  // XmlNamespace (source field 3 omitted — see Source comment above)
  const XmlNamespace = new protobuf.Type("XmlNamespace")
    .add(new protobuf.Field("prefix", 1, "string"))
    .add(new protobuf.Field("uri", 2, "string"));

  // XmlElement
  const XmlElement = new protobuf.Type("XmlElement")
    .add(new protobuf.Field("namespaceDeclaration", 1, "XmlNamespace", "repeated"))
    .add(new protobuf.Field("namespaceUri", 2, "string"))
    .add(new protobuf.Field("name", 3, "string"))
    .add(new protobuf.Field("attribute", 4, "XmlAttribute", "repeated"))
    .add(new protobuf.Field("child", 5, "XmlNode", "repeated"));

  // XmlNode (source field 3 omitted — see Source comment above)
  const XmlNode = new protobuf.Type("XmlNode").add(
    new protobuf.OneOf("node")
      .add(new protobuf.Field("element", 1, "XmlElement"))
      .add(new protobuf.Field("text", 2, "string")),
  );

  ns.add(NullType);
  ns.add(EmptyType);
  ns.add(Primitive);
  ns.add(BooleanMsg);
  ns.add(Reference);
  ns.add(StringMsg);
  ns.add(RawString);
  ns.add(StyledString);
  ns.add(Span);
  ns.add(FileReference);
  ns.add(Id);
  ns.add(Item);
  ns.add(XmlAttribute);
  ns.add(XmlNamespace);
  ns.add(XmlElement);
  ns.add(XmlNode);

  return root;
}

let cachedSchema: protobuf.Root | undefined;

function getSchema(): protobuf.Root {
  if (!cachedSchema) cachedSchema = buildXmlSchema();
  return cachedSchema;
}

interface XmlAttr {
  name: string;
  value: string;
  resourceId: number;
  compiledItem?: {
    prim?: { intDecimalValue?: number; intHexadecimalValue?: number; booleanValue?: boolean };
    str?: { value?: string };
    rawStr?: { value?: string };
    ref?: { id?: number; name?: string };
  };
}

interface XmlElem {
  name: string;
  attribute: XmlAttr[];
  child: XmlNodeParsed[];
}

interface XmlNodeParsed {
  element?: XmlElem;
  text?: string;
}

/** Decode a protobuf-encoded AndroidManifest.xml buffer into a parsed manifest. */
export function decodeManifest(buf: Buffer): ParsedManifest {
  const root = getSchema();
  const XmlNode = root.lookupType("aapt.pb.XmlNode");
  const decoded = XmlNode.decode(buf) as unknown as XmlNodeParsed;

  if (!decoded.element || decoded.element.name !== "manifest") {
    throw new Error("Invalid AAB manifest: root element is not <manifest>");
  }

  return extractManifestData(decoded.element);
}

function getAttrByName(attrs: XmlAttr[], name: string): string | undefined {
  const attr = attrs.find((a) => a.name === name || RESOURCE_IDS[a.resourceId] === name);
  if (!attr) return undefined;
  const ci = attr.compiledItem;
  if (ci?.str?.value !== undefined) return ci.str.value;
  if (ci?.ref?.name !== undefined) return ci.ref.name;
  // Compiled primitives (booleans, integers) may not populate str/ref.
  // Only use prim if attr.value is empty -- prim fields default to 0/false in protobuf
  // which is indistinguishable from an explicitly set 0/false.
  const prim = ci?.prim;
  if (attr.value) return attr.value;
  if (prim?.booleanValue === true) return "true";
  if (prim?.intDecimalValue) return String(prim.intDecimalValue);
  if (prim?.intHexadecimalValue) return String(prim.intHexadecimalValue);
  return undefined;
}

function getBoolByName(attrs: XmlAttr[], name: string, defaultVal: boolean): boolean {
  const val = getAttrByName(attrs, name);
  if (val === undefined) return defaultVal;
  return val === "true" || val === "1";
}

function getIntByName(attrs: XmlAttr[], name: string, defaultVal: number): number {
  const val = getAttrByName(attrs, name);
  if (val === undefined) return defaultVal;
  const n = parseInt(val, 10);
  return isNaN(n) ? defaultVal : n;
}

function getChildren(elem: XmlElem, tagName: string): XmlElem[] {
  return (elem.child || [])
    .filter((c): c is XmlNodeParsed & { element: XmlElem } => c.element?.name === tagName)
    .map((c) => c.element);
}

function extractManifestData(manifest: XmlElem): ParsedManifest {
  const attrs = manifest.attribute || [];

  const packageName = getAttrByName(attrs, "package") || "";
  const versionCodeStr = getAttrByName(attrs, "versionCode");
  const versionCode = versionCodeStr ? parseInt(versionCodeStr, 10) || 0 : 0;
  const versionName = getAttrByName(attrs, "versionName") || "";

  // <uses-sdk> element
  const usesSdkElements = getChildren(manifest, "uses-sdk");
  const usesSdk = usesSdkElements[0];
  const minSdk = usesSdk ? getIntByName(usesSdk.attribute || [], "minSdkVersion", 1) : 1;
  const targetSdk = usesSdk ? getIntByName(usesSdk.attribute || [], "targetSdkVersion", minSdk) : minSdk;

  // <uses-permission> elements
  const permissions = getChildren(manifest, "uses-permission")
    .map((el) => getAttrByName(el.attribute || [], "name"))
    .filter((p): p is string => p !== undefined);

  // <uses-feature> elements
  const features: ManifestFeature[] = getChildren(manifest, "uses-feature").map((el) => ({
    name: getAttrByName(el.attribute || [], "name") || "",
    required: getBoolByName(el.attribute || [], "required", true),
  }));

  // <application> element
  const appElements = getChildren(manifest, "application");
  const app = appElements[0];

  const debuggable = app ? getBoolByName(app.attribute || [], "debuggable", false) : false;
  const testOnly = getBoolByName(attrs, "testOnly", false);
  const usesCleartextTraffic = app ? getBoolByName(app.attribute || [], "usesCleartextTraffic", true) : true;
  const extractNativeLibs = app ? getBoolByName(app.attribute || [], "extractNativeLibs", true) : true;
  const pageSizeCompat = app ? getBoolByName(app.attribute || [], "pageSizeCompat", false) : false;

  const activities = app ? extractComponents(app, "activity") : [];
  const services = app ? extractComponents(app, "service") : [];
  const receivers = app ? extractComponents(app, "receiver") : [];
  const providers = app ? extractComponents(app, "provider") : [];

  return {
    packageName,
    versionCode,
    versionName,
    minSdk,
    targetSdk,
    debuggable,
    testOnly,
    usesCleartextTraffic,
    extractNativeLibs,
    pageSizeCompat: pageSizeCompat || undefined,
    permissions,
    features,
    activities,
    services,
    receivers,
    providers,
  };
}

function extractComponents(appElement: XmlElem, tagName: string): ManifestComponent[] {
  return getChildren(appElement, tagName).map((el) => {
    const compAttrs = el.attribute || [];
    const exportedVal = getAttrByName(compAttrs, "exported");
    const intentFilters = getChildren(el, "intent-filter");
    const hasIntentFilter = intentFilters.length > 0;

    const intentActions: string[] = [];
    const intentCategories: string[] = [];
    for (const filter of intentFilters) {
      for (const action of getChildren(filter, "action")) {
        const name = getAttrByName(action.attribute || [], "name");
        if (name) intentActions.push(name);
      }
      for (const cat of getChildren(filter, "category")) {
        const name = getAttrByName(cat.attribute || [], "name");
        if (name) intentCategories.push(name);
      }
    }

    return {
      name: getAttrByName(compAttrs, "name") || "",
      exported:
        exportedVal === undefined ? undefined : exportedVal === "true" || exportedVal === "1",
      permission: getAttrByName(compAttrs, "permission") || undefined,
      foregroundServiceType:
        tagName === "service" ? getAttrByName(compAttrs, "foregroundServiceType") : undefined,
      hasIntentFilter,
      intentActions: intentActions.length > 0 ? intentActions : undefined,
      intentCategories: intentCategories.length > 0 ? intentCategories : undefined,
    };
  });
}
