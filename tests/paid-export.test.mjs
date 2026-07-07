import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function functionBody(source, functionName) {
  const marker = `function ${functionName}`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${functionName} should exist`);
  const bodyStart = source.indexOf("{", start);
  assert.notEqual(bodyStart, -1, `${functionName} should have a body`);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") {
      depth += 1;
    }
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }
  assert.fail(`${functionName} body should close`);
}

test("legal pages are noindex and omitted from sitemap", () => {
  const pages = [
    "public/legal/terms.html",
    "public/legal/privacy.html",
    "public/legal/commercial-transactions.html",
  ];

  for (const page of pages) {
    const html = read(page);
    assert.match(html, /<meta name="robots" content="noindex,follow" \/>/);
    assert.match(html, /BORINEF md maker/);
  }

  const commercial = read("public/legal/commercial-transactions.html");
  assert.match(commercial, /PEAKHEADZ/);
  assert.match(commercial, /peakheadz@gmail\.com/);
  assert.match(commercial, /¥300/);
  assert.match(commercial, /\$3\.00/);

  const sitemap = read("public/sitemap.xml");
  assert.doesNotMatch(sitemap, /\/legal\/terms|\/legal\/privacy|\/legal\/commercial-transactions/);
});

test("checkout request sends locale and ExportSpec only from the browser", () => {
  const app = read("src/app.ts");
  const checkout = functionBody(app, "requestCheckoutSession");

  assert.match(checkout, /fetch\("\/api\/create-checkout-session"/);
  assert.match(checkout, /locale: state\.language/);
  assert.match(checkout, /exportSpec: buildExportSpecV1\(state\)/);
  assert.doesNotMatch(checkout, /price_id|priceId|unit_amount|amount|currency/i);
  assert.match(checkout, /trackEvent\("stripe_outbound"/);
  assert.doesNotMatch(functionBody(app, "downloadPaidExport"), /checkoutUrl|buy\.stripe\.com|price_id|priceId/i);
  assert.doesNotMatch(app, /downloadExportZip/);
});

test("checkout return session id stays in memory and URL is scrubbed before analytics", () => {
  const app = read("src/app.ts");
  assert(app.indexOf("const checkoutReturn = consumeCheckoutReturnUrl();") < app.indexOf("initAnalytics();"));

  const consumeReturn = functionBody(app, "consumeCheckoutReturnUrl");
  assert.match(consumeReturn, /url\.searchParams\.delete\("session_id"\)/);
  assert.match(consumeReturn, /window\.history\.replaceState/);
  assert.doesNotMatch(consumeReturn, /localStorage|sessionStorage|document\.cookie|console\./);

  const analytics = read("src/analytics.ts");
  assert.doesNotMatch(analytics, /session_id|checkoutUrl|buy\.stripe\.com\/|cs_test_|cs_live_/i);
});

test("ExportSpecV1 and Stripe metadata omit raw input and generated bodies", () => {
  const exportSpec = read("src/exportSpec.ts");
  const buildSpec = functionBody(exportSpec, "buildExportSpecV1");
  const metadata = functionBody(exportSpec, "exportSpecToStripeMetadata");

  assert.match(buildSpec, /schemaVersion: 1/);
  assert.match(buildSpec, /normalizedToneTags/);
  assert.doesNotMatch(buildSpec, /feelingText|structure|design\.md|prompt|settings/i);

  assert.match(metadata, /schema_version/);
  assert.match(metadata, /visual_preset_id/);
  assert.match(metadata, /color_palette_id/);
  assert.match(metadata, /translation_mode/);
  assert.match(metadata, /tone_tags/);
  assert.match(metadata, /product_code: "design-md-export-v1"/);
  assert.doesNotMatch(metadata, /feelingText|design_md|design\.md|prompt|structure|settings|zip|checkoutUrl|session_id|email|phone|address/i);
});

test("paid export APIs verify Stripe server-side before returning ZIP", () => {
  const shared = read("functions/_shared/stripe.ts");
  const checkout = read("functions/api/create-checkout-session.ts");
  const status = read("functions/api/checkout-status.ts");
  const download = read("functions/api/download-export.ts");

  assert.match(checkout, /priceIdForLocale\(context\.env, locale\)/);
  assert.match(checkout, /line_items\[0\]\[price\]/);
  assert.match(checkout, /metadata\[/);
  assert.doesNotMatch(checkout, /unit_amount|currency|price_data/i);

  assert.match(shared, /session\.mode !== "payment"/);
  assert.match(shared, /session\.status !== "complete"/);
  assert.match(shared, /session\.payment_status !== "paid"/);
  assert.match(shared, /lineItem\.quantity !== 1/);
  assert.match(shared, /checkout_price_not_allowed/);
  assert.match(shared, /checkout_product_not_allowed/);

  assert.match(status, /verifyPaidCheckoutSession/);
  const paidStart = status.indexOf("paid: true");
  assert.notEqual(paidStart, -1, "checkout status should return a paid response object");
  const paidResponse = status.slice(paidStart, status.indexOf("});", paidStart));
  assert.doesNotMatch(paidResponse, /sessionId|session_id|url/i);

  const downloadHandler = functionBody(download, "onRequestPost");
  assert(downloadHandler.indexOf("verifyPaidCheckoutSession") < downloadHandler.indexOf("buildGeneratedFiles"));
  assert.match(download, /Content-Type": "application\/zip"/);
  assert.match(download, /Content-Disposition": `attachment; filename="\$\{exportZipFileName\}"/);
  assert.match(download, /Cache-Control": "private, no-store"/);
});
