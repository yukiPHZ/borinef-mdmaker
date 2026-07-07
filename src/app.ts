import { colorPalettes, getColorPalette } from "./data/colorPalettes";
import { sampleFeelingEn, sampleFeelingJa } from "./data/sampleOutputs";
import { getVisualPreset, normalizeVisualPresetId, visualPresets } from "./data/visualPresets";
import { getDictionary } from "./i18n";
import type { DesignStructure, LanguageCode, MakerState, TranslationConflict, TranslationMode } from "./types";
import {
  buildFallbackStructure,
  detectTranslationConflict,
  extractToneKeywords,
  getRecommendedColorPaletteIds,
  getRecommendedSets,
  getRecommendedVisualPresetIds,
  mergeApiStructure,
  normalizeConflict,
  structureToYaml,
} from "./engine/translateFeeling";
import { buildExportSpecV1 } from "./exportSpec";
import { initAnalytics, refreshAnalyticsConsentUi, trackEvent } from "./analytics";
import { buildGeneratedFiles, downloadBlob, downloadTextFile, exportZipFileName } from "./zip/buildZip";

let rootElement: HTMLElement;
let state = createInitialState("ja");
let statusMessage = "";
let nextActionMessage = "";
let lastConflictEventKey = "";
let lastExportCtaViewKey = "";
let isCustomizeOpen = false;
let isAgentOutputOpen = false;
let isPurchaseConfirmOpen = false;
let purchaseMessage = "";
let checkoutSessionId: string | null = null;
let checkoutNotice: CheckoutNotice = { status: "idle", message: "" };
const rejectedVisuals = new Set<string>();

export function mountApp(root: HTMLElement): void {
  rootElement = root;
  const checkoutReturn = consumeCheckoutReturnUrl();
  if (checkoutReturn.status === "success") {
    checkoutSessionId = checkoutReturn.sessionId;
    checkoutNotice = {
      status: "verifying",
      message: checkoutText(state.language).verifying,
    };
  } else if (checkoutReturn.status === "cancelled") {
    checkoutNotice = {
      status: "cancelled",
      message: checkoutText(state.language).cancelled,
    };
  }

  initAnalytics();
  rootElement.addEventListener("click", handleClick);
  rootElement.addEventListener("input", handleInput);
  rootElement.addEventListener("change", handleChange);
  rootElement.addEventListener("toggle", handleToggle, true);
  render();
  trackEvent("mdmaker_view", analyticsStateParams());

  if (checkoutReturn.status === "success") {
    void verifyAndDownloadPaidExport(checkoutReturn.sessionId);
  }
}

interface CheckoutNotice {
  status: "idle" | "verifying" | "ready" | "downloading" | "error" | "cancelled";
  message: string;
}

type CheckoutReturn =
  | { status: "none" }
  | { status: "cancelled" }
  | { status: "success"; sessionId: string };

function createInitialState(language: LanguageCode): MakerState {
  const baseState = {
    version: "1.0.0",
    language,
    maker: "design.md" as const,
    feelingText: "",
    selectedVisualPreset: "quiet-practical",
    selectedColorPalette: "warm-neutral",
    isCustomizedFromRecommendation: false,
    interpretedFeelingTags: [] as string[],
    translationMode: "harmonize" as const,
  };
  const conflict = detectTranslationConflict({
    interpretedFeelingTags: baseState.interpretedFeelingTags,
    selectedVisualPreset: baseState.selectedVisualPreset,
    selectedColorPalette: baseState.selectedColorPalette,
  });

  return {
    ...baseState,
    conflict,
    structure: buildFallbackStructure({ ...baseState, conflict }),
  };
}

function render(): void {
  const t = getDictionary(state.language);
  document.documentElement.lang = state.language;

  rootElement.innerHTML = `
    <div class="app-shell">
      <header class="site-header">
        <a class="brand-lockup" href="#top" aria-label="BORINEF Labs md maker">
          <span>${t.brand}</span>
          <strong>${t.product}</strong>
        </a>
        <div class="header-actions">
          <button class="language-button" type="button" data-action="toggle-language">
            ${t.switchLanguage}
          </button>
        </div>
      </header>

      <main id="top">
        <section class="intro-band" aria-labelledby="intro-title">
          <div class="intro-copy">
            <p class="eyebrow">${t.designOnly}</p>
            <h1 id="intro-title">${t.heroTitle}</h1>
            <p>${t.heroLead}</p>
            <p class="pricing-summary">${t.pricingSummary}</p>
            <button class="primary-button" type="button" data-action="scroll-maker">${t.openMaker}</button>
          </div>
          <div class="maker-switcher" aria-label="maker selector">
            <button class="maker-pill is-active" type="button">${t.designOnly}</button>
            ${t.futureMakers
              .map(
                (maker) => `
                  <button class="maker-pill" type="button" disabled>
                    <span>${maker}</span>
                    <small>${t.comingSoon}</small>
                  </button>
                `,
              )
              .join("")}
          </div>
        </section>

        ${renderCheckoutNotice()}

        <section class="maker-section" id="maker" aria-labelledby="maker-title">
          <div class="maker-heading">
            <div>
              <p class="eyebrow">BORINEF Translation Engine</p>
              <h2 id="maker-title">${t.makerTitle}</h2>
            </div>
            <p>${t.makerLead}</p>
          </div>

          <ol class="step-strip" aria-label="steps">
            ${t.steps.map((step, index) => `<li><span>Step ${index + 1}</span>${step}</li>`).join("")}
          </ol>

          <div class="maker-grid">
            <aside class="input-rail" aria-label="input controls">
              ${renderFeelingPanel()}
              ${renderRecommendationPanel()}
            </aside>

            <section class="preview-rail" id="selectedPreviewRail" aria-labelledby="preview-title">
              <div class="rail-title">
                <p class="eyebrow">Step 3</p>
                <h3 id="preview-title">${t.previewTitle}</h3>
              </div>
              ${renderLivePreview()}
            </section>

            <aside class="secondary-rail" aria-label="customize and generated output">
              ${renderCustomizePanel()}
              ${renderAgentOutputPanel()}
            </aside>
          </div>
        </section>
      </main>

      ${renderAnalyticsPrivacy()}

      <footer class="site-footer">
        <span>BORINEF Labs</span>
        <span>mdmaker.borinef.com</span>
      </footer>
    </div>
  `;

  updateGeneratedViews();
  refreshAnalyticsConsentUi();
}

