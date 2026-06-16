import { getColorPalette } from "../data/colorPalettes";
import { getVisualPreset } from "../data/visualPresets";
import type { ColorPalette, DesignStructure, VisualPreset } from "../types";

interface BuildStructureOptions {
  feelingText: string;
  selectedVisualPreset: string;
  selectedColorPalette: string;
}

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
];

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

const shadowByIntensity = {
  none: "none",
  soft: "0 10px 30px rgba(0,0,0,0.18)",
  editorial: "0 14px 42px rgba(25,23,22,0.14)",
  calm: "0 18px 50px rgba(0,0,0,0.34)",
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

export function buildFallbackStructure(options: BuildStructureOptions): DesignStructure {
  const preset = getVisualPreset(options.selectedVisualPreset);
  const palette = getColorPalette(options.selectedColorPalette);
  return buildStructureFromParts(options.feelingText, preset, palette);
}

export function buildStructureFromParts(
  feelingText: string,
  preset: VisualPreset,
  palette: ColorPalette,
): DesignStructure {
  const extracted = extractToneKeywords(feelingText);
  const visualTone = uniqueList([...extracted, ...preset.tags]).slice(0, 7);
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
      heading: "Inter",
      body: "Inter",
      weightHeading: preset.id === "studio-editorial" ? 760 : 700,
      weightBody: 400,
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
    "color:",
    `  palette_name: ${structure.color.palette_name}`,
  ].join("\n");
}

function uniqueList(items: string[]): string[] {
  return [...new Set(items.filter(Boolean).map((item) => item.trim()))];
}
