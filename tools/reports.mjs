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

export function reportPage(report, locale) {
  const fr = locale.startsWith('fr'), t = (a,b) => fr ? a : b;
  const list = items => items.length ? items.map(item => `- [${item.title.replaceAll('[','').replaceAll(']','')}](doc:${item.id}) · \`${item.locale}\`${item.translatedRevision ? ` · ${item.translatedRevision} → ${item.expectedRevision}` : ''}`).join('\n') : t('Aucune.', 'None.');
  return { id:'translation-report',locale,title:t('État des traductions','Translation status'),description:t('Rapport généré : traductions manquantes, dépassées ou sans révision source.','Generated report: missing, outdated, or untracked translations.'),section:t('Maintenance','Maintenance'),order:290,markdown:`${t('Le rapport compare les révisions déclarées ; il ne juge pas la qualité d’une traduction.','This report compares declared revisions; it does not judge translation quality.')}\n\n## ${t('Traductions manquantes','Missing translations')} {#missing}\n\n${list(report.missing)}\n\n## ${t('Traductions à mettre à jour','Outdated translations')} {#outdated}\n\n${list(report.outdated)}\n\n## ${t('Révision non renseignée','Untracked revision')} {#untracked}\n\n${list(report.untracked)}\n\n## ${t('Suivre une traduction','Track a translation')} {#tracking}\n\n${t('Ajoutez `revision: 2` à la page d’origine et `sourceRevision: 2` à sa traduction. Changez la révision d’origine quand le sens évolue. Sans révision explicite, le générateur utilise une empreinte du contenu.','Add `revision: 2` to the original page and `sourceRevision: 2` to its translation. Update the original revision when its meaning changes. Without an explicit revision, the generator uses a content fingerprint.')}\n` };
}