function renderCheckoutNotice(): string {
  if (checkoutNotice.status === "idle") {
    return "";
  }

  const text = checkoutText(state.language);
  const canDownload = checkoutNotice.status === "ready" && Boolean(checkoutSessionId);
  const action = canDownload
    ? `<button class="secondary-button" type="button" data-action="download-paid-export">${text.downloadAgain}</button>`
    : "";

  return `
    <section class="checkout-notice checkout-notice--${checkoutNotice.status}" id="checkoutNotice" role="status" aria-live="polite">
      <div>
        <p class="eyebrow">${text.eyebrow}</p>
        <h2>${text.title}</h2>
        <p>${checkoutNotice.message}</p>
      </div>
      ${action}
    </section>
  `;
}

function renderAnalyticsPrivacy(): string {
  return `
    <section class="analytics-privacy" aria-labelledby="analytics-privacy-title">
      <div class="analytics-privacy__copy">
        <p class="eyebrow">Privacy</p>
        <h2 id="analytics-privacy-title">匿名の利用状況計測</h2>
        <p>
          BORINEF Labsは、Google Analyticsを使用してページ表示や安全な操作種別だけを確認します。
          入力本文、出力本文、clipboard本文、価格、購入者情報、URLのqueryやhashは送信しません。
        </p>
        <p id="market-observer-consent-status" class="analytics-privacy__status" role="status" aria-live="polite"></p>
      </div>
      <div class="analytics-privacy__actions">
        <button id="market-observer-consent-allow" class="primary-button market-observer-consent-button" data-action="allow" type="button">許可する</button>
        <button id="market-observer-consent-deny" class="secondary-button market-observer-consent-button" data-action="deny" type="button">許可しない</button>
      </div>
    </section>
  `;
}

function renderFeelingPanel(): string {
  const t = getDictionary(state.language);
  const placeholder = state.language === "ja" ? sampleFeelingJa : sampleFeelingEn;

  return `
    <section class="control-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Step 1</p>
          <h3>${t.feelingTitle}</h3>
        </div>
      </div>
      <p class="panel-note">${t.feelingGuide}</p>
      <label class="field-label" for="feelingInput">Feeling</label>
      <textarea id="feelingInput" rows="5" placeholder="${placeholder}">${escapeHtml(state.feelingText)}</textarea>
      <div class="feeling-tags" id="feelingTags"></div>
      <div class="conflict-box" id="conflictBox"></div>
      <button class="secondary-button" type="button" data-action="translate-api">${t.translateButton}</button>
      <p class="button-note">${t.translateGuide}</p>
      <p class="status-line" id="statusLine" role="status" aria-live="polite">${statusMessage}</p>
    </section>
  `;
}

function renderRecommendationPanel(): string {
  const t = getDictionary(state.language);

  return `
    <section class="control-panel recommendation-step">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Step 2</p>
          <h3>${t.recommendedSetsTitle}</h3>
        </div>
      </div>
      <p class="panel-note">${t.recommendationGuide}</p>
      <div class="recommendation-sets" id="recommendationSets">
        ${renderRecommendationSets()}
      </div>
    </section>
  `;
}

function renderCustomizePanel(): string {
  const t = getDictionary(state.language);

  return `
    <details class="control-panel accordion-panel customize-details" id="customizeDetails" ${isCustomizeOpen ? "open" : ""}>
      <summary>
        <span>${t.customizeDetailsTitle}</span>
      </summary>
      <div class="customize-content">
        ${renderVisualPanel()}
        ${renderColorPanel()}
      </div>
    </details>
  `;
}

function renderAgentOutputPanel(): string {
  const t = getDictionary(state.language);

  return `
    <details class="control-panel accordion-panel agent-output-details" id="agentOutputDetails" ${isAgentOutputOpen ? "open" : ""}>
      <summary>
        <span>${t.reviewAgentOutputTitle}</span>
      </summary>
      <div class="agent-output-content">
        <section class="output-panel output-panel--inline">
          <div class="panel-heading">
            <div>
              <p class="eyebrow">Structure</p>
              <h3>${t.structureTitle}</h3>
            </div>
            <span class="source-pill" id="sourcePill">${t.standardConversion}</span>
          </div>
          <pre class="code-preview" id="structurePreview"></pre>
          <button class="secondary-button" type="button" data-action="copy-structure">${t.copyStructure}</button>
          <p class="next-action" id="structureNextAction"></p>
        </section>

        <section class="output-panel output-panel--inline">
          <div class="panel-heading">
            <div>
              <p class="eyebrow">Free</p>
              <h3>${t.designPreviewTitle}</h3>
            </div>
          </div>
          <pre class="code-preview code-preview--large" id="designPreview"></pre>
          <button class="secondary-button primary-button--full" type="button" data-action="copy-design">${t.copyDesign}</button>
          <p class="next-action" id="designNextAction"></p>
          <div class="settings-row">
            <input class="sr-only" id="settingsFile" type="file" accept=".json,application/json" />
            <label class="secondary-button secondary-button--file" for="settingsFile">${t.settingsUpload}</label>
            <button class="secondary-button" type="button" data-action="download-settings">${t.downloadSettings}</button>
          </div>
        </section>
      </div>
    </details>
  `;
}

