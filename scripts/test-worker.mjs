import assert from "node:assert/strict";
import worker from "../src/_worker.js";

const assets = {
  fetch: async () => new Response("<html>ok</html>", { headers: { "Content-Type": "text/html" } })
};

const preview = await worker.fetch(
  new Request("https://corp-merch-eu.workers.dev/"),
  { LOCAL_DEV: "false", ASSETS: assets }
);
assert.equal(preview.status, 200);
assert.equal(preview.headers.get("X-Robots-Tag"), "noindex, nofollow");
assert.equal(preview.headers.get("Cache-Control"), "no-store");

const previewRobots = await worker.fetch(
  new Request("https://corp-merch-eu.workers.dev/robots.txt"),
  { LOCAL_DEV: "false", ASSETS: assets }
);
assert.equal(previewRobots.status, 200);
assert.equal(await previewRobots.text(), "User-agent: *\nDisallow: /\n");
assert.equal(previewRobots.headers.get("X-Robots-Tag"), "noindex, nofollow");

const redirect = await worker.fetch(
  new Request("https://www.corp-merch.eu/example?source=test"),
  { LOCAL_DEV: "false", ASSETS: assets }
);
assert.equal(redirect.status, 308);
assert.equal(redirect.headers.get("Location"), "https://corp-merch.eu/example?source=test");

const crossOrigin = await worker.fetch(
  new Request("https://corp-merch.eu/api/lead", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://example.com" },
    body: "{}"
  }),
  { LOCAL_DEV: "false", ASSETS: assets }
);
assert.equal(crossOrigin.status, 403);

let deliveredMessage;
const leadPayload = {
  name: "QA Test",
  email: "qa@example.com",
  company: "QA Company",
  event: "Barcelona · QA",
  need: "Synthetic form delivery test",
  page: "homepage",
  consent: true,
  startedAt: Date.now() - 3000
};
const leadResponse = await worker.fetch(
  new Request("https://corp-merch.eu/api/lead", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://corp-merch.eu" },
    body: JSON.stringify(leadPayload)
  }),
  {
    LOCAL_DEV: "false",
    ASSETS: assets,
    LEAD_EMAIL: { send: async (message) => { deliveredMessage = message; } }
  }
);
assert.equal(leadResponse.status, 200);
assert.deepEqual(await leadResponse.json(), { ok: true });
assert.equal(deliveredMessage.to, "order@swaggy.agency");
assert.equal(deliveredMessage.from.email, "leads@corp-merch.eu");
assert.equal(deliveredMessage.replyTo.email, leadPayload.email);
assert.match(deliveredMessage.subject, /New corp-merch\.eu lead/);

console.log("Worker tests passed: preview noindex, canonical redirect, origin validation and lead delivery contract.");
