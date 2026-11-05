import { encodeSegment } from "./segments.js";

/**
 * @doc api-typescript
 * @locale fr
 * @title TypeScript · helpLink
 * @symbol helpLink
 * @section API
 * @order 180
 * Construit un lien typé ; l’import JavaScript est relié au fichier source TypeScript correspondant.
 *
 * ## Signature {#signature}
 *
 * ```typescript
 * export function helpLink(base: string, locale: string, page: string, section = ""): string
 * ```
 *
 * ## Exemples et intégration {#integration}
 *
 * [Voir les exemples de code](doc:code-languages).
 */

/**
 * @doc api-typescript
 * @locale en
 * @title TypeScript · helpLink
 * @symbol helpLink
 * @section API
 * @order 180
 * Build a typed link; the JavaScript import resolves to the corresponding TypeScript source file.
 *
 * ## Signature {#signature}
 *
 * ```typescript
 * export function helpLink(base: string, locale: string, page: string, section = ""): string
 * ```
 *
 * ## Examples and integration {#integration}
 *
 * [View code examples](doc:code-languages).
 */

export function helpLink(base: string, locale: string, page: string, section = ""): string {
  return `${base.split('#')[0]}#/${encodeSegment(locale)}/${encodeSegment(page)}` +
    (section ? `/${encodeSegment(section)}` : '');
}
