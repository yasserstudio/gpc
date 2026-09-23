// undici is an optional runtime dependency, loaded only for HTTPS_PROXY support.
// A shorthand declaration keeps the dynamic import type-checking whether or not
// undici's own types happen to be installed.
declare module "undici";
