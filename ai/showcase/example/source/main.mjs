import { copy, media } from './content.mjs';

let language = new URL(location.href).searchParams.get('lang') === 'fr' ? 'fr' : 'en';
let activeMedia = media[0];
const strings = () => copy[language];
const dialog = document.querySelector('#lightbox');
const picture = document.querySelector('#lightbox-image');
const caption = document.querySelector('#lightbox-caption');
let openedBy;
let currentShot = 0;
let shots = [];

function documentationUrl(target) {
  const [page, anchor] = target.split('#');
  return `./manual/Documentation.html#/${language}/${encodeURIComponent(page)}${anchor ? '/' + encodeURIComponent(anchor) : ''}`;
}

function localize() {
  const messages = strings();
  document.documentElement.lang = language;
  document.title = messages['meta.title'];
  document.querySelector('meta[name="description"]').content = messages['meta.description'];
  document.querySelector('meta[property="og:title"]').content = messages['meta.title'];
  document.querySelector('meta[property="og:description"]').content = messages['meta.description'];
  document.querySelectorAll('[data-i18n]').forEach(element => { element.textContent = messages[element.dataset.i18n]; });
  document.querySelectorAll('[data-i18n-label]').forEach(element => { element.setAttribute('aria-label', messages[element.dataset.i18nLabel]); });
  document.querySelectorAll('[data-i18n-alt]').forEach(element => { element.alt = messages[element.dataset.i18nAlt]; });
  document.querySelectorAll('[data-doc]').forEach(element => { element.href = documentationUrl(element.dataset.doc); });
  document.querySelectorAll('[data-lang]').forEach(element => { element.setAttribute('aria-pressed', String(element.dataset.lang === language)); });
  document.querySelector('[data-localized-shot]').src = `./assets/screenshots/studio-visual${language === 'fr' ? '-fr' : ''}.webp`;
  document.querySelectorAll('[data-shot]').forEach(element => { element.setAttribute('aria-label', `${messages['lightbox.open']}: ${messages[element.dataset.caption]}`); });
  queueChapterUpdate();
}

