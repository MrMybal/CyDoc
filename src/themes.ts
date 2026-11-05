export const themes = [
  { id: 'light', fr: 'Clair', en: 'Light', color: '#237d65' },
  { id: 'dark', fr: 'Sombre', en: 'Dark', color: '#79d9b6' },
  { id: 'midnight', fr: 'Minuit', en: 'Midnight', color: '#a5a0ff' },
  { id: 'nord', fr: 'Nord', en: 'Nord', color: '#88c0d0' },
  { id: 'paper', fr: 'Papier', en: 'Paper', color: '#976749' },
  { id: 'contrast', fr: 'Contraste élevé', en: 'High contrast', color: '#ffe46b' }
] as const;
export function validTheme(value: string | null | undefined) { return themes.some(theme => theme.id === value); }
