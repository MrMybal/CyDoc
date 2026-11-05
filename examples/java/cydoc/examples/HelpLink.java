package cydoc.examples;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * @doc api-java
 * @locale fr
 * @title Java · HelpLink.create
 * @symbol cydoc.examples.HelpLink.create
 * @section API
 * @order 180
 * Construit un fragment d’aide locale en Java, avec encodage des segments.
 *
 * ## Signature {#signature}
 *
 * ```java
 * public static String create(String base, String locale, String page)
 * ```
 *
 * ## Exemples et intégration {#integration}
 *
 * [Voir les exemples de code](doc:code-languages).
 */

/**
 * @doc api-java
 * @locale en
 * @title Java · HelpLink.create
 * @symbol cydoc.examples.HelpLink.create
 * @section API
 * @order 180
 * Build a local Java help fragment with encoded path segments.
 *
 * ## Signature {#signature}
 *
 * ```java
 * public static String create(String base, String locale, String page)
 * ```
 *
 * ## Examples and integration {#integration}
 *
 * [View code examples](doc:code-languages).
 */

public final class HelpLink {
    private HelpLink() {}
    private static String segment(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }
    public static String create(String base, String locale, String page) {
        return base.split("#", 2)[0] + "#/" + segment(locale) + "/" + segment(page);
    }
}