function chooseMedia(item, { focus = false } = {}) {
  activeMedia = item;
  const heading = document.querySelector('#media-title-current');
  const body = document.querySelector('#media-body-current');
  const panel = document.querySelector('#media-panel');
  heading.dataset.i18n = `media.${item.id}.title`;
  body.dataset.i18n = `media.${item.id}.body`;
  panel.setAttribute('aria-labelledby', `media-tab-${item.id}`);
  panel.querySelector('a[data-doc]').dataset.doc = item.doc;
  const image = panel.querySelector('.shot img');
  image.src = `./assets/screenshots/${item.image}.webp`;
  image.dataset.i18nAlt = `media.${item.id}.body`;
  panel.querySelector('[data-shot]').dataset.caption = `media.${item.id}.title`;
  panel.querySelector('figcaption [data-i18n]').dataset.i18n = `media.${item.id}.title`;
  panel.querySelector('.mesh-modes').hidden = item.id !== 'mesh';
  panel.querySelectorAll('[data-mesh-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.meshMode === 'pbr')));
  document.querySelectorAll('[data-media]').forEach(button => {
    const selected = button.dataset.media === item.id;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
    if (selected && focus) button.focus();
  });
  localize();
}

function setLanguage(value) {
  language = value === 'fr' ? 'fr' : 'en';
  const url = new URL(location.href);
  url.searchParams.set('lang', language);
  history.replaceState(null, '', url);
  localize();
}

function showShot(index) {
  currentShot = (index + shots.length) % shots.length;
  const target = shots[currentShot];
  const image = target.querySelector('img');
  picture.src = target.dataset.zoomSrc || image.src;
  picture.alt = image?.alt || strings()['theme.alt'];
  caption.textContent = strings()[target.dataset.caption];
  document.querySelector('#lightbox-count').textContent = `${currentShot + 1} / ${shots.length}`;
}

function openShot(target) {
  openedBy = target;
  shots = [...document.querySelectorAll('[data-shot], [data-zoom-src]')].filter(element => element.getClientRects().length);
  showShot(shots.indexOf(target));
  dialog.showModal();
  document.querySelector('[data-lightbox-close]').focus();
}

const menu = document.querySelector('.menu-button');
function closeMenu() {
  menu.setAttribute('aria-expanded', 'false');
  document.querySelector('#primary-nav').dataset.open = 'false';
}
document.addEventListener('click', event => {
  const languageButton = event.target.closest('[data-lang]');
  if (languageButton) setLanguage(languageButton.dataset.lang);
  const shot = event.target.closest('[data-shot], [data-zoom-src]');
  if (shot) openShot(shot);
  const mediaButton = event.target.closest('[data-media]');
  if (mediaButton) chooseMedia(media.find(item => item.id === mediaButton.dataset.media));
  const meshMode = event.target.closest('[data-mesh-mode]');
  if (meshMode && activeMedia.id === 'mesh') {
    document.querySelector('#media-panel .shot img').src = `./assets/screenshots/reader-mesh${meshMode.dataset.meshMode === 'wire' ? '-wire' : ''}.webp`;
    document.querySelectorAll('[data-mesh-mode]').forEach(button => button.setAttribute('aria-pressed', String(button === meshMode)));
  }
  if (event.target.closest('#primary-nav a')) closeMenu();
});
menu.addEventListener('click', () => {
  const expanded = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(expanded));
  document.querySelector('#primary-nav').dataset.open = String(expanded);
});
document.querySelector('[role="tablist"]').addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  let index = media.indexOf(activeMedia);
  if (event.key === 'Home') index = 0;
  else if (event.key === 'End') index = media.length - 1;
  else index = (index + (event.key === 'ArrowRight' ? 1 : -1) + media.length) % media.length;
  chooseMedia(media[index], { focus: true });
});
document.querySelector('[data-lightbox-close]').addEventListener('click', () => dialog.close());
document.querySelector('[data-lightbox-prev]').addEventListener('click', () => showShot(currentShot - 1));
document.querySelector('[data-lightbox-next]').addEventListener('click', () => showShot(currentShot + 1));
dialog.addEventListener('keydown', event => {
  if (event.key === 'Tab') {
    const controls = [...dialog.querySelectorAll('button:not(:disabled)')];
    const index = controls.indexOf(document.activeElement);
    event.preventDefault();
    controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length]?.focus();
    return;
  }
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    showShot(currentShot + (event.key === 'ArrowRight' ? 1 : -1));
  }
});
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});
dialog.addEventListener('close', () => {
  picture.removeAttribute('src');
  openedBy?.focus({ preventScroll: true });
});
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !dialog.open) closeMenu(); });

const comparison = document.querySelector('.theme-comparison');
const range = document.querySelector('#theme-range');
function updateComparison(value) {
  range.value = String(Math.max(0, Math.min(100, value)));
  comparison.style.setProperty('--split', `${range.value}%`);
}
range.addEventListener('input', () => updateComparison(Number(range.value)));
const divider = document.querySelector('.compare-divider');
let dragging = false;
function dragComparison(event) {
  const rect = comparison.querySelector('.compare-images').getBoundingClientRect();
  updateComparison((event.clientX - rect.left) / rect.width * 100);
}
divider.addEventListener('pointerdown', event => { if (event.button !== 0) return; dragging = true; divider.setPointerCapture(event.pointerId); dragComparison(event); });
divider.addEventListener('pointermove', event => { if (dragging) dragComparison(event); });
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) divider.addEventListener(type, () => { dragging = false; });

const chapterLinks = [...document.querySelectorAll('[data-chapter]')];
const observedSections = chapterLinks.map(link => document.getElementById(link.dataset.chapter));
let chapterFrame = false;
function updateActiveChapter() {
  chapterFrame = false;
  const threshold = document.querySelector('.site-header').offsetHeight + document.querySelector('.chapters').offsetHeight + 24;
  let active;
  for (const section of observedSections) if (section.getBoundingClientRect().top <= threshold) active = section;
  chapterLinks.forEach(link => {
    if (link.dataset.chapter === active?.id) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  });
}
function queueChapterUpdate() { if (!chapterFrame) { chapterFrame = true; requestAnimationFrame(updateActiveChapter); } }
window.addEventListener('scroll', queueChapterUpdate, { passive: true });
window.addEventListener('resize', queueChapterUpdate);
window.addEventListener('popstate', () => { language = new URL(location.href).searchParams.get('lang') === 'fr' ? 'fr' : 'en'; localize(); });
localize();
queueChapterUpdate();
