/* test data lives here so the tests stay readable */

const validApplicant = Object.freeze({
  fullName: 'Asha Raman',
  email: 'asha.raman@example.com',
  experience: '3',
  coverNote: 'Interested in API and exploratory testing.',
});

/** Returns a valid applicant with some fields replaced. */
const applicantWith = (overrides) => ({ ...validApplicant, ...overrides });

const repeat = (character, times) => character.repeat(times);

module.exports = { validApplicant, applicantWith, repeat };