function renderVisualPanel(): string {
  const t = getDictionary(state.language);
  const recommendedVisualIds = getRecommendedVisualPresetIds(state.interpretedFeelingTags);

  return `
    <section class="customize-block">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Visual</p>
          <h3>${t.changeVisualTitle}</h3>
        </div>
      </div>
      <p class="panel-note">${t.visualGuide}</p>
      <div class="preset-list">
        ${visualPresets
          .map((preset) => {
            const isSelected = preset.id === state.selectedVisualPreset;
            const isRejected = rejectedVisuals.has(preset.id);
            const isRecommended = recommendedVisualIds.includes(preset.id);
            const style = [
              `--pv-bg:${preset.preview.background}`,
              `--pv-surface:${preset.preview.surface}`,
              `--pv-text:${preset.preview.text}`,
              `--pv-muted:${preset.preview.muted}`,
              `--pv-accent:${preset.preview.accent}`,
              `--pv-radius:${preset.preview.radius}`,
            ].join(";");

            return `
              <article
                class="preset-card ${isSelected ? "is-selected" : ""} ${isRejected ? "is-rejected" : ""} ${isRecommended ? "is-recommended" : ""}"
                data-id="${preset.id}"
                style="${style}"
              >
                <div class="mini-ui" aria-hidden="true">
                  <span class="mini-bar"></span>
                  <span class="mini-line mini-line--wide"></span>
                  <span class="mini-block"></span>
                  <span class="mini-button"></span>
                </div>
                <div class="preset-body">
                  <div class="choice-title-row">
                    <strong>${preset.name}</strong>
                    <span class="recommend-badge ${isRecommended ? "" : "is-hidden"}">${t.recommended}</span>
                  </div>
                  <p>${preset.description[state.language]}</p>
                </div>
                <div class="choice-row">
                  <button type="button" data-action="select-preset" data-id="${preset.id}">${t.near}</button>
                  <button type="button" data-action="reject-preset" data-id="${preset.id}">${t.different}</button>
                </div>
              </article>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function renderColorPanel(): string {
  const t = getDictionary(state.language);
  const recommendedColorIds = getRecommendedColorPaletteIds(state.interpretedFeelingTags);

  return `
    <section class="customize-block">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Color</p>
          <h3>${t.changeColorTitle}</h3>
        </div>
      </div>
      <p class="panel-note">${t.colorGuide}</p>
      <p class="panel-note panel-note--subtle">${t.paletteCurationNote}</p>
      <div class="palette-list">
        ${colorPalettes
          .map((palette) => {
            const isSelected = palette.id === state.selectedColorPalette;
            const isRecommended = recommendedColorIds.includes(palette.id);
            return `
              <button
                class="palette-card ${isSelected ? "is-selected" : ""} ${isRecommended ? "is-recommended" : ""}"
                type="button"
                data-action="select-palette"
                data-id="${palette.id}"
              >
                <span class="swatch-row" aria-hidden="true">
                  ${Object.entries(palette.colors)
                    .slice(0, 5)
                    .map(([, color]) => `<span style="background:${color}"></span>`)
                    .join("")}
                </span>
                <span class="choice-title-row">
                  <strong>${palette.name}</strong>
                  <span class="recommend-badge ${isRecommended ? "" : "is-hidden"}">${t.recommended}</span>
                </span>
                <small>${palette.description[state.language]}</small>
              </button>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function renderLivePreview(): string {
  const t = getDictionary(state.language);
  const preset = getVisualPreset(state.selectedVisualPreset);
  const palette = getColorPalette(state.selectedColorPalette);
  const previewStyle = preset.previewStyle;
  const vars = [
    `--preview-bg:${palette.colors.background}`,
    `--preview-surface:${palette.colors.surface}`,
    `--preview-text:${palette.colors.text}`,
    `--preview-muted:${palette.colors.muted}`,
    `--preview-accent:${palette.colors.accent}`,
    `--preview-border:${palette.colors.border}`,
    `--preview-gap:${previewStyle.gap}`,
    `--preview-card-radius:${previewStyle.cardRadiusValue}`,
    `--preview-button-radius:${previewStyle.buttonRadiusValue}`,
    `--preview-card-shadow:${previewStyle.cardShadowValue}`,
    `--preview-card-padding:${previewStyle.cardPadding}`,
    `--preview-component-min-height:${previewStyle.componentMinHeight}`,
    `--preview-hero-min-height:${previewStyle.heroMinHeight}`,
    `--preview-hero-font-size:${previewStyle.heroFontSize}`,
    `--preview-copy-gap:${previewStyle.copyGap}`,
    `--preview-topbar-min-height:${previewStyle.topbarMinHeight}`,
    `--preview-font-family:${getPreviewFontFamily(previewStyle.typography)}`,
  ].join(";");

  return `
    <div class="product-preview" style="${vars}">
      <div class="preview-summary">
        <strong>${preset.name} × ${palette.name}</strong>
        <span>${t.currentMode}: ${getTranslationModeLabel(state.translationMode)}</span>
      </div>
      <div class="preview-stage">
        <div class="preview-topbar" aria-hidden="true">
          <span></span>
          <span></span>
        </div>
        <div class="preview-hero">
          <p></p>
          <h4>${preset.name}</h4>
          <span></span>
          <button type="button" aria-hidden="true"></button>
        </div>
      </div>
      <div class="preview-scenes" aria-label="visual preview variants">
        <div class="preview-scene preview-scene--landing">
          <small>${t.landingPreview}</small>
          <div class="scene-lines" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
        <div class="preview-scene preview-scene--component">
          <small>${t.componentPreview}</small>
          <div class="scene-component" aria-hidden="true">
            <span></span>
            <strong></strong>
            <em></em>
          </div>
        </div>
        <div class="preview-scene preview-scene--form">
          <small>${t.formPreview}</small>
          <div class="scene-form" aria-hidden="true">
            <span></span>
            <span></span>
            <button type="button"></button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function handleInput(event: Event): void {
  const target = event.target as HTMLTextAreaElement;
  if (target.id !== "feelingInput") {
    return;
  }

  state.feelingText = target.value;
  refreshFallbackStructure();
  updateGeneratedViews();
}

function handleClick(event: MouseEvent): void {
  const actionTarget = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
  if (!actionTarget) {
    return;
  }

  event.preventDefault();

  const action = actionTarget.dataset.action;
  const id = actionTarget.dataset.id;

  if (action === "toggle-language") {
    state.language = state.language === "ja" ? "en" : "ja";
    trackEvent("language_switch", analyticsStateParams());
    render();
    return;
  }

  if (action === "scroll-maker") {
    document.querySelector("#maker")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (action === "select-preset" && id) {
    rejectedVisuals.delete(id);
    state.selectedVisualPreset = id;
    markCustomizedFromRecommendation();
    refreshFallbackStructure();
    trackEvent("visual_preset_select", analyticsStateParams());
    trackEvent("customize_details_change", analyticsStateParams());
    updateInteractiveViews();
    return;
  }

  if (action === "reject-preset" && id) {
    rejectedVisuals.add(id);
    if (state.selectedVisualPreset === id) {
      const nextPreset = visualPresets.find((preset) => !rejectedVisuals.has(preset.id)) ?? visualPresets[0];
      state.selectedVisualPreset = nextPreset.id;
    }
    markCustomizedFromRecommendation();
    refreshFallbackStructure();
    trackEvent("visual_preset_select", analyticsStateParams());
    trackEvent("customize_details_change", analyticsStateParams());
    updateInteractiveViews();
    return;
  }

  if (action === "select-palette" && id) {
    state.selectedColorPalette = id;
    markCustomizedFromRecommendation();
    refreshFallbackStructure();
    trackEvent("color_palette_select", analyticsStateParams());
    trackEvent("customize_details_change", analyticsStateParams());
    updateInteractiveViews();
    return;
  }

  if (action === "select-recommendation-set") {
    const visualId = actionTarget.dataset.visualId;
    const paletteId = actionTarget.dataset.paletteId;
    const setId = actionTarget.dataset.setId;
    const setIndex = Number(actionTarget.dataset.setIndex ?? 0);

    if (!visualId || !paletteId || !setId) {
      return;
    }

    state.selectedVisualPreset = visualId;
    state.selectedColorPalette = paletteId;
    state.selectedRecommendationSet = setId;
    state.isCustomizedFromRecommendation = false;
    isPurchaseConfirmOpen = false;
    purchaseMessage = "";
    refreshFallbackStructure();
    trackEvent("recommended_set_select", {
      ...analyticsStateParams(),
      recommendedSetIndex: setIndex,
      selectedVisualPreset: visualId,
      selectedColorPalette: paletteId,
    });
    trackEvent("recommendation_use", {
      ...analyticsStateParams(),
      recommendedSetIndex: setIndex,
      selectedVisualPreset: visualId,
      selectedColorPalette: paletteId,
    });
    updateInteractiveViews();
    trackExportCtaViewIfNeeded();
    return;
  }

  if (action === "open-customize-details") {
    openCustomizeDetails();
    return;
  }

  if (action === "select-mode" && isTranslationMode(id)) {
    state.translationMode = id;
    refreshFallbackStructure();
    trackEvent("translation_mode_select", analyticsStateParams());
    updateInteractiveViews();
    return;
  }

  if (action === "translate-api") {
    void translateWithApi();
    return;
  }

  if (action === "copy-design") {
    void copyDesignMd();
    return;
  }

  if (action === "copy-structure") {
    void copyStructure();
    return;
  }

  if (action === "paid-export") {
    openPurchaseConfirm();
    return;
  }

  if (action === "close-purchase-confirm") {
    isPurchaseConfirmOpen = false;
    purchaseMessage = "";
    updateInteractiveViewsPreservingScroll();
    return;
  }

  if (action === "start-checkout") {
    void requestCheckoutSession();
    return;
  }

  if (action === "download-paid-export") {
    if (checkoutSessionId) {
      void downloadPaidExport(checkoutSessionId);
    }
    return;
  }

  if (action === "download-settings") {
    const files = buildGeneratedFiles(state);
    downloadTextFile("settings.json", files["settings.json"], "application/json");
    trackEvent("settings_download", {
      ...analyticsStateParams(),
      exportType: "settings",
      fileCount: 1,
    });
  }
}

function handleChange(event: Event): void {
  const target = event.target as HTMLInputElement;
  if (target.id !== "settingsFile" || !target.files?.[0]) {
    return;
  }

  void loadSettingsFile(target.files[0]);
  target.value = "";
}

function handleToggle(event: Event): void {
  const target = event.target as HTMLDetailsElement;
  if (target.id === "agentOutputDetails") {
    isAgentOutputOpen = target.open;
    return;
  }

  if (target.id !== "customizeDetails") {
    return;
  }

  const wasOpen = isCustomizeOpen;
  isCustomizeOpen = target.open;
  if (!wasOpen && target.open) {
    trackEvent("customize_details_open", analyticsStateParams());
  }
}

function refreshFallbackStructure(): void {
  const interpretedFeelingTags = extractToneKeywords(state.feelingText);
  const conflict = detectTranslationConflict({
    interpretedFeelingTags,
    selectedVisualPreset: state.selectedVisualPreset,
    selectedColorPalette: state.selectedColorPalette,
  });

  state.interpretedFeelingTags = interpretedFeelingTags;
  state.conflict = conflict;
  state.structure = buildFallbackStructure({
    feelingText: state.feelingText,
    selectedVisualPreset: state.selectedVisualPreset,
    selectedColorPalette: state.selectedColorPalette,
    interpretedFeelingTags,
    translationMode: state.translationMode,
    conflict,
  });
  trackConflictIfNeeded();
}

async function translateWithApi(): Promise<void> {
  const t = getDictionary(state.language);
  const fallback = buildFallbackStructure(state);

  try {
    const response = await fetch("/api/translate-design", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        language: state.language,
        feelingText: state.feelingText,
        interpretedFeelingTags: state.interpretedFeelingTags,
        selectedVisualPreset: state.selectedVisualPreset,
        selectedColorPalette: state.selectedColorPalette,
        selectedRecommendationSet: state.selectedRecommendationSet,
        isCustomizedFromRecommendation: state.isCustomizedFromRecommendation,
        translationMode: state.translationMode,
      }),
    });

    if (!response.ok) {
      throw new Error("translate endpoint unavailable");
    }

    const data = (await response.json()) as {
      ok?: boolean;
      source?: string;
      structure?: Partial<DesignStructure>;
      conflict?: Partial<TranslationConflict>;
    };
    if (!data.ok || !data.structure) {
      throw new Error("translate fallback used");
    }

    state.structure = mergeApiStructure(fallback, data.structure);
    state.conflict = normalizeConflict(data.conflict) ?? state.conflict;
    setStatus(t.standardConversion);
  } catch {
    state.structure = fallback;
    setStatus(t.standardConversion);
  }

  trackEvent("feeling_translate", {
    ...analyticsStateParams(),
    inputPresent: state.feelingText.trim().length > 0,
  });
  trackConflictIfNeeded();
  updateGeneratedViews();
}

async function copyDesignMd(): Promise<void> {
  const t = getDictionary(state.language);
  const files = buildGeneratedFiles(state);
  const ok = await copyText(files["design.md"]);
  nextActionMessage = ok ? t.designNextAction : "";
  setStatus(ok ? t.copied : t.copyFailed);
  if (ok) {
    trackEvent("design_md_copy", {
      ...analyticsStateParams(),
      exportType: "copy_design",
      fileCount: 1,
    });
    trackEvent("export_cta_click", {
      ...analyticsStateParams(),
      exportType: "copy_design",
      fileCount: 1,
    });
  }
}

async function copyStructure(): Promise<void> {
  const t = getDictionary(state.language);
  const ok = await copyText(structureToYaml(state.structure));
  nextActionMessage = ok ? t.structureNextAction : "";
  setStatus(ok ? t.copied : t.copyFailed);
  if (ok) {
    trackEvent("structure_copy", analyticsStateParams());
  }
}

function openPurchaseConfirm(): void {
  isPurchaseConfirmOpen = true;
  purchaseMessage = "";
  updateInteractiveViewsPreservingScroll();
}

function updateInteractiveViewsPreservingScroll(): void {
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const previousOverflowAnchor = document.documentElement.style.overflowAnchor;
  document.documentElement.style.overflowAnchor = "none";
  updateInteractiveViews();
  window.scrollTo(scrollX, scrollY);
  window.requestAnimationFrame(() => {
    window.scrollTo(scrollX, scrollY);
    document.documentElement.style.overflowAnchor = previousOverflowAnchor;
  });
}

async function requestCheckoutSession(): Promise<void> {
  const text = purchaseText(state.language);
  const zipAnalyticsParams = {
    ...analyticsStateParams(),
    exportType: "zip_export" as const,
  };
  const accepted = rootElement.querySelector<HTMLInputElement>("#purchaseTermsAccepted")?.checked === true;

  if (!accepted) {
    setPurchaseMessage(text.acceptRequired);
    return;
  }

  trackEvent("zip_export_click", zipAnalyticsParams);
  trackEvent("export_cta_click", {
    ...zipAnalyticsParams,
  });
  setPurchaseMessage(text.creatingCheckout);

  try {
    const response = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        locale: state.language,
        exportSpec: buildExportSpecV1(state),
      }),
    });

    if (response.ok) {
      const data = (await response.json()) as { checkoutUrl?: string };
      if (data.checkoutUrl) {
        trackEvent("stripe_outbound", {
          ...zipAnalyticsParams,
        });
        window.location.href = data.checkoutUrl;
        return;
      }
    }
  } catch {
    trackEvent("client_exception", { errorCode: "checkout_unavailable" });
  }

  setPurchaseMessage(text.checkoutUnavailable);
}

async function verifyAndDownloadPaidExport(sessionId: string): Promise<void> {
  checkoutNotice = {
    status: "verifying",
    message: checkoutText(state.language).verifying,
  };
  updateCheckoutNotice();

  try {
    const response = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(sessionId)}`);
    const data = (await response.json()) as { paid?: boolean };

    if (!response.ok || data.paid !== true) {
      throw new Error("checkout status unavailable");
    }

    await downloadPaidExport(sessionId);
  } catch {
    checkoutNotice = {
      status: "error",
      message: checkoutText(state.language).downloadFailed,
    };
    updateCheckoutNotice();
  }
}

