import { getColorPalette } from "../data/colorPalettes";
import { getVisualPreset } from "../data/visualPresets";
import type {
  ColorPalette,
  DesignStructure,
  TranslationConflict,
  TranslationMode,
  VisualShadowStyle,
  VisualPreset,
} from "../types";

interface BuildStructureOptions {
  feelingText: string;
  selectedVisualPreset: string;
  selectedColorPalette: string;
  interpretedFeelingTags?: string[];
  translationMode?: TranslationMode;
  conflict?: TranslationConflict;
}

const defaultMode: TranslationMode = "harmonize";

const keywordRules: Array<{ value: string; patterns: string[] }> = [
  { value: "quiet", patterns: ["quiet", "calm", "silent", "静", "穏", "落ち着"] },
  { value: "spacious", patterns: ["space", "spacious", "余白", "広", "ゆとり"] },
  { value: "practical", patterns: ["practical", "useful", "実務", "道具", "使いやす"] },
  { value: "warm", patterns: ["warm", "温", "あたた", "暖"] },
  { value: "minimal", patterns: ["minimal", "minimum", "ミニマル", "最小"] },
  { value: "editorial", patterns: ["editorial", "magazine", "編集", "雑誌"] },
  { value: "clean", patterns: ["clean", "clear", "清潔", "明快"] },
  { value: "dark", patterns: ["dark", "black", "暗", "黒"] },
  { value: "natural", patterns: ["natural", "organic", "自然", "有機"] },
  { value: "soft", patterns: ["soft", "gentle", "やわ", "柔"] },
  { value: "structured", patterns: ["structured", "system", "構造", "整理"] },
  { value: "low-noise", patterns: ["low-noise", "noise", "静音", "うるさく", "ノイズ"] },
  { value: "human", patterns: ["human", "person", "人間", "人"] },
  { value: "focused", patterns: ["focused", "focus", "集中"] },
  { value: "energetic", patterns: ["energetic", "energy", "熱血", "勢い", "エネルギ"] },
  { value: "red", patterns: ["red", "crimson", "真っ赤", "赤", "紅"] },
  { value: "passionate", patterns: ["passionate", "passion", "情熱", "熱い"] },
  { value: "bold", patterns: ["bold", "strong", "大胆", "力強", "太い"] },
  { value: "intense", patterns: ["intense", "aggressive", "激", "強烈"] },
];

const intenseTags = ["energetic", "red", "passionate", "bold", "intense"];
const quietVisualIds = ["quiet-practical", "warm-minimal"];
const quietPaletteIds = ["warm-neutral", "sand-minimal", "forest-calm", "clear-light"];
const calmFitIds = ["quiet-practical", "warm-minimal", "dark-calm"];

const spacingByScale = {
  large: { section: "96px", container: "24px", card: "24px" },
  balanced: { section: "80px", container: "22px", card: "20px" },
  compact: { section: "64px", container: "18px", card: "16px" },
};

const radiusByScale = {
  soft: { card: "14px", button: "10px", input: "10px" },
  balanced: { card: "10px", button: "8px", input: "8px" },
  sharp: { card: "4px", button: "4px", input: "4px" },
};

const shadowByIntensity: Record<VisualShadowStyle, string> = {
  none: "none",
  soft: "0 8px 24px rgba(45, 41, 36, 0.08)",
  "very-soft": "0 18px 42px rgba(70, 54, 40, 0.07)",
  minimal: "0 2px 0 rgba(25, 23, 22, 0.16)",
  clean: "0 10px 26px rgba(35, 39, 37, 0.1)",
  editorial: "0 14px 42px rgba(25, 23, 22, 0.14)",
  calm: "0 18px 50px rgba(0, 0, 0, 0.34)",
  "dark-soft": "0 22px 54px rgba(0, 0, 0, 0.42)",
  "organic-soft": "0 18px 40px rgba(63, 78, 54, 0.12)",
};

export function extractToneKeywords(feelingText: string): string[] {
  const source = feelingText.trim().toLowerCase();
  if (!source) {
    return [];
  }

  return keywordRules
    .filter((rule) => rule.patterns.some((pattern) => source.includes(pattern.toLowerCase())))
    .map((rule) => rule.value);
}

