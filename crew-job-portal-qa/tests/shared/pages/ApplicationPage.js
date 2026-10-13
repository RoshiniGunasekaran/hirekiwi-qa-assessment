const { expect } = require('@playwright/test');

/*
 * Page object for the mock job application form.
 * All selectors live here, so if the page changes only this file changes.
 * Methods are named for what a candidate does (fillForm, submit).
 * No business-rule assertions here, the specs decide what is correct.
 * Locators use labels and roles first (that's how people find things) and
 * test ids only for messages.
 */
class ApplicationPage {
  /**
   * @param {import('@playwright/test').Page} page
   * @param {string} jobId  Unique per test, so saved data never mixes between tests.
   */
  constructor(page, jobId) {
    this.page = page;
    this.jobId = jobId;

    // Page and form
    this.heading = page.getByRole('heading', { name: 'Apply for QA Engineer' });
    this.form = page.locator('#application-form');

    // Input fields
    this.fullName = page.getByLabel('Full name');
    this.email = page.getByLabel('Email address');
    this.experience = page.getByLabel('Years of experience');
    this.coverNote = page.getByLabel('Cover note');
    this.noteCounter = page.getByTestId('coverNote-count');

    // The label changes to "Submitting…" while a request is pending, so the
    // locator accepts both names and stays valid in either state.
    this.submitButton = page.getByRole('button', { name: /^(Submit application|Submitting…)$/ });

    // Messages
    this.formError = page.getByTestId('form-error');
    this.confirmation = page.getByTestId('confirmation');
    this.confirmationName = page.getByTestId('confirmation-name');
    this.confirmationReference = page.getByTestId('confirmation-reference');
    this.newApplicationButton = page.getByRole('button', { name: 'Start a new application' });
  }

  /**
   * The error message shown next to one field.
   * @param {'fullName' | 'email' | 'experience' | 'coverNote'} field
   */
  fieldError(field) {
    return this.page.getByTestId(`${field}-error`);
  }

  /** Opens the form for this test's job and waits until it is ready. */
  async goto() {
    await this.page.goto(`/?job=${encodeURIComponent(this.jobId)}`);
    await expect(this.heading).toBeVisible();
  }

  /**
   * Types into the form. Only the fields that are provided are filled, so a
   * test can deliberately leave other fields empty.
   * @param {{ fullName?: string, email?: string, experience?: string, coverNote?: string }} data
   */
  async fillForm(data) {
    if (data.fullName !== undefined) await this.fullName.fill(data.fullName);
    if (data.email !== undefined) await this.email.fill(data.email);
    if (data.experience !== undefined) await this.experience.fill(data.experience);
    if (data.coverNote !== undefined) await this.coverNote.fill(data.coverNote);
  }

  /** Clicks "Submit application". */
  async submit() {
    await this.submitButton.click();
  }

  /** Fills the form, then submits it. */
  async submitWith(data) {
    await this.fillForm(data);
    await this.submit();
  }

  /** Double-clicks "Submit application" (two clicks in quick succession). */
  async doubleClickSubmit() {
    await this.submitButton.dblclick();
  }

  /** Fires two submit events without clicking the button (like a script or a fast Enter). */
  async submitTwiceWithoutClicking() {
    await this.form.evaluate((form) => {
      form.requestSubmit();
      form.requestSubmit();
    });
  }

  /** Presses Enter while the cursor is in the email field. */
  async pressEnterInEmail() {
    await this.email.press('Enter');
  }

  /** From the confirmation screen, goes back to an empty form. */
  async startNewApplication() {
    await this.newApplicationButton.click();
  }

  /** Reloads the page, like pressing F5. */
  async refresh() {
    await this.page.reload();
  }
}

module.exports = { ApplicationPage };
