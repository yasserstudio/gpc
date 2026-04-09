/**
 * Extract the value of --profile or -p from argv, if present.
 * Returns undefined if the flag is missing or its value looks like another flag.
 */
export function extractProfileFromArgv(argv: readonly string[]): string | undefined {
  const idx = Math.max(argv.indexOf("--profile"), argv.indexOf("-p"));
  if (idx === -1 || idx + 1 >= argv.length) return undefined;
  const val = argv[idx + 1];
  if (!val || val.startsWith("-")) return undefined;
  return val;
}