export function detectTranslationConflict(options: {
  interpretedFeelingTags: string[];
  selectedVisualPreset: string;
  selectedColorPalette: string;
}): TranslationConflict {
  const tags = new Set(options.interpretedFeelingTags);
  const reasons: string[] = [];
  let level: TranslationConflict["level"] = "none";

  const hasIntensity = intenseTags.some((tag) => tags.has(tag));
  const hasQuietFit = ["quiet", "spacious", "minimal", "practical"].some((tag) => tags.has(tag));
  const hasDark = tags.has("dark");
  const quietVisual = quietVisualIds.includes(options.selectedVisualPreset);
  const quietPalette = quietPaletteIds.includes(options.selectedColorPalette);

  if (hasIntensity && quietVisual) {
    level = "high";
    reasons.push("feeling text suggests energetic, red, passionate, bold, or intense direction");
    reasons.push(`selected visual preset is ${options.selectedVisualPreset}`);
  }

  if (hasIntensity && quietPalette) {
    level = "high";
    reasons.push(`selected color palette is ${options.selectedColorPalette}`);
  }

  if (hasDark && options.selectedColorPalette === "clear-light") {
    level = level === "high" ? "high" : "medium";
    reasons.push("feeling text suggests a dark direction");
    reasons.push("selected color palette is clear-light");
  }

  if (level === "none" && hasQuietFit && calmFitIds.includes(options.selectedVisualPreset)) {
    return {
      hasConflict: false,
      level: "none",
      summary: "Feeling text and selected visual direction are aligned.",
      reasons: [],
      suggestedModes: ["harmonize"],
    };
  }

  if (level === "none" && options.interpretedFeelingTags.length > 0) {
    level = "low";
    reasons.push("minor interpretation differences may exist between the feeling text and selected direction");
  }

  const hasConflict = level === "medium" || level === "high";

  return {
    hasConflict,
    level,
    summary: hasConflict
      ? "The feeling text and selected visual direction point in different directions."
      : "No significant conflict was detected.",
    reasons,
    suggestedModes: hasConflict ? ["prefer_feeling", "harmonize"] : ["harmonize"],
  };
}

export function getRecommendedVisualPresetIds(interpretedFeelingTags: string[]): string[] {
  const tags = new Set(interpretedFeelingTags);

  if (intenseTags.some((tag) => tags.has(tag))) {
    return ["clean-saas", "dark-calm"];
  }

  if (["quiet", "spacious", "practical", "warm"].some((tag) => tags.has(tag))) {
    return ["quiet-practical", "warm-minimal"];
  }

  if (tags.has("dark")) {
    return ["dark-calm", "studio-editorial"];
  }

  if (tags.has("natural") || tags.has("soft")) {
    return ["natural-soft", "warm-minimal"];
  }

  if (tags.has("editorial") || tags.has("structured")) {
    return ["studio-editorial", "clean-saas"];
  }

  return [];
}

export function getRecommendedColorPaletteIds(interpretedFeelingTags: string[]): string[] {
  const tags = new Set(interpretedFeelingTags);

  if (intenseTags.some((tag) => tags.has(tag))) {
    return ["soft-ink", "quiet-charcoal"];
  }

  if (["quiet", "spacious", "practical", "warm"].some((tag) => tags.has(tag))) {
    return ["warm-neutral", "quiet-charcoal"];
  }

  if (tags.has("dark")) {
    return ["quiet-charcoal", "soft-ink"];
  }

  if (tags.has("natural") || tags.has("soft")) {
    return ["forest-calm", "warm-neutral"];
  }

  if (tags.has("clean") || tags.has("structured")) {
    return ["soft-ink", "clear-light"];
  }

  return [];
}

export function buildFallbackStructure(options: BuildStructureOptions): DesignStructure {
  const preset = getVisualPreset(options.selectedVisualPreset);
  const palette = getColorPalette(options.selectedColorPalette);
  const interpretedFeelingTags =
    options.interpretedFeelingTags ?? extractToneKeywords(options.feelingText);
  const conflict =
    options.conflict ??
    detectTranslationConflict({
      interpretedFeelingTags,
      selectedVisualPreset: options.selectedVisualPreset,
      selectedColorPalette: options.selectedColorPalette,
    });

  return buildStructureFromParts({
    feelingText: options.feelingText,
    preset,
    palette,
    interpretedFeelingTags,
    translationMode: options.translationMode ?? defaultMode,
    conflict,
  });
}