async function downloadPaidExport(sessionId: string): Promise<void> {
  checkoutNotice = {
    status: "downloading",
    message: checkoutText(state.language).downloading,
  };
  updateCheckoutNotice();

  try {
    const response = await fetch("/api/download-export", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ session_id: sessionId }),
    });

    if (!response.ok) {
      throw new Error("download unavailable");
    }

    const blob = await response.blob();
    downloadBlob(blob, exportZipFileName);
    checkoutNotice = {
      status: "ready",
      message: checkoutText(state.language).ready,
    };
    updateCheckoutNotice();
    trackEvent("zip_export_download", {
      ...analyticsStateParams(),
      exportType: "zip_export",
      stripeEnabled: true,
      fileCount: Object.keys(buildGeneratedFiles(state)).length,
    });
  } catch {
    checkoutNotice = {
      status: "error",
      message: checkoutText(state.language).downloadFailed,
    };
    updateCheckoutNotice();
  }
}

async function loadSettingsFile(file: File): Promise<void> {
  const t = getDictionary(state.language);

  try {
    const parsed = JSON.parse(await file.text()) as Partial<MakerState>;
    const nextLanguage = parsed.language === "en" || parsed.language === "ja" ? parsed.language : state.language;
    const nextPreset = parsed.selectedVisualPreset
      ? normalizeVisualPresetId(getVisualPreset(parsed.selectedVisualPreset).id)
      : state.selectedVisualPreset;
    const nextPalette = parsed.selectedColorPalette
      ? getColorPalette(parsed.selectedColorPalette).id
      : state.selectedColorPalette;
    const nextFeelingText = typeof parsed.feelingText === "string" ? parsed.feelingText : "";
    const nextTags = Array.isArray(parsed.interpretedFeelingTags)
      ? parsed.interpretedFeelingTags.filter((tag): tag is string => typeof tag === "string")
      : extractToneKeywords(nextFeelingText);
    const nextMode = isTranslationMode(parsed.translationMode) ? parsed.translationMode : "harmonize";
    const nextRecommendationSet =
      typeof parsed.selectedRecommendationSet === "string" ? parsed.selectedRecommendationSet : undefined;
    const nextIsCustomizedFromRecommendation = parsed.isCustomizedFromRecommendation === true;
    const nextConflict =
      normalizeConflict(parsed.conflict) ??
      detectTranslationConflict({
        interpretedFeelingTags: nextTags,
        selectedVisualPreset: nextPreset,
        selectedColorPalette: nextPalette,
      });

    state = {
      version: "1.0.0",
      language: nextLanguage,
      maker: "design.md",
      feelingText: nextFeelingText,
      selectedVisualPreset: nextPreset,
      selectedColorPalette: nextPalette,
      selectedRecommendationSet: nextRecommendationSet,
      isCustomizedFromRecommendation: nextIsCustomizedFromRecommendation,
      interpretedFeelingTags: nextTags,
      translationMode: nextMode,
      conflict: nextConflict,
      structure: buildFallbackStructure({
        feelingText: nextFeelingText,
        selectedVisualPreset: nextPreset,
        selectedColorPalette: nextPalette,
        interpretedFeelingTags: nextTags,
        translationMode: nextMode,
        conflict: nextConflict,
      }),
    };

    if (parsed.structure) {
      state.structure = mergeApiStructure(state.structure, parsed.structure);
    }

    statusMessage = t.settingsLoaded;
    trackEvent("settings_import", analyticsStateParams());
    render();
  } catch {
    setStatus(t.settingsFailed);
  }
}

