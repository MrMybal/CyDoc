/** Static SVG diagrams use the reader window; their original DOM and links stay intact. */
export function mountDiagramTools(root: HTMLElement, locale: string, signal: AbortSignal) {
  const figures = [...root.querySelectorAll<HTMLElement>('article.prose .diagram')].filter(figure => figure.querySelector('svg'));
  if (!figures.length) return;
  const fr = locale.startsWith('fr');
  const dialog = document.createElement('dialog'); dialog.className = 'diagram-dialog';
  const header = document.createElement('div'); header.className = 'diagram-dialog-header';
  const title = document.createElement('h2'); title.id = 'cydoc-diagram-title';
  dialog.setAttribute('aria-labelledby', title.id);
  const close = document.createElement('button'); close.type = 'button'; close.textContent = fr ? 'Fermer' : 'Close';
  const stage = document.createElement('div'); stage.className = 'diagram diagram-dialog-stage';
  header.append(title, close); dialog.append(header, stage); root.append(dialog);
  let active: { svg: SVGSVGElement; placeholder: HTMLElement; button: HTMLButtonElement; description: string | null; top: number; left: number } | undefined;
  const restore = () => {
    if (!active) return;
    const previous = active; active = undefined;
    previous.placeholder.replaceWith(previous.svg);
    if (previous.description === null) previous.svg.removeAttribute('aria-describedby'); else previous.svg.setAttribute('aria-describedby', previous.description);
    stage.replaceChildren();
    if (!signal.aborted) { window.scrollTo({ top: previous.top, left: previous.left, behavior: 'instant' }); previous.button.focus({ preventScroll: true }); }
  };
  dialog.addEventListener('close', restore, { signal });
  dialog.addEventListener('cancel', event => { event.preventDefault(); dialog.close(); restore(); }, { signal });
  close.addEventListener('click', () => { dialog.close(); restore(); }, { signal });
  for (const figure of figures) {
    const svg = figure.querySelector<SVGSVGElement>('svg')!;
    const button = document.createElement('button'); button.type = 'button'; button.className = 'diagram-expand';
    button.textContent = fr ? 'Agrandir le schéma' : 'Enlarge diagram';
    button.setAttribute('aria-label', `${button.textContent}: ${svg.getAttribute('aria-label') || (fr ? 'Schéma' : 'Diagram')}`);
    figure.prepend(button);
    button.addEventListener('click', () => {
      if (active || signal.aborted) return;
      title.textContent = svg.getAttribute('aria-label') || (fr ? 'Schéma' : 'Diagram');
      const placeholder = document.createElement('div'); placeholder.className = 'diagram-placeholder'; placeholder.setAttribute('aria-hidden', 'true'); placeholder.style.height = `${svg.getBoundingClientRect().height}px`;
      active = { svg, placeholder, button, description: svg.getAttribute('aria-describedby'), top: window.scrollY, left: window.scrollX };
      svg.replaceWith(placeholder); stage.append(svg);
      const explanation = figure.querySelector<HTMLDetailsElement>('.diagram-description')?.cloneNode(true) as HTMLDetailsElement | undefined;
      if (explanation) { explanation.id = 'cydoc-enlarged-diagram-description'; explanation.open = true; stage.append(explanation); svg.setAttribute('aria-describedby', explanation.id); }
      dialog.showModal(); close.focus({ preventScroll: true });
    }, { signal });
  }
  signal.addEventListener('abort', () => { restore(); dialog.close(); dialog.remove(); }, { once: true });
}