export function buildStructureFromParts(options: {
  feelingText: string;
  preset: VisualPreset;
  palette: ColorPalette;
  interpretedFeelingTags: string[];
  translationMode: TranslationMode;
  conflict: TranslationConflict;
}): DesignStructure {
  const { preset, palette, interpretedFeelingTags, translationMode, conflict } = options;
  const visualTone = buildVisualTone(interpretedFeelingTags, preset, translationMode, conflict);
  const spacing = spacingByScale[preset.structureHints.spacingScale];
  const radius = radiusByScale[preset.structureHints.radiusScale];
  const motionSpeed = preset.structureHints.motion === "editorial-shift" ? "medium" : "slow";

  return {
    visual_tone: visualTone.length ? visualTone : ["quiet", "practical", "human"],
    layout: {
      density: preset.structureHints.density,
      max_width: preset.structureHints.density === "compact" ? "960px" : "1120px",
      rhythm: preset.structureHints.rhythm,
    },
    spacing: {
      scale: preset.structureHints.spacingScale,
      ...spacing,
    },
    radius,
    shadow: {
      intensity: preset.structureHints.shadow,
      card: shadowByIntensity[preset.structureHints.shadow],
    },
    motion: {
      speed: motionSpeed,
      style: preset.structureHints.motion,
      duration: motionSpeed === "medium" ? "360ms" : "600ms",
    },
    typography: {
      heading: preset.structureHints.recommendedStack,
      body: preset.structureHints.bodyStyle === "system-sans" ? "system-ui" : preset.structureHints.recommendedStack,
      headingStyle: preset.structureHints.headingStyle,
      bodyStyle: preset.structureHints.bodyStyle,
      recommendedStack: preset.structureHints.recommendedStack,
      weightHeading: preset.id === "studio-editorial" ? 760 : 700,
      weightBody: 400,
      fontSize: {
        hero: preset.id === "studio-editorial" ? "clamp(46px, 7vw, 88px)" : "clamp(42px, 7vw, 84px)",
        h1: preset.id === "studio-editorial" ? "56px" : "48px",
        h2: "32px",
        h3: "22px",
        body: "16px",
        small: "13px",
      },
      lineHeight: {
        heading: "1.08",
        body: "1.8",
      },
    },
    components: {
      buttons: "clear command buttons with restrained accent states",
      cards: "individual surfaces only; avoid nested card composition",
      forms: "plain labels, readable inputs, and generous touch targets",
    },
    color: {
      palette_name: palette.name,
      tokens: palette.colors,
    },
    translation: {
      mode: translationMode,
      interpreted_tags: interpretedFeelingTags,
      conflict_level: conflict.level,
      notes: buildTranslationNotes(interpretedFeelingTags, translationMode, conflict),
    },
  };
}

export function mergeApiStructure(
  fallback: DesignStructure,
  apiStructure: Partial<DesignStructure>,
): DesignStructure {
  return {
    ...fallback,
    ...apiStructure,
    visual_tone: Array.isArray(apiStructure.visual_tone)
      ? apiStructure.visual_tone
      : fallback.visual_tone,
    layout: { ...fallback.layout, ...(apiStructure.layout ?? {}) },
    spacing: { ...fallback.spacing, ...(apiStructure.spacing ?? {}) },
    radius: { ...fallback.radius, ...(apiStructure.radius ?? {}) },
    shadow: { ...fallback.shadow, ...(apiStructure.shadow ?? {}) },
    motion: { ...fallback.motion, ...(apiStructure.motion ?? {}) },
    typography: { ...fallback.typography, ...(apiStructure.typography ?? {}) },
    components: { ...fallback.components, ...(apiStructure.components ?? {}) },
    color: fallback.color,
    translation: { ...fallback.translation, ...(apiStructure.translation ?? {}) },
  };
}

export function normalizeConflict(conflict: Partial<TranslationConflict> | undefined): TranslationConflict | undefined {
  if (!conflict) {
    return undefined;
  }

  const level: TranslationConflict["level"] =
    conflict.level === "none" ||
    conflict.level === "low" ||
    conflict.level === "medium" ||
    conflict.level === "high"
      ? conflict.level
      : "none";
  const suggestedModes = Array.isArray(conflict.suggestedModes)
    ? conflict.suggestedModes.filter((mode): mode is TranslationMode =>
        mode === "prefer_feeling" || mode === "prefer_visual" || mode === "harmonize",
      )
    : [];

  return {
    hasConflict: Boolean(conflict.hasConflict),
    level,
    summary: typeof conflict.summary === "string" ? conflict.summary : "",
    reasons: Array.isArray(conflict.reasons)
      ? conflict.reasons.filter((reason): reason is string => typeof reason === "string")
      : [],
    suggestedModes: suggestedModes.length ? suggestedModes : ["harmonize"],
  };
}

