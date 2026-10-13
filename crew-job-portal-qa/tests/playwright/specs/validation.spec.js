/*
 * Form validation tests (VAL-01 to VAL-08) on the mock application form.
 * Bad input should be refused with a clear message, good input should go
 * through, and the edge cases (empty, whitespace, limits, odd characters)
 * should behave. Most tests check the screen and also ask the server what it saved.
 */
const { test, expect } = require('../fixtures/test-fixtures');
const { applicantWith, repeat } = require('../../shared/data/applicants');
const { observeApplicationRequests } = require('../../shared/support/network');
const { expectAccepted, expectRejected } = require('../../shared/support/assertions');
const { meta } = require('../support/meta');

test.describe('Form validation', () => {
  // VAL-01 (P1): submit an empty form. Name, email and experience get flagged, focus goes to the first bad field, the optional cover note stays clean and nothing is sent.
  test(
    'VAL-01 empty form flags every required field and sends nothing',
    meta('VAL-01', 'P1', 'smoke', 'negative'),
    async ({ page, applicationPage }) => {
      // watch the network so we can prove no request is sent.
      const tracker = await observeApplicationRequests(page);

      await applicationPage.submit();

      // each required field shows an error and is marked invalid.
      for (const field of ['fullName', 'email', 'experience']) {
        await expect(applicationPage.fieldError(field)).toBeVisible();
      }
      await expect(applicationPage.fullName).toHaveAttribute('aria-invalid', 'true');
      await expect(applicationPage.email).toHaveAttribute('aria-invalid', 'true');
      await expect(applicationPage.experience).toHaveAttribute('aria-invalid', 'true');
      // Keyboard users land on the first problem.
      await expect(applicationPage.fullName).toBeFocused();
      // The cover note is optional, so it must not be flagged.
      await expect(applicationPage.fieldError('coverNote')).toBeHidden();
      expect(tracker.count).toBe(0);
    },
  );

  // VAL-02 (P1): every badly formed email must be refused. One test per value, so a failure names the exact value that slipped through.
  const invalidEmails = ['plain', 'a@', '@b.com', 'a@b', 'a b@c.com', 'a@@b.com'];
  for (const email of invalidEmails) {
    test(
      `VAL-02 rejects invalid email "${email}"`,
      meta('VAL-02', 'P1', 'negative'),
      async ({ page, applicationPage }) => {
        const tracker = await observeApplicationRequests(page);

        // everything else is valid, so only the email can cause the error.
        await applicationPage.submitWith(applicantWith({ email }));

        await expectRejected(applicationPage, 'email', 'valid email address', tracker);
      },
    );
  }

  // VAL-03 (P2): make sure the rule isn't too strict. Plus-addressing and subdomains are valid emails.
  const validEmails = ['a@b.co', 'first.last+tag@sub.example.com'];
  for (const email of validEmails) {
    test(
      `VAL-03 accepts valid email "${email}"`,
      meta('VAL-03', 'P2', 'positive'),
      async ({ applicationPage, storedApplications }) => {
        await applicationPage.submitWith(applicantWith({ email }));

        await expectAccepted(applicationPage, storedApplications);
      },
    );
  }

  // VAL-04 (P1): a name that looks empty counts as empty. Covers spaces, tabs, non-breaking spaces and zero-width spaces.
  const blankNames = {
    spaces: repeat(' ', 5),
    tabs: repeat('\t', 3),
    'non-breaking spaces': repeat('\u00a0', 3),
    'zero-width spaces': repeat('\u200b', 3),
  };
  for (const [kind, fullName] of Object.entries(blankNames)) {
    test(
      `VAL-04 rejects a name made only of ${kind}`,
      meta('VAL-04', 'P1', 'negative', 'edge'),
      async ({ page, applicationPage }) => {
        const tracker = await observeApplicationRequests(page);

        await applicationPage.submitWith(applicantWith({ fullName }));

        // treated exactly like an empty name.
        await expectRejected(applicationPage, 'fullName', 'Enter your full name.', tracker);
      },
    );
  }

  // VAL-04 (second half): real names are trimmed before they are saved
  test(
    'VAL-04 trims spaces around a valid name before saving',
    meta('VAL-04', 'P1', 'positive', 'edge'),
    async ({ applicationPage, storedApplications }) => {
      await applicationPage.submitWith(applicantWith({ fullName: '   Asha Raman   ' }));

      // shown trimmed AND stored trimmed.
      await expect(applicationPage.confirmationName).toHaveText('Asha Raman');
      const { applications } = await storedApplications();
      expect(applications[0].fullName).toBe('Asha Raman');
    },
  );

  // VAL-05 (P2): name length limits are 2 and 60. Try just below, on and just above each limit.
  const nameLengths = [
    { length: 1, accepted: false, message: 'at least 2 characters' },
    { length: 2, accepted: true },
    { length: 60, accepted: true },
    { length: 61, accepted: false, message: '60 characters or fewer' },
  ];
  for (const { length, accepted, message } of nameLengths) {
    test(
      `VAL-05 name of ${length} character(s) is ${accepted ? 'accepted' : 'rejected'}`,
      meta('VAL-05', 'P2', 'boundary'),
      async ({ page, applicationPage, storedApplications }) => {
        const tracker = await observeApplicationRequests(page);

        await applicationPage.submitWith(applicantWith({ fullName: repeat('N', length) }));

        if (accepted) {
          await expectAccepted(applicationPage, storedApplications);
        } else {
          await expectRejected(applicationPage, 'fullName', message, tracker);
        }
      },
    );
  }

  // VAL-06 (P2): experience must be a whole number from 0 to 20. Both limits, a negative, a decimal and plain text.
  const experienceValues = [
    { value: '-1', accepted: false },
    { value: '0', accepted: true },
    { value: '20', accepted: true },
    { value: '21', accepted: false },
    { value: '1.5', accepted: false },
    { value: 'abc', accepted: false },
  ];
  for (const { value, accepted } of experienceValues) {
    test(
      `VAL-06 experience "${value}" is ${accepted ? 'accepted' : 'rejected'}`,
      meta('VAL-06', 'P2', 'boundary'),
      async ({ page, applicationPage, storedApplications }) => {
        const tracker = await observeApplicationRequests(page);

        await applicationPage.submitWith(applicantWith({ experience: value }));

        if (accepted) {
          await expectAccepted(applicationPage, storedApplications);
          // The server must store a number, not the typed text.
          const { applications } = await storedApplications();
          expect(applications[0].experience).toBe(Number(value));
        } else {
          await expectRejected(applicationPage, 'experience', 'whole number from 0 to 20', tracker);
        }
      },
    );
  }

  // VAL-07 (P2): a cover note of exactly 500 characters is allowed
  test(
    'VAL-07 cover note of 500 characters is accepted',
    meta('VAL-07', 'P2', 'boundary'),
    async ({ applicationPage, storedApplications }) => {
      await applicationPage.fillForm(applicantWith({ coverNote: repeat('n', 500) }));
      // The live counter tells the candidate how much they have used.
      await expect(applicationPage.noteCounter).toHaveText('500 / 500');

      await applicationPage.submit();

      await expectAccepted(applicationPage, storedApplications);
    },
  );

  // VAL-07 (P2): one character over the limit is refused
  test(
    'VAL-07 cover note of 501 characters is rejected',
    meta('VAL-07', 'P2', 'boundary'),
    async ({ page, applicationPage }) => {
      const tracker = await observeApplicationRequests(page);
      await applicationPage.fillForm(applicantWith({ coverNote: repeat('n', 501) }));
      await expect(applicationPage.noteCounter).toHaveText('501 / 500');

      await applicationPage.submit();

      await expectRejected(applicationPage, 'coverNote', '500 characters or fewer', tracker);
    },
  );

  // VAL-08 (P2): script text typed into a field must show as plain text and never run. If it ran, a dialog would open.
  test(
    'VAL-08 script text is shown as plain text and never runs',
    meta('VAL-08', 'P2', 'negative', 'security'),
    async ({ page, applicationPage, storedApplications }) => {
      // record any dialog the page tries to open.
      const dialogs = [];
      page.on('dialog', async (dialog) => {
        dialogs.push(dialog.message());
        await dialog.dismiss();
      });
      const script = '<script>alert(1)</script>';

      await applicationPage.submitWith(applicantWith({ fullName: script, coverNote: script }));

      // shown literally, no dialog opened, stored unchanged.
      await expect(applicationPage.confirmationName).toHaveText(script);
      expect(dialogs).toEqual([]);
      const { applications } = await storedApplications();
      expect(applications[0].fullName).toBe(script);
    },
  );

  // VAL-08 (P2): Tamil names must work. Trying only "John Smith" would miss encoding and length-counting problems.
  test(
    'VAL-08 a Tamil name is accepted and shown intact',
    meta('VAL-08', 'P2', 'positive', 'edge'),
    async ({ applicationPage, storedApplications }) => {
      const tamilName = 'ரோஷினி';

      await applicationPage.submitWith(applicantWith({ fullName: tamilName }));

      // nothing lost or garbled between screen, network and storage.
      await expect(applicationPage.confirmationName).toHaveText(tamilName);
      const { applications } = await storedApplications();
      expect(applications[0].fullName).toBe(tamilName);
    },
  );
});
