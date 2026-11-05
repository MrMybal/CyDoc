import { activateTab } from './reader-tools.js';

const readingDetails = (root: HTMLElement) => [...root.querySelectorAll<HTMLDetailsElement>('main details')].filter(element => !element.closest('.cy-media,[data-cydoc-module]'));

/** Small UI snapshots; media readers are still disposed when leaving a page. */
export function captureReadingView(root: HTMLElement) {
  return {
    top: window.scrollY, left: window.scrollX,
    tabs: [...root.querySelectorAll<HTMLElement>('[data-tabs] [role=tab][aria-selected=true]')].map(tab => tab.id),
    details: readingDetails(root).map(element => element.open),
    code: [...root.querySelectorAll<HTMLElement>('main pre')].map(element => ({ left: element.scrollLeft, top: element.scrollTop }))
  };
}
export function restoreReadingView(root: HTMLElement, view: ReturnType<typeof captureReadingView>) {
  for (const id of view.tabs) { const tab = [...root.querySelectorAll<HTMLElement>('[data-tabs] [role=tab]')].find(tab => tab.id === id); if (tab) activateTab(tab); }
  readingDetails(root).forEach((element, i) => { if (view.details[i] !== undefined) element.open = view.details[i]!; });
  root.querySelectorAll<HTMLElement>('main pre').forEach((element, i) => { const position = view.code[i]; if (position) { element.scrollLeft = position.left; element.scrollTop = position.top; } });
}
/** Retry only while lazy media is filling the page, and stop as soon as the reader interacts. */
export function restoreScroll(top: number, left: number, content: HTMLElement, signal: AbortSignal) {
  const controller = new AbortController();
  let observer: ResizeObserver | undefined;
  const stop = () => { if (controller.signal.aborted) return; controller.abort(); observer?.disconnect(); clearTimeout(timeout); };
  const apply = () => { if (controller.signal.aborted) return; window.scrollTo({ top, left, behavior: 'instant' }); if (Math.abs(window.scrollY - top) < 1) stop(); };
  const timeout = setTimeout(stop, 2000);
  signal.addEventListener('abort', stop, { once: true, signal: controller.signal });
  for (const event of ['wheel', 'touchstart', 'pointerdown', 'keydown']) window.addEventListener(event, stop, { once: true, passive: true, signal: controller.signal });
  if (typeof ResizeObserver !== 'undefined') { observer = new ResizeObserver(apply); observer.observe(content); }
  apply();
  return stop;
}
