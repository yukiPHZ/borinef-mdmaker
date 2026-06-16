import { colorPalettes, getColorPalette } from "./data/colorPalettes";
import { sampleFeelingEn, sampleFeelingJa } from "./data/sampleOutputs";
import { getVisualPreset, visualPresets } from "./data/visualPresets";
import { getDictionary } from "./i18n";
import type { DesignStructure, LanguageCode, MakerState } from "./types";
import { buildFallbackStructure, mergeApiStructure, structureToYaml } from "./engine/translateFeeling";
import { buildGeneratedFiles, downloadExportZip, downloadTextFile } from "./zip/buildZip";

let rootElement: HTMLElement;
let state = createInitialState("ja");
let statusMessage = "";
let structureSource = "fallback";
const rejectedVisuals = new Set<string>();

export function mountApp(root: HTMLElement): void {
  rootElement = root;
  rootElement.addEventListener("click", handleClick);
  rootElement.addEventListener("input", handleInput);
  rootElement.addEventListener("change", handleChange);
  render();
}

function createInitialState(language: LanguageCode): MakerState {
  const baseState = {
    version: "1.0.0",
    language,
    maker: "design.md" as const,
    feelingText: "",
    selectedVisualPreset: "quiet-practical",
    selectedColorPalette: "warm-neutral",
  };

  return {
    ...baseState,
    structure: buildFallbackStructure(baseState),
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
                  <span class="source-pill" id="sourcePill">${structureSource}</span>
                </div>
                <pre class="code-preview" id="structurePreview"></pre>
                <button class="secondary-button" type="button" data-action="copy-structure">${t.copyStructure}</button>
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
    render();
    return;
  }

  if (action === "select-palette" && id) {
    state.selectedColorPalette = id;
    refreshFallbackStructure();
    render();
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
  state.structure = buildFallbackStructure({
    feelingText: state.feelingText,
    selectedVisualPreset: state.selectedVisualPreset,
    selectedColorPalette: state.selectedColorPalette,
  });
  structureSource = "fallback";
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
        selectedVisualPreset: state.selectedVisualPreset,
        selectedColorPalette: state.selectedColorPalette,
      }),
    });

    if (!response.ok) {
      throw new Error("translate endpoint unavailable");
    }

    const data = (await response.json()) as { ok?: boolean; source?: string; structure?: Partial<DesignStructure> };
    if (!data.ok || !data.structure) {
      throw new Error("translate fallback used");
    }

    state.structure = mergeApiStructure(fallback, data.structure);
    structureSource = data.source ?? "api";
    setStatus(t.apiUsed);
  } catch {
    state.structure = fallback;
    structureSource = "fallback";
    setStatus(t.fallbackUsed);
  }

  updateGeneratedViews();
}

async function copyDesignMd(): Promise<void> {
  const t = getDictionary(state.language);
  const files = buildGeneratedFiles(state);
  const ok = await copyText(files["design.md"]);
  setStatus(ok ? t.copied : t.copyFailed);
}

async function copyStructure(): Promise<void> {
  const t = getDictionary(state.language);
  const ok = await copyText(structureToYaml(state.structure));
  setStatus(ok ? t.copied : t.copyFailed);
}

async function requestCheckoutOrDownload(): Promise<void> {
  const t = getDictionary(state.language);

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

    state = {
      version: "1.0.0",
      language: nextLanguage,
      maker: "design.md",
      feelingText: typeof parsed.feelingText === "string" ? parsed.feelingText : "",
      selectedVisualPreset: nextPreset,
      selectedColorPalette: nextPalette,
      structure: buildFallbackStructure({
        feelingText: typeof parsed.feelingText === "string" ? parsed.feelingText : "",
        selectedVisualPreset: nextPreset,
        selectedColorPalette: nextPalette,
      }),
    };

    if (parsed.structure) {
      state.structure = mergeApiStructure(state.structure, parsed.structure);
    }

    structureSource = "settings";
    statusMessage = t.settingsLoaded;
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

  const files = buildGeneratedFiles(state);

  if (structurePreview) {
    structurePreview.textContent = structureToYaml(state.structure);
  }

  if (designPreview) {
    designPreview.textContent = files["design.md"];
  }

  if (sourcePill) {
    sourcePill.textContent = structureSource;
  }

  if (statusLine) {
    statusLine.textContent = statusMessage;
  }
}

function setStatus(message: string): void {
  statusMessage = message;
  updateGeneratedViews();
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
