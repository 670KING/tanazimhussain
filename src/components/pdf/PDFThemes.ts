// PDF Theme definitions for ultra-enhanced document generation

export type PDFTheme = 'academic' | 'modern' | 'cheatsheet' | 'dark' | 'minimal';

export interface ThemeConfig {
  id: PDFTheme;
  name: string;
  description: string;
  fonts: {
    title: string;
    body: string;
    code: string;
  };
  colors: {
    primary: [number, number, number];
    secondary: [number, number, number];
    text: [number, number, number];
    muted: [number, number, number];
    background: [number, number, number];
    accent: [number, number, number];
    code: [number, number, number];
    codeBg: [number, number, number];
  };
  layout: {
    margins: { top: number; right: number; bottom: number; left: number };
    lineHeight: number;
    fontSize: { title: number; h1: number; h2: number; h3: number; body: number; caption: number };
    columns: 1 | 2;
  };
  styling: {
    headerLine: boolean;
    footerLine: boolean;
    boxedHeaders: boolean;
    coloredHeaders: boolean;
    roundedBoxes: boolean;
  };
}

export const PDF_THEMES: Record<PDFTheme, ThemeConfig> = {
  academic: {
    id: 'academic',
    name: 'Academic',
    description: 'Professional serif fonts, formal headers, two-column layout option',
    fonts: {
      title: 'times',
      body: 'times',
      code: 'courier',
    },
    colors: {
      primary: [0, 0, 0],
      secondary: [60, 60, 60],
      text: [30, 30, 30],
      muted: [120, 120, 120],
      background: [255, 255, 255],
      accent: [0, 51, 102],
      code: [0, 80, 0],
      codeBg: [245, 245, 245],
    },
    layout: {
      margins: { top: 25, right: 25, bottom: 25, left: 25 },
      lineHeight: 1.6,
      fontSize: { title: 24, h1: 18, h2: 14, h3: 12, body: 11, caption: 9 },
      columns: 1,
    },
    styling: {
      headerLine: true,
      footerLine: true,
      boxedHeaders: false,
      coloredHeaders: false,
      roundedBoxes: false,
    },
  },
  modern: {
    id: 'modern',
    name: 'Modern Clean',
    description: 'Clean sans-serif design with accent colors and visual hierarchy',
    fonts: {
      title: 'helvetica',
      body: 'helvetica',
      code: 'courier',
    },
    colors: {
      primary: [45, 90, 180],
      secondary: [80, 80, 80],
      text: [40, 40, 40],
      muted: [140, 140, 140],
      background: [255, 255, 255],
      accent: [45, 90, 180],
      code: [230, 80, 60],
      codeBg: [248, 250, 252],
    },
    layout: {
      margins: { top: 20, right: 20, bottom: 20, left: 20 },
      lineHeight: 1.5,
      fontSize: { title: 28, h1: 20, h2: 16, h3: 13, body: 11, caption: 9 },
      columns: 1,
    },
    styling: {
      headerLine: false,
      footerLine: false,
      boxedHeaders: false,
      coloredHeaders: true,
      roundedBoxes: true,
    },
  },
  cheatsheet: {
    id: 'cheatsheet',
    name: 'Cheat Sheet',
    description: 'Compact layout, color-coded boxes, high information density',
    fonts: {
      title: 'helvetica',
      body: 'helvetica',
      code: 'courier',
    },
    colors: {
      primary: [80, 80, 80],
      secondary: [60, 60, 60],
      text: [30, 30, 30],
      muted: [100, 100, 100],
      background: [255, 255, 255],
      accent: [220, 80, 60],
      code: [0, 100, 150],
      codeBg: [255, 250, 240],
    },
    layout: {
      margins: { top: 15, right: 15, bottom: 15, left: 15 },
      lineHeight: 1.3,
      fontSize: { title: 18, h1: 14, h2: 12, h3: 10, body: 9, caption: 8 },
      columns: 2,
    },
    styling: {
      headerLine: false,
      footerLine: false,
      boxedHeaders: true,
      coloredHeaders: true,
      roundedBoxes: true,
    },
  },
  dark: {
    id: 'dark',
    name: 'Dark Mode',
    description: 'High-contrast dark theme for screen reading',
    fonts: {
      title: 'helvetica',
      body: 'helvetica',
      code: 'courier',
    },
    colors: {
      primary: [220, 220, 220],
      secondary: [180, 180, 180],
      text: [230, 230, 230],
      muted: [120, 120, 120],
      background: [30, 30, 35],
      accent: [100, 180, 255],
      code: [150, 220, 150],
      codeBg: [45, 45, 50],
    },
    layout: {
      margins: { top: 20, right: 20, bottom: 20, left: 20 },
      lineHeight: 1.5,
      fontSize: { title: 26, h1: 18, h2: 15, h3: 12, body: 11, caption: 9 },
      columns: 1,
    },
    styling: {
      headerLine: true,
      footerLine: true,
      boxedHeaders: false,
      coloredHeaders: true,
      roundedBoxes: true,
    },
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    description: 'Ultra-clean design with generous whitespace',
    fonts: {
      title: 'helvetica',
      body: 'helvetica',
      code: 'courier',
    },
    colors: {
      primary: [20, 20, 20],
      secondary: [80, 80, 80],
      text: [50, 50, 50],
      muted: [160, 160, 160],
      background: [255, 255, 255],
      accent: [20, 20, 20],
      code: [80, 80, 80],
      codeBg: [250, 250, 250],
    },
    layout: {
      margins: { top: 30, right: 30, bottom: 30, left: 30 },
      lineHeight: 1.8,
      fontSize: { title: 32, h1: 22, h2: 16, h3: 13, body: 11, caption: 9 },
      columns: 1,
    },
    styling: {
      headerLine: false,
      footerLine: false,
      boxedHeaders: false,
      coloredHeaders: false,
      roundedBoxes: false,
    },
  },
};

export function getTheme(id: PDFTheme): ThemeConfig {
  return PDF_THEMES[id] || PDF_THEMES.modern;
}
