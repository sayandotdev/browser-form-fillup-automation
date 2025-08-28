import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { runAgent } from "./formAgent.js";

const rl = readline.createInterface({ input, output });
async function main() {
  try {
    const startUrl = await rl.question(
      "Enter the base URL (e.g., https://example.com): "
    );
    const routeUrl = await rl.question(
      "Enter the route/path (e.g., /signup, press Enter if none): "
    );

    if (!startUrl.startsWith("http://") && !startUrl.startsWith("https://")) {
      console.error("❌ Invalid URL: Must start with http:// or https://");
      return;
    }

    const normalizedRouteUrl = routeUrl
      ? routeUrl.startsWith("/")
        ? routeUrl
        : `/${routeUrl}`
      : "";

    console.log(`🔗 Navigating to: ${startUrl}${normalizedRouteUrl}`);
    await runAgent(startUrl, normalizedRouteUrl);
  } catch (err) {
    console.error("❌ Input error:", err.message);
  } finally {
    rl.close();
    process.exit();
  }
}

main();
