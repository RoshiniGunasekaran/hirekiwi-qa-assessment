// Cucumber settings. "default" is the profile used by `npm run bdd`.
module.exports = {
  default: {
    paths: ['tests/bdd/features/**/*.feature'],
    require: ['tests/bdd/support/**/*.js', 'tests/bdd/step-definitions/**/*.js'],
    format: [
      'progress-bar',
      'html:reports/cucumber-report.html',
      'json:reports/cucumber-report.json',
    ],
    formatOptions: { snippetInterface: 'async-await' },
  },
};
