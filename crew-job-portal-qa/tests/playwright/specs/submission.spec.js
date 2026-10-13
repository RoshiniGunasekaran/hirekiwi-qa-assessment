/*
 * Submission tests (SUB-01 to SUB-05) on the mock application form.
 * A valid application should be saved exactly once, and the form should hold
 * up against double clicks, the Enter key, refreshes and the same person
 * applying twice.
 */
const { test, expect } = require('../fixtures/test-fixtures');
const { validApplicant, applicantWith } = require('../../shared/data/applicants');
const { observeApplicationRequests } = require('../../shared/support/network');
const { meta } = require('../support/meta');

test.describe('Submission', () => {
  // SUB-01 (P1): the happy path. A valid application shows a confirmation and saves one record.
  test(
    'SUB-01 a valid application shows a confirmation and saves exactly one record',
    meta('SUB-01', 'P1', 'smoke', 'positive'),
    async ({ applicationPage, storedApplications }) => {
      await applicationPage.submitWith(validApplicant);

      // confirmation with the name and a reference number.
      await expect(applicationPage.confirmation).toBeVisible();
      await expect(applicationPage.confirmationName).toHaveText(validApplicant.fullName);
      await expect(applicationPage.confirmationReference).toHaveText(/^APP-\d{4}$/);
      await expect(applicationPage.form).toBeHidden();

      // exactly one record, with the values that were typed.
      const { count, applications } = await storedApplications();
      expect(count).toBe(1);
      expect(applications[0]).toMatchObject({
        fullName: validApplicant.fullName,
        email: validApplicant.email,
        experience: 3,
        coverNote: validApplicant.coverNote,
      });
    },
  );

  // SUB-02 (P1): a double-click must not create two applications. The server answer is held for 800 ms so the first request is still pending when the second click lands, otherwise the test proves nothing.
  test(
    'SUB-02 a double-click sends one request and disables the button while pending',
    meta('SUB-02', 'P1', 'smoke', 'negative'),
    async ({ page, applicationPage, storedApplications }) => {
      const tracker = await observeApplicationRequests(page, { delayMs: 800 });
      await applicationPage.fillForm(validApplicant);

      await applicationPage.submitButton.dblclick();

      // pending state is visible to the candidate...
      await expect(applicationPage.submitButton).toBeDisabled();
      await expect(applicationPage.submitButton).toHaveText('Submitting…');
      await expect(applicationPage.confirmation).toBeVisible();
      // ...and only ONE request and ONE record exist.
      expect(tracker.count).toBe(1);
      expect((await storedApplications()).count).toBe(1);
    },
  );

  // SUB-02 (P1): a disabled button isn't enough. Enter or a script can submit without a click, so the guard has to be in the submit handler.
  test(
    'SUB-02 a second submit event while pending is ignored, even without a click',
    meta('SUB-02', 'P1', 'negative', 'edge'),
    async ({ page, applicationPage, storedApplications }) => {
      const tracker = await observeApplicationRequests(page, { delayMs: 800 });
      await applicationPage.fillForm(validApplicant);

      // fire two submit events back to back, bypassing the button.
      await applicationPage.form.evaluate((form) => {
        form.requestSubmit();
        form.requestSubmit();
      });

      await expect(applicationPage.confirmation).toBeVisible();
      expect(tracker.count).toBe(1);
      expect((await storedApplications()).count).toBe(1);
    },
  );

  // SUB-03 (P1): the same person can't apply twice for one job. The second try uses capitals because emails aren't case-sensitive.
  test(
    'SUB-03 applying twice with the same email is rejected and keeps one record',
    meta('SUB-03', 'P1', 'negative'),
    async ({ applicationPage, storedApplications }) => {
      // first application succeeds.
      await applicationPage.submitWith(validApplicant);
      await expect(applicationPage.confirmation).toBeVisible();
      await applicationPage.newApplicationButton.click();

      // same email in capitals.
      const repeated = applicantWith({ email: validApplicant.email.toUpperCase() });
      await applicationPage.submitWith(repeated);

      // clear message, no second confirmation, details kept, one record.
      await expect(applicationPage.formError).toContainText('already applied');
      await expect(applicationPage.confirmation).toBeHidden();
      await expect(applicationPage.email).toHaveValue(repeated.email);
      expect((await storedApplications()).count).toBe(1);
    },
  );

  // SUB-04 (P2): refreshing after success must not resend the application.
  test(
    'SUB-04 refreshing after success does not create a second record',
    meta('SUB-04', 'P2', 'negative'),
    async ({ page, applicationPage, storedApplications }) => {
      await applicationPage.submitWith(validApplicant);
      await expect(applicationPage.confirmation).toBeVisible();

      await page.reload();

      // a fresh empty form, and still one record.
      await expect(applicationPage.form).toBeVisible();
      await expect(applicationPage.confirmation).toBeHidden();
      await expect(applicationPage.fullName).toHaveValue('');
      expect((await storedApplications()).count).toBe(1);
    },
  );

  // SUB-05 (P3): Enter in a field should behave exactly like clicking the button.
  test(
    'SUB-05 pressing Enter in a field submits once',
    meta('SUB-05', 'P3', 'positive'),
    async ({ page, applicationPage, storedApplications }) => {
      const tracker = await observeApplicationRequests(page);
      await applicationPage.fillForm(validApplicant);

      await applicationPage.email.press('Enter');

      await expect(applicationPage.confirmation).toBeVisible();
      expect(tracker.count).toBe(1);
      expect((await storedApplications()).count).toBe(1);
    },
  );
});
