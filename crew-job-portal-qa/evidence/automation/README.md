# Automatic test screenshots (Option B)

This folder is filled by the test runs. Do not edit it by hand: each run deletes the old screenshots of the browser it runs and writes new ones.

| Folder | Created by | Command |
| --- | --- | --- |
| `chromium/`, `firefox/`, `webkit/` | Playwright suite | `npm run test:firefox`, `npm run test:webkit`, `npm run test:chromium` |
| `cucumber-chromium/`, `cucumber-firefox/`, `cucumber-webkit/` | Cucumber suite | `npm run bdd`, `npm run bdd:firefox`, `npm run bdd:webkit` |

File name pattern: `<test case id and title>__PASS.png` or `__FAIL.png`. The picture shows the page at the end of the test (for example the confirmation, or the error message).

Screenshots of the live portal bugs (Option A) are in `../live-portal/`.