export function structureToYaml(structure: DesignStructure): string {
  return [
    "visual_tone:",
    ...structure.visual_tone.map((tone) => `  - ${tone}`),
    "",
    "layout:",
    `  density: ${structure.layout.density}`,
    `  max_width: ${structure.layout.max_width}`,
    `  rhythm: ${structure.layout.rhythm}`,
    "",
    "spacing:",
    `  scale: ${structure.spacing.scale}`,
    `  section: ${structure.spacing.section}`,
    `  container: ${structure.spacing.container}`,
    `  card: ${structure.spacing.card}`,
    "",
    "radius:",
    `  card: ${structure.radius.card}`,
    `  button: ${structure.radius.button}`,
    `  input: ${structure.radius.input}`,
    "",
    "shadow:",
    `  intensity: ${structure.shadow.intensity}`,
    "",
    "motion:",
    `  speed: ${structure.motion.speed}`,
    `  style: ${structure.motion.style}`,
    `  duration: ${structure.motion.duration}`,
    "",
    "typography:",
    `  heading_style: ${structure.typography.headingStyle}`,
    `  body_style: ${structure.typography.bodyStyle}`,
    `  recommended_stack: ${structure.typography.recommendedStack}`,
    "",
    "color:",
    `  palette_name: ${structure.color.palette_name}`,
    "",
    "translation:",
    `  mode: ${structure.translation.mode}`,
    `  conflict_level: ${structure.translation.conflict_level}`,
    "  interpreted_tags:",
    ...structure.translation.interpreted_tags.map((tag) => `    - ${tag}`),
  ].join("\n");
}

function buildVisualTone(
  interpretedFeelingTags: string[],
  preset: VisualPreset,
  mode: TranslationMode,
  conflict: TranslationConflict,
): string[] {
  const tags = uniqueList(interpretedFeelingTags);
  const hasIntensity = intenseTags.some((tag) => tags.includes(tag));
  const hasDark = tags.includes("dark");

  if (mode === "prefer_feeling") {
    return uniqueList([
      ...tags,
      ...(hasIntensity ? ["energetic", "bold", "passionate", "high-contrast"] : []),
      ...(hasDark ? ["dark", "focused"] : []),
      ...preset.tags.slice(0, 2),
    ]).slice(0, 8);
  }

  if (mode === "prefer_visual") {
    return uniqueList([
      ...preset.tags,
      ...(conflict.hasConflict ? ["selected-direction-priority"] : []),
      ...tags.slice(0, 2),
    ]).slice(0, 8);
  }

  if (conflict.hasConflict && hasIntensity) {
    return uniqueList(["warm", "focused", "confident", "restrained-energy", ...preset.tags.slice(0, 3)]).slice(0, 8);
  }

  if (conflict.hasConflict && hasDark) {
    return uniqueList(["clear", "calm", "focused", "restrained-dark", ...preset.tags.slice(0, 3)]).slice(0, 8);
  }

  return uniqueList([...tags, ...preset.tags]).slice(0, 8);
}

function buildTranslationNotes(
  interpretedFeelingTags: string[],
  mode: TranslationMode,
  conflict: TranslationConflict,
): string[] {
  const notes = [`Translation mode: ${mode}.`];

  if (interpretedFeelingTags.length) {
    notes.push(`Interpreted feeling tags: ${interpretedFeelingTags.join(", ")}.`);
  }

  if (conflict.hasConflict) {
    notes.push(conflict.summary);
  }

  if (mode === "prefer_visual" && conflict.hasConflict) {
    notes.push("Original feeling text suggested a different intensity, but selected visual direction was prioritized.");
  }

  if (mode === "harmonize" && conflict.hasConflict) {
    notes.push("The structure intentionally blends feeling intent with the selected visual and color direction.");
  }

  return notes;
}

function uniqueList(items: string[]): string[] {
  return [...new Set(items.filter(Boolean).map((item) => item.trim()))];
}
