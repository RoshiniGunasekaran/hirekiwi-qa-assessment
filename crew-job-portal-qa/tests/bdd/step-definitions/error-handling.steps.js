/*
 * Steps for error-handling.feature. The failures are faked by intercepting
 * the browser's request with Playwright.
 */
const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const {
  stubApplicationResponse,
  failApplicationRequests,
  restoreApplicationEndpoint,
} = require('../../shared/support/network');

// Given steps

Given('the server fails with status {int}', async function (status) {
  await stubApplicationResponse(this.page, {
    status,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'internal_error' }),
  });
});

Given('the network connection drops', async function () {
  await failApplicationRequests(this.page);
});

Given('the server rejects the email with {string}', async function (message) {
  await stubApplicationResponse(this.page, {
    status: 400,
    contentType: 'application/json',
    body: JSON.stringify({ errors: { email: message } }),
  });
});

// When steps

When('the server recovers', async function () {
  await restoreApplicationEndpoint(this.page);
});

// Then steps

Then('the error message is gone', async function () {
  await expect(this.applicationPage.formError).toBeHidden();
});

Then('the form is marked as busy', async function () {
  await expect(this.applicationPage.form).toHaveAttribute('aria-busy', 'true');
});

Then('the email field is flagged and has the focus', async function () {
  await expect(this.applicationPage.email).toHaveAttribute('aria-invalid', 'true');
  await expect(this.applicationPage.email).toBeFocused();
});

Then('the full name field is not flagged', async function () {
  await expect(this.applicationPage.fieldError('fullName')).toBeHidden();
});
