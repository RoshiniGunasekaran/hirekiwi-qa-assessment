const APPLICATION_ENDPOINT = '**/api/applications';

/*
 * Lets every application request through to the real server and records it.
 * delayMs holds each request back first, to fake a slow server.
 */
async function observeApplicationRequests(page, { delayMs = 0 } = {}) {
  const bodies = [];
  await page.route(APPLICATION_ENDPOINT, async (route) => {
    bodies.push(route.request().postDataJSON());
    if (delayMs > 0) {
      // Simulated server latency, not a wait for the test itself.
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    await route.continue();
  });
  return {
    bodies,
    get count() {
      return bodies.length;
    },
  };
}

/** Replaces the server's answer, so the test controls the failure. */
async function stubApplicationResponse(page, response) {
  await page.route(APPLICATION_ENDPOINT, (route) => route.fulfill(response));
}

/** Makes every application request fail as if the network dropped. */
async function failApplicationRequests(page) {
  await page.route(APPLICATION_ENDPOINT, (route) => route.abort('failed'));
}

/** Removes any stub so the next request reaches the real server. */
async function restoreApplicationEndpoint(page) {
  await page.unroute(APPLICATION_ENDPOINT);
}

module.exports = {
  observeApplicationRequests,
  stubApplicationResponse,
  failApplicationRequests,
  restoreApplicationEndpoint,
};
