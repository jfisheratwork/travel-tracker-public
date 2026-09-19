export type ColorThemeId =
  | 'dunes-deep-lake'
  | 'classic-stone'
  | 'forest-ranger'
  | 'midnight-slate'
  | 'desert-sunset'
  | 'lake-forest'
  | 'dutch-orange'
  | 'alpine-orange';

export interface ColorThemeDefinition {
  id: ColorThemeId;
  name: string;
  description: string;
  swatches: [string, string, string]; // [headerBg, canvasBg, accentColor]
  canvasBg: string;
  headerBg: string;
  headerText: string;
  headerBorder: string;
  cardBg: string;
  cardBorder: string;
  accent: string;
  isDark?: boolean;
}

export const COLOR_THEMES: Record<ColorThemeId, ColorThemeDefinition> = {
  'dunes-deep-lake': {
    id: 'dunes-deep-lake',
    name: 'Dunes & Deep Lake',
    description: 'Lake Michigan navy blue with warm natural dune sandstone',
    swatches: ['#16384c', '#f5eee6', '#b4533c'],
    canvasBg: '#f5eee6',
    headerBg: '#16384c',
    headerText: '#ffffff',
    headerBorder: '#102b3b',
    cardBg: '#ffffff',
    cardBorder: '#e6ded4',
    accent: '#16384c',
  },
  'classic-stone': {
    id: 'classic-stone',
    name: 'Classic Stone & Clean Slate',
    description: 'Clean stone canvas with crisp white cards and emerald accents',
    swatches: ['#ffffff', '#fafaf9', '#16a34a'],
    canvasBg: '#fafaf9',
    headerBg: '#ffffff',
    headerText: '#1c1917',
    headerBorder: '#e7e5e4',
    cardBg: '#ffffff',
    cardBorder: '#e7e5e4',
    accent: '#16a34a',
  },
  'forest-ranger': {
    id: 'forest-ranger',
    name: 'Sage & Forest Ranger',
    description: 'Deep national park evergreen with soothing sage mist canvas',
    swatches: ['#1e3a2f', '#ebeee6', '#2d6a4f'],
    canvasBg: '#ebeee6',
    headerBg: '#1e3a2f',
    headerText: '#ffffff',
    headerBorder: '#162c23',
    cardBg: '#fcfdfa',
    cardBorder: '#d4ded7',
    accent: '#1e3a2f',
  },
  'midnight-slate': {
    id: 'midnight-slate',
    name: 'Midnight Slate (Dark)',
    description: 'Immersive dark cartography with luminous blue highlights',
    swatches: ['#1e293b', '#0f172a', '#38bdf8'],
    canvasBg: '#0f172a',
    headerBg: '#1e293b',
    headerText: '#f8fafc',
    headerBorder: '#334155',
    cardBg: '#1e293b',
    cardBorder: '#334155',
    accent: '#38bdf8',
    isDark: true,
  },
  'desert-sunset': {
    id: 'desert-sunset',
    name: 'Terracotta & Sandstone',
    description: 'Warm Southwest red rock clay and sunbaked parchment linen',
    swatches: ['#a84325', '#f6f1ea', '#d97706'],
    canvasBg: '#f6f1ea',
    headerBg: '#a84325',
    headerText: '#ffffff',
    headerBorder: '#88351c',
    cardBg: '#fdfcf9',
    cardBorder: '#e7dfd5',
    accent: '#a84325',
  },
  'lake-forest': {
    id: 'lake-forest',
    name: 'Lake Michigan & Forest',
    description: 'Deep lake water blue with soft forest mist and pine accents',
    swatches: ['#144265', '#dce8e1', '#1e5138'],
    canvasBg: '#dce8e1',
    headerBg: '#144265',
    headerText: '#ffffff',
    headerBorder: '#0f334f',
    cardBg: '#ffffff',
    cardBorder: '#cde0d6',
    accent: '#1e5138',
  },
  'dutch-orange': {
    id: 'dutch-orange',
    name: 'Vibrant Dutch Orange',
    description: 'Celebratory rich Dutch orange with warm linen cream canvas',
    swatches: ['#ea580c', '#fbf7f0', '#245a44'],
    canvasBg: '#fbf7f0',
    headerBg: '#ea580c',
    headerText: '#ffffff',
    headerBorder: '#c2410c',
    cardBg: '#ffffff',
    cardBorder: '#ebdcd0',
    accent: '#ea580c',
  },
  'alpine-orange': {
    id: 'alpine-orange',
    name: 'Alpine Pine & Dutch Accent',
    description: 'Crisp alpine pine mist with bold Dutch orange banner',
    swatches: ['#ea580c', '#e5ece7', '#1b663e'],
    canvasBg: '#e5ece7',
    headerBg: '#ea580c',
    headerText: '#ffffff',
    headerBorder: '#c2410c',
    cardBg: '#ffffff',
    cardBorder: '#d1ddd5',
    accent: '#1b663e',
  },
};

export const DEFAULT_THEME_ID: ColorThemeId = 'dunes-deep-lake';
export const AVAILABLE_THEMES_LIST: ColorThemeDefinition[] = Object.values(COLOR_THEMES);
