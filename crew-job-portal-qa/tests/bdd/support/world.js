/*
 * Cucumber builds a new World for every scenario, so scenarios never share
 * data. Steps keep their state on `this`, e.g. this.applicationPage.
 */
const { setWorldConstructor, World } = require('@cucumber/cucumber');
const { randomUUID } = require('node:crypto');

class CustomWorld extends World {
  constructor(options) {
    super(options);
    this.jobId = `job-${randomUUID()}`; // unique job: scenarios cannot see each other's data
    this.applicant = null; // the applicant used by the scenario
    this.dialogs = []; // browser dialogs (alert/confirm) the page tried to open
    this.tracker = null; // watches requests sent to the server
  }
}

setWorldConstructor(CustomWorld);
