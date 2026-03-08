import { Command } from "commander";

export async function createProgram(): Promise<Command> {
  const program = new Command();

  program
    .name("gpc")
    .description("The complete Google Play CLI")
    .version("0.0.0", "-V, --version")
    .option("-o, --output <format>", "Output format: table, json, yaml, markdown")
    .option("-v, --verbose", "Enable debug logging")
    .option("-q, --quiet", "Suppress non-essential output")
    .option("-a, --app <package>", "App package name")
    .option("-p, --profile <name>", "Auth profile name")
    .option("--no-color", "Disable colored output")
    .option("--no-interactive", "Disable interactive prompts")
    .option("--dry-run", "Preview changes without executing");

  const commandLoaders: Record<string, () => Promise<void>> = {
    auth: async () => { (await import("./commands/auth.js")).registerAuthCommands(program); },
    config: async () => { (await import("./commands/config.js")).registerConfigCommands(program); },
    doctor: async () => { (await import("./commands/doctor.js")).registerDoctorCommand(program); },
    docs: async () => { (await import("./commands/docs.js")).registerDocsCommand(program); },
    completion: async () => { (await import("./commands/completion.js")).registerCompletionCommand(program); },
    apps: async () => { (await import("./commands/apps.js")).registerAppsCommands(program); },
    releases: async () => { (await import("./commands/releases.js")).registerReleasesCommands(program); },
    tracks: async () => { (await import("./commands/tracks.js")).registerTracksCommands(program); },
    status: async () => { (await import("./commands/status.js")).registerStatusCommand(program); },
    listings: async () => { (await import("./commands/listings.js")).registerListingsCommands(program); },
    reviews: async () => { (await import("./commands/reviews.js")).registerReviewsCommands(program); },
    vitals: async () => { (await import("./commands/vitals.js")).registerVitalsCommands(program); },
    subscriptions: async () => { (await import("./commands/subscriptions.js")).registerSubscriptionsCommands(program); },
    iap: async () => { (await import("./commands/iap.js")).registerIapCommands(program); },
    purchases: async () => { (await import("./commands/purchases.js")).registerPurchasesCommands(program); },
    pricing: async () => { (await import("./commands/pricing.js")).registerPricingCommands(program); },
    reports: async () => { (await import("./commands/reports.js")).registerReportsCommands(program); },
    users: async () => { (await import("./commands/users.js")).registerUsersCommands(program); },
    testers: async () => { (await import("./commands/testers.js")).registerTestersCommands(program); },
    validate: async () => { (await import("./commands/validate.js")).registerValidateCommand(program); },
    publish: async () => { (await import("./commands/publish.js")).registerPublishCommand(program); },
  };

  const target = process.argv[2];

  if (target && target in commandLoaders) {
    await commandLoaders[target]!();
  } else {
    await Promise.all(Object.values(commandLoaders).map((loader) => loader()));
  }

  return program;
}
