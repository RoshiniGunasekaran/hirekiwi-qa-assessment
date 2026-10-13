/*
 * Error handling tests (ERR-01 to ERR-04) on the mock application form.
 * When something goes wrong (server error, dropped network, slow server, a
 * field rejected by the server) the user should see a clear message, keep what
 * they typed and be able to try again.
 * The failures are faked by intercepting the request in Playwright, so the
 * mock server doesn't need any special "break now" code.
 */
const { test, expect } = require('../fixtures/test-fixtures');
const { validApplicant } = require('../../shared/data/applicants');
const {
  observeApplicationRequests,
  stubApplicationResponse,
  failApplicationRequests,
  restoreApplicationEndpoint,
} = require('../../shared/support/network');
const { expectDetailsKept } = require('../../shared/support/assertions');
const { meta } = require('../support/meta');

test.describe('Error handling', () => {
  // ERR-01 (P1): server answers 500. The worst case is losing what the user typed, so the details must stay and a retry must work.
  test(
    'ERR-01 a server error shows a clear message, keeps the details and allows a retry',
    meta('ERR-01', 'P1', 'smoke', 'negative'),
    async ({ page, applicationPage, storedApplications }) => {
      // the server fails with HTTP 500.
      await stubApplicationResponse(page, {
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'internal_error' }),
      });

      await applicationPage.submitWith(validApplicant);

      // plain-language message, nothing saved, form still usable.
      await expect(applicationPage.formError).toContainText('Something went wrong on our side');
      await expect(applicationPage.confirmation).toBeHidden();
      await expect(applicationPage.submitButton).toBeEnabled();
      await expectDetailsKept(applicationPage, validApplicant);
      expect((await storedApplications()).count).toBe(0);

      // the server recovers; submit without retyping.
      await restoreApplicationEndpoint(page);
      await applicationPage.submit();

      // the retry succeeds and the error message is gone.
      await expect(applicationPage.confirmation).toBeVisible();
      await expect(applicationPage.formError).toBeHidden();
      expect((await storedApplications()).count).toBe(1);
    },
  );

  // ERR-02 (P1): network drops mid-request. Loading must stop (no endless "Submitting…") and the details are kept.
  test(
    'ERR-02 a network failure shows a message, stops loading and keeps the details',
    meta('ERR-02', 'P1', 'negative'),
    async ({ page, applicationPage, storedApplications }) => {
      // every application request fails as if the connection dropped.
      await failApplicationRequests(page);

      await applicationPage.submitWith(validApplicant);

      await expect(applicationPage.formError).toContainText('Could not reach the server');
      await expect(applicationPage.submitButton).toBeEnabled();
      await expect(applicationPage.submitButton).toHaveText('Submit application');
      await expect(applicationPage.confirmation).toBeHidden();
      await expectDetailsKept(applicationPage, validApplicant);
      expect((await storedApplications()).count).toBe(0);
    },
  );

  // ERR-03 (P2): slow server (3 s). The user should see work in progress and must not be able to resubmit meanwhile.
  test(
    'ERR-03 a slow response shows a loading state until the answer arrives',
    meta('ERR-03', 'P2', 'boundary'),
    async ({ page, applicationPage, storedApplications }) => {
      // hold every response for 3 seconds.
      await observeApplicationRequests(page, { delayMs: 3000 });
      await applicationPage.fillForm(validApplicant);

      await applicationPage.submit();

      // loading state is visible and the button is locked.
      await expect(applicationPage.submitButton).toBeDisabled();
      await expect(applicationPage.submitButton).toHaveText('Submitting…');
      await expect(applicationPage.form).toHaveAttribute('aria-busy', 'true');
      // success, with the longer timeout the delay needs.
      await expect(applicationPage.confirmation).toBeVisible({ timeout: 10_000 });
      expect((await storedApplications()).count).toBe(1);
    },
  );

  // ERR-04 (P2): server rejects one field (400). The message should sit next to that field, not in a vague banner.
  test(
    'ERR-04 a field error from the server appears next to that field',
    meta('ERR-04', 'P2', 'negative'),
    async ({ page, applicationPage }) => {
      // server says the email is not accepted.
      await stubApplicationResponse(page, {
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ errors: { email: 'This email address is not accepted.' } }),
      });

      await applicationPage.submitWith(validApplicant);

      // message beside the email field, field flagged and focused,
      // other fields untouched, details kept.
      await expect(applicationPage.fieldError('email')).toHaveText(
        'This email address is not accepted.',
      );
      await expect(applicationPage.email).toHaveAttribute('aria-invalid', 'true');
      await expect(applicationPage.email).toBeFocused();
      await expect(applicationPage.fieldError('fullName')).toBeHidden();
      await expect(applicationPage.submitButton).toBeEnabled();
      await expectDetailsKept(applicationPage, validApplicant);
    },
  );
});
