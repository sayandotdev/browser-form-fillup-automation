import fs from "fs";

/**
 * Creates a delay for the specified number of milliseconds
 * @param {number} ms - Delay duration in milliseconds
 * @returns {Promise}
 */
export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Ensures a directory exists, creating it if necessary
 * @param {string} dirPath - Path to the directory
 */
export function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath);
  }
}
