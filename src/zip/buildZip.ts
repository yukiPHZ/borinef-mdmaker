import JSZip from "jszip";
import { getColorPalette } from "../data/colorPalettes";
import { getVisualPreset } from "../data/visualPresets";
import {
  buildClaudeCodePrompt,
  buildCodexPrompt,
  buildCursorPrompt,
  buildDesignSummary,
  buildTailwindMemo,
} from "../engine/buildAgentPrompts";
import { buildDesignMd } from "../engine/buildDesignMd";
import { buildSettingsJson } from "../engine/buildSettingsJson";
import { buildTokensCss } from "../engine/buildTokensCss";
import { buildTokensJson } from "../engine/buildTokensJson";
import type { GeneratedFiles, MakerState } from "../types";

export const exportZipFileName = "borinef-design-md-export.zip";

export function buildGeneratedFiles(state: MakerState): GeneratedFiles {
  const visualPreset = getVisualPreset(state.selectedVisualPreset);
  const colorPalette = getColorPalette(state.selectedColorPalette);
  const promptOptions = { state, visualPreset, colorPalette };

  return {
    "design.md": buildDesignMd({
      state,
      structure: state.structure,
      visualPreset,
      colorPalette,
    }),
    "design-summary.txt": buildDesignSummary(promptOptions, state.language),
    "tokens.json": buildTokensJson(state.structure),
    "tokens.css": buildTokensCss(state.structure),
    "tailwind.config.memo.md": buildTailwindMemo(promptOptions),
    "codex-prompt.md": buildCodexPrompt(promptOptions),
    "claude-code-prompt.md": buildClaudeCodePrompt(promptOptions),
    "cursor-prompt.md": buildCursorPrompt(promptOptions),
    "settings.json": buildSettingsJson(state),
  };
}

export async function buildExportZip(files: GeneratedFiles): Promise<Blob> {
  const zip = new JSZip();

  Object.entries(files).forEach(([fileName, content]) => {
    zip.file(fileName, content);
  });

  return zip.generateAsync({ type: "blob" });
}

export async function downloadExportZip(state: MakerState): Promise<void> {
  const files = buildGeneratedFiles(state);
  const blob = await buildExportZip(files);
  downloadBlob(blob, exportZipFileName);
}

export function downloadTextFile(fileName: string, content: string, type = "text/plain"): void {
  downloadBlob(new Blob([content], { type }), fileName);
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
