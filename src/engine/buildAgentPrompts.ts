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
    },
    fontSize: {
      hero: "${state.structure.typography.fontSize.hero}",
      h1: "${state.structure.typography.fontSize.h1}",
      h2: "${state.structure.typography.fontSize.h2}",
      h3: "${state.structure.typography.fontSize.h3}",
      body: "${state.structure.typography.fontSize.body}",
      small: "${state.structure.typography.fontSize.small}"
    },
    lineHeight: {
      heading: "${state.structure.typography.lineHeight.heading}",
      body: "${state.structure.typography.lineHeight.body}"
    }
  }
}
\`\`\`
`;
}

export function buildCodexPrompt(options: PromptOptions): string {
  return `# Codex UI Implementation Prompt

## Role

You are working inside an existing code repository.
Use \`design.md\` and design tokens as the visual source of truth.

${buildSelectedDirection(options)}

${buildAiNativeStructure(options.state)}

## Before Editing

- Inspect the existing repository structure.
- Identify the current framework, styling method, and build commands.
- Do not replace the current stack without approval.
- Read existing UI components before making changes.

## Implementation Rules

- Apply design tokens incrementally.
- Prefer small, reviewable changes.
- Do not introduce a second design system.
- Do not rewrite unrelated files.
- Keep behavior unchanged unless explicitly requested.

## Verification

Run the available checks, such as:

- type-check
- lint
- build

If exact commands are unknown, inspect \`package.json\`.

## Final Report

Report:

- changed files
- summary of visual changes
- commands run
- verification result
- any remaining risks
`;
}

export function buildClaudeCodePrompt(options: PromptOptions): string {
  return `# Claude Code UI Planning Prompt

## Role

You are helping apply a visual source of truth to an existing project.
Read \`design.md\`, tokens, and existing implementation before broad changes.

${buildSelectedDirection(options)}

${buildAiNativeStructure(options.state)}

## Planning First

Before editing, provide a short plan:

- what will change
- which files are likely affected
- what will not be changed
- risks or assumptions

## Implementation Principles

- Preserve existing behavior.
- Avoid broad rewrites.
- Keep changes reversible.
- Explain tradeoffs when multiple approaches exist.
- Respect the selected visual tone and conflict resolution notes.

## Review

After implementation, summarize:

- how the design source of truth was applied
- where tokens were used
- any deviations from the source of truth
- recommended follow-up
`;
}

export function buildCursorPrompt(options: PromptOptions): string {
  return `# Cursor Persistent Design Context

## How to Use

Keep this prompt as persistent project context.
Use it when editing UI files, components, styles, and layout.

${buildSelectedDirection(options)}

${buildAiNativeStructure(options.state)}

## Context Rules

- Treat \`design.md\` as the source of truth.
- Prefer existing components and styles.
- Apply tokens gradually.
- Do not create parallel styling systems.
- Keep changes file-scoped when possible.

## Editing Guidance

When editing:

- update nearby styles before creating new abstractions
- preserve naming conventions
- avoid unrelated refactors
- keep visual changes consistent across similar components

## Review Checklist

Before finishing, check:

- colors match tokens
- spacing follows the scale
- focus states exist
- mobile layout still works
- no random accent colors were introduced
`;
}

function buildSelectedDirection(options: PromptOptions): string {
  const { state, visualPreset, colorPalette } = options;

  return `## Selected Direction

- Visual preset: ${visualPreset.name}
- Color palette: ${colorPalette.name}
- Maker: ${state.maker}
- Translation mode: ${state.translationMode}
- Conflict level: ${state.conflict?.level ?? "none"}
- Interpreted feeling tags: ${state.interpretedFeelingTags.join(", ") || "none"}
`;
}

function buildAiNativeStructure(state: MakerState): string {
  return `## AI Native Structure

\`\`\`yaml
${structureToYaml(state.structure)}
\`\`\`
`;
}
