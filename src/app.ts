import { colorPalettes, getColorPalette } from "./data/colorPalettes";
import { sampleFeelingEn, sampleFeelingJa } from "./data/sampleOutputs";
import { getVisualPreset, visualPresets } from "./data/visualPresets";
import { getDictionary } from "./i18n";
import type { DesignStructure, LanguageCode, MakerState, TranslationConflict, TranslationMode } from "./types";
import {
  buildFallbackStructure,
  detectTranslationConflict,
  extractToneKeywords,
  mergeApiStructure,
  normalizeConflict,
  structureToYaml,
} from "./engine/translateFeeling";
import { initAnalytics, trackEvent } from "./analytics";
import { buildGeneratedFiles, downloadExportZip, downloadTextFile } from "./zip/buildZip";

let rootElement: HTMLElement;
let state = createInitialState("ja");
let statusMessage = "";
let nextActionMessage = "";
let lastConflictEventKey = "";
const rejectedVisuals = new Set<string>();

export function mountApp(root: HTMLElement): void {
  rootElement = root;
  initAnalytics();
  rootElement.addEventListener("click", handleClick);
  rootElement.addEventListener("input", handleInput);
  rootElement.addEventListener("change", handleChange);
  render();
  trackEvent("mdmaker_view", analyticsStateParams());
}

