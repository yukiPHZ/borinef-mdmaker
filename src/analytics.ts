import type { LanguageCode, TranslationMode } from "./types";

type AnalyticsEventName =
  | "mdmaker_view"
  | "feeling_translate"
  | "visual_preset_select"
  | "color_palette_select"
  | "conflict_detected"
  | "translation_mode_select"
  | "design_md_copy"
  | "structure_copy"
  | "settings_download"
  | "settings_import"
  | "zip_export_click"
  | "zip_export_download"
  | "stripe_outbound"
  | "language_switch"
  | "recommended_set_select"
  | "recommendation_use"
  | "export_cta_view"
  | "export_cta_click"
  | "customize_details_open"
  | "customize_details_change"
  | "client_exception";

interface AnalyticsParams {
  selectedVisualPreset?: string;
  selectedColorPalette?: string;
  translationMode?: TranslationMode;
  conflictLevel?: string;
  language?: LanguageCode;
  tagCount?: number;
  inputPresent?: boolean;
  recommendedSetIndex?: number;
  isCustomizedFromRecommendation?: boolean;
  exportType?: "copy_design" | "zip_export" | "settings";
  stripeEnabled?: boolean;
  fileCount?: number;
  errorCode?: "tracker_init_blocked" | "event_rejected" | "translate_endpoint_unavailable" | "checkout_unavailable";
}

interface RuntimePackage {
  profile?: Record<string, unknown>;
  profileHash?: string;
  profileHashes?: Record<string, string>;
  profiles?: Record<string, Record<string, unknown>>;
  runtimeSchema?: Record<string, unknown>;
  runtimeSchemaHash?: string;
}

interface MarketObserverApi {
  init(config: {
    measurementId: string;
    runtimeSchema: Record<string, unknown>;
    profile: Record<string, unknown>;
    runtimeSchemaHash: string;
    profileHash: string;
  }): { ok: boolean; reasons?: string[] };
  trackPageView(): { ok: boolean; reason?: string };
  track(
    eventName: string,
    parameters?: Record<string, unknown>,
    options?: { actionToken?: string; copySucceeded?: boolean },
  ): { ok: boolean; reason?: string; parameters?: Record<string, unknown> };
}

interface MarketObserverConsentApi {
  read(): { state: "granted" | "denied" | "unknown" | "unavailable"; gpc?: boolean; reason?: string };
  choose(state: "granted" | "denied", options?: { reload?: boolean }): boolean;
}

declare global {
  interface Window {
    MarketObserver?: MarketObserverApi;
    MarketObserverConsent?: MarketObserverConsentApi;
    MarketObserverRuntimePackage?: RuntimePackage;
  }
}

const measurementId = "G-VTJKYHD8Q3";
const projectId = "borinef_mdmaker";
const consentStorageKey = "market_observer_analytics_consent";

let initialized = false;
let pageViewTracked = false;
let controlsBound = false;
let retryScheduled = false;
let actionCounter = 0;

export function initAnalytics(): void {
  bindAnalyticsConsentControls();
  refreshAnalyticsConsentUi();
  initializeTrackerIfAllowed();
  scheduleInitializationRetry();
}

export function refreshAnalyticsConsentUi(): void {
  const status = document.querySelector<HTMLElement>("#market-observer-consent-status");
  const allowButton = document.querySelector<HTMLButtonElement>("#market-observer-consent-allow");
  const denyButton = document.querySelector<HTMLButtonElement>("#market-observer-consent-deny");

  if (!status || !allowButton || !denyButton) {
    return;
  }

  allowButton.hidden = false;
  denyButton.hidden = false;
  allowButton.disabled = false;
  denyButton.disabled = false;

  const consent = readConsentState();
  if (consent.gpc) {
    status.textContent = "ブラウザのプライバシー設定により解析は無効です。";
    allowButton.disabled = true;
    return;
  }
  if (consent.state === "granted") {
    status.textContent = "匿名の利用状況計測は許可されています。";
    return;
  }
  if (consent.state === "denied") {
    status.textContent = "匿名の利用状況計測は拒否されています。";
    return;
  }
  if (consent.state === "unavailable") {
    status.textContent = "この環境では解析設定を保存できません。";
    allowButton.disabled = true;
    denyButton.disabled = true;
    return;
  }
  status.textContent = "匿名の利用状況計測は未選択です。";
}

export function trackEvent(name: AnalyticsEventName, params: AnalyticsParams = {}): void {
  if (!initialized && !initializeTrackerIfAllowed()) {
    return;
  }

  switch (name) {
    case "feeling_translate":
      if (params.inputPresent === true) {
        trackUseStart("translate_design");
        trackUseComplete("translate_design", "ai_native_structure");
      }
      return;
    case "recommendation_use":
      trackUseComplete("select_recommendation", "ai_native_structure");
      return;
    case "design_md_copy":
      trackCopyResult("design_md");
      return;
    case "structure_copy":
      trackCopyResult("ai_native_structure");
      return;
    case "zip_export_download":
      trackResultExport("zip_export", "download");
      return;
    case "stripe_outbound":
      trackStripeOutbound();
      return;
    case "client_exception":
      trackClientException(params.errorCode ?? "event_rejected");
      return;
    default:
      return;
  }
}

