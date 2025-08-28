import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { runAgent } from "./formAgent.js";
import { generateGeneralResponse } from "./geminiClient.js";

const rl = readline.createInterface({ input, output });

async function main() {
  try {
    const userInput = await rl.question(
      "Enter a URL to fill a form (e.g., https://example.com) or just say something: "
    );

    const urlRegex = /(https?:\/\/[^\s/$.?#].[^\s]*)/i;
    const urlMatch = userInput.match(urlRegex);

    if (urlMatch) {
      const matchedUrl = urlMatch[0];
      const url = new URL(matchedUrl);
      const startUrl = `${url.protocol}//${url.hostname}${
        url.port ? `:${url.port}` : ""
      }`;
      const routeUrl = url.pathname + url.search + url.hash;

      console.log(`🔗 Navigating to: ${startUrl}${routeUrl}`);
      await runAgent(startUrl, routeUrl);
    } else {
      console.log("🤖 Processing your input...");
      const response = await generateGeneralResponse(userInput);
      console.log("🤖 AI Response:", response);
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    rl.close();
    process.exit();
  }
}

main();
