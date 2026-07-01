interface Env {
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
}

interface PagesContext {
  request: Request;
  env: Env;
}

type TranslationMode = "prefer_feeling" | "prefer_visual" | "harmonize";
type ConflictLevel = "none" | "low" | "medium" | "high";

interface TranslatePayload {
  language?: "ja" | "en";
  feelingText?: string;
  interpretedFeelingTags?: string[];
  selectedVisualPreset?: string;
  selectedColorPalette?: string;
  translationMode?: TranslationMode;
}

interface TranslationConflict {
  hasConflict: boolean;
  level: ConflictLevel;
  summary: string;
  reasons: string[];
  suggestedModes: TranslationMode[];
}

interface ColorTokens {
  background: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  border: string;
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, { headers: corsHeaders() });
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const payload = await readJson<TranslatePayload>(context.request);

  if (!payload) {
    return jsonResponse({
      ok: false,
      source: "fallback",
      message: "invalid_json",
    }, 400);
  }

  const interpretedFeelingTags = Array.isArray(payload.interpretedFeelingTags)
    ? payload.interpretedFeelingTags.filter((tag): tag is string => typeof tag === "string")
    : extractToneKeywords(payload.feelingText || "");
  const conflict = detectConflict({
    interpretedFeelingTags,
    selectedVisualPreset: payload.selectedVisualPreset || "quiet-practical",
    selectedColorPalette: payload.selectedColorPalette || "warm-neutral",
  });
  const fallback = buildFallbackStructure(payload, interpretedFeelingTags, conflict);

  if (!context.env.OPENAI_API_KEY) {
    return jsonResponse({
      ok: true,
      source: "fallback",
      message: "fallback_used",
      structure: fallback,
      conflict,
    });
  }

  try {
    const aiResult = await requestOpenAiStructure(context.env, payload, fallback, interpretedFeelingTags, conflict);

    return jsonResponse({
      ok: true,
      source: "api",
      structure: {
        ...fallback,
        ...(aiResult.structure ?? {}),
        color: fallback.color,
      },
      conflict: aiResult.conflict ?? conflict,
    });
  } catch {
    return jsonResponse({
      ok: true,
      source: "fallback",
      message: "fallback_used",
      structure: fallback,
      conflict,
    });
  }
}

async function requestOpenAiStructure(
  env: Env,
  payload: TranslatePayload,
  fallback: ReturnType<typeof buildFallbackStructure>,
  interpretedFeelingTags: string[],
  conflict: TranslationConflict,
): Promise<{ structure?: Record<string, unknown>; conflict?: TranslationConflict }> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || "gpt-5.2",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You are BORINEF Translation Engine. Translate human feeling, visual choice, and color choice into AI-native design structure. Return JSON only with structure and conflict. Do not return prose outside JSON. Preserve selected color tokens.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                language: payload.language ?? "ja",
                feelingText: String(payload.feelingText ?? "").slice(0, 1200),
                interpretedFeelingTags,
                selectedVisualPreset: payload.selectedVisualPreset,
                selectedColorPalette: payload.selectedColorPalette,
                translationMode: payload.translationMode ?? "harmonize",
                fallback,
                conflict,
              }),
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "design_translation",
          strict: false,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              structure: { type: "object", additionalProperties: true },
              conflict: {
                type: "object",
                additionalProperties: false,
                properties: {
                  hasConflict: { type: "boolean" },
                  level: { type: "string", enum: ["none", "low", "medium", "high"] },
                  summary: { type: "string" },
                  reasons: { type: "array", items: { type: "string" } },
                  suggestedModes: {
                    type: "array",
                    items: { type: "string", enum: ["prefer_feeling", "prefer_visual", "harmonize"] },
                  },
                },
              },
            },
          },
        },
      },
      max_output_tokens: 1400,
    }),
  });

  if (!response.ok) {
    throw new Error("OpenAI request failed");
  }

  const data = await response.json();
  const text = extractOutputText(data);
  if (!text) {
    throw new Error("No OpenAI output text");
  }

  return JSON.parse(text) as { structure?: Record<string, unknown>; conflict?: TranslationConflict };
}

function extractOutputText(data: unknown): string {
  if (typeof data !== "object" || data === null) {
    return "";
  }

  const maybeOutputText = (data as { output_text?: unknown }).output_text;
  if (typeof maybeOutputText === "string") {
    return maybeOutputText;
  }

  const output = (data as { output?: unknown }).output;
  if (!Array.isArray(output)) {
    return "";
  }

  for (const item of output) {
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) {
      continue;
    }

    for (const part of content) {
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string") {
        return text;
      }
    }
  }

  return "";
}

