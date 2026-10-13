/*
 * Steps shared by all three feature files. Each Given/When/Then line in a
 * .feature file is matched to one function here, and the function drives the
 * page through the page object, so there are no selectors in the steps.
 */
const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { ApplicationPage } = require('../../shared/pages/ApplicationPage');
const { validApplicant } = require('../../shared/data/applicants');
const { observeApplicationRequests } = require('../../shared/support/network');
const { expectDetailsKept } = require('../../shared/support/assertions');

/** Asks the mock server what it really saved (not just what the screen shows). */
async function storedApplications(world) {
  const response = await world.context.request.get(
    `/api/test/applications?jobId=${world.jobId}`,
  );
  expect(response.ok()).toBeTruthy();
  return response.json();
}

// Given steps

Given('I am on the application form', async function () {
  this.applicationPage = new ApplicationPage(this.page, this.jobId);
  await this.applicationPage.goto();
  this.tracker = await observeApplicationRequests(this.page); // counts requests to the server
});

Given('I have already submitted a valid application', async function () {
  this.applicant = validApplicant;
  await this.applicationPage.submitWith(validApplicant);
  await expect(this.applicationPage.confirmation).toBeVisible();
});

// When steps

When('I fill in the form with valid details', async function () {
  this.applicant = validApplicant;
  await this.applicationPage.fillForm(validApplicant);
});

When('I submit the application', async function () {
  await this.applicationPage.submit();
});

When('I submit the application again', async function () {
  await this.applicationPage.submit();
});

When('I submit a valid application', async function () {
  this.applicant = validApplicant;
  await this.applicationPage.submitWith(validApplicant);
});

When('I click the Submit button', async function () {
  await this.applicationPage.submit();
});

// Then steps

Then('I see a confirmation', async function () {
  // Longer timeout: some scenarios hold the server answer for 3 seconds.
  await expect(this.applicationPage.confirmation).toBeVisible({ timeout: 10_000 });
});

Then('no confirmation is shown', async function () {
  await expect(this.applicationPage.confirmation).toBeHidden();
});

Then('no request is sent to the server', async function () {
  expect(this.tracker.count).toBe(0);
});

Then('the server received exactly {int} request(s)', async function (expected) {
  expect(this.tracker.count).toBe(expected);
});

Then('the server stores exactly {int} application(s)', async function (expected) {
  const { count } = await storedApplications(this);
  expect(count).toBe(expected);
});

Then('my typed details are still in the form', async function () {
  await expectDetailsKept(this.applicationPage, this.applicant);
});

Then('the Submit button is disabled and reads {string}', async function (label) {
  await expect(this.applicationPage.submitButton).toBeDisabled();
  await expect(this.applicationPage.submitButton).toHaveText(label);
});

Then('the Submit button is enabled', async function () {
  await expect(this.applicationPage.submitButton).toBeEnabled();
});

Then('the Submit button is enabled and reads {string}', async function (label) {
  await expect(this.applicationPage.submitButton).toBeEnabled();
  await expect(this.applicationPage.submitButton).toHaveText(label);
});

Then('the form shows the message {string}', async function (message) {
  await expect(this.applicationPage.formError).toContainText(message);
});

module.exports = { storedApplications };
