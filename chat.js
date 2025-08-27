import "dotenv/config";
import fs from "fs";
import path from "path";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { chromium } from "playwright";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
const rl = readline.createInterface({ input, output });

const screenshotDir = path.resolve("./screenshots");
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const userFormData = {
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  password: "securePassword123",
  confirmPassword: "securePassword123",
};

function normalizeField(field) {
  const mapping = {
    name: "firstName",
    firstname: "firstName",
    first_name: "firstName",

    lastname: "lastName",
    last_name: "lastName",

    mail: "email",
    email: "email",
    username: "email",

    pass: "password",
    password: "password",

    confirmpassword: "confirmPassword",
    confirm_password: "confirmPassword",
  };

  return mapping[field.toLowerCase()] || field;
}

async function runAgent(startUrl, routeUrl) {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500,
    args: ["--start-maximized", "--disabe-extensions", "--disable-file-system"],
  });

  const context = await browser.newContext({
    viewport: null,
  });
  const page = await context.newPage();

  await page.goto(`${startUrl}`);
  await delay(1000);
  await page.evaluate((route) => {
    history.pushState({}, "", route);
    window.dispatchEvent(new Event("popstate"));
  }, `/${routeUrl}`);
  await page.waitForTimeout(2000);

  const screenshotPath = path.join(screenshotDir, `signup.png`);
  await page.screenshot({ path: screenshotPath });
  const selectors = await page.$$eval(
    "input, textarea, select, button",
    (els) =>
      els
        .map((el) => {
          const id = el.getAttribute("id");
          const name = el.getAttribute("name");
          const placeholder = el.getAttribute("placeholder");
          const type = el.getAttribute("type");
          const text = el.innerText;
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
    actions = await askGeminiForFormFill(screenshotPath, selectors);
  } catch (err) {
    console.error("❌ Gemini fetch failed:", err.message);
    await browser.close();
    process.exit();
  }

  console.log("🤖 Gemini returned actions:", actions);

  for (const action of actions) {
    try {
      if (action.type === "fill_form") {
        let fieldKey = normalizeField(action.field);

        if (!userFormData[fieldKey]) {
          console.warn(
            `⚠️ Gemini gave value instead of field: "${action.field}"`
          );
          if (action.field.includes("@")) fieldKey = "email";
          else if (/pass/i.test(action.field)) {
            fieldKey = action.field.toLowerCase().includes("confirm")
              ? "confirmPassword"
              : "password";
          } else if (/john|test|name/i.test(action.field)) {
            fieldKey = "firstName";
          } else {
            continue;
          }
        }

        const value = userFormData[fieldKey];
        await page.fill(action.selector, value);
        console.log(`✍️ Filled ${fieldKey} into ${action.selector}`);
      } else if (action.type === "click") {
        let selector = action.selector;

        if (/text=|text\[/.test(selector) || selector.includes("[text=")) {
          selector = null;
        }

        try {
          if (selector) {
            await page.click(selector);
          } else {
            await page.getByRole("button", { name: /create account/i }).click();
          }
        } catch (err) {
          console.error(
            "❌ Click failed, retrying with fallback:",
            err.message
          );
          await page.getByRole("button", { name: /create account/i }).click();
        }
      }
    } catch (err) {
      console.error("❌ Playwright action failed:", err.message);
    }
  }
  await browser.close();
  process.exit();
}

async function askGeminiForFormFill(screenshotPath, selectors) {
  const imgBuffer = fs.readFileSync(screenshotPath);

  const prompt = `
You are an AI browser agent filling a signup form.

Available selectors:
${JSON.stringify(selectors, null, 2)}

Task:
- You must only output the canonical field keys: firstName, lastName, email, password, confirmPassword.
- Do NOT output example values like "Test" or "Password123".
- Always map selectors to the field key, not the dummy value.
- After filling, click the signup/submit button.
- Output a JSON array of steps.

Allowed actions:
- { "type": "fill_form", "selector": "<css>", "field": "firstName|lastName|email|password|confirmPassword" }
- { "type": "click", "selector": "<css>" }
`;

  const result = await model.generateContent([
    { text: prompt },
    {
      inlineData: {
        data: imgBuffer.toString("base64"),
        mimeType: "image/png",
      },
    },
  ]);

  let reply = result.response.text().trim();
  reply = reply
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  return JSON.parse(reply);
}

runAgent("https://ui.chaicode.com", "auth/signup");
