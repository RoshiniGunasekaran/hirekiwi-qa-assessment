/*
 * Gives each test its case ID and tags so we can run subsets:
 *   npm run test:smoke   (--grep @smoke)
 *   npm run test:p1      (--grep @P1)
 * The case ID also shows up as an annotation in the HTML report.
 * Usage: meta('VAL-01', 'P1', 'smoke', 'negative')
 */
function meta(testCaseId, priority, ...labels) {
  return {
    tag: [`@${priority}`, ...labels.map((label) => `@${label}`)],
    annotation: { type: 'test-case', description: testCaseId },
  };
}

module.exports = { meta };
