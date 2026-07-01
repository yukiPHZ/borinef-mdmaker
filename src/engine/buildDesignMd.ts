import type { ColorPalette, DesignStructure, MakerState, VisualPreset } from "../types";

interface BuildDesignMdOptions {
  state: MakerState;
  structure: DesignStructure;
  visualPreset: VisualPreset;
  colorPalette: ColorPalette;
}

export function buildDesignMd(options: BuildDesignMdOptions): string {
  const { state, structure, visualPreset, colorPalette } = options;
  const tokens = structure.color.tokens;
  const conflict = state.conflict;
  const conflictReasons = conflict?.reasons.length
    ? conflict.reasons.map((reason) => `- ${reason}`).join("\n")
    : "- No significant conflict was detected.";

  return `# Design Source of Truth

## Purpose

This document defines the visual direction for this project.
AI agents must read this file before making UI changes.

## Visual Tone

${structure.visual_tone.map((tone) => `- ${tone}`).join("\n")}

Selected visual preset: ${visualPreset.name}
Selected color palette: ${colorPalette.name}
Selected recommendation set: ${state.selectedRecommendationSet ?? "none"}
Customized from recommendation: ${state.isCustomizedFromRecommendation ? "yes" : "no"}
Translation mode: ${state.translationMode}
Interpreted feeling tags: ${state.interpretedFeelingTags.join(", ") || "none"}

## Color System

Use the selected color tokens as the source of truth.

- background: ${tokens.background}
- surface: ${tokens.surface}
- text: ${tokens.text}
- muted: ${tokens.muted}
- accent: ${tokens.accent}
- border: ${tokens.border}

## Typography

- heading style: ${structure.typography.headingStyle}
- body style: ${structure.typography.bodyStyle}
- recommended stack: ${structure.typography.recommendedStack}
- heading weight: ${structure.typography.weightHeading}
- body weight: ${structure.typography.weightBody}

## Type Scale

- hero: ${structure.typography.fontSize.hero}
- h1: ${structure.typography.fontSize.h1}
- h2: ${structure.typography.fontSize.h2}
- h3: ${structure.typography.fontSize.h3}
- body: ${structure.typography.fontSize.body}
- small: ${structure.typography.fontSize.small}
- heading line-height: ${structure.typography.lineHeight.heading}
- body line-height: ${structure.typography.lineHeight.body}

## Layout

- density: ${structure.layout.density}
- max width: ${structure.layout.max_width}
- rhythm: ${structure.layout.rhythm}

## Responsive Behavior

- Keep the primary content readable on mobile before adding side-by-side layout.
- Use a single-column flow below tablet widths.
- Preserve touch targets of at least 44px height.
- Avoid horizontal scrolling caused by code blocks, long labels, or fixed-width panels.

## Spacing

- scale: ${structure.spacing.scale}
- section: ${structure.spacing.section}
- container: ${structure.spacing.container}
- card: ${structure.spacing.card}

Use generous spacing when the intent is quiet or spacious.
Avoid dense layouts unless the selected structure explicitly asks for compact density.

## Border Radius

- card: ${structure.radius.card}
- button: ${structure.radius.button}
- input: ${structure.radius.input}

## Shadow

- intensity: ${structure.shadow.intensity}
- card: ${structure.shadow.card}

## Motion

- speed: ${structure.motion.speed}
- style: ${structure.motion.style}
- duration: ${structure.motion.duration}

Use slow and subtle transitions.
Avoid aggressive animations.

## Components

- buttons: ${structure.components.buttons}
- cards: ${structure.components.cards}
- forms: ${structure.components.forms}

## Accessibility

- Maintain visible focus states for every interactive element.
- Keep text contrast readable against the selected surface and background colors.
- Do not rely on color alone to communicate state.
- Pair icon-only controls with accessible labels.
- Respect reduced-motion preferences.

## Interaction States

- Hover states should be quiet and restrained.
- Focus states should be clear but not visually aggressive.
- Disabled states should remain readable and visibly inactive.
- Loading or pending states should not shift the surrounding layout.

## Implementation Guardrails

- Map these tokens into the existing design system before creating new style primitives.
- Keep changes incremental and reviewable.
- Avoid unrelated layout rewrites when applying this visual source of truth.
- Do not introduce a parallel color palette.
- Do not add decorative gradients or noisy motion unless explicitly required by the selected tone.

## Conflict Resolution Notes

- conflict level: ${conflict?.level ?? "none"}
- translation mode: ${state.translationMode}
- summary: ${conflict?.summary ?? "No significant conflict was detected."}

${conflictReasons}

${structure.translation.notes.map((note) => `- ${note}`).join("\n")}

## Do

- Keep layouts calm and readable.
- Use clear hierarchy.
- Preserve whitespace.
- Treat the color tokens as the source of truth.
- Keep interactions practical and low-noise.

## Don't

- Do not introduce random accent colors.
- Do not use aggressive gradients.
- Do not reduce spacing without reason.
- Do not add noisy animations.
- Do not nest decorative cards inside other cards.

## Agent Instructions

Before editing UI, read this document.
Treat colors, spacing, radius, typography, and motion as source-of-truth decisions.
When a design choice is unclear, preserve the selected visual tone before adding new styling.
`;
}
