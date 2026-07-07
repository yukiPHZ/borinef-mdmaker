import { colorPalettes } from "./data/colorPalettes";
import { visualPresets } from "./data/visualPresets";
import {
  buildFallbackStructure,
  detectTranslationConflict,
} from "./engine/translateFeeling";
import type {
  ExportSpecV1,
  LanguageCode,
  MakerState,
  RecommendationSetId,
  TranslationMode,
} from "./types";

type ExportSpecResult =
  | { ok: true; spec: ExportSpecV1 }
  | { ok: false; reason: string };

const maxToneTags = 12;
const maxTagLength = 40;
const allowedLanguages: LanguageCode[] = ["ja", "en"];
const allowedTranslationModes: TranslationMode[] = ["prefer_feeling", "prefer_visual", "harmonize"];
const allowedRecommendationSets: RecommendationSetId[] = ["set-1", "set-2", "set-3"];
const allowedToneTags = new Set([
  "quiet",
  "spacious",
  "practical",
  "warm",
  "minimal",
  "editorial",
  "clean",
  "dark",
  "natural",
  "soft",
  "structured",
  "low-noise",
  "human",
  "focused",
  "energetic",
  "red",
  "passionate",
  "bold",
  "intense",
  "blue",
  "trust",
]);

export function buildExportSpecV1(state: MakerState): ExportSpecV1 {
  return {
    schemaVersion: 1,
    language: state.language,
    visualPresetId: state.selectedVisualPreset,
    colorPaletteId: state.selectedColorPalette,
    translationMode: state.translationMode,
    normalizedToneTags: normalizeToneTags(state.interpretedFeelingTags),
    selectedRecommendationSet: normalizeRecommendationSet(state.selectedRecommendationSet),
    isCustomizedFromRecommendation: state.isCustomizedFromRecommendation,
  };
}

export function parseExportSpecV1(value: unknown): ExportSpecResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, reason: "export_spec_not_object" };
  }

  const input = value as Partial<Record<keyof ExportSpecV1, unknown>>;
  if (input.schemaVersion !== 1) {
    return { ok: false, reason: "invalid_schema_version" };
  }

  if (!isLanguage(input.language)) {
    return { ok: false, reason: "invalid_language" };
  }

  if (!isKnownVisualPreset(input.visualPresetId)) {
    return { ok: false, reason: "invalid_visual_preset" };
  }

  if (!isKnownColorPalette(input.colorPaletteId)) {
    return { ok: false, reason: "invalid_color_palette" };
  }

  if (!isTranslationMode(input.translationMode)) {
    return { ok: false, reason: "invalid_translation_mode" };
  }

  if (
    input.selectedRecommendationSet !== null &&
    !isRecommendationSet(input.selectedRecommendationSet)
  ) {
    return { ok: false, reason: "invalid_recommendation_set" };
  }

  if (!Array.isArray(input.normalizedToneTags) || input.normalizedToneTags.length > maxToneTags) {
    return { ok: false, reason: "invalid_tone_tags" };
  }

  const normalizedToneTags = normalizeToneTags(input.normalizedToneTags);
  if (normalizedToneTags.length !== input.normalizedToneTags.length) {
    return { ok: false, reason: "invalid_tone_tag_value" };
  }

  if (typeof input.isCustomizedFromRecommendation !== "boolean") {
    return { ok: false, reason: "invalid_customized_flag" };
  }

  return {
    ok: true,
    spec: {
      schemaVersion: 1,
      language: input.language,
      visualPresetId: input.visualPresetId,
      colorPaletteId: input.colorPaletteId,
      translationMode: input.translationMode,
      normalizedToneTags,
      selectedRecommendationSet: input.selectedRecommendationSet,
      isCustomizedFromRecommendation: input.isCustomizedFromRecommendation,
    },
  };
}

export function buildMakerStateFromExportSpec(spec: ExportSpecV1): MakerState {
  const conflict = detectTranslationConflict({
    interpretedFeelingTags: spec.normalizedToneTags,
    selectedVisualPreset: spec.visualPresetId,
    selectedColorPalette: spec.colorPaletteId,
  });

  const base = {
    version: "1.0.0",
    language: spec.language,
    maker: "design.md" as const,
    feelingText: "",
    selectedVisualPreset: spec.visualPresetId,
    selectedColorPalette: spec.colorPaletteId,
    selectedRecommendationSet: spec.selectedRecommendationSet ?? undefined,
    isCustomizedFromRecommendation: spec.isCustomizedFromRecommendation,
    interpretedFeelingTags: spec.normalizedToneTags,
    translationMode: spec.translationMode,
    conflict,
  };

  return {
    ...base,
    structure: buildFallbackStructure(base),
  };
}

export function exportSpecToStripeMetadata(spec: ExportSpecV1): Record<string, string> {
  return {
    schema_version: "1",
    language: spec.language,
    visual_preset_id: spec.visualPresetId,
    color_palette_id: spec.colorPaletteId,
    translation_mode: spec.translationMode,
    recommendation_set: spec.selectedRecommendationSet ?? "none",
    customized: spec.isCustomizedFromRecommendation ? "1" : "0",
    tone_tags: spec.normalizedToneTags.join(","),
    product_code: "design-md-export-v1",
    app: "borinef-mdmaker",
  };
}

export function stripeMetadataToExportSpec(metadata: Record<string, unknown>): ExportSpecResult {
  const toneTags =
    typeof metadata.tone_tags === "string" && metadata.tone_tags.trim()
      ? metadata.tone_tags.split(",")
      : [];
  const recommendationSet =
    metadata.recommendation_set === "none" ? null : metadata.recommendation_set;

  return parseExportSpecV1({
    schemaVersion: Number(metadata.schema_version),
    language: metadata.language,
    visualPresetId: metadata.visual_preset_id,
    colorPaletteId: metadata.color_palette_id,
    translationMode: metadata.translation_mode,
    normalizedToneTags: toneTags,
    selectedRecommendationSet: recommendationSet,
    isCustomizedFromRecommendation: metadata.customized === "1",
  });
}

function normalizeToneTags(tags: unknown[]): string[] {
  return [
    ...new Set(
      tags
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0 && tag.length <= maxTagLength && allowedToneTags.has(tag)),
    ),
  ].slice(0, maxToneTags);
}

function normalizeRecommendationSet(value: unknown): RecommendationSetId | null {
  return isRecommendationSet(value) ? value : null;
}

function isLanguage(value: unknown): value is LanguageCode {
  return allowedLanguages.includes(value as LanguageCode);
}

function isTranslationMode(value: unknown): value is TranslationMode {
  return allowedTranslationModes.includes(value as TranslationMode);
}

function isRecommendationSet(value: unknown): value is RecommendationSetId {
  return allowedRecommendationSets.includes(value as RecommendationSetId);
}

function isKnownVisualPreset(value: unknown): value is string {
  return typeof value === "string" && visualPresets.some((preset) => preset.id === value);
}

function isKnownColorPalette(value: unknown): value is string {
  return typeof value === "string" && colorPalettes.some((palette) => palette.id === value);
}
