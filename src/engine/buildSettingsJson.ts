import type { MakerState } from "../types";

export function buildSettingsJson(state: MakerState): string {
  return `${JSON.stringify(state, null, 2)}\n`;
}
