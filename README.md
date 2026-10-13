# Job Application Portal: QA Assessment

QA Engineer assessment for HireKiwi (Infinitica): test a job application workflow, find defects, and automate the most important checks.

## What I tested

| Area | Where | How |
| --- | --- | --- |
| Job listings, search, filters, navigation (scope 1 and 2) | Live portal: https://crew.tinobritty.me/jobs | Manual, read-only. Nothing was submitted, saved or changed. |
| Form validation, submission, error handling, cross-browser (scope 3 to 6) | Local mock application in `mock-app/` | Automated with Playwright and Cucumber. |

The live portal was used only for safe exploratory testing, as the brief requires. Because submitting fake applications to it is not allowed, I built a small local mock form and server (`mock-app/`) so submission and error scenarios could be tested safely. The mock keeps data in memory and loses it on restart.

## Project layout

```
mock-app/            Local form and server used for the automated tests
shared/validation.js Form rules, used by both the page and the server
tests/playwright/    Playwright specs (validation, submission, error handling, layout)
tests/bdd/           Cucumber features and step definitions
tests/shared/        Page object, test data and helpers used by both suites
docs/                Test plan, manual and automated test cases, bug reports (Word and PDF)
evidence/            Screenshots: live-portal/ (bugs) and automation/ (every test run)
```

## Setup

You need Node.js 18 or newer (developed on Node 22).

```
npm install
npx playwright install
```

The second command downloads the Chromium, Firefox and WebKit browsers that Playwright uses.

## Running the tests

Playwright starts the mock server itself, so you do not need to start it first.

| Command | What it does |
| --- | --- |
| `npm test` | Whole Playwright suite on Chromium, Firefox and WebKit |
| `npm run test:chromium` | Whole suite on Chromium only |
| `npm run test:firefox` / `npm run test:webkit` | Same suite on one browser, one worker |
| `npm run test:smoke` | The 4 most important checks, as a quick health test |
| `npm run test:p1` | All high-priority (P1) tests |
| `npm run test:headed` | Chromium with a visible browser window |
| `npm run report` | Opens the Playwright HTML report |
| `npm run bdd` | Cucumber (BDD) scenarios on Chromium |
| `npm run bdd:p1` / `npm run bdd:smoke` | Cucumber, high-priority or smoke only |
| `npm start` | Starts the mock form at http://127.0.0.1:4173/?job=qa-engineer for manual poking |

If browsers time out on a slower laptop, lower the number of parallel workers with `WORKERS=1` (on Windows: `set WORKERS=1`).

## What is automated

39 Playwright tests (and 38 matching Cucumber scenarios) cover 19 documented cases. The high-priority ones are:

| ID | What it checks |
| --- | --- |
| VAL-01 | Empty form flags every required field and sends no request |
| VAL-02 | Invalid emails are rejected (`plain`, `a@`, `@b.com`, `a@b`, `a b@c.com`, `a@@b.com`) |
| VAL-04 | Names made only of spaces, tabs, non-breaking or zero-width spaces are rejected; real names are trimmed |
| SUB-01 | A valid application shows a confirmation and saves exactly one record |
| SUB-02 | Double-click or repeated submit sends one request while the button is disabled |
| SUB-03 | The same email applying twice (even in capitals) is rejected |
| ERR-01 | Server error (500) shows a clear message, keeps the typed details, and allows a retry |
| ERR-02 | Network failure shows a message, stops loading, and keeps the details |
| XBR-01 | The suite gives the same result on Chromium, Firefox and WebKit |

Medium and low priority tests cover valid emails, name length (2 to 60), experience (whole number 0 to 20), cover note (500 characters), special and Tamil text, refresh after success, slow responses, server field errors, the Enter key, and a 375 px phone-width layout.

Each test checks both what the user sees and what the server really stored, and every test saves a screenshot to `evidence/automation/<browser>/`.

## Results

Run on 13 October 2026.

| Suite | Browser | Result |
| --- | --- | --- |
| Playwright | Chromium | 39 of 39 passed |
| Playwright | Firefox | 39 of 39 passed |
| Playwright | WebKit | 39 of 39 passed |
| Cucumber | Chromium | 38 of 38 scenarios passed (258 steps) |

Screenshots for every Playwright test on each browser are in `evidence/automation/`, and the run screenshots are also shown in section 6 of `docs/2_Automated_Test_Cases`.

## Manual test results (live portal)

21 manual cases (14 positive, 5 negative, 2 boundary) are in `docs/1_Manual_Test_Cases`. Eight of them failed, and each one has a full bug report (steps, expected and actual result, severity, screenshot) in `docs/3_Bug_Reports`.

| Case | Problem found | Severity |
| --- | --- | --- |
| LST-01 | Salary on the QA Engineer card has no pay period (for example "per month") | Major |
| LST-02 | A job with no salary shows nothing instead of a label such as "Not disclosed" | Minor |
| LST-06 | Search is inconsistent with spaces: "qa" plus one space works, plus two spaces finds nothing, spaces only finds nothing | Minor |
| LST-07 | After opening a job and pressing Back, the chosen filter resets | Major |
| LST-09 | Invalid URL values are handled inconsistently: `page=-1` shows no jobs, and `type=abc` shows 0 jobs while the dropdown says "All Types" | Minor |
| LST-10 | The empty area of a job card is not clickable | Minor |
| LST-15 | The filter button beside the search box opens nothing | Major |
| LST-19 | The card says "Yesterday" but the detail page shows "Posted 10/11/2026", which does not match and is easy to misread | Minor |

Screenshots for these are in `evidence/live-portal/`.

## Documents

| File (in `docs/`) | What it holds |
| --- | --- |
| `0_Test_Plan` | Scope, approach, how priority was decided, the prioritised scenarios, browser checks, risks |
| `1_Manual_Test_Cases` | The 21 manual cases with steps, expected and actual results, and screenshots |
| `2_Automated_Test_Cases` | The 19 automated cases with their Gherkin scenarios and run results |
| `3_Bug_Reports` | The 8 bug reports from the failed manual cases |

Each document is available as Word and PDF.

## Known limits

- The mock application is a stand-in. It is not the real HireKiwi backend, so it shows how the tests work, not how the live system behaves under submission.
- Real phones and Edge were not tested. The 375 px checks use a resized browser window.
- Load and performance testing was not done, as the brief forbids it.
