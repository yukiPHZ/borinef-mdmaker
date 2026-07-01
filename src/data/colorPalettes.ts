import type { ColorPalette } from "../types";

export const colorPalettes: ColorPalette[] = [
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
    id: "warm-neutral-deep",
    name: "Warm Neutral Deep",
    description: {
      ja: "少し深い紙色で、落ち着いた温度を出す。",
      en: "A deeper warm neutral with grounded paper-like calm.",
    },
    colors: {
      background: "#F3EDE4",
      surface: "#FFFFFF",
      text: "#24201B",
      muted: "#6B6055",
      accent: "#A6572E",
      border: "#DDD2C2",
    },
  },
  {
    id: "warm-paper",
    name: "Warm Paper",
    description: {
      ja: "紙の余白に近い、やさしい温かさ。",
      en: "Gentle paper warmth with quiet readable contrast.",
    },
    colors: {
      background: "#FBF8F3",
      surface: "#FFFFFF",
      text: "#322C25",
      muted: "#8A7F72",
      accent: "#C17A4A",
      border: "#ECE4D8",
    },
  },
  {
    id: "warm-clay",
    name: "Warm Clay",
    description: {
      ja: "土の温度を少し含んだ、柔らかな実用色。",
      en: "Soft clay warmth for practical, human screens.",
    },
    colors: {
      background: "#F6EEE6",
      surface: "#FFFDF9",
      text: "#2E2620",
      muted: "#7D6F60",
      accent: "#C1633B",
      border: "#E6D8C8",
    },
  },
  {
    id: "quiet-charcoal",
    name: "Quiet Charcoal",
    description: {
      ja: "明るい面にチャコールの芯を置く。",
      en: "A light surface with a quiet charcoal core.",
    },
    colors: {
      background: "#F5F3F1",
      surface: "#FFFFFF",
      text: "#1E1C1A",
      muted: "#7A756F",
      accent: "#B7653F",
      border: "#DAD5CF",
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
      background: "#F4F5F6",
      surface: "#FFFFFF",
      text: "#22262B",
      muted: "#6E7680",
      accent: "#4A5A6B",
      border: "#DDE1E5",
    },
  },
  {
    id: "deep-ink",
    name: "Deep Ink",
    description: {
      ja: "濃いインクの輪郭で、情報を引き締める。",
      en: "Deep ink contrast for focused information hierarchy.",
    },
    colors: {
      background: "#EFF1F3",
      surface: "#FFFFFF",
      text: "#14181C",
      muted: "#5A626C",
      accent: "#35465A",
      border: "#D2D7DC",
    },
  },
  {
    id: "slate-quiet",
    name: "Slate Quiet",
    description: {
      ja: "スレートの静けさで、画面を整える。",
      en: "Slate quietness for calm, ordered interfaces.",
    },
    colors: {
      background: "#F1F3F4",
      surface: "#FFFFFF",
      text: "#262B2E",
      muted: "#6F767B",
      accent: "#5C6B72",
      border: "#DADEE0",
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
      background: "#F1F4EF",
      surface: "#FFFFFF",
      text: "#1F2A1E",
      muted: "#6C7768",
      accent: "#4C6B48",
      border: "#DCE3D8",
    },
  },
  {
    id: "sage-quiet",
    name: "Sage Quiet",
    description: {
      ja: "セージの淡さで、圧を抜いた候補。",
      en: "Pale sage tones that soften pressure without losing order.",
    },
    colors: {
      background: "#F4F6F2",
      surface: "#FFFFFF",
      text: "#262E23",
      muted: "#767F6E",
      accent: "#6E8362",
      border: "#E0E5DC",
    },
  },
  {
    id: "moss-deep",
    name: "Moss Deep",
    description: {
      ja: "苔のような深さで、自然な重心を作る。",
      en: "A mossy depth that gives natural visual grounding.",
    },
    colors: {
      background: "#EFF2ED",
      surface: "#FFFFFF",
      text: "#1A2318",
      muted: "#626B5C",
      accent: "#3F5A38",
      border: "#D5DBD0",
    },
  },
  {
    id: "herb-fresh",
    name: "Herb Fresh",
    description: {
      ja: "少し新鮮な緑で、軽い活気を出す。",
      en: "A fresher green for light energy and clarity.",
    },
    colors: {
      background: "#F3F6F0",
      surface: "#FFFFFF",
      text: "#202B1D",
      muted: "#707A67",
      accent: "#5E8A4C",
      border: "#DDE4D6",
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
      background: "#F7F3EC",
      surface: "#FFFFFF",
      text: "#2A251E",
      muted: "#7D7264",
      accent: "#B08050",
      border: "#E8E0D2",
    },
  },
  {
    id: "desert-warm",
    name: "Desert Warm",
    description: {
      ja: "乾いた砂漠色で、温かい余白を作る。",
      en: "Dry desert warmth for spacious, low-noise layouts.",
    },
    colors: {
      background: "#F6F0E6",
      surface: "#FFFFFF",
      text: "#2C241C",
      muted: "#7E7161",
      accent: "#C1723F",
      border: "#E6DCC9",
    },
  },
  {
    id: "stone-quiet",
    name: "Stone Quiet",
    description: {
      ja: "石のような控えめさで、画面を安定させる。",
      en: "A quiet stone palette that stabilizes the screen.",
    },
    colors: {
      background: "#F3F2ED",
      surface: "#FFFFFF",
      text: "#262521",
      muted: "#767268",
      accent: "#8A7A62",
      border: "#DEDCD3",
    },
  },
  {
    id: "wheat-soft",
    name: "Wheat Soft",
    description: {
      ja: "麦色の柔らかさで、手触りを少し足す。",
      en: "Soft wheat warmth with a tactile undertone.",
    },
    colors: {
      background: "#F8F3E8",
      surface: "#FFFFFF",
      text: "#2E2820",
      muted: "#837763",
      accent: "#C08A4E",
      border: "#EAE1CF",
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
      background: "#FAFAF9",
      surface: "#FFFFFF",
      text: "#24211E",
      muted: "#7A756D",
      accent: "#B7653F",
      border: "#E5E3E0",
    },
  },
  {
    id: "cool-clarity",
    name: "Cool Clarity",
    description: {
      ja: "涼しい明快さで、信頼感を作る。",
      en: "Cool clarity for trustworthy, readable tools.",
    },
    colors: {
      background: "#F8FAFB",
      surface: "#FFFFFF",
      text: "#1E252B",
      muted: "#6D7680",
      accent: "#3E6280",
      border: "#E1E6EA",
    },
  },
  {
    id: "frost-quiet",
    name: "Frost Quiet",
    description: {
      ja: "霜のように薄い青みで、静けさを保つ。",
      en: "A frosted blue cast that keeps the interface quiet.",
    },
    colors: {
      background: "#F5F8FA",
      surface: "#FFFFFF",
      text: "#202A30",
      muted: "#6C7981",
      accent: "#4A7B93",
      border: "#DCE4E8",
    },
  },
  {
    id: "steel-soft",
    name: "Steel Soft",
    description: {
      ja: "柔らかな鋼色で、業務感を整える。",
      en: "Soft steel tones for a composed work surface.",
    },
    colors: {
      background: "#F4F6F7",
      surface: "#FFFFFF",
      text: "#232A2E",
      muted: "#6E767C",
      accent: "#556670",
      border: "#DBE0E3",
    },
  },
  {
    id: "ember-focus",
    name: "Ember Focus",
    description: {
      ja: "熾火色を少し強め、視線を作る。",
      en: "A stronger ember accent for focused attention.",
    },
    colors: {
      background: "#F8F4EF",
      surface: "#FFFFFF",
      text: "#2D2924",
      muted: "#7C7167",
      accent: "#D2612E",
      border: "#E4DCD2",
    },
  },
  {
    id: "plum-quiet",
    name: "Plum Quiet",
    description: {
      ja: "紫みを抑えて、静かな個性を出す。",
      en: "A restrained plum accent for quiet character.",
    },
    colors: {
      background: "#F5F2F5",
      surface: "#FFFFFF",
      text: "#262129",
      muted: "#756E79",
      accent: "#7A5470",
      border: "#E0DAE2",
    },
  },
  {
    id: "rust-confident",
    name: "Rust Confident",
    description: {
      ja: "錆色の強さで、抑えた自信を出す。",
      en: "Rust confidence with a grounded visual tone.",
    },
    colors: {
      background: "#F7F1EA",
      surface: "#FFFFFF",
      text: "#2B211A",
      muted: "#7C6C5F",
      accent: "#A84E2B",
      border: "#E5D9C9",
    },
  },
  {
    id: "sunset-muted",
    name: "Sunset Muted",
    description: {
      ja: "夕焼けの赤みを抑え、やわらかく見せる。",
      en: "Muted sunset warmth without loud contrast.",
    },
    colors: {
      background: "#F8F1EC",
      surface: "#FFFFFF",
      text: "#2D2320",
      muted: "#7E6E67",
      accent: "#C06B52",
      border: "#E6D9D0",
    },
  },
  {
    id: "deep-blue-focus",
    name: "Deep Blue Focus",
    description: {
      ja: "深い青で、信頼と集中を強める。",
      en: "Deep blue focus for trust-heavy interfaces.",
    },
    colors: {
      background: "#F2F5F9",
      surface: "#FFFFFF",
      text: "#17222E",
      muted: "#5A6A7A",
      accent: "#1D5AA8",
      border: "#D6E0EA",
    },
  },
  {
    id: "electric-trust",
    name: "Electric Trust",
    description: {
      ja: "鮮やかな青で、信頼と勢いを両立する。",
      en: "A brighter blue for confident trust and momentum.",
    },
    colors: {
      background: "#F0F5FC",
      surface: "#FFFFFF",
      text: "#16212F",
      muted: "#566577",
      accent: "#1E6FD9",
      border: "#D2E0F0",
    },
  },
  {
    id: "navy-confident",
    name: "Navy Confident",
    description: {
      ja: "濃紺で、判断の速い信頼感を出す。",
      en: "Confident navy for decisive, reliable products.",
    },
    colors: {
      background: "#EFF2F6",
      surface: "#FFFFFF",
      text: "#131C28",
      muted: "#52606F",
      accent: "#103D75",
      border: "#CFD8E2",
    },
  },
  {
    id: "sky-bold",
    name: "Sky Bold",
    description: {
      ja: "空色を強め、明るく大胆に見せる。",
      en: "A bolder sky blue for bright product confidence.",
    },
    colors: {
      background: "#F1F6FA",
      surface: "#FFFFFF",
      text: "#1B2733",
      muted: "#5D6C7C",
      accent: "#2E7BC4",
      border: "#D8E3ED",
    },
  },
  {
    id: "bold-ember",
    name: "Bold Ember",
    description: {
      ja: "強い熾火色で、赤い熱量を扱いやすくする。",
      en: "A bold ember accent that keeps red energy usable.",
    },
    colors: {
      background: "#F9F1EE",
      surface: "#FFFFFF",
      text: "#2B1A16",
      muted: "#7D6259",
      accent: "#C93F1E",
      border: "#EAD6CC",
    },
  },
  {
    id: "crimson-focus",
    name: "Crimson Focus",
    description: {
      ja: "深い赤で、集中と情熱を作る。",
      en: "Crimson focus for passionate, direct interfaces.",
    },
    colors: {
      background: "#F9EFEE",
      surface: "#FFFFFF",
      text: "#2A1614",
      muted: "#7C5C58",
      accent: "#C22B2B",
      border: "#EAD1CE",
    },
  },
  {
    id: "passion-deep",
    name: "Passion Deep",
    description: {
      ja: "情熱を深く抑えて、重心を作る。",
      en: "A deeper passion palette with controlled heat.",
    },
    colors: {
      background: "#F7EFEB",
      surface: "#FFFFFF",
      text: "#281813",
      muted: "#786058",
      accent: "#A83A24",
      border: "#E5D3CA",
    },
  },
  {
    id: "signal-red",
    name: "Signal Red",
    description: {
      ja: "信号色の赤で、強い行動感を出す。",
      en: "A clear signal red for decisive action emphasis.",
    },
    colors: {
      background: "#FAF0EF",
      surface: "#FFFFFF",
      text: "#2C1613",
      muted: "#7E5D58",
      accent: "#D62F1F",
      border: "#ECD3CE",
    },
  },
];

export function getColorPalette(id: string): ColorPalette {
  return colorPalettes.find((palette) => palette.id === id) ?? colorPalettes[0];
}
