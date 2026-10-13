const { expect } = require('@playwright/test');

/*
 * Checks shared by more than one spec. The page object only knows how to use
 * the page; what counts as correct is decided here and in the specs.
 */

/*
 * Form accepted the data: the confirmation is shown and the server saved
 * exactly one record. Checking the server proves it was really stored, not
 * just that the screen changed.
 */
async function expectAccepted(applicationPage, storedApplications) {
  await expect(applicationPage.confirmation).toBeVisible();
  const { count } = await storedApplications();
  expect(count).toBe(1);
}

/*
 * Form refused the data: the field shows the message, no confirmation
 * appears and no request went out.
 */
async function expectRejected(applicationPage, field, message, requestTracker) {
  const error = applicationPage.fieldError(field);
  // Text first: it retries until the message really appears, so a slow browser cannot
  // fail the check by catching the element before its text is filled in.
  await expect(error).toContainText(message);
  await expect(error).toBeVisible();
  await expect(applicationPage.confirmation).toBeHidden();
  expect(requestTracker.count).toBe(0);
}

/** After a failure, everything the candidate typed is still in the form. */
async function expectDetailsKept(applicationPage, applicant) {
  await expect(applicationPage.fullName).toHaveValue(applicant.fullName);
  await expect(applicationPage.email).toHaveValue(applicant.email);
  await expect(applicationPage.experience).toHaveValue(applicant.experience);
  await expect(applicationPage.coverNote).toHaveValue(applicant.coverNote);
}

module.exports = { expectAccepted, expectRejected, expectDetailsKept };