function updateGeneratedViews(): void {
  const structurePreview = rootElement.querySelector<HTMLElement>("#structurePreview");
  const designPreview = rootElement.querySelector<HTMLElement>("#designPreview");
  const sourcePill = rootElement.querySelector<HTMLElement>("#sourcePill");
  const statusLine = rootElement.querySelector<HTMLElement>("#statusLine");
  const feelingTags = rootElement.querySelector<HTMLElement>("#feelingTags");
  const recommendationSets = rootElement.querySelector<HTMLElement>("#recommendationSets");
  const conflictBox = rootElement.querySelector<HTMLElement>("#conflictBox");
  const designNextAction = rootElement.querySelector<HTMLElement>("#designNextAction");
  const structureNextAction = rootElement.querySelector<HTMLElement>("#structureNextAction");

  const files = buildGeneratedFiles(state);
  const t = getDictionary(state.language);

  if (structurePreview) {
    structurePreview.textContent = structureToYaml(state.structure);
  }

  if (designPreview) {
    designPreview.textContent = files["design.md"];
  }

  if (sourcePill) {
    sourcePill.textContent = t.standardConversion;
  }

  if (statusLine) {
    statusLine.textContent = statusMessage;
  }

  if (feelingTags) {
    feelingTags.innerHTML = renderFeelingTags();
  }

  if (recommendationSets) {
    recommendationSets.innerHTML = renderRecommendationSets();
  }

  if (conflictBox) {
    conflictBox.innerHTML = renderConflictBox();
  }

  updateRecommendationBadges();
  updateChoiceSelectionStates();
  trackExportCtaViewIfNeeded();

  if (designNextAction) {
    designNextAction.textContent = nextActionMessage === t.designNextAction ? nextActionMessage : "";
  }

  if (structureNextAction) {
    structureNextAction.textContent = nextActionMessage === t.structureNextAction ? nextActionMessage : "";
  }
}

