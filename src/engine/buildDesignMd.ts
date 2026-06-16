import type { ColorPalette, DesignStructure, VisualPreset } from "../types";

interface BuildDesignMdOptions {
  structure: DesignStructure;
  visualPreset: VisualPreset;
  colorPalette: ColorPalette;
}

export function buildDesignMd(options: BuildDesignMdOptions): string {
  const { structure, visualPreset, colorPalette } = options;
  const tokens = structure.color.tokens;

  return `# Design Source of Truth

## Purpose

This document defines the visual direction for this project.
AI agents must read this file before making UI changes.

## Visual Tone

${structure.visual_tone.map((tone) => `- ${tone}`).join("\n")}

Selected visual preset: ${visualPreset.name}
Selected color palette: ${colorPalette.name}

## Color System

Use the selected color tokens as the source of truth.

- background: ${tokens.background}
- surface: ${tokens.surface}
- text: ${tokens.text}
- muted: ${tokens.muted}
- accent: ${tokens.accent}
- border: ${tokens.border}

## Typography

- heading: ${structure.typography.heading}
- body: ${structure.typography.body}
- heading weight: ${structure.typography.weightHeading}
- body weight: ${structure.typography.weightBody}

## Layout

- density: ${structure.layout.density}
- max width: ${structure.layout.max_width}
- rhythm: ${structure.layout.rhythm}

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
