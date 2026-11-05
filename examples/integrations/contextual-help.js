import { createLink } from '../../dist/index.js';

// The host chooses its browser/WebView opening API. No native dependency in CyDoc.
export function bindContextualHelp(target, open, indexFile, locale = 'fr') {
  const listener = event => {
    if (event.key !== 'F1') return;
    event.preventDefault();
    const context = event.target?.closest?.('[data-help-page]');
    open(createLink({ locale, pageId: context?.dataset.helpPage || 'overview', anchor: context?.dataset.helpSection }, indexFile));
  };
  target.addEventListener('keydown', listener);
  return () => target.removeEventListener('keydown', listener);
}
