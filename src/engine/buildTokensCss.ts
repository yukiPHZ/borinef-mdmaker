import type { DesignStructure } from "../types";

export function buildTokensCss(structure: DesignStructure): string {
  const { tokens } = structure.color;

  return `:root {
  --color-bg: ${tokens.background};
  --color-surface: ${tokens.surface};
  --color-text: ${tokens.text};
  --color-muted: ${tokens.muted};
  --color-accent: ${tokens.accent};
  --color-border: ${tokens.border};

  --space-section: ${structure.spacing.section};
  --space-container: ${structure.spacing.container};
  --space-card: ${structure.spacing.card};

  --radius-card: ${structure.radius.card};
  --radius-button: ${structure.radius.button};
  --radius-input: ${structure.radius.input};

  --shadow-card: ${structure.shadow.card};

  --font-heading: ${structure.typography.recommendedStack};
  --font-body: ${structure.typography.bodyStyle === "system-sans" ? "system-ui, sans-serif" : structure.typography.recommendedStack};

  --font-size-hero: ${structure.typography.fontSize.hero};
  --font-size-h1: ${structure.typography.fontSize.h1};
  --font-size-h2: ${structure.typography.fontSize.h2};
  --font-size-h3: ${structure.typography.fontSize.h3};
  --font-size-body: ${structure.typography.fontSize.body};
  --font-size-small: ${structure.typography.fontSize.small};

  --line-height-heading: ${structure.typography.lineHeight.heading};
  --line-height-body: ${structure.typography.lineHeight.body};
}
`;
}
