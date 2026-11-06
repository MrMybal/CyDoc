/** Translation freshness is explicit: translations record the source revision they translated. */
export function translationReport(pages, { defaultLocale, locales }) {
  const originals = pages.filter(page => page.locale === defaultLocale && page.kind !== 'source');
  const report = { defaultLocale, missing: [], outdated: [], untracked: [], current: 0 };
  for (const original of originals) for (const locale of locales.filter(item => item.code !== defaultLocale)) {
    const translation = pages.find(page => page.id === original.id && page.locale === locale.code);
    const item = { id: original.id, title: original.title, locale: locale.code, expectedRevision: String(original.revision || '') };
    if (!translation) report.missing.push(item);
    else if (!translation.sourceRevision) report.untracked.push(item);
    else if (String(translation.sourceRevision) !== String(original.revision)) report.outdated.push({ ...item, translatedRevision: String(translation.sourceRevision) });
    else report.current++;
  }
  return report;
}
