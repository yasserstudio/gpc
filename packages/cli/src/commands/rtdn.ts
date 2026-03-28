import { resolvePackageName, getClient } from "../resolve.js";
import type { Command } from "commander";
import { loadConfig } from "@gpc-cli/config";
import {
  getRtdnStatus,
  decodeNotification,
  formatNotification,
  formatOutput,
} from "@gpc-cli/core";
import { getOutputFormat } from "../format.js";
import { yellow } from "../colors.js";

export function registerRtdnCommands(program: Command): void {
  const rtdn = program
    .command("rtdn")
    .description("Real-Time Developer Notifications (Pub/Sub)");

  rtdn
    .command("status")
    .description("Check RTDN notification topic configuration")
    .action(async () => {
      const config = await loadConfig();
      const packageName = resolvePackageName(program.opts()["app"], config);
      const client = await getClient(config);
      const format = getOutputFormat(program, config);

      const status = await getRtdnStatus(client, packageName);

      if (format === "json") {
        console.log(formatOutput({ packageName, ...status }, format));
        return;
      }

      console.log(`\nRTDN Status — ${packageName}`);
      console.log(`${"─".repeat(50)}`);
      if (status.topicName) {
        console.log(`Topic:   ${status.topicName}`);
        console.log(`Enabled: ${status.enabled ? "yes" : "no"}`);
      } else {
        console.log(`${yellow("⚠")} No RTDN topic configured.`);
        console.log(`\nTo set up RTDN:`);
        console.log(`  1. Create a Pub/Sub topic in your GCP project`);
        console.log(`  2. Grant google-play-developer-notifications@system.gserviceaccount.com the Pub/Sub Publisher role`);
        console.log(`  3. Set the topic in Play Console → Monetization setup → Real-time developer notifications`);
        console.log(`  4. Or use: gpc rtdn setup --topic projects/<PROJECT>/topics/<TOPIC>`);
      }
    });

  rtdn
    .command("decode <payload>")
    .description("Decode a base64-encoded Pub/Sub notification payload")
    .action(async (payload: string) => {
      const config = await loadConfig();
      const format = getOutputFormat(program, config);

      const notification = decodeNotification(payload);
      const formatted = formatNotification(notification);

      if (format === "json") {
        console.log(formatOutput(notification, format));
      } else {
        console.log(formatOutput(formatted, format));
      }
    });

  rtdn
    .command("test")
    .description("Send a test notification to verify RTDN setup")
    .action(async () => {
      const config = await loadConfig();
      const format = getOutputFormat(program, config);

      if (format !== "json") {
        console.log(`${yellow("⚠")} Test notifications can only be triggered from the Play Console.`);
        console.log(`\nTo test RTDN:`);
        console.log(`  1. Open Play Console → Monetization setup → Real-time developer notifications`);
        console.log(`  2. Click "Send test notification"`);
        console.log(`  3. Check your Pub/Sub subscription for the test message`);
        console.log(`  4. Decode it with: gpc rtdn decode <base64-payload>`);
      } else {
        console.log(formatOutput({
          message: "Test notifications can only be triggered from the Play Console",
          steps: [
            "Open Play Console → Monetization setup → RTDN",
            "Click 'Send test notification'",
            "Check your Pub/Sub subscription",
            "Decode with: gpc rtdn decode <payload>",
          ],
        }, format));
      }
    });
}
