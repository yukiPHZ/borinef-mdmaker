export type LanguageCode = "ja" | "en";

export type MakerKind = "design.md";

export type TranslationMode = "prefer_feeling" | "prefer_visual" | "harmonize";

export type ConflictLevel = "none" | "low" | "medium" | "high";

export type TypographyStyle =
  | "neutral-sans"
  | "editorial-serif"
  | "humanist-sans"
  | "system-sans";

export type VisualShadowStyle =
  | "none"
  | "soft"
  | "very-soft"
  | "minimal"
  | "clean"
  | "editorial"
  | "calm"
  | "dark-soft"
  | "organic-soft";

export interface TranslationConflict {
  hasConflict: boolean;
  level: ConflictLevel;
  summary: string;
  reasons: string[];
  suggestedModes: TranslationMode[];
}

export interface ColorTokens {
  background: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  border: string;
}

export interface VisualPreset {
  id: string;
  name: string;
  description: Record<LanguageCode, string>;
  tags: string[];
  preview: {
    background: string;
    surface: string;
    text: string;
    muted: string;
    accent: string;
    radius: string;
    density: "low" | "medium" | "compact";
  };
  previewStyle: {
    spacing: string;
    cardRadius: string;
    buttonRadius: string;
    cardShadow: string;
    typography: TypographyStyle;
    layoutDensity: "low" | "medium" | "compact";
    componentSize: string;
    gap: string;
    cardRadiusValue: string;
    buttonRadiusValue: string;
    cardShadowValue: string;
    cardPadding: string;
    componentMinHeight: string;
    heroMinHeight: string;
    heroFontSize: string;
    copyGap: string;
    topbarMinHeight: string;
  };
  structureHints: {
    density: "low" | "medium" | "compact";
    rhythm: string;
    spacingScale: "large" | "balanced" | "compact";
    radiusScale: "soft" | "balanced" | "sharp";
    shadow: VisualShadowStyle;
    motion: "subtle-fade" | "steady" | "editorial-shift";
    headingStyle: TypographyStyle;
    bodyStyle: TypographyStyle;
    recommendedStack: string;
  };
}

export interface ColorPalette {
  id: string;
  name: string;
  description: Record<LanguageCode, string>;
  colors: ColorTokens;
}

export interface RecommendationSet {
  id: string;
  index: number;
  visualPresetId: string;
  colorPaletteId: string;
  reason: Record<LanguageCode, string>;
}

export interface DesignStructure {
  visual_tone: string[];
  layout: {
    density: string;
    max_width: string;
    rhythm: string;
  };
  spacing: {
    scale: string;
    section: string;
    container: string;
    card: string;
  };
  radius: {
    card: string;
    button: string;
    input: string;
  };
  shadow: {
    intensity: string;
    card: string;
  };
  motion: {
    speed: string;
    style: string;
    duration: string;
  };
  typography: {
    heading: string;
    body: string;
    headingStyle: TypographyStyle;
    bodyStyle: TypographyStyle;
    recommendedStack: string;
    weightHeading: number;
    weightBody: number;
    fontSize: {
      hero: string;
      h1: string;
      h2: string;
      h3: string;
      body: string;
      small: string;
    };
    lineHeight: {
      heading: string;
      body: string;
    };
  };
  components: {
    buttons: string;
    cards: string;
    forms: string;
  };
  color: {
    palette_name: string;
    tokens: ColorTokens;
  };
  translation: {
    mode: TranslationMode;
    interpreted_tags: string[];
    conflict_level: ConflictLevel;
    notes: string[];
  };
}

export interface MakerState {
  version: string;
  language: LanguageCode;
  maker: MakerKind;
  feelingText: string;
  selectedVisualPreset: string;
  selectedColorPalette: string;
  selectedRecommendationSet?: string;
  interpretedFeelingTags: string[];
  translationMode: TranslationMode;
  conflict?: TranslationConflict;
  structure: DesignStructure;
}

export interface GeneratedFiles {
  "design.md": string;
  "design-summary.txt": string;
  "tokens.json": string;
  "tokens.css": string;
  "tailwind.config.memo.md": string;
  "codex-prompt.md": string;
  "claude-code-prompt.md": string;
  "cursor-prompt.md": string;
  "settings.json": string;
}
