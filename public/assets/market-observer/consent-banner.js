(function attachMarketObserverConsent(root) {
  "use strict";

  const VERSION = "2026-06-24-explicit-opt-in-v1";
  const CONSENT_KEY = "market_observer_analytics_consent";
  const LEGACY_OPT_OUT_KEY = "market_observer_opt_out";
  const BANNER_ID = "market-observer-consent-banner";
  const STYLE_ID = "market-observer-consent-style";
  const CHANGE_BUTTON_CLASS = "market-observer-consent-change";
  const VALID_STATES = new Set(["granted", "denied"]);
  const BUTTON_CLASS = "market-observer-consent-button";

  const MESSAGES = {
    ja: {
      heading: "匿名の利用状況の計測にご協力ください",
      body: [
        "DAKEでは、サイトやツールを改善するため、Google Analyticsを使用して匿名の利用状況を計測しています。",
        "入力した文章、変換結果、氏名、メールアドレス、電話番号、住所、購入情報は送信しません。",
        "許可しなくても、すべての機能をそのまま利用できます。",
      ],
      allow: "許可する",
      deny: "許可しない",
      learnMore: "詳しく見る",
      changeSettings: "解析設定を変更",
      statusGranted: "アクセス解析：許可済み",
      statusDenied: "アクセス解析：利用しない",
      statusUnknown: "アクセス解析：未選択",
      statusUnavailable: "アクセス解析：利用しない",
      gpcNotice: "ブラウザのプライバシー設定により解析を無効にしています。",
    },
    en: {
      heading: "Help us improve with anonymous usage analytics",
      body: [
        "DAKE uses Google Analytics to measure anonymous usage and improve its sites and tools.",
        "We do not send your input, output, name, email address, phone number, address, or purchase information.",
        "You can use every feature without allowing analytics.",
      ],
      allow: "Allow analytics",
      deny: "Do not allow",
      learnMore: "Learn more",
      changeSettings: "Change analytics settings",
      statusGranted: "Analytics: allowed",
      statusDenied: "Analytics: disabled",
      statusUnknown: "Analytics: not selected",
      statusUnavailable: "Analytics: unavailable",
      gpcNotice: "Your browser privacy settings are disabling analytics.",
    },
  };

  function hasGpc() {
    return Boolean(root.navigator && root.navigator.globalPrivacyControl === true);
  }

  function parseStoredValue(value) {
    if (value === "granted" || value === "denied") return value;
    if (!value) return "unknown";
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && VALID_STATES.has(parsed.state)) return parsed.state;
    } catch (_error) {
      return "unknown";
    }
    return "unknown";
  }

  function readConsent() {
    if (hasGpc()) return { state: "denied", reason: "global_privacy_control", gpc: true };
    try {
      if (!root.localStorage) return { state: "unavailable", reason: "consent_unavailable", gpc: false };
      const legacyValue = root.localStorage.getItem(LEGACY_OPT_OUT_KEY);
      if (legacyValue === "true") {
        root.localStorage.setItem(CONSENT_KEY, "denied");
        root.localStorage.removeItem(LEGACY_OPT_OUT_KEY);
        return { state: "denied", reason: "consent_denied", gpc: false };
      }
      const state = parseStoredValue(root.localStorage.getItem(CONSENT_KEY));
      if (state === "granted") return { state, reason: "", gpc: false };
      if (state === "denied") return { state, reason: "consent_denied", gpc: false };
      return { state: "unknown", reason: "consent_unknown", gpc: false };
    } catch (_error) {
      return { state: "unavailable", reason: "consent_unavailable", gpc: false };
    }
  }

  function writeConsent(state) {
    if (!VALID_STATES.has(state)) return false;
    if (state === "granted" && hasGpc()) return false;
    try {
      if (!root.localStorage) return false;
      root.localStorage.setItem(CONSENT_KEY, state);
      root.localStorage.removeItem(LEGACY_OPT_OUT_KEY);
      return true;
    } catch (_error) {
      return false;
    }
  }

  function localeFor(options) {
    if (options && (options.locale === "ja" || options.locale === "en")) return options.locale;
    const document = root.document;
    const lang = document && document.documentElement ? String(document.documentElement.lang || "").toLowerCase() : "";
    return lang.startsWith("ja") ? "ja" : "en";
  }

  function ensureStyle(document) {
    if (!document || document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      ".market-observer-consent-banner{--mo-consent-allow-bg:#2563EB;--mo-consent-allow-text:#FFFFFF;--mo-consent-allow-hover-bg:#1D4ED8;--mo-consent-deny-bg:#FFFFFF;--mo-consent-deny-text:currentColor;--mo-consent-deny-border:#6B7280;--mo-consent-focus-ring:#2563EB;position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483000;background:#fff;color:#111;border:1px solid #111;box-shadow:0 8px 28px rgba(0,0,0,.16);padding:16px;max-width:760px;margin:0 auto;font:14px/1.6 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}",
      ".market-observer-consent-banner h2{font-size:16px;line-height:1.35;margin:0 0 8px;font-weight:700;letter-spacing:0}",
      ".market-observer-consent-banner p{margin:0 0 6px}",
      ".market-observer-consent-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}",
      ".market-observer-consent-button{appearance:none;border:1px solid transparent;border-radius:4px;padding:9px 16px;font:inherit;font-size:14px;line-height:1.25;min-height:44px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;text-align:center;text-decoration:none}",
      ".market-observer-consent-button[data-action='allow']{background:var(--mo-consent-allow-bg);color:var(--mo-consent-allow-text);border-color:var(--mo-consent-allow-bg);font-weight:700}",
      ".market-observer-consent-button[data-action='allow']:hover{background:var(--mo-consent-allow-hover-bg);border-color:var(--mo-consent-allow-hover-bg)}",
      ".market-observer-consent-button[data-action='deny']{background:var(--mo-consent-deny-bg);color:var(--mo-consent-deny-text);border-color:var(--mo-consent-deny-border);font-weight:700}",
      ".market-observer-consent-button[data-action='deny']:hover{background:#F9FAFB}",
      ".market-observer-consent-button[data-action='details']{background:transparent;color:inherit;border-color:transparent;font-weight:400;text-decoration:underline;text-underline-offset:2px}",
      ".market-observer-consent-button:hover,.market-observer-consent-button:focus-visible{outline:2px solid var(--mo-consent-focus-ring);outline-offset:2px}",
      ".market-observer-consent-button:disabled{opacity:.55;cursor:not-allowed}",
      ".market-observer-consent-change{appearance:none;border:1px solid currentColor;background:transparent;color:inherit;border-radius:4px;padding:6px 10px;font:inherit;cursor:pointer}",
      ".market-observer-consent-change:hover,.market-observer-consent-change:focus-visible{outline:2px solid currentColor;outline-offset:2px}",
      "@media (max-width:640px){.market-observer-consent-banner{left:8px;right:8px;bottom:8px;padding:12px;font-size:13px}.market-observer-consent-actions{display:grid;grid-template-columns:1fr}.market-observer-consent-actions .market-observer-consent-button{width:100%}}",
    ].join("\n");
    (document.head || document.documentElement).appendChild(style);
  }

  function removeBanner(document) {
    const existing = document && document.getElementById(BANNER_ID);
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
  }

  function openDetails(options) {
    const document = root.document;
    if (!document) return;
    const selector = options && options.detailsSelector ? options.detailsSelector : ".analytics-privacy";
    const details = document.querySelector(selector);
    if (details) {
      if ("open" in details) details.open = true;
      if (typeof details.scrollIntoView === "function") details.scrollIntoView({ block: "nearest" });
      return;
    }
    const privacyUrl = options && options.privacyUrl ? options.privacyUrl : "/privacy/";
    if (privacyUrl && root.location) root.location.href = privacyUrl;
  }

  function choose(state, options) {
    const document = root.document;
    const ok = writeConsent(state);
    if (!ok) {
      updateExistingControls(localeFor(options), "unavailable");
      return false;
    }
    removeBanner(document);
    updateExistingControls(localeFor(options), state);
    if (!options || options.reload !== false) root.location.reload();
    return true;
  }

  function button(document, text, action) {
    const element = document.createElement("button");
    element.className = BUTTON_CLASS;
    element.type = "button";
    element.dataset.action = action;
    element.textContent = text;
    return element;
  }

  function applyButtonRole(element, action) {
    if (!element) return;
    if (element.classList && typeof element.classList.add === "function") {
      element.classList.add(BUTTON_CLASS);
    } else if (!String(element.className || "").split(/\s+/).includes(BUTTON_CLASS)) {
      element.className = `${element.className || ""} ${BUTTON_CLASS}`.trim();
    }
    if (!element.dataset) element.dataset = {};
    element.dataset.action = action;
  }

  function showBanner(options, force) {
    const document = root.document;
    if (!document || !document.body) return null;
    ensureStyle(document);
    removeBanner(document);
    const locale = localeFor(options);
    const text = MESSAGES[locale];
    const consent = readConsent();
    if (!force && consent.state !== "unknown" && !consent.gpc) return null;

    const banner = document.createElement("section");
    banner.id = BANNER_ID;
    banner.className = "market-observer-consent-banner";
    banner.setAttribute("role", "region");
    banner.setAttribute("aria-live", "polite");
    banner.setAttribute("aria-label", text.heading);

    const heading = document.createElement("h2");
    heading.textContent = text.heading;
    banner.appendChild(heading);

    if (consent.gpc) {
      const notice = document.createElement("p");
      notice.textContent = text.gpcNotice;
      banner.appendChild(notice);
    }
    for (const line of text.body) {
      const paragraph = document.createElement("p");
      paragraph.textContent = line;
      banner.appendChild(paragraph);
    }

    const actions = document.createElement("div");
    actions.className = "market-observer-consent-actions";
    const allow = button(document, text.allow, "allow");
    const deny = button(document, text.deny, "deny");
    const details = button(document, text.learnMore, "details");
    if (consent.gpc) allow.disabled = true;
    allow.addEventListener("click", () => choose("granted", options || {}));
    deny.addEventListener("click", () => choose("denied", options || {}));
    details.addEventListener("click", () => openDetails(options || {}));
    actions.appendChild(allow);
    actions.appendChild(deny);
    actions.appendChild(details);
    banner.appendChild(actions);
    document.body.appendChild(banner);
    return banner;
  }

  function updateExistingControls(locale, stateOverride) {
    const document = root.document;
    if (!document) return;
    const text = MESSAGES[locale] || MESSAGES.en;
    const consent = stateOverride ? { state: stateOverride, gpc: hasGpc() } : readConsent();
    const status = document.querySelector("#market-observer-consent-status");
    const allowButton = document.querySelector("#market-observer-consent-allow");
    const denyButton = document.querySelector("#market-observer-consent-deny");
    if (!status || !allowButton || !denyButton) return;
    ensureStyle(document);
    applyButtonRole(allowButton, "allow");
    applyButtonRole(denyButton, "deny");

    allowButton.hidden = false;
    denyButton.hidden = false;
    allowButton.disabled = false;
    denyButton.disabled = false;
    allowButton.textContent = text.allow;
    denyButton.textContent = text.deny;

    if (consent.gpc) {
      status.textContent = text.gpcNotice;
      allowButton.disabled = true;
      return;
    }
    if (consent.state === "granted") {
      status.textContent = text.statusGranted;
      return;
    }
    if (consent.state === "denied") {
      status.textContent = text.statusDenied;
      return;
    }
    if (consent.state === "unavailable") {
      status.textContent = text.statusUnavailable;
      allowButton.disabled = true;
      denyButton.disabled = true;
      return;
    }
    status.textContent = text.statusUnknown;
  }

  function bindExistingControls(options) {
    const document = root.document;
    if (!document) return;
    const locale = localeFor(options);
    const allowButton = document.querySelector("#market-observer-consent-allow");
    const denyButton = document.querySelector("#market-observer-consent-deny");
    if (allowButton && !allowButton.dataset.marketObserverConsentBound) {
      allowButton.dataset.marketObserverConsentBound = "true";
      allowButton.addEventListener("click", () => choose("granted", options || {}));
    }
    if (denyButton && !denyButton.dataset.marketObserverConsentBound) {
      denyButton.dataset.marketObserverConsentBound = "true";
      denyButton.addEventListener("click", () => choose("denied", options || {}));
    }
    updateExistingControls(locale);
  }

  function ensureChangeControl(options) {
    const document = root.document;
    if (!document || document.querySelector(`.${CHANGE_BUTTON_CLASS}`)) return;
    const locale = localeFor(options);
    const text = MESSAGES[locale] || MESSAGES.en;
    const container = document.querySelector((options && options.settingsContainerSelector) || ".analytics-privacy-body") || document.querySelector("footer") || document.body;
    if (!container) return;
    const action = document.createElement("button");
    action.type = "button";
    action.className = CHANGE_BUTTON_CLASS;
    action.textContent = text.changeSettings;
    action.addEventListener("click", () => showBanner(Object.assign({}, options, { reload: true }), true));
    container.appendChild(action);
  }

  function mount(options) {
    bindExistingControls(options || {});
    ensureChangeControl(options || {});
    return showBanner(options || {}, false);
  }

  root.MarketObserverConsent = {
    VERSION,
    storageKey: CONSENT_KEY,
    legacyOptOutKey: LEGACY_OPT_OUT_KEY,
    read: readConsent,
    write: writeConsent,
    choose,
    mount,
    showBanner,
    hasGpc,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = root.MarketObserverConsent;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
