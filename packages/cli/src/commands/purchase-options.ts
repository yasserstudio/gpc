import type { Command } from "commander";

const REDIRECT_MESSAGE = `Purchase options are managed through one-time product offers.

Use the following commands instead:
  gpc otp offers list <product-id>        List purchase options for a product
  gpc otp offers get <product-id> <id>    Get a specific purchase option
  gpc otp offers create <product-id>      Create a purchase option
  gpc otp offers activate <product-id> <id>
  gpc otp offers deactivate <product-id> <id>

See: gpc otp offers --help`;

export function registerPurchaseOptionsCommands(program: Command): void {
  const po = program
    .command("purchase-options")
    .description("Manage purchase options (use 'otp offers' commands)");

  po.command("list")
    .description("List purchase options")
    .option("--sort <field>", "Sort by field")
    .action(async () => {
      console.log(REDIRECT_MESSAGE);
      process.exit(2);
    });

  po.command("get <id>")
    .description("Get a purchase option")
    .action(async () => {
      console.log(REDIRECT_MESSAGE);
      process.exit(2);
    });

  po.command("create")
    .description("Create a purchase option")
    .option("--file <path>", "JSON file with purchase option data")
    .action(async () => {
      console.log(REDIRECT_MESSAGE);
      process.exit(2);
    });

  po.command("activate <id>")
    .description("Activate a purchase option")
    .action(async () => {
      console.log(REDIRECT_MESSAGE);
      process.exit(2);
    });

  po.command("deactivate <id>")
    .description("Deactivate a purchase option")
    .action(async () => {
      console.log(REDIRECT_MESSAGE);
      process.exit(2);
    });
}