function createInitialState(language: LanguageCode): MakerState {
  const baseState = {
    version: "1.0.0",
    language,
    maker: "design.md" as const,
    feelingText: "",
    selectedVisualPreset: "quiet-practical",
    selectedColorPalette: "warm-neutral",
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
  const price = t.price;
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
              ${renderVisualPanel()}
              ${renderColorPanel()}
              ${renderExportPanel(price)}
            </aside>

            <section class="preview-rail" aria-labelledby="preview-title">
              <div class="rail-title">
                <p class="eyebrow">Step 4</p>
                <h3 id="preview-title">${t.previewTitle}</h3>
              </div>
              ${renderLivePreview()}
            </section>

            <aside class="output-rail" aria-label="generated output">
              <section class="output-panel">
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

              <section class="output-panel">
                <div class="panel-heading">
                  <div>
                    <p class="eyebrow">Free</p>
                    <h3>${t.designPreviewTitle}</h3>
                  </div>
                </div>
                <pre class="code-preview code-preview--large" id="designPreview"></pre>
                <button class="primary-button primary-button--full" type="button" data-action="copy-design">${t.copyDesign}</button>
                <p class="next-action" id="designNextAction"></p>
              </section>
            </aside>
          </div>
        </section>
      </main>

      <footer class="site-footer">
        <span>BORINEF Labs</span>
        <span>mdmaker.borinef.com</span>
      </footer>
    </div>
  `;

  updateGeneratedViews();
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
      <p class="status-line" id="statusLine" role="status" aria-live="polite">${statusMessage}</p>
    </section>
  `;
}

function renderVisualPanel(): string {
  const t = getDictionary(state.language);

  return `
    <section class="control-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Step 2</p>
          <h3>${t.visualTitle}</h3>
        </div>
      </div>
      <div class="preset-list">
        ${visualPresets
          .map((preset) => {
            const isSelected = preset.id === state.selectedVisualPreset;
            const isRejected = rejectedVisuals.has(preset.id);
            const style = [
              `--pv-bg:${preset.preview.background}`,
              `--pv-surface:${preset.preview.surface}`,
              `--pv-text:${preset.preview.text}`,
              `--pv-muted:${preset.preview.muted}`,
              `--pv-accent:${preset.preview.accent}`,
              `--pv-radius:${preset.preview.radius}`,
            ].join(";");

            return `
              <article class="preset-card ${isSelected ? "is-selected" : ""} ${isRejected ? "is-rejected" : ""}" style="${style}">
                <div class="mini-ui" aria-hidden="true">
                  <span class="mini-bar"></span>
                  <span class="mini-line mini-line--wide"></span>
                  <span class="mini-block"></span>
                  <span class="mini-button"></span>
                </div>
                <div class="preset-body">
                  <strong>${preset.name}</strong>
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

  return `
    <section class="control-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Step 3</p>
          <h3>${t.colorTitle}</h3>
        </div>
      </div>
      <div class="palette-list">
        ${colorPalettes
          .map((palette) => {
            const isSelected = palette.id === state.selectedColorPalette;
            return `
              <button class="palette-card ${isSelected ? "is-selected" : ""}" type="button" data-action="select-palette" data-id="${palette.id}">
                <span class="swatch-row" aria-hidden="true">
                  ${Object.entries(palette.colors)
                    .slice(0, 5)
                    .map(([, color]) => `<span style="background:${color}"></span>`)
                    .join("")}
                </span>
                <strong>${palette.name}</strong>
                <small>${palette.description[state.language]}</small>
              </button>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function renderExportPanel(price: string): string {
  const t = getDictionary(state.language);

  return `
    <section class="control-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Step 5</p>
          <h3>${t.exportTitle}</h3>
        </div>
        <span class="price-tag">${price}</span>
      </div>
      <button class="primary-button primary-button--full" type="button" data-action="paid-export">${t.paidExport}</button>
      <div class="settings-row">
        <input class="sr-only" id="settingsFile" type="file" accept=".json,application/json" />
        <label class="secondary-button secondary-button--file" for="settingsFile">${t.settingsUpload}</label>
        <button class="secondary-button" type="button" data-action="download-settings">${t.downloadSettings}</button>
      </div>
    </section>
  `;
}

function renderLivePreview(): string {
  const preset = getVisualPreset(state.selectedVisualPreset);
  const palette = getColorPalette(state.selectedColorPalette);
  const vars = [
    `--preview-bg:${palette.colors.background}`,
    `--preview-surface:${palette.colors.surface}`,
    `--preview-text:${palette.colors.text}`,
    `--preview-muted:${palette.colors.muted}`,
    `--preview-accent:${palette.colors.accent}`,
    `--preview-border:${palette.colors.border}`,
    `--preview-radius:${preset.preview.radius}`,
  ].join(";");

  return `
    <div class="product-preview" style="${vars}">
      <div class="preview-topbar">
        <span>design.md</span>
        <span>tokens.json</span>
      </div>
      <div class="preview-hero">
        <p>AI Native Structure</p>
        <h4>${preset.name}</h4>
        <span>${palette.name}</span>
      </div>
      <div class="preview-content">
        <div class="preview-copy">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div class="preview-card">
          <strong>Component</strong>
          <small>${state.structure.layout.density} density</small>
          <button type="button">Apply tokens</button>
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
    refreshFallbackStructure();
    trackEvent("visual_preset_select", analyticsStateParams());
    render();
    return;
  }

  if (action === "reject-preset" && id) {
    rejectedVisuals.add(id);
    if (state.selectedVisualPreset === id) {
      const nextPreset = visualPresets.find((preset) => !rejectedVisuals.has(preset.id)) ?? visualPresets[0];
      state.selectedVisualPreset = nextPreset.id;
    }
    refreshFallbackStructure();
    trackEvent("visual_preset_select", analyticsStateParams());
    render();
    return;
  }

  if (action === "select-palette" && id) {
    state.selectedColorPalette = id;
    refreshFallbackStructure();
    trackEvent("color_palette_select", analyticsStateParams());
    render();
    return;
  }

  if (action === "select-mode" && isTranslationMode(id)) {
    state.translationMode = id;
    refreshFallbackStructure();
    trackEvent("translation_mode_select", analyticsStateParams());
    updateGeneratedViews();
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
    void requestCheckoutOrDownload();
    return;
  }

  if (action === "download-settings") {
    const files = buildGeneratedFiles(state);
    downloadTextFile("settings.json", files["settings.json"], "application/json");
    trackEvent("settings_download", analyticsStateParams());
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

  trackEvent("feeling_translate", analyticsStateParams());
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
    trackEvent("design_md_copy", analyticsStateParams());
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

async function requestCheckoutOrDownload(): Promise<void> {
  const t = getDictionary(state.language);
  trackEvent("zip_export_click", analyticsStateParams());

  try {
    const response = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        language: state.language,
        maker: state.maker,
      }),
    });

    if (response.ok) {
      const data = (await response.json()) as { checkoutUrl?: string };
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
    }
  } catch {
    // Static Vite preview and missing Stripe config intentionally fall through to ZIP generation.
  }

  await downloadExportZip(state);
  trackEvent("zip_export_download", analyticsStateParams());
  setStatus(t.checkoutUnavailable);
}

async function loadSettingsFile(file: File): Promise<void> {
  const t = getDictionary(state.language);

  try {
    const parsed = JSON.parse(await file.text()) as Partial<MakerState>;
    const nextLanguage = parsed.language === "en" || parsed.language === "ja" ? parsed.language : state.language;
    const nextPreset = parsed.selectedVisualPreset
      ? getVisualPreset(parsed.selectedVisualPreset).id
      : state.selectedVisualPreset;
    const nextPalette = parsed.selectedColorPalette
      ? getColorPalette(parsed.selectedColorPalette).id
      : state.selectedColorPalette;
    const nextFeelingText = typeof parsed.feelingText === "string" ? parsed.feelingText : "";
    const nextTags = Array.isArray(parsed.interpretedFeelingTags)
      ? parsed.interpretedFeelingTags.filter((tag): tag is string => typeof tag === "string")
      : extractToneKeywords(nextFeelingText);
    const nextMode = isTranslationMode(parsed.translationMode) ? parsed.translationMode : "harmonize";
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

  if (conflictBox) {
    conflictBox.innerHTML = renderConflictBox();
  }

  if (designNextAction) {
    designNextAction.textContent = nextActionMessage === t.designNextAction ? nextActionMessage : "";
  }

  if (structureNextAction) {
    structureNextAction.textContent = nextActionMessage === t.structureNextAction ? nextActionMessage : "";
  }
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