function buildFallbackStructure(payload: TranslatePayload, interpretedFeelingTags: string[], conflict: TranslationConflict) {
  const visualPreset = payload.selectedVisualPreset || "quiet-practical";
  const palette = getPalette(payload.selectedColorPalette || "warm-neutral");
  const translationMode = payload.translationMode || "harmonize";
  const preset = getPreset(visualPreset);
  const tone = buildVisualTone(interpretedFeelingTags, preset.tags, translationMode, conflict);
  const spacingScale = visualPreset === "studio-editorial" || visualPreset === "clean-saas" ? "balanced" : "large";
  const density = visualPreset === "studio-editorial" || visualPreset === "clean-saas" ? "medium" : "low";
  const radius =
    visualPreset === "studio-editorial"
      ? { card: "4px", button: "4px", input: "4px" }
      : { card: "10px", button: "8px", input: "8px" };
  const shadow = visualPreset === "dark-calm"
    ? "0 18px 50px rgba(0, 0, 0, 0.34)"
    : "0 8px 24px rgba(45, 41, 36, 0.08)";

  return {
    visual_tone: tone.length ? tone : ["quiet", "practical", "human"],
    layout: {
      density,
      max_width: "1120px",
      rhythm: visualPreset.split("-").join(" "),
    },
    spacing: {
      scale: spacingScale,
      section: spacingScale === "large" ? "96px" : "80px",
      container: spacingScale === "large" ? "24px" : "22px",
      card: spacingScale === "large" ? "24px" : "20px",
    },
    radius,
    shadow: {
      intensity: visualPreset === "dark-calm" ? "calm" : "soft",
      card: shadow,
    },
    motion: {
      speed: "slow",
      style: "subtle-fade",
      duration: "600ms",
    },
    typography: {
      heading: preset.recommendedStack,
      body: "system-ui",
      headingStyle: preset.headingStyle,
      bodyStyle: preset.bodyStyle,
      recommendedStack: preset.recommendedStack,
      weightHeading: visualPreset === "studio-editorial" ? 760 : 700,
      weightBody: 400,
      fontSize: {
        hero: "clamp(42px, 7vw, 84px)",
        h1: "48px",
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
      notes: [conflict.summary],
    },
  };
}

function buildVisualTone(tags: string[], presetTags: string[], mode: TranslationMode, conflict: TranslationConflict): string[] {
  const hasIntensity = tags.some((tag) => ["energetic", "red", "passionate", "bold", "intense"].includes(tag));

  if (mode === "prefer_feeling") {
    return uniqueList([
      ...tags,
      ...(hasIntensity ? ["energetic", "bold", "passionate", "high-contrast"] : []),
      ...presetTags.slice(0, 2),
    ]).slice(0, 8);
  }

  if (mode === "prefer_visual") {
    return uniqueList([
      ...presetTags,
      ...(conflict.hasConflict ? ["selected-direction-priority"] : []),
      ...tags.slice(0, 2),
    ]).slice(0, 8);
  }

  if (conflict.hasConflict && hasIntensity) {
    return uniqueList(["warm", "focused", "confident", "restrained-energy", ...presetTags.slice(0, 3)]).slice(0, 8);
  }

  return uniqueList([...tags, ...presetTags]).slice(0, 8);
}

function detectConflict(options: {
  interpretedFeelingTags: string[];
  selectedVisualPreset: string;
  selectedColorPalette: string;
}): TranslationConflict {
  const tags = new Set(options.interpretedFeelingTags);
  const hasIntensity = ["energetic", "red", "passionate", "bold", "intense"].some((tag) => tags.has(tag));
  const hasDark = tags.has("dark");
  const reasons: string[] = [];
  let level: ConflictLevel = "none";

  if (hasIntensity && ["quiet-practical", "warm-minimal"].includes(options.selectedVisualPreset)) {
    level = "high";
    reasons.push("feelingText includes intense and passionate keywords");
    reasons.push(`selected visual preset is ${options.selectedVisualPreset}`);
  }

  if (hasIntensity && ["warm-neutral", "soft-ink"].includes(options.selectedColorPalette)) {
    level = "high";
    reasons.push(`selected color palette is ${options.selectedColorPalette}`);
  }

  if (hasDark && options.selectedColorPalette === "clear-light") {
    level = level === "high" ? "high" : "medium";
    reasons.push("feelingText suggests dark direction");
    reasons.push("selected color palette is clear-light");
  }

  return {
    hasConflict: level === "medium" || level === "high",
    level,
    summary: level === "none"
      ? "No significant conflict was detected."
      : "The feeling text suggests a different intensity than the selected visual direction.",
    reasons,
    suggestedModes: level === "none" ? ["harmonize"] : ["prefer_feeling", "harmonize"],
  };
}

function getPreset(id: string) {
  const presets: Record<string, { tags: string[]; headingStyle: string; bodyStyle: string; recommendedStack: string }> = {
    "quiet-practical": {
      tags: ["quiet", "practical", "spacious", "low-noise", "human"],
      headingStyle: "neutral-sans",
      bodyStyle: "system-sans",
      recommendedStack: "Inter, system-ui, sans-serif",
    },
    "warm-minimal": {
      tags: ["warm", "minimal", "quiet", "soft", "focused"],
      headingStyle: "humanist-sans",
      bodyStyle: "system-sans",
      recommendedStack: "Avenir Next, Yu Gothic, system-ui, sans-serif",
    },
    "studio-editorial": {
      tags: ["editorial", "structured", "confident", "spacious", "sharp"],
      headingStyle: "editorial-serif",
      bodyStyle: "neutral-sans",
      recommendedStack: "Georgia, Times New Roman, serif",
    },
    "clean-saas": {
      tags: ["clean", "systematic", "practical", "readable", "steady"],
      headingStyle: "neutral-sans",
      bodyStyle: "system-sans",
      recommendedStack: "Inter, system-ui, sans-serif",
    },
    "dark-calm": {
      tags: ["dark", "calm", "focused", "quiet", "low-noise"],
      headingStyle: "system-sans",
      bodyStyle: "system-sans",
      recommendedStack: "system-ui, sans-serif",
    },
    "natural-soft": {
      tags: ["natural", "soft", "warm", "organic", "human"],
      headingStyle: "humanist-sans",
      bodyStyle: "system-sans",
      recommendedStack: "Avenir Next, Hiragino Sans, system-ui, sans-serif",
    },
  };
  return presets[id] ?? presets["quiet-practical"];
}

function extractToneKeywords(feelingText: string): string[] {
  const source = feelingText.toLowerCase();
  const rules = [
    ["quiet", ["quiet", "calm", "静", "穏", "落ち着"]],
    ["spacious", ["space", "余白", "広", "ゆとり"]],
    ["practical", ["practical", "実務", "道具", "使いやす"]],
    ["warm", ["warm", "温", "あたた", "暖"]],
    ["minimal", ["minimal", "ミニマル", "最小"]],
    ["dark", ["dark", "暗", "黒"]],
    ["energetic", ["energetic", "energy", "熱血", "勢い", "エネルギ"]],
    ["red", ["red", "crimson", "真っ赤", "赤", "紅"]],
    ["passionate", ["passionate", "passion", "情熱", "熱い"]],
    ["bold", ["bold", "strong", "大胆", "力強", "太い"]],
    ["intense", ["intense", "aggressive", "激", "強烈"]],
  ] as const;

  return rules
    .filter(([, patterns]) => patterns.some((pattern) => source.includes(pattern)))
    .map(([tone]) => tone);
}

function getPalette(id: string): { name: string; colors: ColorTokens } {
  const palettes: Record<string, { name: string; colors: ColorTokens }> = {
    "quiet-charcoal": {
      name: "Quiet Charcoal",
      colors: {
        background: "#0B0D10",
        surface: "#151A20",
        text: "#F5F7FA",
        muted: "#9CA3AF",
        accent: "#C46A32",
        border: "#2A3038",
      },
    },
    "warm-neutral": {
      name: "Warm Neutral",
      colors: {
        background: "#F8F4EF",
        surface: "#FFFFFF",
        text: "#2D2924",
        muted: "#7C7167",
        accent: "#B7653F",
        border: "#E4DCD2",
      },
    },
    "soft-ink": {
      name: "Soft Ink",
      colors: {
        background: "#F5F7FA",
        surface: "#FFFFFF",
        text: "#17202A",
        muted: "#667085",
        accent: "#44566C",
        border: "#D9E0E8",
      },
    },
    "forest-calm": {
      name: "Forest Calm",
      colors: {
        background: "#F4F6F1",
        surface: "#FFFFFF",
        text: "#1F2A24",
        muted: "#687469",
        accent: "#5E744E",
        border: "#DDE4D7",
      },
    },
    "sand-minimal": {
      name: "Sand Minimal",
      colors: {
        background: "#F7F1E8",
        surface: "#FFFCF7",
        text: "#2E2B26",
        muted: "#81776A",
        accent: "#A66A3E",
        border: "#E4D9CB",
      },
    },
    "clear-light": {
      name: "Clear Light",
      colors: {
        background: "#FAFAF8",
        surface: "#FFFFFF",
        text: "#242321",
        muted: "#696A6A",
        accent: "#C46A32",
        border: "#E8E5DE",
      },
    },
  };

  return palettes[id] ?? palettes["warm-neutral"];
}

function uniqueList(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}

async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
