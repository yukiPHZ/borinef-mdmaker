import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}

test("robots.txt and sitemap.xml are static crawler files", () => {
  const robots = read("public/robots.txt");
  assert.match(robots, /^User-agent: \*/m);
  assert.match(robots, /^Allow: \/$/m);
  assert.match(robots, /^Sitemap: https:\/\/mdmaker\.borinef\.com\/sitemap\.xml$/m);
  assert.doesNotMatch(robots, /<!doctype|<html|<body/i);

  const sitemap = read("public/sitemap.xml");
  assert.match(sitemap, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(sitemap, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.equal(count(sitemap, "<loc>"), 1);
  assert.match(sitemap, /<loc>https:\/\/mdmaker\.borinef\.com\/<\/loc>/);
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.deepEqual(locs, ["https://mdmaker.borinef.com/"]);
  assert(locs.every((loc) => !/[?#]/.test(loc)));
  assert.doesNotMatch(locs.join("\n"), /pages\.dev|workers\.dev|localhost|127\.0\.0\.1/i);
  assert.doesNotMatch(sitemap, /<!doctype|<html|<body/i);
});

test("central market observer scripts are loaded once before the app module", () => {
  const index = read("index.html");
  assert.equal(count(index, "/assets/market-observer/generated/runtime-package.js"), 1);
  assert.equal(count(index, "/assets/market-observer/market-observer.js"), 1);
  assert.equal(count(index, "/assets/market-observer/consent-banner.js"), 1);
  assert(index.indexOf("/assets/market-observer/market-observer.js") < index.indexOf("/src/main.ts"));
  assert.match(index, /data-market-observer-tracker/);
});

test("site analytics wrapper does not use independent gtag or unsafe payload fields", () => {
  const analytics = read("src/analytics.ts");
  assert.match(analytics, /const measurementId = "G-VTJKYHD8Q3"/);
  assert.match(analytics, /const projectId = "borinef_mdmaker"/);
  assert.match(analytics, /destination_host: "buy\.stripe\.com"/);
  assert.match(analytics, /destination_path_class: "checkout"/);
  assert.doesNotMatch(analytics, /VITE_GA_MEASUREMENT_ID|window\.gtag|dataLayer|googletagmanager\.com\/gtag|price|currency|checkoutUrl|clipboard/i);

  const app = read("src/app.ts");
  assert.doesNotMatch(app, /price:\s*\d+|currency:/);
  const stripeEvent = app.match(/trackEvent\("stripe_outbound",\s*\{([\s\S]*?)\}\);/);
  assert(stripeEvent, "stripe_outbound event should be emitted before external checkout navigation");
  assert.doesNotMatch(stripeEvent[1], /checkoutUrl|href|price|currency|query|hash/i);
});

test("central tracker initializes only on production origin with explicit consent", () => {
  const context = createBrowserContext({
    origin: "https://mdmaker.borinef.com",
    hostname: "mdmaker.borinef.com",
    pathname: "/",
    search: "?secret=raw#frag",
    referrer: "https://mdmaker.borinef.com/from?secret=raw#frag",
    consent: "granted",
  });
  loadMarketObserverScripts(context);

  const runtimePackage = context.MarketObserverRuntimePackage;
  const result = context.MarketObserver.init({
    measurementId: "G-VTJKYHD8Q3",
    runtimeSchema: runtimePackage.runtimeSchema,
    profile: runtimePackage.profiles.borinef_mdmaker,
    runtimeSchemaHash: runtimePackage.runtimeSchemaHash,
    profileHash: runtimePackage.profileHashes.borinef_mdmaker,
  });
  assert.equal(result.ok, true, JSON.stringify(result.reasons));

  const pageView = context.MarketObserver.trackPageView();
  assert.equal(pageView.ok, true, pageView.reason);

  const entries = Array.from(context.dataLayer, (entry) => Array.from(entry));
  assert.equal(JSON.stringify(entries.map((entry) => entry[0])), JSON.stringify(["consent", "js", "config", "event"]));
  assert.equal(Object.prototype.toString.call(context.dataLayer[0]), "[object Arguments]");
  assert.equal(entries[2][1], "G-VTJKYHD8Q3");
  assert.equal(entries[2][2].project_id, "borinef_mdmaker");
  assert.equal(entries[2][2].surface, "web_tool");
  assert.equal(entries[2][2].tracker_version, "1.0.0");
  assert.equal(entries[2][2].send_page_view, false);

  const pageViewPayload = entries[3][2];
  assert.equal(entries[3][1], "page_view");
  assert.equal(pageViewPayload.page_location, "https://mdmaker.borinef.com/");
  assert.equal(pageViewPayload.page_referrer, "https://mdmaker.borinef.com/from/");
  assert.equal(pageViewPayload.page_title, "borinef_mdmaker");
  assert.doesNotMatch(JSON.stringify(pageViewPayload), /secret|raw|frag|\?|#/i);
  assert.equal(context.document.insertedGoogleTagCount(), 1);
});

test("central tracker blocks localhost and ungated preview origins", () => {
  for (const target of [
    {
      origin: "http://localhost:5173",
      hostname: "localhost",
      protocol: "http:",
      expected: "local_or_file_origin",
    },
    {
      origin: "https://borinef-mdmaker.pages.dev",
      hostname: "borinef-mdmaker.pages.dev",
      protocol: "https:",
      expected: "preview_origin",
    },
  ]) {
    const context = createBrowserContext({
      origin: target.origin,
      hostname: target.hostname,
      protocol: target.protocol,
      pathname: "/",
      consent: "granted",
    });
    loadMarketObserverScripts(context);

    const runtimePackage = context.MarketObserverRuntimePackage;
    const result = context.MarketObserver.init({
      measurementId: "G-VTJKYHD8Q3",
      runtimeSchema: runtimePackage.runtimeSchema,
      profile: runtimePackage.profiles.borinef_mdmaker,
      runtimeSchemaHash: runtimePackage.runtimeSchemaHash,
      profileHash: runtimePackage.profileHashes.borinef_mdmaker,
    });

    assert.equal(result.ok, false);
    assert(result.reasons.includes(target.expected), JSON.stringify(result.reasons));
    assert.equal(context.document.insertedGoogleTagCount(), 0);
  }
});

test("allowed outbound and copy events do not carry raw URL or copied body", () => {
  const context = createBrowserContext({
    origin: "https://mdmaker.borinef.com",
    hostname: "mdmaker.borinef.com",
    pathname: "/",
    consent: "granted",
  });
  loadMarketObserverScripts(context);

  const runtimePackage = context.MarketObserverRuntimePackage;
  const result = context.MarketObserver.init({
    measurementId: "G-VTJKYHD8Q3",
    runtimeSchema: runtimePackage.runtimeSchema,
    profile: runtimePackage.profiles.borinef_mdmaker,
    runtimeSchemaHash: runtimePackage.runtimeSchemaHash,
    profileHash: runtimePackage.profileHashes.borinef_mdmaker,
  });
  assert.equal(result.ok, true, JSON.stringify(result.reasons));

  const outbound = context.MarketObserver.track(
    "stripe_outbound",
    {
      destination_host: "buy.stripe.com",
      destination_path_class: "checkout",
    },
    { actionToken: "stripe_outbound_checkout_test" },
  );
  assert.equal(outbound.ok, true, outbound.reason);

  const copy = context.MarketObserver.track(
    "copy_result",
    {
      result_type: "design_md",
    },
    { actionToken: "copy_result_design_md_test", copySucceeded: true },
  );
  assert.equal(copy.ok, true, copy.reason);

  const entries = Array.from(context.dataLayer, (entry) => Array.from(entry));
  const payloads = entries.filter((entry) => entry[0] === "event").map((entry) => entry[2]);
  assert(payloads.some((payload) => payload.destination_host === "buy.stripe.com"));
  assert(payloads.some((payload) => payload.result_type === "design_md"));
  assert.doesNotMatch(JSON.stringify(payloads), /https:\/\/buy\.stripe\.com\/|checkoutUrl|input|output|clipboard|price|email|phone|token|credential/i);
});

function createBrowserContext({
  origin,
  hostname,
  pathname = "/",
  protocol = "https:",
  search = "",
  referrer = "",
  consent = "unknown",
}) {
  const scripts = [];
  const firstScript = {
    src: "",
    id: "app-module",
    parentNode: {
      insertBefore(element) {
        scripts.unshift(element);
      },
    },
    getAttribute(name) {
      return this[name] ?? "";
    },
  };
  const document = {
    referrer,
    createElement(tagName) {
      return {
        tagName,
        async: false,
        id: "",
        src: "",
        attributes: {},
        setAttribute(name, value) {
          this.attributes[name] = value;
          this[name] = value;
        },
        getAttribute(name) {
          return this.attributes[name] ?? this[name] ?? "";
        },
      };
    },
    getElementById(id) {
      return scripts.find((script) => script.id === id) ?? null;
    },
    getElementsByTagName(tagName) {
      if (tagName !== "script") {
        return [];
      }
      return [firstScript, ...scripts];
    },
    head: {
      appendChild(element) {
        scripts.push(element);
      },
    },
    insertedGoogleTagCount() {
      return scripts.filter((script) => /googletagmanager\.com\/gtag\/js/.test(script.src)).length;
    },
  };

  const storage = new Map();
  if (consent !== "unknown") {
    storage.set("market_observer_analytics_consent", consent);
  }

  const context = {
    URL,
    URLSearchParams,
    Date,
    Map,
    Set,
    Array,
    Object,
    RegExp,
    JSON,
    encodeURIComponent,
    decodeURIComponent,
    console,
    document,
    navigator: { globalPrivacyControl: false },
    location: {
      href: `${origin}${pathname}${search}`,
      origin,
      hostname,
      protocol,
      pathname,
      search,
    },
    localStorage: {
      getItem(key) {
        return storage.has(key) ? storage.get(key) : null;
      },
      setItem(key, value) {
        storage.set(key, String(value));
      },
      removeItem(key) {
        storage.delete(key);
      },
    },
  };
  context.window = context;
  context.globalThis = context;
  return vm.createContext(context);
}

function loadMarketObserverScripts(context) {
  for (const relativePath of [
    "public/assets/market-observer/generated/runtime-package.js",
    "public/assets/market-observer/market-observer.js",
  ]) {
    vm.runInContext(read(relativePath), context, { filename: relativePath });
  }
}
