export type LanguageCode = "ja" | "en";

export type MakerKind = "design.md";

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
  structureHints: {
    density: "low" | "medium" | "compact";
    rhythm: string;
    spacingScale: "large" | "balanced" | "compact";
    radiusScale: "soft" | "balanced" | "sharp";
    shadow: "none" | "soft" | "editorial" | "calm";
    motion: "subtle-fade" | "steady" | "editorial-shift";
  };
}

export interface ColorPalette {
  id: string;
  name: string;
  description: Record<LanguageCode, string>;
  colors: ColorTokens;
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
    weightHeading: number;
    weightBody: number;
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
}

export interface MakerState {
  version: string;
  language: LanguageCode;
  maker: MakerKind;
  feelingText: string;
  selectedVisualPreset: string;
  selectedColorPalette: string;
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
