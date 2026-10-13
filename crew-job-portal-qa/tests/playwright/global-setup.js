/*
 * Runs once before the Playwright tests.
 * Clears the old screenshots of the browser(s) about to run so old and new
 * ones don't mix. Other browsers' folders stay, so you can run Firefox and
 * then WebKit and keep both sets.
 */
const fs = require('node:fs');
const path = require('node:path');

module.exports = async () => {
  const requested = [...process.argv.join(' ').matchAll(/--project[= ](\w+)/g)].map((m) => m[1]);
  const browsers = requested.length ? requested : ['chromium', 'firefox', 'webkit'];
  for (const browser of browsers) {
    fs.rmSync(path.join(__dirname, '../../evidence/automation', browser), { recursive: true, force: true });
  }
};
