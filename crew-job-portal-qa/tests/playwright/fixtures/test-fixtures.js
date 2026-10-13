const base = require('@playwright/test');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { ApplicationPage } = require('../../shared/pages/ApplicationPage');

const { expect } = base;

/*
 * Custom fixtures: setup Playwright runs before a test and hands to it.
 *   jobId               a unique job per test, so tests can't see each
 *                       other's data and can run in parallel
 *   applicationPage     the form, already open for that job
 *   storedApplications  asks the server what it really saved
 */
const EVIDENCE_DIR = path.join(__dirname, '../../../evidence/automation');

/* turns a test title into a safe file name */
const toFileName = (title) =>
  title.replace(/[^A-Za-z0-9._ -]/g, '').trim().replace(/\s+/g, '-').slice(0, 90);

const test = base.test.extend({
  // Evidence: takes a screenshot at the end of EVERY test, pass or fail, and saves it
  // to evidence/automation/<browser>/. `auto: true` means no test has to ask for it.
  evidenceScreenshot: [
    async ({ page }, use, testInfo) => {
      await use();
      try {
        const folder = path.join(EVIDENCE_DIR, testInfo.project.name);
        fs.mkdirSync(folder, { recursive: true });
        const result = testInfo.status === 'passed' ? 'PASS' : 'FAIL';
        await page.screenshot({ path: path.join(folder, `${toFileName(testInfo.title)}__${result}.png`) });
      } catch (error) {
        // A screenshot problem must never fail the test itself.
      }
    },
    { auto: true },
  ],

  // eslint-disable-next-line no-empty-pattern
  jobId: async ({}, use) => {
    await use(`job-${randomUUID()}`);
  },

  applicationPage: async ({ page, jobId }, use) => {
    const applicationPage = new ApplicationPage(page, jobId);
    await applicationPage.goto();
    await use(applicationPage);
  },

  storedApplications: async ({ request, jobId }, use) => {
    await use(async () => {
      const response = await request.get(`/api/test/applications?jobId=${jobId}`);
      expect(response.ok()).toBeTruthy();
      return response.json();
    });
  },
});

module.exports = { test, expect };