function initializeTrackerIfAllowed(): boolean {
  if (initialized) {
    return true;
  }
  if (readConsentState().state !== "granted") {
    return false;
  }

  const runtimePackage = window.MarketObserverRuntimePackage;
  const tracker = window.MarketObserver;
  const runtimeSchema = runtimePackage?.runtimeSchema;
  const profile = runtimePackage?.profiles?.[projectId] ?? runtimePackage?.profile;
  const profileHash = runtimePackage?.profileHashes?.[projectId] ?? runtimePackage?.profileHash;
  const runtimeSchemaHash = runtimePackage?.runtimeSchemaHash;

  if (!tracker || !runtimeSchema || !profile || !profileHash || !runtimeSchemaHash) {
    return false;
  }

  const result = tracker.init({
    measurementId,
    runtimeSchema,
    profile,
    runtimeSchemaHash,
    profileHash,
  });

  initialized = result.ok;
  if (initialized && !pageViewTracked) {
    tracker.trackPageView();
    pageViewTracked = true;
  }
  return initialized;
}

function scheduleInitializationRetry(): void {
  if (retryScheduled) {
    return;
  }
  retryScheduled = true;
  window.setTimeout(() => {
    retryScheduled = false;
    initializeTrackerIfAllowed();
    refreshAnalyticsConsentUi();
  }, 100);
}

function bindAnalyticsConsentControls(): void {
  if (controlsBound) {
    return;
  }
  controlsBound = true;
  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest<HTMLButtonElement>("#market-observer-consent-allow, #market-observer-consent-deny");
    if (!button) {
      return;
    }

    event.preventDefault();
    const nextState = button.id === "market-observer-consent-allow" ? "granted" : "denied";
    chooseConsent(nextState);
    if (nextState === "granted") {
      initializeTrackerIfAllowed();
    }
    refreshAnalyticsConsentUi();
  });
}

function readConsentState(): { state: "granted" | "denied" | "unknown" | "unavailable"; gpc?: boolean } {
  const privacyNavigator = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (privacyNavigator.globalPrivacyControl === true) {
    return { state: "denied", gpc: true };
  }

  const consentApi = window.MarketObserverConsent;
  if (consentApi) {
    const result = consentApi.read();
    return { state: result.state, gpc: result.gpc };
  }

  try {
    const value = window.localStorage.getItem(consentStorageKey);
    if (value === "granted" || value === "denied") {
      return { state: value };
    }
    return { state: "unknown" };
  } catch {
    return { state: "unavailable" };
  }
}

function chooseConsent(state: "granted" | "denied"): void {
  const consentApi = window.MarketObserverConsent;
  if (consentApi?.choose(state, { reload: false })) {
    return;
  }

  try {
    window.localStorage.setItem(consentStorageKey, state);
  } catch {
    // The UI reports the unavailable state on the next refresh.
  }
}

function trackUseStart(toolAction: "translate_design" | "select_recommendation" | "customize_details"): void {
  window.MarketObserver?.track(
    "use_start",
    {
      tool_action: toolAction,
      input_present: true,
    },
    { actionToken: nextActionToken("use_start", toolAction) },
  );
}

function trackUseComplete(
  toolAction: "translate_design" | "select_recommendation" | "customize_details",
  resultType: "design_md" | "ai_native_structure" | "zip_export",
): void {
  window.MarketObserver?.track(
    "use_complete",
    {
      tool_action: toolAction,
      result_type: resultType,
    },
    { actionToken: nextActionToken("use_complete", toolAction) },
  );
}

function trackCopyResult(resultType: "design_md" | "ai_native_structure"): void {
  window.MarketObserver?.track(
    "copy_result",
    {
      result_type: resultType,
    },
    {
      actionToken: nextActionToken("copy_result", resultType),
      copySucceeded: true,
    },
  );
}

function trackResultExport(resultType: "zip_export", exportType: "download"): void {
  window.MarketObserver?.track(
    "result_export",
    {
      result_type: resultType,
      export_type: exportType,
    },
    { actionToken: nextActionToken("result_export", resultType) },
  );
}

function trackStripeOutbound(): void {
  window.MarketObserver?.track(
    "stripe_outbound",
    {
      destination_host: "buy.stripe.com",
      destination_path_class: "checkout",
    },
    { actionToken: nextActionToken("stripe_outbound", "checkout") },
  );
}

function trackClientException(errorCode: NonNullable<AnalyticsParams["errorCode"]>): void {
  window.MarketObserver?.track("client_exception", {
    error_code: errorCode,
    component: "borinef_mdmaker",
  });
}

function nextActionToken(eventName: string, alias: string): string {
  actionCounter += 1;
  return `${eventName}_${alias}_${Date.now()}_${actionCounter}`;
}
