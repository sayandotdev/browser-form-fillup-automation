import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import "dotenv/config";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

/**
 * Generates a conversational response for general-purpose user input
 * @param {string} userInput - The user's input text
 * @returns {string} AI-generated response
 */
export async function generateGeneralResponse(userInput) {
  const prompt = `
    You are a friendly and helpful AI assistant. The user has provided the following input: "${userInput}".
    Respond in a conversational, natural tone. If the input is a greeting like "Hi" or "Hello", reply warmly and encourage further interaction (e.g., asking if they want to provide a URL to fill a form). For other inputs, provide a relevant and engaging response. Keep the response concise, under 100 words, and avoid generating JSON or code unless explicitly requested.

    Example:
    User: "Hi"
    Response: "Hey there! Nice to hear from you! 😊 Want to give me a URL to fill a form, or just chat?"
  `;

  const result = await model.generateContent([{ text: prompt }]);
  let reply = result.response.text().trim();
  return reply;
}

/**
 * Analyzes a form screenshot and selectors to generate form-filling actions
 * @param {string} screenshotPath - Path to the form screenshot
 * @param {Array} selectors - Array of form element selectors
 * @returns {Array} Array of actions to fill and submit the form
 */
export async function analyzeForm(screenshotPath, selectors) {
  const imgBuffer = fs.readFileSync(screenshotPath);

  const prompt = `
    You are an AI browser agent tasked with filling a signup form on any website. Analyze the provided screenshot and selectors to identify form fields and map them to appropriate field names.

    Available selectors:
    ${JSON.stringify(selectors, null, 2)}

    Task:
    - Identify form fields (e.g., firstName, lastName, email, password, confirmPassword, phone, address, username, etc.) based on attributes like id, name, placeholder, or type.
    - Map each field to a CSS selector and a field name (e.g., "email" for an email input).
    - For inputs you can't confidently map, use the name or id as the field name.
    - After filling all fields, click the submit/signup/register button.
    - Output a JSON array of steps.

    Allowed actions:
    - { "type": "fill_form", "selector": "<css>", "field": "<field_name>" }
    - { "type": "click", "selector": "<css>" }

    Example output:
    [
        { "type": "fill_form", "selector": "#firstName", "field": "firstName" },
        { "type": "fill_form", "selector": "#email", "field": "email" },
        { "type": "click", "selector": "button[type='submit']" }
    ]
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

/**
 * Generates realistic user data for the given form fields
 * @param {Array} fields - Array of field names to generate data for
 * @returns {Object} User data object with field-value pairs
 */
export async function generateUserData(fields) {
  const prompt = `
    Generate realistic user data for a signup form based on the provided fields. Return a JSON object where each key corresponds to a field name and the value is appropriate for that field type. Ensure passwords match if a confirmPassword field is present. Use common formats for fields like email, phone, etc.

    Fields: ${JSON.stringify(fields, null, 2)}

    Example output for fields ["firstName", "email", "password", "confirmPassword"]:
    {
    "firstName": "Alice",
    "email": "alice.johnson45@gmail.com",
    "password": "Str0ngPass321",
    "confirmPassword": "Str0ngPass321"
    }

    For fields like phone, address, or username, generate appropriate values (e.g., phone: "123-456-7890", address: "123 Main St, City, Country", username: "alice_johnson").
`;

  const result = await model.generateContent([{ text: prompt }]);
  let reply = result.response.text().trim();
  reply = reply
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
  return JSON.parse(reply);
}