function updateInteractiveViews(): void {
  updateLivePreview();
  updateGeneratedViews();
}

function updateLivePreview(): void {
  const preview = rootElement.querySelector<HTMLElement>("#selectedPreviewRail .product-preview");
  if (!preview) {
    return;
  }

  preview.outerHTML = renderLivePreview();
}

function setStatus(message: string): void {
  statusMessage = message;
  updateGeneratedViews();
}

function renderFeelingTags(): string {
  const t = getDictionary(state.language);
  const tags = state.interpretedFeelingTags;

  if (!tags.length) {
    return `<p>${t.noInterpretedFeeling}</p>`;
  }

  return `
    <p>${t.interpretedFeeling}: ${tags.join(" / ")}</p>
    <div class="tag-row">
      ${tags.map((tag) => `<span>${tag}</span>`).join("")}
    </div>
  `;
}

function renderRecommendationSets(): string {
  const t = getDictionary(state.language);
  const sets = getRecommendedSets(state.interpretedFeelingTags);

  if (!sets.length) {
    return "";
  }

  return `
    <section class="recommendation-panel" aria-label="${t.recommendedSetsTitle}">
      <h4>${t.recommendedSetsTitle}</h4>
      <div class="recommendation-list">
        ${sets
          .map((set) => {
            const visualPreset = getVisualPreset(set.visualPresetId);
            const colorPalette = getColorPalette(set.colorPaletteId);
            const isSelected = state.selectedRecommendationSet === set.id;
            const sampleStyle = [
              `--pv-bg:${colorPalette.colors.background}`,
              `--pv-surface:${colorPalette.colors.surface}`,
              `--pv-text:${colorPalette.colors.text}`,
              `--pv-muted:${colorPalette.colors.muted}`,
              `--pv-accent:${colorPalette.colors.accent}`,
              `--pv-radius:${visualPreset.preview.radius}`,
            ].join(";");

            return `
              <article class="recommendation-card ${isSelected ? "is-selected" : ""}">
                <div class="recommendation-card__head">
                  <strong>${t.recommendedSetLabel} ${set.index}</strong>
                  <span>${visualPreset.name} × ${colorPalette.name}</span>
                </div>
                <div class="recommendation-meta">
                  <span><b>${t.setVisualLabel}:</b> ${visualPreset.name}</span>
                  <span><b>${t.setColorLabel}:</b> ${colorPalette.name}</span>
                  <span><b>${t.setReasonLabel}:</b> ${set.reason[state.language]}</span>
                </div>
                <div class="recommendation-swatches" aria-hidden="true">
                  ${Object.entries(colorPalette.colors)
                    .slice(0, 5)
                    .map(([, color]) => `<span style="background:${color}"></span>`)
                    .join("")}
                </div>
                <div class="recommendation-sample mini-ui" style="${sampleStyle}" aria-hidden="true">
                  <span class="mini-bar"></span>
                  <span class="mini-line mini-line--wide"></span>
                  <span class="mini-block"></span>
                  <span class="mini-button"></span>
                </div>
                <button
                  class="primary-button"
                  type="button"
                  data-action="select-recommendation-set"
                  data-set-id="${set.id}"
                  data-set-index="${set.index}"
                  data-visual-id="${visualPreset.id}"
                  data-palette-id="${colorPalette.id}"
                >${t.useRecommendationSet}</button>
              </article>
              ${isSelected ? renderExportCtaBlock() : ""}
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function renderExportCtaBlock(): string {
  if (!isRecommendationExportReady()) {
    return "";
  }

  const t = getDictionary(state.language);
  const preset = getVisualPreset(state.selectedVisualPreset);
  const palette = getColorPalette(state.selectedColorPalette);
  const customizedNote = state.isCustomizedFromRecommendation
    ? `<p class="customized-note">${t.customizedFromRecommendation}</p>`
    : "";

  return `
    <section class="export-cta" id="exportCtaBlock" aria-label="${t.readyToExport}">
      <div>
        <p class="export-cta__ready">${t.readyToExport}</p>
        <strong>${preset.name} × ${palette.name}</strong>
        ${customizedNote}
      </div>
      <div class="export-cta__actions">
        <button class="primary-button primary-button--full" type="button" data-action="copy-design">${t.copyDesignFree}</button>
        <button class="secondary-button primary-button--full" type="button" data-action="paid-export">${t.zipExport}</button>
        <button class="secondary-button primary-button--full" type="button" data-action="open-customize-details">${t.customizeDetailsTitle}</button>
      </div>
      <p class="button-note">${t.zipIncludes}</p>
      ${isPurchaseConfirmOpen ? renderPurchaseConfirmPanel() : ""}
    </section>
  `;
}

function renderPurchaseConfirmPanel(): string {
  const text = purchaseText(state.language);
  const price = state.language === "en" ? "$3" : "¥300";

  return `
    <section class="purchase-confirm" aria-labelledby="purchase-confirm-title">
      <div class="purchase-confirm__head">
        <div>
          <p class="eyebrow">${text.eyebrow}</p>
          <h4 id="purchase-confirm-title">${text.title}</h4>
        </div>
        <button class="secondary-button purchase-confirm__close" type="button" data-action="close-purchase-confirm">${text.close}</button>
      </div>
      <dl class="purchase-summary">
        <div><dt>${text.product}</dt><dd>BORINEF md maker Export Pack</dd></div>
        <div><dt>${text.files}</dt><dd>9 files</dd></div>
        <div><dt>${text.purchaseType}</dt><dd>${text.oneTime}</dd></div>
        <div><dt>${text.price}</dt><dd>${price}</dd></div>
      </dl>
      <p class="purchase-confirm__note">${text.note}</p>
      <div class="legal-link-row">
        <a href="/legal/terms.html" target="_blank" rel="noreferrer">${text.terms}</a>
        <a href="/legal/privacy.html" target="_blank" rel="noreferrer">${text.privacy}</a>
        <a href="/legal/commercial-transactions.html" target="_blank" rel="noreferrer">${text.commercial}</a>
      </div>
      <label class="purchase-checkbox">
        <input id="purchaseTermsAccepted" type="checkbox" />
        <span>${text.accept}</span>
      </label>
      <p class="purchase-confirm__status" id="purchasePanelStatus" role="status" aria-live="polite">${purchaseMessage}</p>
      <button class="primary-button primary-button--full" type="button" data-action="start-checkout">${text.continue}</button>
    </section>
  `;
}

function renderConflictBox(): string {
  const t = getDictionary(state.language);
  const conflict = state.conflict;

  if (!conflict?.hasConflict) {
    return "";
  }

  const modes: Array<{ id: TranslationMode; label: string }> = [
    { id: "prefer_feeling", label: t.preferFeeling },
    { id: "prefer_visual", label: t.preferVisual },
    { id: "harmonize", label: t.harmonize },
  ];

  return `
    <div class="conflict-card">
      <div>
        <strong>${t.conflictTitle}</strong>
        <p>${t.conflictMessage}</p>
      </div>
      <div class="mode-row">
        ${modes
          .map(
            (mode) => `
              <button
                class="${state.translationMode === mode.id ? "is-active" : ""}"
                type="button"
                data-action="select-mode"
                data-id="${mode.id}"
              >${mode.label}</button>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function updateRecommendationBadges(): void {
  const t = getDictionary(state.language);
  const recommendedVisualIds = getRecommendedVisualPresetIds(state.interpretedFeelingTags);
  const recommendedColorIds = getRecommendedColorPaletteIds(state.interpretedFeelingTags);

  rootElement.querySelectorAll<HTMLElement>(".preset-card[data-id]").forEach((card) => {
    const isRecommended = recommendedVisualIds.includes(card.dataset.id ?? "");
    card.classList.toggle("is-recommended", isRecommended);
    const badge = card.querySelector<HTMLElement>(".recommend-badge");
    if (badge) {
      badge.textContent = t.recommended;
      badge.classList.toggle("is-hidden", !isRecommended);
    }
  });

  rootElement.querySelectorAll<HTMLElement>(".palette-card[data-id]").forEach((card) => {
    const isRecommended = recommendedColorIds.includes(card.dataset.id ?? "");
    card.classList.toggle("is-recommended", isRecommended);
    const badge = card.querySelector<HTMLElement>(".recommend-badge");
    if (badge) {
      badge.textContent = t.recommended;
      badge.classList.toggle("is-hidden", !isRecommended);
    }
  });
}

function updateChoiceSelectionStates(): void {
  rootElement.querySelectorAll<HTMLElement>(".preset-card[data-id]").forEach((card) => {
    const id = card.dataset.id ?? "";
    card.classList.toggle("is-selected", id === state.selectedVisualPreset);
    card.classList.toggle("is-rejected", rejectedVisuals.has(id));
  });

  rootElement.querySelectorAll<HTMLElement>(".palette-card[data-id]").forEach((card) => {
    card.classList.toggle("is-selected", card.dataset.id === state.selectedColorPalette);
  });
}

function getTranslationModeLabel(mode: TranslationMode): string {
  const t = getDictionary(state.language);

  if (mode === "prefer_feeling") {
    return t.preferFeeling;
  }

  if (mode === "prefer_visual") {
    return t.preferVisual;
  }

  return t.harmonize;
}

function markCustomizedFromRecommendation(): void {
  state.isCustomizedFromRecommendation = Boolean(state.selectedRecommendationSet);
}

function isRecommendationExportReady(): boolean {
  return Boolean(state.selectedRecommendationSet);
}

function openCustomizeDetails(): void {
  if (isCustomizeOpen) {
    return;
  }

  isCustomizeOpen = true;
  const details = rootElement.querySelector<HTMLDetailsElement>("#customizeDetails");
  if (details) {
    details.open = true;
  }
  trackEvent("customize_details_open", analyticsStateParams());
}

function getSelectedRecommendationIndex(): number | undefined {
  if (!state.selectedRecommendationSet) {
    return undefined;
  }

  const recommendedSet = getRecommendedSets(state.interpretedFeelingTags).find(
    (set) => set.id === state.selectedRecommendationSet,
  );
  if (recommendedSet) {
    return recommendedSet.index;
  }

  const fallbackIndex = Number(state.selectedRecommendationSet.replace(/^set-/, ""));
  return Number.isFinite(fallbackIndex) ? fallbackIndex : undefined;
}

function trackExportCtaViewIfNeeded(): void {
  if (!isRecommendationExportReady() || !rootElement.querySelector("#exportCtaBlock")) {
    return;
  }

  const key = [
    state.selectedRecommendationSet,
    state.selectedVisualPreset,
    state.selectedColorPalette,
    state.translationMode,
    state.isCustomizedFromRecommendation ? "customized" : "recommended",
  ].join("|");

  if (key === lastExportCtaViewKey) {
    return;
  }

  lastExportCtaViewKey = key;
  trackEvent("export_cta_view", analyticsStateParams());
}

function getPreviewFontFamily(typography: ReturnType<typeof getVisualPreset>["previewStyle"]["typography"]): string {
  if (typography === "editorial-serif") {
    return "Georgia, 'Times New Roman', serif";
  }

  if (typography === "humanist-sans") {
    return "'Avenir Next', 'Yu Gothic', system-ui, sans-serif";
  }

  return "Inter, system-ui, sans-serif";
}

function isTranslationMode(value: unknown): value is TranslationMode {
  return value === "prefer_feeling" || value === "prefer_visual" || value === "harmonize";
}

function analyticsStateParams() {
  return {
    selectedVisualPreset: state.selectedVisualPreset,
    selectedColorPalette: state.selectedColorPalette,
    translationMode: state.translationMode,
    conflictLevel: state.conflict?.level ?? "none",
    language: state.language,
    tagCount: state.interpretedFeelingTags.length,
    recommendedSetIndex: getSelectedRecommendationIndex(),
    isCustomizedFromRecommendation: state.isCustomizedFromRecommendation,
  };
}

function trackConflictIfNeeded(): void {
  if (!state.conflict?.hasConflict) {
    return;
  }

  const key = [
    state.selectedVisualPreset,
    state.selectedColorPalette,
    state.translationMode,
    state.conflict.level,
    state.interpretedFeelingTags.join(","),
  ].join("|");

  if (key === lastConflictEventKey) {
    return;
  }

  lastConflictEventKey = key;
  trackEvent("conflict_detected", analyticsStateParams());
}

function consumeCheckoutReturnUrl(): CheckoutReturn {
  const url = new URL(window.location.href);
  const checkout = url.searchParams.get("checkout");
  const sessionId = normalizeCheckoutSessionId(url.searchParams.get("session_id"));

  if (checkout || url.searchParams.has("session_id")) {
    url.searchParams.delete("checkout");
    url.searchParams.delete("session_id");
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  }

  if (checkout === "success" && sessionId) {
    return { status: "success", sessionId };
  }

  if (checkout === "cancelled") {
    return { status: "cancelled" };
  }

  return { status: "none" };
}

function normalizeCheckoutSessionId(value: string | null): string | null {
  if (!value || value.length > 200) {
    return null;
  }
  return /^cs_(test|live)_[A-Za-z0-9_]+$/.test(value) ? value : null;
}

function setPurchaseMessage(message: string): void {
  purchaseMessage = message;
  const status = rootElement.querySelector<HTMLElement>("#purchasePanelStatus");
  if (status) {
    status.textContent = message;
  }
}

function updateCheckoutNotice(): void {
  const existing = rootElement.querySelector<HTMLElement>("#checkoutNotice");
  const next = renderCheckoutNotice();

  if (existing) {
    if (next) {
      existing.outerHTML = next;
    } else {
      existing.remove();
    }
    return;
  }

  if (next) {
    const intro = rootElement.querySelector<HTMLElement>(".intro-band");
    intro?.insertAdjacentHTML("afterend", next);
  }
}

function purchaseText(language: LanguageCode) {
  if (language === "en") {
    return {
      eyebrow: "Purchase confirmation",
      title: "Export Pack",
      close: "Close",
      product: "Product",
      files: "Files",
      purchaseType: "Purchase",
      oneTime: "One-time purchase",
      price: "Price",
      note: "After Stripe payment is confirmed, the ZIP is generated server-side and downloads immediately.",
      terms: "Terms",
      privacy: "Privacy Policy",
      commercial: "Legal disclosure",
      accept: "I have reviewed and agree to the terms and refund conditions.",
      acceptRequired: "Please confirm the purchase terms before continuing.",
      creatingCheckout: "Creating a secure Stripe Checkout session.",
      checkoutUnavailable: "Checkout is unavailable. Please try again after payment settings are complete.",
      continue: "Continue to Stripe",
    };
  }

  return {
    eyebrow: "購入確認",
    title: "Export Pack",
    close: "閉じる",
    product: "商品",
    files: "ファイル",
    purchaseType: "購入",
    oneTime: "1回限りの購入",
    price: "価格",
    note: "Stripe決済の確認後、サーバー側でZIPを生成してすぐにダウンロードします。",
    terms: "利用規約",
    privacy: "プライバシーポリシー",
    commercial: "特定商取引法に基づく表記",
    accept: "利用規約と返品・返金条件を確認し、同意します。",
    acceptRequired: "続行する前に購入条件への同意を確認してください。",
    creatingCheckout: "安全なStripe Checkoutを作成しています。",
    checkoutUnavailable: "Checkoutを利用できません。決済設定完了後に再度お試しください。",
    continue: "Stripeへ進む",
  };
}

function checkoutText(language: LanguageCode) {
  if (language === "en") {
    return {
      eyebrow: "Checkout",
      title: "Paid export",
      verifying: "Verifying your payment.",
      downloading: "Preparing your ZIP download.",
      ready: "Your ZIP is ready. You can download it again from this page while it remains open.",
      cancelled: "Checkout was cancelled. No payment was completed.",
      downloadFailed: "Payment could not be verified or the ZIP could not be generated.",
      downloadAgain: "Download ZIP again",
    };
  }

  return {
    eyebrow: "Checkout",
    title: "有料Export",
    verifying: "決済結果を確認しています。",
    downloading: "ZIPダウンロードを準備しています。",
    ready: "ZIPの準備ができました。このページを開いている間は再ダウンロードできます。",
    cancelled: "Checkoutはキャンセルされました。決済は完了していません。",
    downloadFailed: "決済確認またはZIP生成に失敗しました。",
    downloadAgain: "ZIPを再ダウンロード",
  };
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    textarea.remove();
    return ok;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
