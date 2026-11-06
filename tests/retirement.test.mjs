import assert from "node:assert/strict";
import test from "node:test";

import { onRequest, RETIREMENT_URL } from "../functions/_middleware.js";

test("every former application path permanently redirects to the START making record", async () => {
  for (const url of [
    "https://mdmaker.borinef.com/",
    "https://mdmaker.borinef.com/?utm_source=existing-link",
    "https://mdmaker.borinef.com/api/health",
    "https://mdmaker.borinef.com/api/create-checkout-session",
    "https://mdmaker.borinef.com/old/path?private=not-forwarded",
  ]) {
    const response = await onRequest({ request: new Request(url) });
    assert.equal(response.status, 301);
    assert.equal(response.headers.get("location"), RETIREMENT_URL);
  }
});
