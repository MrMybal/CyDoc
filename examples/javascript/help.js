import { encodeSegment } from "./segments.js";

/**
 * @doc api-javascript
 * @locale fr
 * @title JavaScript · helpLink
 * @symbol helpLink
 * @section API
 * @order 180
 * Construit un lien local en JavaScript. La page de fichier relie l’import à segments.js.
 *
 * ## Signature {#signature}
 *
 * ```javascript
 * export function helpLink(base, locale, page, section = "")
 * ```
 *
 * ## Exemples et intégration {#integration}
 *
 * [Voir les exemples de code](doc:code-languages).
 */

/**
 * @doc api-javascript
 * @locale en
 * @title JavaScript · helpLink
 * @symbol helpLink
 * @section API
 * @order 180
 * Build a local JavaScript link. The file page links the import to segments.js.
 *
 * ## Signature {#signature}
 *
 * ```javascript
 * export function helpLink(base, locale, page, section = "")
 * ```
 *
 * ## Examples and integration {#integration}
 *
 * [View code examples](doc:code-languages).
 */

export function helpLink(base, locale, page, section = "") {
  return `${base.split('#')[0]}#/${encodeSegment(locale)}/${encodeSegment(page)}` +
    (section ? `/${encodeSegment(section)}` : '');
}
