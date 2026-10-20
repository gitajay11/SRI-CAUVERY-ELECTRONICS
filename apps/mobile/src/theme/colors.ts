import { useColorScheme } from 'react-native';

/**
 * The website's palette (packages/core/styles/theme.css), as the app needs
 * it. Gold on warm neutrals; the dark scheme is the website's dark theme.
 * Keep the two in step when either changes.
 */

const light = {
  canvas: '#ffffff',
  surface: '#ffffff',
  raised: '#faf8f3',
  sunken: '#f5f2ea',
  border: '#efede7',
  borderStrong: '#ded9cf',
  text: '#14110c',
  textMuted: '#635d4f',
  textFaint: '#78715f',
  action: '#ddb965',
  actionPressed: '#cba24a',
  onAction: '#14110c',
  link: '#8a6a19',
  accentSoft: '#fffaf0',
  danger: '#b23b2c',
  dangerSoft: '#fdeeec',
};

export type Palette = typeof light;

const dark: Palette = {
  canvas: '#0b0906',
  surface: '#14110c',
  raised: '#1c1913',
  sunken: '#080604',
  border: '#232019',
  borderStrong: '#322e26',
  text: '#f7f3e9',
  textMuted: '#b3ab97',
  textFaint: '#9a927f',
  action: '#ddb965',
  actionPressed: '#ecd087',
  onAction: '#14110c',
  link: '#e2c477',
  accentSoft: '#241d0d',
  danger: '#e08a7c',
  dangerSoft: '#2c1512',
};

export const palettes = { light, dark } as const;

export function useColors(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, card: 16, pill: 999 } as const;
