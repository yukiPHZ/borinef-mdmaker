interface Env {
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
}

interface PagesContext {
  request: Request;
  env: Env;
}

interface TranslatePayload {
  language?: "ja" | "en";
  feelingText?: string;
  selectedVisualPreset?: string;
  selectedColorPalette?: string;
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

  const fallback = buildFallbackStructure(payload);

  if (!context.env.OPENAI_API_KEY) {
    return jsonResponse({
      ok: true,
      source: "fallback",
      message: "fallback_used",
      structure: fallback,
    });
  }

  try {
    const aiStructure = await requestOpenAiStructure(context.env, payload, fallback);

    return jsonResponse({
      ok: true,
      source: "api",
      structure: {
        ...fallback,
        ...aiStructure,
        color: fallback.color,
      },
    });
  } catch {
    return jsonResponse({
      ok: true,
      source: "fallback",
      message: "fallback_used",
      structure: fallback,
    });
  }
}

async function requestOpenAiStructure(
  env: Env,
  payload: TranslatePayload,
  fallback: ReturnType<typeof buildFallbackStructure>,
): Promise<Record<string, unknown>> {
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
                "You are BORINEF Translation Engine. Translate human visual feeling into a concise AI-native design structure. Return JSON only. Preserve the selected palette tokens.",
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
                selectedVisualPreset: payload.selectedVisualPreset,
                selectedColorPalette: payload.selectedColorPalette,
                fallback,
              }),
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "design_structure",
          strict: false,
          schema: {
            type: "object",
            additionalProperties: true,
            properties: {
              visual_tone: {
                type: "array",
                items: { type: "string" },
              },
              layout: { type: "object", additionalProperties: true },
              spacing: { type: "object", additionalProperties: true },
              radius: { type: "object", additionalProperties: true },
              shadow: { type: "object", additionalProperties: true },
              motion: { type: "object", additionalProperties: true },
              typography: { type: "object", additionalProperties: true },
              components: { type: "object", additionalProperties: true },
            },
          },
        },
      },
      max_output_tokens: 1200,
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

  return JSON.parse(text) as Record<string, unknown>;
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

function buildFallbackStructure(payload: TranslatePayload) {
  const visualPreset = payload.selectedVisualPreset || "quiet-practical";
  const palette = getPalette(payload.selectedColorPalette || "warm-neutral");
  const tone = uniqueList([
    ...extractToneKeywords(payload.feelingText || ""),
    ...presetTags(visualPreset),
  ]).slice(0, 7);

  const spacingScale = visualPreset === "studio-editorial" || visualPreset === "clean-saas" ? "balanced" : "large";
  const density = visualPreset === "studio-editorial" || visualPreset === "clean-saas" ? "medium" : "low";
  const radius =
    visualPreset === "studio-editorial"
      ? { card: "4px", button: "4px", input: "4px" }
      : { card: "10px", button: "8px", input: "8px" };

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
      intensity: "soft",
      card: "0 10px 30px rgba(0,0,0,0.18)",
    },
    motion: {
      speed: "slow",
      style: "subtle-fade",
      duration: "600ms",
    },
    typography: {
      heading: "Inter",
      body: "Inter",
      weightHeading: 700,
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

function presetTags(id: string): string[] {
  const map: Record<string, string[]> = {
    "quiet-practical": ["quiet", "practical", "spacious", "low-noise", "human"],
    "warm-minimal": ["warm", "minimal", "quiet", "soft", "focused"],
    "studio-editorial": ["editorial", "structured", "confident", "spacious", "sharp"],
    "clean-saas": ["clean", "systematic", "practical", "readable", "steady"],
    "dark-calm": ["dark", "calm", "focused", "quiet", "low-noise"],
    "natural-soft": ["natural", "soft", "warm", "organic", "human"],
  };
  return map[id] ?? map["quiet-practical"];
}

function extractToneKeywords(feelingText: string): string[] {
  const source = feelingText.toLowerCase();
  const rules = [
    ["quiet", ["quiet", "calm", "静", "穏", "落ち着"]],
    ["spacious", ["space", "余白", "広", "ゆとり"]],
    ["practical", ["practical", "実務", "道具", "使いやす"]],
    ["warm", ["warm", "温", "あたた", "暖"]],
    ["minimal", ["minimal", "ミニマル", "最小"]],
    ["editorial", ["editorial", "編集", "雑誌"]],
    ["clean", ["clean", "clear", "清潔", "明快"]],
    ["dark", ["dark", "暗", "黒"]],
    ["natural", ["natural", "自然", "有機"]],
    ["soft", ["soft", "やわ", "柔"]],
    ["structured", ["structured", "構造", "整理"]],
    ["human", ["human", "人間", "人"]],
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
