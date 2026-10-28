// Kartstil per tema (K4) — OpenFreeMap, se docs/kartval.md
// Appen har i dag bara ett mörkt tema; ljus stil används om html får data-theme="light".

export type MapTheme = 'dark' | 'light'

export const MAP_STYLES: Record<MapTheme, string> = {
  dark: 'https://tiles.openfreemap.org/styles/dark',
  light: 'https://tiles.openfreemap.org/styles/positron',
}

// Bakgrunden i den mörka stilen tonas till appens bakgrund så att kartan smälter in
export const DARK_MAP_BACKGROUND = '#1a1a18'

export function mapThemeFromDocument(root: { dataset: { theme?: string } }): MapTheme {
  return root.dataset.theme === 'light' ? 'light' : 'dark'
}
