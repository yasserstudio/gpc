// Named exports only. No default export.

import * as protobuf from "protobufjs";
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
  0x01010010: "versionName",
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

  // Source message (line/column info — we skip reading this)
  const Source = new protobuf.Type("Source")
    .add(new protobuf.Field("pathIdx", 1, "uint32"))
    .add(new protobuf.Field("position", 2, "Position"));
  const Position = new protobuf.Type("Position")
    .add(new protobuf.Field("lineNumber", 1, "uint32"))
    .add(new protobuf.Field("columnNumber", 2, "uint32"));

  // Primitive item — used for compiled attribute values
  const Primitive = new protobuf.Type("Primitive")
    .add(new protobuf.OneOf("oneofValue").add(new protobuf.Field("intDecimalValue", 6, "int32"))
      .add(new protobuf.Field("intHexadecimalValue", 7, "uint32"))
      .add(new protobuf.Field("booleanValue", 8, "bool"))
      .add(new protobuf.Field("floatValue", 11, "float")));

  // Reference — points to another resource
  const Reference = new protobuf.Type("Reference")
    .add(new protobuf.Field("id", 1, "uint32"))
    .add(new protobuf.Field("name", 2, "string"));

  // Item — compiled value of an attribute
  const Item = new protobuf.Type("Item")
    .add(new protobuf.OneOf("value")
      .add(new protobuf.Field("ref", 1, "Reference"))
      .add(new protobuf.Field("str", 2, "String"))
      .add(new protobuf.Field("prim", 4, "Primitive")));

  const StringMsg = new protobuf.Type("String")
    .add(new protobuf.Field("value", 1, "string"));

  // XmlAttribute
  const XmlAttribute = new protobuf.Type("XmlAttribute")
    .add(new protobuf.Field("namespaceUri", 1, "string"))
    .add(new protobuf.Field("name", 2, "string"))
    .add(new protobuf.Field("value", 3, "string"))
    .add(new protobuf.Field("source", 4, "Source"))
    .add(new protobuf.Field("resourceId", 5, "uint32"))
    .add(new protobuf.Field("compiledItem", 6, "Item"));

  // XmlNamespace
  const XmlNamespace = new protobuf.Type("XmlNamespace")
    .add(new protobuf.Field("prefix", 1, "string"))
    .add(new protobuf.Field("uri", 2, "string"))
    .add(new protobuf.Field("source", 3, "Source"));

  // XmlElement
  const XmlElement = new protobuf.Type("XmlElement")
    .add(new protobuf.Field("namespaceDeclaration", 1, "XmlNamespace", "repeated"))
    .add(new protobuf.Field("namespaceUri", 2, "string"))
    .add(new protobuf.Field("name", 3, "string"))
    .add(new protobuf.Field("attribute", 4, "XmlAttribute", "repeated"))
    .add(new protobuf.Field("child", 5, "XmlNode", "repeated"));

  // XmlNode
  const XmlNode = new protobuf.Type("XmlNode")
    .add(new protobuf.OneOf("node")
      .add(new protobuf.Field("element", 1, "XmlElement"))
      .add(new protobuf.Field("text", 2, "string")))
    .add(new protobuf.Field("source", 3, "Source"));

  ns.add(Position);
  ns.add(Source);
  ns.add(Primitive);
  ns.add(Reference);
  ns.add(StringMsg);
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
  compiledItem?: { prim?: { intDecimalValue?: number; intHexadecimalValue?: number; booleanValue?: boolean }; str?: { value?: string }; ref?: { id?: number; name?: string } };
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

function getAttrValue(attrs: XmlAttr[], resId: number): string | undefined {
  const attr = attrs.find((a) => a.resourceId === resId);
  if (!attr) return undefined;
  // The `value` string field is always populated and is the most reliable source.
  // compiledItem contains structured types but protobuf.js fills default values
  // for all oneof fields, making it unreliable for distinguishing which field is set.
  // Use compiledItem.str for string values (package names, etc.) and fall back to value.
  const ci = attr.compiledItem;
  if (ci?.str?.value !== undefined) return ci.str.value;
  if (ci?.ref?.name !== undefined) return ci.ref.name;
  // For primitives (int, bool), use the string `value` field which is always correct
  return attr.value || undefined;
}

function getAttrByName(attrs: XmlAttr[], name: string): string | undefined {
  const attr = attrs.find((a) => a.name === name || RESOURCE_IDS[a.resourceId] === name);
  if (!attr) return undefined;
  const ci = attr.compiledItem;
  if (ci?.str?.value !== undefined) return ci.str.value;
  if (ci?.ref?.name !== undefined) return ci.ref.name;
  return attr.value || undefined;
}

function getBoolAttr(attrs: XmlAttr[], resId: number, defaultVal: boolean): boolean {
  const val = getAttrValue(attrs, resId);
  if (val === undefined) return defaultVal;
  return val === "true" || val === "1";
}

function getIntAttr(attrs: XmlAttr[], resId: number, defaultVal: number): number {
  const val = getAttrValue(attrs, resId);
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
  const versionCode = getIntAttr(attrs, 0x0101000f, 0);
  const versionName = getAttrValue(attrs, 0x01010010) || "";

  // <uses-sdk> element
  const usesSdkElements = getChildren(manifest, "uses-sdk");
  const usesSdk = usesSdkElements[0];
  const minSdk = usesSdk ? getIntAttr(usesSdk.attribute || [], 0x0101020c, 1) : 1;
  const targetSdk = usesSdk ? getIntAttr(usesSdk.attribute || [], 0x01010270, minSdk) : minSdk;

  // <uses-permission> elements
  const permissions = getChildren(manifest, "uses-permission")
    .map((el) => getAttrValue(el.attribute || [], 0x01010003))
    .filter((p): p is string => p !== undefined);

  // <uses-feature> elements
  const features: ManifestFeature[] = getChildren(manifest, "uses-feature").map((el) => ({
    name: getAttrValue(el.attribute || [], 0x01010003) || "",
    required: getBoolAttr(el.attribute || [], 0x0101028a, true),
  }));

  // <application> element
  const appElements = getChildren(manifest, "application");
  const app = appElements[0];

  const debuggable = app ? getBoolAttr(app.attribute || [], 0x0101001e, false) : false;
  const testOnly = getBoolAttr(attrs, 0x01010272, false);
  const usesCleartextTraffic = app ? getBoolAttr(app.attribute || [], 0x010103f0, true) : true;
  const extractNativeLibs = app ? getBoolAttr(app.attribute || [], 0x010104ea, true) : true;

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
    const exportedVal = getAttrValue(compAttrs, 0x0101002b);
    const hasIntentFilter = getChildren(el, "intent-filter").length > 0;

    return {
      name: getAttrValue(compAttrs, 0x01010003) || "",
      exported: exportedVal === undefined ? undefined : exportedVal === "true" || exportedVal === "1",
      foregroundServiceType: tagName === "service" ? getAttrValue(compAttrs, 0x010104d1) : undefined,
      hasIntentFilter,
    };
  });
}
