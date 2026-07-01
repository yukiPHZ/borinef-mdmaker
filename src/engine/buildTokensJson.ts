import type { DesignStructure } from "../types";

export function buildTokensObject(structure: DesignStructure) {
  return {
    colors: structure.color.tokens,
    spacing: {
      section: structure.spacing.section,
      container: structure.spacing.container,
      card: structure.spacing.card,
      buttonX: "18px",
      buttonY: "10px",
    },
    radius: structure.radius,
    shadow: {
      card: structure.shadow.card,
    },
    typography: structure.typography,
    fontSize: structure.typography.fontSize,
    lineHeight: structure.typography.lineHeight,
    motion: {
      duration: structure.motion.duration,
      easing: "ease-out",
    },
  };
}

export function buildTokensJson(structure: DesignStructure): string {
  return `${JSON.stringify(buildTokensObject(structure), null, 2)}\n`;
}
