export { themes } from '../../dist/themes.js';
import { themes } from '../../dist/themes.js';
export const themeIds = themes.map(theme => theme.id);
const legacy = { 'light-grey': 'light', 'mid-grey': 'dark',navy:'nord',violet:'midnight','amber-night':'paper' };
const tokens = ['--bg', '--panel', '--raised', '--text', '--muted', '--line', '--accent', '--accent-soft', '--danger'];
export function applyTheme(value) {
  const theme = legacy[value] || value;
  const selected = themeIds.includes(theme) ? theme : 'dark';
  const root = document.documentElement;
  // Older native builds injected inline palette values, which override CSS themes.
  for (const token of tokens) root.style.removeProperty(token);
  root.dataset.theme = selected;
  root.style.colorScheme = ['light','paper'].includes(selected) ? 'light' : 'dark';
  localStorage.setItem('cydoc-studio-theme', selected);
  return selected;
}
