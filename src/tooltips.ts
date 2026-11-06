const triggers = '[data-tooltip-title],[role=tab],.side-nav summary';
let nextTooltip = 0;

/** One delegated tooltip per reader page, outside scrolling and clipped navigation containers. */
export function mountTooltips(root: HTMLElement, signal: AbortSignal, delay = 120) {
  if (signal.aborted) return;
  const tooltip = document.createElement('div');
  tooltip.id = `cydoc-tooltip-${++nextTooltip}`; tooltip.className = 'reader-tooltip';
  tooltip.setAttribute('role', 'tooltip'); tooltip.hidden = true;
  const title = document.createElement('strong'), description = document.createElement('span');
  title.className = 'reader-tooltip-title'; description.className = 'reader-tooltip-description';
  tooltip.append(title, description); root.append(tooltip);
  let active: HTMLElement | undefined, pending: HTMLElement | undefined;
  let hovered: HTMLElement | undefined, focused: HTMLElement | undefined;
  let dismissed: HTMLElement | undefined, pointerFocus: HTMLElement | undefined;
  let showTimer: ReturnType<typeof setTimeout> | undefined, hideTimer: ReturnType<typeof setTimeout> | undefined;
  const target = (node: EventTarget | null) => node instanceof window.Element ? node.closest<HTMLElement>(triggers) || undefined : undefined;
  const clearTimers = () => { clearTimeout(showTimer); clearTimeout(hideTimer); pending = undefined; };
  function unlink() {
    if (!active) return;
    const ids = (active.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== tooltip.id);
    if (ids.length) active.setAttribute('aria-describedby', ids.join(' ')); else active.removeAttribute('aria-describedby');
  }
  function hide() { clearTimers(); unlink(); active = undefined; tooltip.hidden = true; }
  function position(element: HTMLElement) {
    const anchor = element.getBoundingClientRect(), box = tooltip.getBoundingClientRect();
    const margin = 8, gap = 10, side = !!element.closest('.side-nav');
    let left = side ? anchor.right + gap : anchor.left;
    let top = side ? anchor.top + (anchor.height - box.height) / 2 : anchor.bottom + gap;
    if (side && left + box.width > window.innerWidth - margin) left = anchor.left - box.width - gap;
    if (!side && top + box.height > window.innerHeight - margin) top = anchor.top - box.height - gap;
    tooltip.style.left = `${Math.max(margin, Math.min(left, window.innerWidth - box.width - margin))}px`;
    tooltip.style.top = `${Math.max(margin, Math.min(top, window.innerHeight - box.height - margin))}px`;
  }
  function show(element: HTMLElement) {
    clearTimers();
    if (signal.aborted || !root.contains(element) || dismissed === element) return;
    const source = element.matches('.side-nav summary') ? element.querySelector<HTMLElement>(':scope > a[data-tooltip-title]') || element : element;
    const label = source.dataset.tooltipTitle || source.getAttribute('aria-label') || source.textContent?.trim() || '';
    if (!label) { hide(); return; }
    unlink(); active = element;
    title.textContent = label;
    description.textContent = source.dataset.tooltipDescription || '';
    description.hidden = !description.textContent || description.textContent === label;
    const ids = (element.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    element.setAttribute('aria-describedby', [...new Set([...ids, tooltip.id])].join(' '));
    tooltip.hidden = false; position(element);
  }
  function schedule(element: HTMLElement, immediate = false) {
    clearTimeout(hideTimer);
    if (active === element || pending === element || dismissed === element) return;
    hide();
    if (immediate) show(element);
    else { pending = element; showTimer = setTimeout(() => show(element), delay); }
  }
  const leave = () => {
    clearTimeout(hideTimer);
    if (focused) schedule(focused, true);
    else hideTimer = setTimeout(hide, 100);
  };
  root.addEventListener('pointerover', event => {
    if (event.pointerType === 'touch') return;
    const element = target(event.target); if (!element || !root.contains(element)) return;
    if (hovered?.contains(element)) return;
    if (element.matches('.side-nav summary') && active && element.contains(active)) { hovered = active; clearTimeout(hideTimer); return; }
    hovered = element; schedule(element);
  }, { signal });
  root.addEventListener('pointerout', event => {
    const element = target(event.target); if (!element || (event.relatedTarget instanceof window.Node && element.contains(event.relatedTarget))) return;
    if (dismissed === element) dismissed = undefined;
    if (hovered && element.contains(hovered)) hovered = undefined;
    clearTimeout(showTimer); pending = undefined; leave();
  }, { signal });
  root.addEventListener('focusin', event => {
    const element = target(event.target); if (!element || pointerFocus === element) return;
    focused = element; schedule(element, true);
  }, { signal });
  root.addEventListener('focusout', event => {
    const element = target(event.target);
    if (focused === element) focused = undefined;
    if (dismissed === element) dismissed = undefined;
    if (hovered) schedule(hovered); else leave();
  }, { signal });
  tooltip.addEventListener('pointerenter', () => clearTimeout(hideTimer), { signal });
  tooltip.addEventListener('pointerleave', leave, { signal });
  root.addEventListener('pointerdown', event => { if (tooltip.contains(event.target as Node)) return; pointerFocus = target(event.target); hovered = focused = undefined; hide(); }, { signal });
  root.addEventListener('click', event => { if (!tooltip.contains(event.target as Node)) hide(); }, { signal });
  root.addEventListener('toggle', hide, { signal, capture: true });
  document.addEventListener('keydown', event => {
    pointerFocus = undefined;
    if (event.key === 'Escape') { dismissed = active || pending; hovered = focused = undefined; hide(); }
  }, { signal });
  window.addEventListener('scroll', event => {
    if (event.target instanceof window.Node && tooltip.contains(event.target)) return;
    if (active && focused === active) position(active);
    else { hovered = undefined; hide(); }
  }, { signal, capture: true, passive: true });
  window.addEventListener('resize', hide, { signal });
  window.addEventListener('hashchange', () => { hovered = focused = undefined; hide(); }, { signal });
  signal.addEventListener('abort', () => { hide(); tooltip.remove(); }, { once: true });
}
