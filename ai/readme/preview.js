(() => {
  const labels = {
    en: {document:'Document',language:'Language',theme:'Theme',skip:'Skip to content',local:'Local convention example',notes:'Version notes',dark:'Dark',light:'Light',markdown:'Markdown file',agent:'AI instructions',convention:'Convention',limit:"The header uses a native HTML table with visible borders. No local column layout is added. Check the published GitHub rendering separately.",generated:'This separate example does not replace the root README or the human HTML manual.'},
    fr: {document:'Document',language:'Langue',theme:'Thème',skip:'Aller au contenu',local:'Exemple local de la convention',notes:'Notes de version',dark:'Sombre',light:'Clair',markdown:'Fichier Markdown',agent:'Instructions IA',convention:'Convention',limit:'L’en-tête utilise un tableau HTML natif avec ses bordures visibles. Aucune disposition locale en colonnes n’est ajoutée. Vérifier séparément le rendu publié sur GitHub.',generated:'Cet exemple séparé ne remplace ni le README principal ni le manuel HTML humain.'}
  };
  const params = new URLSearchParams(location.search);
  let language = params.get('lang') === 'fr' ? 'fr' : 'en';
  let kind = params.get('doc') === 'version' ? 'version' : 'readme';
  let theme = params.get('theme') === 'light' ? 'light' : 'dark';
  function render(changeUrl = true) {
    const filename = (kind === 'readme' ? 'README' : 'VERSION') + (language === 'fr' ? '.fr' : '') + '.md';
    document.documentElement.lang = language;
    document.documentElement.dataset.theme = theme;
    document.querySelectorAll('[data-page]').forEach(article => article.hidden = article.dataset.page !== kind + '-' + language);
    for (const [attribute,value] of [['kind',kind],['language',language],['theme',theme]]) document.querySelectorAll(`[data-${attribute}]`).forEach(button => button.setAttribute('aria-pressed',String(button.dataset[attribute] === value)));
    document.querySelectorAll('[data-label]').forEach(element => element.textContent = labels[language][element.dataset.label]);
    document.querySelectorAll('[data-label-aria]').forEach(element => element.setAttribute('aria-label',labels[language][element.dataset.labelAria]));
    document.querySelector('#filename').textContent = 'example/' + filename;
    document.querySelector('#markdown').href = './sources/ai/readme/example/' + filename;
    document.querySelector('#convention').href = './sources/ai/readme/README' + (language === 'fr' ? '.fr' : '') + '.md';
    document.title = 'CyDoc — ' + filename + (language === 'fr' ? ' · Exemple local' : ' · Local example');
    if (changeUrl) try {const url = new URL(location.href);url.searchParams.set('lang',language);url.searchParams.set('doc',kind);url.searchParams.set('theme',theme);url.hash='';history.replaceState(null,'',url);} catch {}
  }
  document.querySelectorAll('[data-kind]').forEach(button => button.addEventListener('click',()=>{kind=button.dataset.kind;render();window.scrollTo(0,0);}));
  document.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click',()=>{language=button.dataset.language;render();window.scrollTo(0,0);}));
  document.querySelectorAll('[data-theme]').forEach(button => button.addEventListener('click',()=>{theme=button.dataset.theme;render();}));
  document.querySelectorAll('[data-document]').forEach(link => link.addEventListener('click',event=>{event.preventDefault();kind=link.dataset.document;language=link.dataset.locale;render();window.scrollTo(0,0);}));
  render(false);
})();
