import { chromium } from "playwright";
import { analyzeForm, generateUserData } from "./geminiClient.js";
import { delay, ensureDirectory } from "./utils.js";
import path from "node:path";
import fs from "node:fs";

const screenshotDir = path.resolve("../screenshots");

/**
 * Runs the form-filling agent for a given website URL and route
 * @param {string} startUrl - Base URL of the website (e.g., https://example.com)
 * @param {string} routeUrl - Route to the form (e.g., /signup)
 */
export async function runAgent(startUrl, routeUrl) {
  ensureDirectory(screenshotDir);

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500,
    args: [
      "--start-maximized",
      "--disable-extensions",
      "--disable-file-system",
    ],
  });

  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  try {
    await page.goto(`${startUrl}`);
    await delay(1000);
    await page.evaluate((route) => {
      history.pushState({}, "", route);
      window.dispatchEvent(new Event("popstate"));
    }, routeUrl);
    await page.waitForTimeout(2000);

    const screenshotPath = path.join(screenshotDir, `signup-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath });

    const selectors = await page.$$eval(
      "input, textarea, select, button",
      (elements) =>
        elements
          .map((el) => {
            const id = el.getAttribute("id");
            const name = el.getAttribute("name");
            const placeholder = el.getAttribute("placeholder");
            const type = el.getAttribute("type");
            const text = el.innerText || el.getAttribute("value") || "";
            let selector = null;
            if (id) selector = `#${id}`;
            else if (name) selector = `[name="${name}"]`;
            else if (placeholder)
              selector = `input[placeholder="${placeholder}"]`;
            else if (type === "submit" || el.tagName.toLowerCase() === "button")
              selector = "button";

            return {
              tag: el.tagName.toLowerCase(),
              id,
              name,
              placeholder,
              type,
              text,
              selector,
            };
          })
          .filter((s) => s.selector)
    );

    let actions;
    try {
      actions = await analyzeForm(screenshotPath, selectors);
      console.log("🤖 Gemini returned actions:", actions);
    } catch (err) {
      console.error("❌ Gemini form analysis failed:", err.message);
      fs.unlinkSync(screenshotPath);
      throw err;
    }

    const fields = actions
      .filter((action) => action.type === "fill_form")
      .map((action) => action.field);

    let userFormData;
    try {
      userFormData = await generateUserData(fields);
      console.log("🤖 Generated user data:", userFormData);
    } catch (err) {
      console.error("❌ Failed to generate user data:", err.message);
      fs.unlinkSync(screenshotPath);
      throw err;
    }

    for (const action of actions) {
      try {
        if (action.type === "fill_form") {
          const fieldKey = action.field;
          const value = userFormData[fieldKey];

          if (!value) {
            console.warn(`⚠️ No value for field: "${fieldKey}"`);
            continue;
          }

          await page.fill(action.selector, value);
          console.log(
            `✍️ Filled ${fieldKey} with ${value} into ${action.selector}`
          );
        } else if (action.type === "click") {
          let selector = action.selector;

          if (/text=|text\[/.test(selector) || selector.includes("[text=")) {
            selector = null;
          }

          try {
            if (selector) {
              await page.click(selector);
            } else {
              await page
                .getByRole("button", {
                  name: /(submit|create|sign up|register)/i,
                })
                .click();
            }
          } catch (err) {
            console.error(
              "❌ Click failed, retrying with fallback:",
              err.message
            );
            fs.unlinkSync(screenshotPath);
            await page
              .getByRole("button", {
                name: /(submit|create|sign up|register)/i,
              })
              .click();
          }
        }
      } catch (err) {
        console.error(`❌ Action failed for ${action.type}:`, err.message);
        fs.unlinkSync(screenshotPath);
      }
    }
  } catch (err) {
    console.error("❌ Script execution failed:", err.message);
  } finally {
    await browser.close();
  }
}
