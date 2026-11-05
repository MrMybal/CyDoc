export interface Locale { code: string; label: string }
export interface Heading { id: string; text: string; level: number }
export interface DocPage {
  id: string;
  locale: string;
  title: string;
  description: string;
  section: string;
  order: number;
  html: string;
  text: string;
  headings: Heading[];
  source?: string;
  sourcePageId?: string;
  symbol?: string;
  anchors?: string[];
  languages?: string[];
  kind?: 'guide' | 'api' | 'source' | 'media';
  code?: string;
  revision?: string;
  sourceRevision?: string;
}
/** HTML must come from the CyDoc compiler, or another trusted sanitizer. */
export interface Documentation {
  schemaVersion: 1;
  name: string;
  version: string;
  defaultLocale: string;
  locales: Locale[];
  pages: DocPage[];
  aliases?: Record<string, string>;
  versions?: Array<{ id: string; label: string; base: string }>;
}
export type ReaderState = Record<string, string>;
export interface DocRoute { locale: string; pageId: string; anchor?: string; state?: ReaderState }
export interface ResolvedPage { page: DocPage; requestedLocale: string; fallback: boolean }
export interface SearchResult { page: DocPage; score: number; excerpt: string; anchor?: string }
export interface SearchOptions { language?: string; kind?: string; fuzzy?: boolean }
export interface ViewerOptions {
  initialLocale?: string;
  homePage?: string;
  /** Optional trusted application-owned HTML for a custom landing page. */
  renderHome?: (locale: string) => string;
  /** Only the loaders selected by the host app are included. */
  modules?: Record<string, () => Promise<MediaModule>>;
  /** Local classic-script assets, or the host application's own binary provider. */
  loadAsset?: (src: string) => Promise<PackedAsset>;
  initialTheme?: string;
  /** Namespace for this application's local reading data. Defaults to the documentation name. */
  storageId?: string;
}
export interface PackedAsset { base64: string; resources?: Record<string, string> }
export interface MediaContext {
  locale: string;
  signal: AbortSignal;
  storageKey: string;
  loadAsset?: (src: string) => Promise<PackedAsset>;
  loadModule?: (name: string) => Promise<MediaModule>;
  state?: ReaderState;
  linkState?: (state: ReaderState) => void;
}
export interface MediaModule {
  mount(host: HTMLElement, config: Record<string, unknown>, context: MediaContext): void | (() => void) | Promise<void | (() => void)>;
}
