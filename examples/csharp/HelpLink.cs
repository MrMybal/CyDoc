using System;

/**
 * @doc api-csharp
 * @locale fr
 * @title C# · HelpLink.Create
 * @symbol CyDoc.Examples.HelpLink.Create
 * @section API
 * @order 180
 * Construit une URL locale utilisable depuis une application .NET.
 *
 * ## Signature {#signature}
 *
 * ```csharp
 * public static string Create(string path, string locale, string page)
 * ```
 *
 * ## Exemples et intégration {#integration}
 *
 * [Voir les exemples de code](doc:code-languages).
 */

/**
 * @doc api-csharp
 * @locale en
 * @title C# · HelpLink.Create
 * @symbol CyDoc.Examples.HelpLink.Create
 * @section API
 * @order 180
 * Build a local URL usable from a .NET application.
 *
 * ## Signature {#signature}
 *
 * ```csharp
 * public static string Create(string path, string locale, string page)
 * ```
 *
 * ## Examples and integration {#integration}
 *
 * [View code examples](doc:code-languages).
 */

namespace CyDoc.Examples {
    public static class HelpLink {
        public static string Create(string path, string locale, string page) {
            return path.Split('#')[0] + "#/" + Uri.EscapeDataString(locale) + "/" + Uri.EscapeDataString(page);
        }
    }
}
