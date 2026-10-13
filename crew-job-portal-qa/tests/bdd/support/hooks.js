/*
 * Cucumber hooks, run automatically:
 *   BeforeAll  start the mock server and the browser
 *   Before     fresh browser context for each scenario
 *   After      screenshot, then close the context
 *   AfterAll   close the browser and stop the server
 * Pick the browser with BROWSER=chromium|firefox|webkit (default chromium).
 */
const { BeforeAll, AfterAll, Before, After, Status, setDefaultTimeout } = require('@cucumber/cucumber');
const { chromium, firefox, webkit } = require('@playwright/test');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

setDefaultTimeout(30_000);

const PORT = process.env.BDD_PORT || '4174'; // different from the Playwright suite (4173)
const BASE_URL = `http://127.0.0.1:${PORT}`;
const BROWSERS = { chromium, firefox, webkit };

const BROWSER_NAME = process.env.BROWSER || 'chromium';
const EVIDENCE_FOLDER = path.join(__dirname, '../../../evidence/automation', `cucumber-${BROWSER_NAME}`);
let screenshotNumber = 0;

let server;
let browser;

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${BASE_URL}/healthz`);
      if (response.ok) return;
    } catch (error) {
      // Server not ready yet: try again shortly.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('The mock server did not start in time.');
}

BeforeAll({ timeout: 60_000 }, async () => {
  // Evidence: start with an empty folder so old and new screenshots never mix.
  fs.rmSync(EVIDENCE_FOLDER, { recursive: true, force: true });
  fs.mkdirSync(EVIDENCE_FOLDER, { recursive: true });
  server = spawn('node', [path.join('mock-app', 'server.js')], {
    env: { ...process.env, PORT },
    stdio: 'ignore',
  });
  await waitForServer();
  browser = await BROWSERS[BROWSER_NAME].launch({ headless: process.env.HEADED !== 'true' });
});

AfterAll(async () => {
  if (browser) await browser.close();
  if (server) server.kill();
});

Before(async function () {
  this.context = await browser.newContext({ baseURL: BASE_URL });
  this.page = await this.context.newPage();
  // Record any alert/confirm/prompt the page opens, then close it.
  this.page.on('dialog', async (dialog) => {
    this.dialogs.push(dialog.message());
    await dialog.dismiss();
  });
});

After(async function (scenario) {
  const failed = scenario.result && scenario.result.status === Status.FAILED;
  try {
    // Evidence: one screenshot per scenario, pass or fail, saved to evidence/automation/.
    screenshotNumber += 1;
    const name = scenario.pickle.name.replace(/[^A-Za-z0-9._ -]/g, '').trim().replace(/\s+/g, '-').slice(0, 70);
    const caseId = (scenario.pickle.tags.map((t) => t.name).find((t) => /^@[A-Z]{3}-\d\d$/.test(t)) || '@NA').slice(1);
    const file = `${String(screenshotNumber).padStart(2, '0')}_${caseId}_${name}__${failed ? 'FAIL' : 'PASS'}.png`;
    const screenshot = await this.page.screenshot({ path: path.join(EVIDENCE_FOLDER, file) });
    if (failed) this.attach(screenshot, 'image/png'); // failed ones also appear in the HTML report
  } catch (error) {
    // A screenshot problem must never fail the scenario itself.
  }
  await this.context.close();
});
