/* Steps for application-submission.feature. */
const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { validApplicant, applicantWith } = require('../../shared/data/applicants');
const { observeApplicationRequests } = require('../../shared/support/network');
const { storedApplications } = require('./common.steps');

// Given steps

Given('the server takes {int} ms to answer', async function (delayMs) {
  // Simulated slow server. The tracker also counts requests.
  this.tracker = await observeApplicationRequests(this.page, { delayMs });
});

// When steps

When('I double-click the Submit button', async function () {
  await this.applicationPage.doubleClickSubmit();
});

When('two submit events fire back to back without a click', async function () {
  await this.applicationPage.submitTwiceWithoutClicking();
});

When('I press Enter in the email field', async function () {
  await this.applicationPage.pressEnterInEmail();
});

When('I apply again with the same email in capital letters', async function () {
  await this.applicationPage.startNewApplication();
  this.applicant = applicantWith({ email: validApplicant.email.toUpperCase() });
  await this.applicationPage.submitWith(this.applicant);
});

When('I refresh the page', async function () {
  await this.applicationPage.refresh();
});

// Then steps

Then('I see a confirmation with my name and a reference number', async function () {
  await expect(this.applicationPage.confirmation).toBeVisible();
  await expect(this.applicationPage.confirmationName).toHaveText(validApplicant.fullName);
  await expect(this.applicationPage.confirmationReference).toHaveText(/^APP-\d{4}$/);
});

Then('the form is hidden', async function () {
  await expect(this.applicationPage.form).toBeHidden();
});

Then('the stored application has my typed details', async function () {
  const { applications } = await storedApplications(this);
  expect(applications[0]).toMatchObject({
    fullName: validApplicant.fullName,
    email: validApplicant.email,
    experience: 3,
    coverNote: validApplicant.coverNote,
  });
});

Then('I see an empty application form', async function () {
  await expect(this.applicationPage.form).toBeVisible();
  await expect(this.applicationPage.confirmation).toBeHidden();
  await expect(this.applicationPage.fullName).toHaveValue('');
});
