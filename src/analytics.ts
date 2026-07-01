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
  | "language_switch";

interface AnalyticsParams {
  selectedVisualPreset?: string;
  selectedColorPalette?: string;
  translationMode?: TranslationMode;
  conflictLevel?: string;
  language?: LanguageCode;
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
let initialized = false;

export function initAnalytics(): void {
  if (!measurementId || initialized) {
    return;
  }

  initialized = true;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);

  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    send_page_view: false,
  });
}

export function trackEvent(name: AnalyticsEventName, params: AnalyticsParams = {}): void {
  if (!measurementId || !window.gtag) {
    return;
  }

  window.gtag("event", name, {
    site: "borinef",
    product: "mdmaker",
    maker: "design.md",
    phase: "phase2",
    source: "borinef-mdmaker",
    ...params,
  });
}
