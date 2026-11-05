/**
 * @doc api-links
 * @locale fr
 * @title API des liens
 * @section API
 * @order 100
 * Créez des liens stables entre votre application et sa documentation.
 *
 * ## createLink {#create-link}
 * `createLink(route, base?)` renvoie une URL avec un fragment encodé.
 *
 * ## Paramètres {#parameters}
 * - `locale` : code de langue, par exemple `fr`.
 * - `pageId` : identifiant stable de la page.
 * - `anchor` : identifiant de section optionnel.
 * - `base` : chemin du lecteur, vide par défaut.
 *
 * ## Exemple {#example}
 * ```typescript
 * createLink({ locale: 'fr', pageId: 'quickstart', anchor: 'installation' }, './help/index.html');
 * ```
 *
 * ## Résultat {#result}
 * `./help/index.html#/fr/quickstart/installation`
 *
 * La fonction ne lance aucun navigateur. L’application hôte ouvre l’URL dans l’environnement de son choix.
 */

/**
 * @doc api-links
 * @locale en
 * @title Links API
 * @section API
 * @order 100
 * Create stable links between your application and its documentation.
 *
 * ## createLink {#create-link}
 * `createLink(route, base?)` returns a URL with an encoded fragment.
 *
 * ## Parameters {#parameters}
 * - `locale`: a locale code, such as `en`.
 * - `pageId`: stable page identifier.
 * - `anchor`: optional section identifier.
 * - `base`: viewer path, empty by default.
 *
 * ## Example {#example}
 * ```typescript
 * createLink({ locale: 'en', pageId: 'quickstart', anchor: 'installation' }, './help/index.html');
 * ```
 *
 * ## Result {#result}
 * `./help/index.html#/en/quickstart/installation`
 *
 * The function does not launch a browser. The host application opens the URL in its chosen environment.
 */
export function helpUrl(locale: string) {
  return `./help/index.html#/${encodeURIComponent(locale)}/quickstart/installation`;
}
