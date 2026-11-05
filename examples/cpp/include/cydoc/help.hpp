#pragma once
#include <string>
#include <string_view>

/**
 * @doc api-cpp
 * @locale fr
 * @title C++ · make_help_link
 * @symbol cydoc::make_help_link
 * @section API
 * @order 180
 * Construit une URL locale stable, avec encodage UTF-8 des segments.
 *
 * ## Signature {#signature}
 *
 * ```cpp
 * std::string make_help_link(std::string_view base, std::string_view locale,
 *                            std::string_view page, std::string_view section = {});
 * ```
 *
 * ## Exemples et intégration {#integration}
 *
 * [Voir les exemples de code](doc:code-languages).
 */

/**
 * @doc api-cpp
 * @locale en
 * @title C++ · make_help_link
 * @symbol cydoc::make_help_link
 * @section API
 * @order 180
 * Build a stable local URL with UTF-8 percent-encoded segments.
 *
 * ## Signature {#signature}
 *
 * ```cpp
 * std::string make_help_link(std::string_view base, std::string_view locale,
 *                            std::string_view page, std::string_view section = {});
 * ```
 *
 * ## Examples and integration {#integration}
 *
 * [View code examples](doc:code-languages).
 */

namespace cydoc {
std::string make_help_link(std::string_view base, std::string_view locale,
                           std::string_view page, std::string_view section = {});
}
