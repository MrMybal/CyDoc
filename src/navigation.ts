import type { DocPage } from './types.js';

export interface NavigationNode {
  key: string;
  label: string;
  page?: DocPage;
  children: NavigationNode[];
}

/** Sections may use slash-separated paths; explicit parent pages keep their own routes. */
export function navigationTree(pages: DocPage[]): NavigationNode[] {
  const roots: NavigationNode[] = [];
  const nodes = new Map(pages.map(page => [page.id, { key: `page:${page.id}`, label: page.title, page, children: [] } as NavigationNode]));
  const folders = new Map<string, NavigationNode>();
  for (const page of pages) {
    const node = nodes.get(page.id)!;
    if (page.parent) { nodes.get(page.parent)?.children.push(node); continue; }
    const path = page.section.split('/').map(part => part.trim()).filter(Boolean);
    if (page.kind === 'source' && page.source) path.push(...page.source.replace(/:\d+$/, '').split('/').slice(0, -1));
    let siblings = roots, key = '';
    for (const label of path) {
      key += `/${label}`;
      let folder = folders.get(key);
      if (!folder) { folder = { key: `section:${key}`, label, children: [] }; folders.set(key, folder); siblings.push(folder); }
      siblings = folder.children;
    }
    siblings.push(node);
  }
  return roots;
}

export const containsPage = (node: NavigationNode, id?: string): boolean => !!id && (node.page?.id === id || node.children.some(child => containsPage(child, id)));
