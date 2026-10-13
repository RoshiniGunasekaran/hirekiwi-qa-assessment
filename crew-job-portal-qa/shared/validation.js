/*
 * Form rules for the mock application form.
 * The page loads this file in the browser and the server requires it,
 * so both sides always check the same limits.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ApplicationValidation = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const LIMITS = Object.freeze({
    nameMin: 2,
    nameMax: 60,
    experienceMin: 0,
    experienceMax: 20,
    noteMax: 500,
  });

  const MESSAGES = Object.freeze({
    nameRequired: 'Enter your full name.',
    nameTooShort: `Full name must be at least ${LIMITS.nameMin} characters.`,
    nameTooLong: `Full name must be ${LIMITS.nameMax} characters or fewer.`,
    emailRequired: 'Enter your email address.',
    emailInvalid: 'Enter a valid email address, like name@example.com.',
    experienceRequired: 'Enter your years of experience.',
    experienceInvalid: `Enter a whole number from ${LIMITS.experienceMin} to ${LIMITS.experienceMax}.`,
    noteTooLong: `Cover note must be ${LIMITS.noteMax} characters or fewer.`,
  });

  // something@something.tld: no spaces, exactly one "@", a dot in the domain,
  // and a top-level domain of at least two characters.
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const WHOLE_NUMBER_PATTERN = /^\d+$/;
  // Zero-width characters are not whitespace for String.prototype.trim(),
  // but a name made only of them is empty to a human reader.
  const INVISIBLE_CHARACTERS = /[\u200B-\u200D\u2060\uFEFF]/g;

  // Count what a person sees as characters, not UTF-16 code units.
  const countCharacters = (text) => Array.from(text).length;

  const clean = (value) =>
    (value === undefined || value === null ? '' : String(value)).trim();

  function validate(input) {
    const source = input || {};
    const values = {
      fullName: clean(source.fullName),
      email: clean(source.email),
      experience: clean(source.experience),
      coverNote: clean(source.coverNote),
    };
    const errors = {};

    const visibleName = values.fullName.replace(INVISIBLE_CHARACTERS, '').trim();
    if (visibleName === '') {
      errors.fullName = MESSAGES.nameRequired;
    } else if (countCharacters(values.fullName) < LIMITS.nameMin) {
      errors.fullName = MESSAGES.nameTooShort;
    } else if (countCharacters(values.fullName) > LIMITS.nameMax) {
      errors.fullName = MESSAGES.nameTooLong;
    }

    if (values.email === '') {
      errors.email = MESSAGES.emailRequired;
    } else if (!EMAIL_PATTERN.test(values.email)) {
      errors.email = MESSAGES.emailInvalid;
    }

    if (values.experience === '') {
      errors.experience = MESSAGES.experienceRequired;
    } else if (
      !WHOLE_NUMBER_PATTERN.test(values.experience) ||
      Number(values.experience) < LIMITS.experienceMin ||
      Number(values.experience) > LIMITS.experienceMax
    ) {
      errors.experience = MESSAGES.experienceInvalid;
    }

    if (countCharacters(values.coverNote) > LIMITS.noteMax) {
      errors.coverNote = MESSAGES.noteTooLong;
    }

    return { values, errors };
  }

  return { LIMITS, MESSAGES, EMAIL_PATTERN, countCharacters, validate };
});
