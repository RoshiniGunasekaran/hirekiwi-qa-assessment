/* Steps for form-validation.feature. */
const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { applicantWith, repeat } = require('../../shared/data/applicants');
const { storedApplications } = require('./common.steps');

// Words used in the feature files -> the field names the Page Object uses.
const FIELD_KEYS = {
  'full name': 'fullName',
  email: 'email',
  'years of experience': 'experience',
  'cover note': 'coverNote',
};

// The kinds of "looks empty" input tested in VAL-04.
const BLANK_NAMES = {
  spaces: repeat(' ', 5),
  tabs: repeat('\t', 3),
  'non-breaking spaces': repeat('\u00a0', 3),
  'zero-width spaces': repeat('\u200b', 3),
};

async function submitWithOverride(world, overrides) {
  world.applicant = applicantWith(overrides);
  await world.applicationPage.submitWith(world.applicant);
}

// When steps

When(
  /^I submit a valid application with the (email|full name|years of experience|cover note) "(.*)"$/,
  async function (fieldName, value) {
    const key = FIELD_KEYS[fieldName];
    if (key === 'experience') this.typedExperience = value;
    await submitWithOverride(this, { [key]: value });
  },
);

When(
  /^I submit a valid application with a full name made only of (.+)$/,
  async function (kind) {
    await submitWithOverride(this, { fullName: BLANK_NAMES[kind] });
  },
);

When('I submit a valid application with a full name of {int} character(s)', async function (length) {
  this.expectedError = length < 2 ? 'at least 2 characters' : '60 characters or fewer';
  await submitWithOverride(this, { fullName: repeat('N', length) });
});

When('I submit a valid application with a cover note of {int} character(s)', async function (length) {
  this.expectedError = '500 characters or fewer';
  await submitWithOverride(this, { coverNote: repeat('n', length) });
});

// Then steps

Then('every required field shows an error', async function () {
  for (const field of ['fullName', 'email', 'experience']) {
    await expect(this.applicationPage.fieldError(field)).toBeVisible();
  }
  await expect(this.applicationPage.fullName).toHaveAttribute('aria-invalid', 'true');
  await expect(this.applicationPage.email).toHaveAttribute('aria-invalid', 'true');
  await expect(this.applicationPage.experience).toHaveAttribute('aria-invalid', 'true');
});

Then('the first invalid field has the focus', async function () {
  await expect(this.applicationPage.fullName).toBeFocused();
});

Then('the cover note is not flagged', async function () {
  await expect(this.applicationPage.fieldError('coverNote')).toBeHidden();
});

Then('the {string} field shows the error {string}', async function (field, message) {
  const error = this.applicationPage.fieldError(field);
  await expect(error).toBeVisible();
  await expect(error).toContainText(message);
});

Then('the application is accepted', async function () {
  await expect(this.applicationPage.confirmation).toBeVisible();
  expect((await storedApplications(this)).count).toBe(1);
});

Then(
  /^the (full name|years of experience|cover note) is (accepted|rejected)$/,
  async function (fieldName, result) {
    const key = FIELD_KEYS[fieldName];
    if (result === 'accepted') {
      await expect(this.applicationPage.confirmation).toBeVisible();
      const { count, applications } = await storedApplications(this);
      expect(count).toBe(1);
      // The server must store experience as a number, not as the typed text.
      if (key === 'experience') {
        expect(applications[0].experience).toBe(Number(this.typedExperience));
      }
    } else {
      const error = this.applicationPage.fieldError(key);
      await expect(error).toBeVisible();
      await expect(error).toContainText(
        key === 'experience' ? 'whole number from 0 to 20' : this.expectedError,
      );
      await expect(this.applicationPage.confirmation).toBeHidden();
      expect(this.tracker.count).toBe(0);
    }
  },
);

Then('the confirmation shows the name {string}', async function (name) {
  await expect(this.applicationPage.confirmationName).toHaveText(name.trim());
});

Then('the server stored the full name {string}', async function (name) {
  const { applications } = await storedApplications(this);
  expect(applications[0].fullName).toBe(name.trim());
});

Then('no browser dialog opened', async function () {
  expect(this.dialogs).toEqual([]);
});
