import type { ColorPalette, LanguageCode, MakerState, VisualPreset } from "../types";
import { structureToYaml } from "./translateFeeling";

interface PromptOptions {
  state: MakerState;
  visualPreset: VisualPreset;
  colorPalette: ColorPalette;
}

export function buildDesignSummary(options: PromptOptions, language: LanguageCode): string {
  const { state, visualPreset, colorPalette } = options;

  if (language === "en") {
    return [
      "BORINEF Labs md maker export summary",
      "",
      `Maker: ${state.maker}`,
      `Visual preset: ${visualPreset.name}`,
      `Color palette: ${colorPalette.name}`,
      `Tone: ${state.structure.visual_tone.join(", ")}`,
      `Layout density: ${state.structure.layout.density}`,
      `Spacing: ${state.structure.spacing.scale}`,
      "",
      "Use design.md and tokens.json as the source of truth before making UI changes.",
    ].join("\n");
  }

  return [
    "BORINEF Labs md maker 出力サマリー",
    "",
    `Maker: ${state.maker}`,
    `ビジュアル: ${visualPreset.name}`,
    `カラー: ${colorPalette.name}`,
    `トーン: ${state.structure.visual_tone.join(", ")}`,
    `レイアウト密度: ${state.structure.layout.density}`,
    `余白: ${state.structure.spacing.scale}`,
    "",
    "UIを変更する前に、design.md と tokens.json を正本として読んでください。",
  ].join("\n");
}

export function buildTailwindMemo(options: PromptOptions): string {
  const { state } = options;
  const tokens = state.structure.color.tokens;

  return `# Tailwind Config Memo

This project export does not require Tailwind.
If Tailwind is introduced later, map the design tokens as follows.

\`\`\`js
theme: {
  extend: {
    colors: {
      bg: "${tokens.background}",
      surface: "${tokens.surface}",
      text: "${tokens.text}",
      muted: "${tokens.muted}",
      accent: "${tokens.accent}",
      border: "${tokens.border}"
    },
    spacing: {
      section: "${state.structure.spacing.section}",
      container: "${state.structure.spacing.container}",
      card: "${state.structure.spacing.card}"
    },
    borderRadius: {
      card: "${state.structure.radius.card}",
      button: "${state.structure.radius.button}",
      input: "${state.structure.radius.input}"
    },
    boxShadow: {
      card: "${state.structure.shadow.card}"
    }
  }
}
\`\`\`
`;
}

export function buildCodexPrompt(options: PromptOptions): string {
  return buildAgentPrompt("Codex", options);
}

export function buildClaudeCodePrompt(options: PromptOptions): string {
  return buildAgentPrompt("Claude Code", options);
}

export function buildCursorPrompt(options: PromptOptions): string {
  return buildAgentPrompt("Cursor", options);
}

function buildAgentPrompt(agentName: string, options: PromptOptions): string {
  const { state, visualPreset, colorPalette } = options;

  return `# ${agentName} UI Implementation Prompt

Read design.md before making visual changes.
Treat tokens.json and tokens.css as implementation constraints.

## Selected Direction

- Visual preset: ${visualPreset.name}
- Color palette: ${colorPalette.name}
- Maker: ${state.maker}

## AI Native Structure

\`\`\`yaml
${structureToYaml(state.structure)}
\`\`\`

## Working Rules

- Preserve the selected visual tone.
- Use the exported color tokens before inventing new colors.
- Keep layout calm, practical, readable, and low-noise.
- Avoid decorative card nesting and aggressive motion.
- If a local design system exists, map these tokens into that system instead of creating parallel styles.
`;
}
