import type { ColorPalette } from "../types";

export const colorPalettes: ColorPalette[] = [
  {
    id: "quiet-charcoal",
    name: "Quiet Charcoal",
    description: {
      ja: "チャコールに熾火色を少しだけ入れる。",
      en: "Charcoal foundation with a restrained ember accent.",
    },
    colors: {
      background: "#0B0D10",
      surface: "#151A20",
      text: "#F5F7FA",
      muted: "#9CA3AF",
      accent: "#C46A32",
      border: "#2A3038",
    },
  },
  {
    id: "warm-neutral",
    name: "Warm Neutral",
    description: {
      ja: "白に近い背景と、あたたかいニュートラル。",
      en: "Near-white background with warm neutral depth.",
    },
    colors: {
      background: "#F8F4EF",
      surface: "#FFFFFF",
      text: "#2D2924",
      muted: "#7C7167",
      accent: "#B7653F",
      border: "#E4DCD2",
    },
  },
  {
    id: "soft-ink",
    name: "Soft Ink",
    description: {
      ja: "墨のような文字色で、清潔だけど青すぎない。",
      en: "Ink-like clarity that stays clean without becoming too blue.",
    },
    colors: {
      background: "#F5F7FA",
      surface: "#FFFFFF",
      text: "#17202A",
      muted: "#667085",
      accent: "#44566C",
      border: "#D9E0E8",
    },
  },
  {
    id: "forest-calm",
    name: "Forest Calm",
    description: {
      ja: "淡い緑と深い文字色。落ち着いた制作環境向け。",
      en: "Soft greens and grounded text for calm making environments.",
    },
    colors: {
      background: "#F4F6F1",
      surface: "#FFFFFF",
      text: "#1F2A24",
      muted: "#687469",
      accent: "#5E744E",
      border: "#DDE4D7",
    },
  },
  {
    id: "sand-minimal",
    name: "Sand Minimal",
    description: {
      ja: "砂色の余白。最小限で乾いた静けさ。",
      en: "Sandy whitespace with dry, quiet minimalism.",
    },
    colors: {
      background: "#F7F1E8",
      surface: "#FFFCF7",
      text: "#2E2B26",
      muted: "#81776A",
      accent: "#A66A3E",
      border: "#E4D9CB",
    },
  },
  {
    id: "clear-light",
    name: "Clear Light",
    description: {
      ja: "明るく読みやすい。BORINEFの熾火色だけを残す。",
      en: "Bright and readable, keeping only the BORINEF ember accent.",
    },
    colors: {
      background: "#FAFAF8",
      surface: "#FFFFFF",
      text: "#242321",
      muted: "#696A6A",
      accent: "#C46A32",
      border: "#E8E5DE",
    },
  },
];

export function getColorPalette(id: string): ColorPalette {
  return colorPalettes.find((palette) => palette.id === id) ?? colorPalettes[0];
}
