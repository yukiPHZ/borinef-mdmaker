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

  --font-heading: ${structure.typography.heading}, system-ui, sans-serif;
  --font-body: ${structure.typography.body}, system-ui, sans-serif;
}
`;
}
